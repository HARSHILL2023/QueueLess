import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import adminAPI from '../services/adminApi';
import {
  Panel,
  Pagination,
  ErrorPanel,
  EmptyState,
  StatusBadge,
  RoleBadge,
  Loading,
  Modal,
  ConfirmDialog,
} from './components/UI';
import { formatDate, formatDateTime, formatNumber } from './format';

export default function Staff() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [focusId, setFocusId] = useState(null);
  const [statusAction, setStatusAction] = useState(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');

  const listQuery = useQuery({
    queryKey: ['admin-staff', { search, role, status, page }],
    queryFn: async () =>
      (
        await adminAPI.getStaff({
          search: search.trim() || undefined,
          role: role || undefined,
          status: status || undefined,
          page,
          limit: 20,
        })
      ).data.data,
  });

  const detailQuery = useQuery({
    queryKey: ['admin-staff-member', focusId],
    queryFn: async () => (await adminAPI.getStaffMember(focusId)).data.data,
    enabled: Boolean(focusId),
  });

  const statusMutation = useMutation({
    mutationFn: ({ member, nextStatus, reason: actionReason }) =>
      adminAPI.setUserStatus(member._id, nextStatus, actionReason),
    onSuccess: () => {
      setStatusAction(null);
      setReason('');
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      queryClient.invalidateQueries({ queryKey: ['admin-staff-member', focusId] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-activity'] });
    },
    onError: (mutationError) => {
      setActionError(
        mutationError?.response?.data?.error || 'The account status could not be changed.'
      );
    },
  });

  const people = listQuery.data?.items || [];
  const detail = detailQuery.data;

  const submitStatus = () => {
    if (!statusAction) return;
    if (statusAction.nextStatus === 'suspended' && reason.trim().length < 3) {
      setActionError('Please provide a short reason (at least 3 characters).');
      return;
    }
    statusMutation.mutate({ ...statusAction, reason: reason.trim() });
  };

  return (
    <>
      <header className="admin-topbar">
        <div>
          <h2>Hospital staff</h2>
          <p>Hospital administrators and staff accounts across every hospital.</p>
        </div>
      </header>

      <Panel
        title="Staff directory"
        subtitle={listQuery.data ? `${formatNumber(listQuery.data.pagination.total)} accounts` : 'Loading…'}
        actions={
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => listQuery.refetch()}
            disabled={listQuery.isFetching}
          >
            {listQuery.isFetching ? 'Refreshing…' : '↻ Refresh'}
          </button>
        }
      >
        <div className="admin-toolbar">
          <input
            className="admin-input"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            aria-label="Search staff"
          />
          <select
            className="admin-select"
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by role"
          >
            <option value="">All roles</option>
            <option value="admin">Hospital administrators</option>
            <option value="staff">Doctors, nurses & reception</option>
          </select>
          <select
            className="admin-select"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by account status"
          >
            <option value="">All accounts</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {listQuery.isError && (
          <ErrorPanel
            message={listQuery.error?.response?.data?.error || 'Unable to load staff accounts.'}
            onRetry={listQuery.refetch}
          />
        )}

        {listQuery.isLoading && <Loading label="Loading staff accounts…" />}

        {!listQuery.isLoading && !listQuery.isError && people.length === 0 && (
          <EmptyState title="No staff accounts found">Try a different search or role filter.</EmptyState>
        )}

        {people.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Hospital</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Last login</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {people.map((member) => (
                  <tr key={member._id}>
                    <td className="admin-cell-strong">{member.name}</td>
                    <td>{member.email}</td>
                    <td>
                      <RoleBadge role={member.role} staffRole={member.staffRole} />
                    </td>
                    <td>
                      {member.hospitalName || '—'}
                      <div className="admin-cell-muted">{member.hospitalCode || ''}</div>
                    </td>
                    <td>{member.departmentName || '—'}</td>
                    <td>
                      <StatusBadge status={member.status || 'active'} />
                    </td>
                    <td>{formatDate(member.createdAt)}</td>
                    <td>{formatDateTime(member.lastLoginAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn-sm"
                        onClick={() => setFocusId(member._id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {listQuery.data && people.length > 0 && (
          <Pagination pagination={listQuery.data.pagination} onPage={setPage} />
        )}
      </Panel>

      <Modal
        open={Boolean(focusId)}
        title={detail?.staff?.name || 'Staff account'}
        onClose={() => setFocusId(null)}
        footer={
          <>
            <button type="button" className="admin-btn" onClick={() => setFocusId(null)}>
              Close
            </button>
            {detail?.staff && (
              <button
                type="button"
                className={`admin-btn ${
                  detail.staff.status === 'suspended' ? 'admin-btn-success' : 'admin-btn-danger'
                }`}
                onClick={() => {
                  setActionError('');
                  setReason('');
                  setStatusAction({
                    member: detail.staff,
                    nextStatus: detail.staff.status === 'suspended' ? 'active' : 'suspended',
                  });
                }}
              >
                {detail.staff.status === 'suspended' ? 'Reactivate account' : 'Suspend account'}
              </button>
            )}
          </>
        }
      >
        {detailQuery.isLoading && <Loading label="Loading staff profile…" />}

        {detailQuery.isError && (
          <ErrorPanel
            message={detailQuery.error?.response?.data?.error || 'Unable to load this account.'}
            onRetry={detailQuery.refetch}
          />
        )}

        {detail && (
          <dl className="admin-kv">
            <dt>Name</dt>
            <dd>{detail.staff.name}</dd>
            <dt>Email</dt>
            <dd>{detail.staff.email}</dd>
            <dt>Phone</dt>
            <dd>{detail.staff.phone || '—'}</dd>
            <dt>Role</dt>
            <dd>
              <RoleBadge role={detail.staff.role} staffRole={detail.staff.staffRole} />
            </dd>
            <dt>Hospital</dt>
            <dd>
              {detail.staff.hospitalId?.name || '—'}
              {detail.staff.hospitalId?.code ? ` (${detail.staff.hospitalId.code})` : ''}
              {detail.staff.hospitalId?.status ? (
                <>
                  {' '}
                  <StatusBadge status={detail.staff.hospitalId.status} />
                </>
              ) : null}
            </dd>
            <dt>Department</dt>
            <dd>
              {detail.staff.departmentId?.name || '—'}
              {detail.staff.departmentId?.floor ? ` · ${detail.staff.departmentId.floor}` : ''}
            </dd>
            <dt>Account status</dt>
            <dd>
              <StatusBadge status={detail.staff.status || 'active'} />{' '}
              {detail.staff.status === 'suspended' && detail.staff.suspendedReason
                ? `— ${detail.staff.suspendedReason}`
                : ''}
            </dd>
            <dt>Registered</dt>
            <dd>{formatDateTime(detail.staff.createdAt)}</dd>
            <dt>Last login</dt>
            <dd>{formatDateTime(detail.staff.lastLoginAt)}</dd>
            <dt>Completed tokens in department</dt>
            <dd>{formatNumber(detail.completedTokensInDepartment)}</dd>
          </dl>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(statusAction)}
        title={statusAction?.nextStatus === 'suspended' ? 'Suspend staff account' : 'Reactivate staff account'}
        description={
          statusAction?.nextStatus === 'suspended'
            ? 'The account will be signed out and blocked from staff APIs. Queue history and patient records are untouched.'
            : 'The account regains access to its hospital console.'
        }
        confirmLabel={statusAction?.nextStatus === 'suspended' ? 'Suspend account' : 'Reactivate account'}
        variant={statusAction?.nextStatus === 'suspended' ? 'danger' : 'success'}
        busy={statusMutation.isPending}
        error={actionError}
        onCancel={() => {
          setStatusAction(null);
          setReason('');
          setActionError('');
        }}
        onConfirm={submitStatus}
      >
        {statusAction?.nextStatus === 'suspended' && (
          <div className="admin-field">
            <label htmlFor="staff-suspend-reason">Reason (shown in the activity log)</label>
            <textarea
              id="staff-suspend-reason"
              className="admin-textarea"
              rows={3}
              maxLength={300}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        )}
      </ConfirmDialog>
    </>
  );
}
