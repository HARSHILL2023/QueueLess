// Lightweight in-memory rate limiter per IP / User
const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests, please try again later.' } = {}) => {
  const requests = new Map();

  // Cleanup every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of requests.entries()) {
      if (now - record.startTime > windowMs) {
        requests.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req, res, next) => {
    // In test environment, skip rate limiting to avoid slowing down or blocking tests
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    let record = requests.get(key);
    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now };
      requests.set(key, record);
      return next();
    }

    record.count += 1;
    if (record.count > max) {
      const retryAfter = Math.ceil((record.startTime + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({ error: message, retryAfterSeconds: retryAfter });
    }

    next();
  };
};

module.exports = rateLimit;
