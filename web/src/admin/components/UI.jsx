import { useEffect } from 'react';

export function Panel({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`admin-panel ${className}`.trim()}>
      {(title || actions) && (
        <header className="admin-panel-header">
          <div>
            {title && <div className="admin-panel-title">{title}</div>}
            {subtitle && <div className="admin-panel-subtitle">{subtitle}</div>}
          </div>
          {actions && <div className="admin-toolbar" style={{ margin: 0 }}>{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, meta, accent }) {
  return (
    <div className="admin-stat">
      <span className="admin-stat-accent" style={accent ? { background: accent } : undefined} />
      <div className="admin-stat-label">{label}</div>
      <div className="admin-stat-value">{value}</div>
      {meta && <div className="admin-stat-meta">{meta}</div>}
    </div>
  );
}

export function Loading({ label = 'Loading platform data…' }) {
  return (
    <div className="admin-loading">
      <span className="admin-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="admin-stat-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="admin-skeleton" />
      ))}
    </div>
  );
}

export function ErrorPanel({ message, onRetry }) {
  return (
    <div className="admin-error" role="alert">
      <span>{message || 'Something went wrong while loading this section.'}</span>
      {onRetry && (
        <button type="button" className="admin-btn admin-btn-sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="admin-empty">
      <div className="admin-empty-title">{title}</div>
      {children && <div>{children}</div>}
    </div>
  );
}

export function StatusBadge({ status }) {
  const normalized = String(status || 'unknown').toLowerCase();
  const labels = {
    active: 'Active',
    pending: 'Pending',
    suspended: 'Suspended',
    approved: 'Approved',
    rejected: 'Rejected',
    completed: 'Completed',
    cancelled: 'Cancelled',
    'no-show': 'No-show',
    waiting: 'Waiting',
    called: 'Called',
    serving: 'Serving',
    info: 'Info',
  };

  const className =
    normalized === 'no-show' ? 'no-show' : ['active', 'pending', 'suspended', 'serving', 'completed', 'cancelled', 'waiting', 'called'].includes(normalized)
      ? normalized
      : 'neutral';

  return <span className={`admin-badge ${className}`}>{labels[normalized] || status}</span>;
}

export function RoleBadge({ role, staffRole }) {
  if (role === 'admin') {
    return <span className="admin-badge info">Platform admin</span>;
  }
  if (role === 'staff') {
    return (
      <span className="admin-badge neutral">
        {staffRole === 'admin' ? 'Hospital admin' : staffRole || 'Staff'}
      </span>
    );
  }
  return <span className="admin-badge neutral">{role || 'Patient'}</span>;
}

export function Pagination({ pagination, onPage }) {
  if (!pagination) return null;
  const { page, pages, total, limit } = pagination;
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(total, page * limit);

  return (
    <div className="admin-pagination">
      <span>
        Showing {first}–{last} of {total}
      </span>
      <div className="admin-pagination-actions">
        <button
          type="button"
          className="admin-btn admin-btn-sm"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-sm"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer, width }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="admin-modal-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal" role="dialog" aria-modal="true" aria-label={title} style={width ? { maxWidth: width } : undefined}>
        <header className="admin-modal-header">
          <h3>{title}</h3>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </header>
        <div className="admin-modal-body">{children}</div>
        {footer && <footer className="admin-modal-footer">{footer}</footer>}
      </div>
    </div>
  );
}

/**
 * Destructive-action confirmation. The caller supplies the action button label
 * and the mutation callback; this component only owns the dialog state.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  variant = 'danger',
  busy = false,
  error = '',
  onCancel,
  onConfirm,
  children,
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={busy ? () => {} : onCancel}
      footer={
        <>
          <button type="button" className="admin-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`admin-btn admin-btn-${variant}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      {description && <p style={{ color: '#b9c8dc', fontSize: '0.87rem', marginBottom: 14 }}>{description}</p>}
      {children}
      {error && <div className="admin-notice danger">{error}</div>}
    </Modal>
  );
}
