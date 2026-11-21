const ActivityLog = require('../models/ActivityLog');

const SENSITIVE_KEY = /pass(word)?|hash|token|secret|authorization|jwt|refresh|cookie|notes/i;

/**
 * Recursively strip anything that could leak a credential or clinical note.
 * Metadata is only ever used for human-readable context.
 */
const sanitize = (value, depth = 0) => {
  if (value === null || value === undefined) return value;
  if (depth > 3) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, depth + 1));
  if (typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, item]) => {
      if (SENSITIVE_KEY.test(key)) return acc;
      acc[key] = sanitize(item, depth + 1);
      return acc;
    }, {});
  }
  if (typeof value === 'string') return value.slice(0, 300);
  return value;
};

/**
 * Record a platform administration action.
 *
 * Audit logging must never break the operation that produced it, so failures
 * are reported to the server log and swallowed.
 */
const recordActivity = async ({ actor, action, targetType, targetId, targetLabel, metadata }) => {
  try {
    await ActivityLog.create({
      actorId: actor?._id || null,
      actorName: actor?.name || 'System',
      actorEmail: actor?.email || '',
      actorRole: actor?.role || '',
      action,
      targetType,
      targetId: targetId || null,
      targetLabel: targetLabel || '',
      metadata: sanitize(metadata || {}),
    });
  } catch (error) {
    console.error('Failed to record platform activity:', error.message);
  }
};

module.exports = { recordActivity, sanitize };
