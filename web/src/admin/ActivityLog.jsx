import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import adminAPI from '../services/adminApi';
import { Panel, Pagination, ErrorPanel, EmptyState, Loading } from './components/UI';
import { formatDateTime, formatNumber } from './format';

const ACTIONS = [
  { value: '', label: 'All actions' },
  { value: 'hospital.created', label: 'Hospital created' },
  { value: 'hospital.updated', label: 'Hospital updated' },
  { value: 'hospital.approved', label: 'Hospital approved' },
  { value: 'hospital.rejected', label: 'Hospital rejected' },
  { value: 'hospital.suspended', label: 'Hospital suspended' },
  { value: 'hospital.activated', label: 'Hospital activated' },
  { value: 'user.suspended', label: 'Account suspended' },
  { value: 'user.reactivated', label: 'Account reactivated' },
];

const LABELS = ACTIONS.reduce((acc, item) => {
  if (item.value) acc[item.value] = item.label;
  return acc;
}, {});

const ACTION_CLASS = {
  'hospital.approved': 'active',
  'hospital.activated': 'active',
  'hospital.created': 'info',
  'hospital.updated': 'neutral',
  'hospital.rejected': 'danger',
  'hospital.suspended': 'danger',
  'user.suspended': 'danger',
  'user.reactivated': 'active',
};

const renderMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object') return '—';
  const entries = Object.entries(metadata).filter(([, value]) => value !== '' && value !== null && value !== undefined);
  if (entries.length === 0) return '—';
  return entries
    .map(([key, value]) => {
      const formatted = Array.isArray(value) ? value.join(', ') : String(value);
      return `${key.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${formatted}`;
    })
    .join(' · ');
};

export default function ActivityLog() {
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['admin-activity', { action, search, page }],
    queryFn: async () =>
      (
        await adminAPI.getActivity({
          action: action || undefined,
          search: search.trim() || undefined,
          page,
          limit: 30,
        })
      ).data.data,
  });

  const items = data?.items || [];

  return (
    <>
      <header className="admin-topbar">
        <div>
          <h2>Activity log</h2>
          <p>Every platform administration action, with who performed it and what it touched.</p>
        </div>
      </header>

      <Panel
        title="Audit trail"
        subtitle={data ? `${formatNumber(data.pagination.total)} recorded actions` : 'Loading…'}
        actions={
          <button type="button" className="admin-btn admin-btn-sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Refreshing…' : '↻ Refresh'}
          </button>
        }
      >
        <div className="admin-toolbar">
          <input
            className="admin-input"
            placeholder="Search by administrator or target…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            aria-label="Search activity"
          />
          <select
            className="admin-select"
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by action"
          >
            {ACTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {isError && (
          <ErrorPanel message={error?.response?.data?.error || 'Unable to load the activity log.'} onRetry={refetch} />
        )}

        {isLoading && <Loading label="Loading audit trail…" />}

        {!isLoading && !isError && items.length === 0 && (
          <EmptyState title="No matching activity">
            Platform actions such as approvals, suspensions and account changes are recorded here.
          </EmptyState>
        )}

        {items.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Administrator</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {items.map((entry) => (
                  <tr key={entry._id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(entry.createdAt)}</td>
                    <td>
                      <span className="admin-cell-strong">{entry.actorName || 'System'}</span>
                      <div className="admin-cell-muted">{entry.actorEmail || ''}</div>
                    </td>
                    <td>
                      <span className={`admin-badge ${ACTION_CLASS[entry.action] || 'neutral'}`}>
                        {(LABELS[entry.action] || entry.action)
                          .replace('Hospital ', '')
                          .replace('Account ', '')}
                      </span>
                    </td>
                    <td>
                      {entry.targetLabel || '—'}
                      <div className="admin-cell-muted">{entry.targetType}</div>
                    </td>
                    <td className="admin-cell-muted" style={{ maxWidth: 340 }}>
                      {renderMetadata(entry.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && items.length > 0 && <Pagination pagination={data.pagination} onPage={setPage} />}
      </Panel>
    </>
  );
}
