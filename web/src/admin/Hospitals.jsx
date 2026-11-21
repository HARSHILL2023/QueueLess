import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import adminAPI from '../services/adminApi';
import HospitalForm from './components/HospitalForm';
import {
  Panel,
  Pagination,
  ErrorPanel,
  EmptyState,
  StatusBadge,
  Loading,
  ConfirmDialog,
} from './components/UI';
import { formatDate, formatNumber } from './format';

export default function Hospitals() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');

  // { type: 'approve' | 'reject' | 'suspend' | 'activate', hospital }
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['admin-hospitals', { search, status, sort, page }],
    queryFn: async () =>
      (
        await adminAPI.getHospitals({
          search: search.trim() || undefined,
          status: status || undefined,
          sort,
          page,
          limit: 15,
        })
      ).data.data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-hospitals'] });
    queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => adminAPI.createHospital(payload),
    onSuccess: () => {
      setFormOpen(false);
      setFormError('');
      invalidate();
    },
    onError: (mutationError) => {
      const details = mutationError?.response?.data?.details;
      setFormError(
        details?.length
          ? details.map((item) => item.message).join(' ')
          : mutationError?.response?.data?.error || 'Could not create the hospital.'
      );
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ type, hospital, reason: actionReason }) => {
      if (type === 'approve') return adminAPI.approveHospital(hospital._id);
      if (type === 'reject') return adminAPI.rejectHospital(hospital._id, actionReason);
      if (type === 'activate') return adminAPI.setHospitalStatus(hospital._id, 'active', actionReason);
      return adminAPI.setHospitalStatus(hospital._id, 'suspended', actionReason);
    },
    onSuccess: () => {
      setAction(null);
      setReason('');
      setActionError('');
      invalidate();
    },
    onError: (mutationError) => {
      setActionError(
        mutationError?.response?.data?.details?.[0]?.message ||
          mutationError?.response?.data?.error ||
          'The action could not be completed.'
      );
    },
  });

  const openAction = (type, hospital) => {
    setAction({ type, hospital });
    setReason('');
    setActionError('');
  };

  const actionCopy = {
    approve: {
      title: 'Approve hospital',
      description: 'This verifies the hospital and activates it so patients can book tokens.',
      confirmLabel: 'Approve hospital',
      variant: 'success',
    },
    reject: {
      title: 'Reject hospital registration',
      description: 'The hospital becomes suspended and unverified. No records are deleted.',
      confirmLabel: 'Reject hospital',
      variant: 'danger',
    },
    suspend: {
      title: 'Suspend hospital',
      description:
        'The hospital stops issuing tokens immediately. Historical queues, tokens and patient records are preserved.',
      confirmLabel: 'Suspend hospital',
      variant: 'danger',
    },
    activate: {
      title: 'Activate hospital',
      description: 'Restores the hospital and verifies it so patients can book tokens again.',
      confirmLabel: 'Activate hospital',
      variant: 'success',
    },
  };

  const needsReason = action && (action.type === 'reject' || action.type === 'suspend');
  const copy = action ? actionCopy[action.type] : null;

  const submitAction = () => {
    if (needsReason && reason.trim().length < 3) {
      setActionError('Please provide a short reason (at least 3 characters).');
      return;
    }
    actionMutation.mutate({ ...action, reason: reason.trim() });
  };

  const hospitals = data?.items || [];

  return (
    <>
      <header className="admin-topbar">
        <div>
          <h2>Hospitals</h2>
          <p>Approve, configure and monitor every hospital on the platform.</p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={() => {
            setFormError('');
            setFormOpen(true);
          }}
        >
          + Register hospital
        </button>
      </header>

      <Panel
        title="Hospital register"
        subtitle={data ? `${formatNumber(data.pagination.total)} hospitals` : 'Loading…'}
        actions={
          <button type="button" className="admin-btn admin-btn-sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Refreshing…' : '↻ Refresh'}
          </button>
        }
      >
        <div className="admin-toolbar">
          <input
            className="admin-input"
            placeholder="Search by name, code, email or city…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            aria-label="Search hospitals"
          />
          <select
            className="admin-select"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending approval</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            className="admin-select"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            aria-label="Sort hospitals"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        {isError && (
          <ErrorPanel
            message={error?.response?.data?.error || 'Unable to load hospitals.'}
            onRetry={refetch}
          />
        )}

        {isLoading && <Loading label="Loading hospitals…" />}

        {!isLoading && !isError && hospitals.length === 0 && (
          <EmptyState title="No hospitals match these filters">
            Adjust the search or status filter, or register a new hospital.
          </EmptyState>
        )}

        {hospitals.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Hospital</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th className="admin-numeric">Depts</th>
                  <th className="admin-numeric">Staff</th>
                  <th className="admin-numeric">Tokens</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {hospitals.map((hospital) => {
                  const pending = !hospital.isVerified || hospital.status === 'pending';
                  return (
                    <tr key={hospital._id}>
                      <td>
                        <Link to={`/admin/hospitals/${hospital._id}`} className="admin-cell-strong">
                          {hospital.name}
                        </Link>
                        <div className="admin-cell-muted">
                          {hospital.code} · {hospital.email}
                        </div>
                      </td>
                      <td>
                        {hospital.address?.city || '—'}
                        <div className="admin-cell-muted">{hospital.address?.state || ''}</div>
                      </td>
                      <td>
                        <StatusBadge status={pending ? 'pending' : hospital.status} />
                      </td>
                      <td>{formatDate(hospital.createdAt)}</td>
                      <td className="admin-numeric">{formatNumber(hospital.counts.departments)}</td>
                      <td className="admin-numeric">
                        {formatNumber(hospital.counts.staff + hospital.counts.admins)}
                      </td>
                      <td className="admin-numeric">
                        {formatNumber(hospital.counts.totalTokens)}
                        <div className="admin-cell-muted">{formatNumber(hospital.counts.waitingTokens)} waiting</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {pending ? (
                            <button
                              type="button"
                              className="admin-btn admin-btn-sm admin-btn-success"
                              onClick={() => openAction('approve', hospital)}
                            >
                              Approve
                            </button>
                          ) : hospital.status === 'suspended' ? (
                            <button
                              type="button"
                              className="admin-btn admin-btn-sm admin-btn-success"
                              onClick={() => openAction('activate', hospital)}
                            >
                              Activate
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="admin-btn admin-btn-sm admin-btn-warn"
                              onClick={() => openAction('suspend', hospital)}
                            >
                              Suspend
                            </button>
                          )}
                          {pending && (
                            <button
                              type="button"
                              className="admin-btn admin-btn-sm admin-btn-danger"
                              onClick={() => openAction('reject', hospital)}
                            >
                              Reject
                            </button>
                          )}
                          <Link to={`/admin/hospitals/${hospital._id}`} className="admin-btn admin-btn-sm">
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && hospitals.length > 0 && <Pagination pagination={data.pagination} onPage={setPage} />}
      </Panel>

      <HospitalForm
        open={formOpen}
        hospital={null}
        busy={createMutation.isPending}
        error={formError}
        onClose={() => setFormOpen(false)}
        onSubmit={(payload) => createMutation.mutate(payload)}
      />

      <ConfirmDialog
        open={Boolean(action)}
        title={copy?.title || ''}
        description={copy?.description}
        confirmLabel={copy?.confirmLabel}
        variant={copy?.variant}
        busy={actionMutation.isPending}
        error={actionError}
        onCancel={() => {
          setAction(null);
          setReason('');
          setActionError('');
        }}
        onConfirm={submitAction}
      >
        {action && (
          <div className="admin-kv" style={{ marginBottom: needsReason ? 14 : 0 }}>
            <dt>Hospital</dt>
            <dd>
              {action.hospital.name} ({action.hospital.code})
            </dd>
          </div>
        )}
        {needsReason && (
          <div className="admin-field">
            <label htmlFor="action-reason">Reason (stored in the activity log)</label>
            <textarea
              id="action-reason"
              className="admin-textarea"
              rows={3}
              maxLength={300}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why this hospital is being declined or suspended"
            />
          </div>
        )}
      </ConfirmDialog>
    </>
  );
}
