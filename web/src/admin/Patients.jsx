import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '../services/adminApi';
import {
  Panel,
  Pagination,
  ErrorPanel,
  EmptyState,
  StatusBadge,
  Loading,
  Modal,
  ConfirmDialog,
} from './components/UI';
import { formatDate, formatDateTime, formatNumber } from './format';

export default function Patients() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [focusId, setFocusId] = useState(searchParams.get('focus') || null);

  const [statusAction, setStatusAction] = useState(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (focusId) setSearchParams({ focus: focusId }, { replace: true });
  }, [focusId, setSearchParams]);

  const listQuery = useQuery({
    queryKey: ['admin-patients', { search, status, page }],
    queryFn: async () =>
      (
        await adminAPI.getPatients({
          search: search.trim() || undefined,
          status: status || undefined,
          page,
          limit: 20,
        })
      ).data.data,
  });

  const detailQuery = useQuery({
    queryKey: ['admin-patient', focusId],
    queryFn: async () => (await adminAPI.getPatient(focusId)).data.data,
    enabled: Boolean(focusId),
  });

  const statusMutation = useMutation({
    mutationFn: ({ patient, nextStatus, reason: actionReason }) =>
      adminAPI.setUserStatus(patient._id, nextStatus, actionReason),
    onSuccess: () => {
      setStatusAction(null);
      setReason('');
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['admin-patients'] });
      queryClient.invalidateQueries({ queryKey: ['admin-patient', focusId] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-activity'] });
    },
    onError: (mutationError) => {
      setActionError(
        mutationError?.response?.data?.error || 'The account status could not be changed.'
      );
    },
  });

  const patients = listQuery.data?.items || [];
  const detail = detailQuery.data;

  const closeDetail = () => {
    setFocusId(null);
    setSearchParams({}, { replace: true });
  };

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
          <h2>Patients</h2>
          <p>Every registered patient account, with visit and token history.</p>
        </div>
      </header>

      <Panel
        title="Patient directory"
        subtitle={listQuery.data ? `${formatNumber(listQuery.data.pagination.total)} patients` : 'Loading…'}
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
            aria-label="Search patients"
          />
          <select
            className="admin-select"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter patients by status"
          >
            <option value="">All accounts</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {listQuery.isError && (
          <ErrorPanel
            message={listQuery.error?.response?.data?.error || 'Unable to load patients.'}
            onRetry={listQuery.refetch}
          />
        )}

        {listQuery.isLoading && <Loading label="Loading patients…" />}

        {!listQuery.isLoading && !listQuery.isError && patients.length === 0 && (
          <EmptyState title="No patients found">Try a different search term or account status.</EmptyState>
        )}

        {patients.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Contact</th>
                  <th>Registered</th>
                  <th>Account</th>
                  <th className="admin-numeric">Tokens</th>
                  <th className="admin-numeric">Completed</th>
                  <th className="admin-numeric">Cancelled</th>
                  <th className="admin-numeric">No-show</th>
                  <th>Last activity</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient._id}>
                    <td>
                      <span className="admin-cell-strong">{patient.name}</span>
                      <div className="admin-cell-muted">{patient.email}</div>
                    </td>
                    <td>{patient.phone || '—'}</td>
                    <td>{formatDate(patient.createdAt)}</td>
                    <td>
                      <StatusBadge status={patient.status || 'active'} />
                    </td>
                    <td className="admin-numeric">{formatNumber(patient.stats.totalTokens)}</td>
                    <td className="admin-numeric">{formatNumber(patient.stats.completedTokens)}</td>
                    <td className="admin-numeric">{formatNumber(patient.stats.cancelledTokens)}</td>
                    <td className="admin-numeric">{formatNumber(patient.stats.noShowTokens)}</td>
                    <td>{formatDate(patient.stats.lastActivity)}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn-sm"
                        onClick={() => setFocusId(patient._id)}
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

        {listQuery.data && patients.length > 0 && (
          <Pagination pagination={listQuery.data.pagination} onPage={setPage} />
        )}
      </Panel>

      <Modal
        open={Boolean(focusId)}
        title={detail?.patient?.name || 'Patient profile'}
        onClose={closeDetail}
        width="760px"
        footer={
          <>
            <button type="button" className="admin-btn" onClick={closeDetail}>
              Close
            </button>
            {detail?.patient && (
              <button
                type="button"
                className={`admin-btn ${
                  detail.patient.status === 'suspended' ? 'admin-btn-success' : 'admin-btn-danger'
                }`}
                onClick={() => {
                  setActionError('');
                  setReason('');
                  setStatusAction({
                    patient: detail.patient,
                    nextStatus: detail.patient.status === 'suspended' ? 'active' : 'suspended',
                  });
                }}
              >
                {detail.patient.status === 'suspended' ? 'Reactivate account' : 'Suspend account'}
              </button>
            )}
          </>
        }
      >
        {detailQuery.isLoading && <Loading label="Loading patient profile…" />}

        {detailQuery.isError && (
          <ErrorPanel
            message={detailQuery.error?.response?.data?.error || 'Unable to load this patient.'}
            onRetry={detailQuery.refetch}
          />
        )}

        {detail && (
          <div className="admin-section-stack">
            <div>
              <dl className="admin-kv">
                <dt>Email</dt>
                <dd>{detail.patient.email}</dd>
                <dt>Phone</dt>
                <dd>{detail.patient.phone || '—'}</dd>
                <dt>Account status</dt>
                <dd>
                  <StatusBadge status={detail.patient.status || 'active'} />{' '}
                  {detail.patient.status === 'suspended' && detail.patient.suspendedReason
                    ? `— ${detail.patient.suspendedReason}`
                    : ''}
                </dd>
                <dt>Registered</dt>
                <dd>{formatDateTime(detail.patient.createdAt)}</dd>
                <dt>Last login</dt>
                <dd>{formatDateTime(detail.patient.lastLoginAt)}</dd>
              </dl>
            </div>

            <div className="admin-mini-grid">
              <div className="admin-mini">
                <span>Tokens</span>
                <strong>{formatNumber(detail.stats.total)}</strong>
              </div>
              <div className="admin-mini">
                <span>Completed</span>
                <strong>{formatNumber(detail.stats.completed)}</strong>
              </div>
              <div className="admin-mini">
                <span>Cancelled</span>
                <strong>{formatNumber(detail.stats.cancelled)}</strong>
              </div>
              <div className="admin-mini">
                <span>No-show</span>
                <strong>{formatNumber(detail.stats['no-show'])}</strong>
              </div>
            </div>

            <div>
              <div className="admin-panel-title" style={{ marginBottom: 8 }}>
                Hospitals visited
              </div>
              {detail.hospitalsVisited.length === 0 ? (
                <EmptyState title="No hospital visits yet" />
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table" style={{ minWidth: 420 }}>
                    <thead>
                      <tr>
                        <th>Hospital</th>
                        <th>City</th>
                        <th className="admin-numeric">Tokens</th>
                        <th className="admin-numeric">Completed</th>
                        <th>Last visit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.hospitalsVisited.map((hospital) => (
                        <tr key={hospital.hospitalId}>
                          <td className="admin-cell-strong">{hospital.name}</td>
                          <td>{hospital.city || '—'}</td>
                          <td className="admin-numeric">{formatNumber(hospital.tokens)}</td>
                          <td className="admin-numeric">{formatNumber(hospital.completed)}</td>
                          <td>{formatDate(hospital.lastVisit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <div className="admin-panel-title" style={{ marginBottom: 8 }}>
                Department visits
              </div>
              {detail.departmentVisits.length === 0 ? (
                <EmptyState title="No department visits yet" />
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table" style={{ minWidth: 420 }}>
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th className="admin-numeric">Tokens</th>
                        <th className="admin-numeric">Completed</th>
                        <th>Last visit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.departmentVisits.map((department) => (
                        <tr key={`${department.departmentId}-${department.name}`}>
                          <td>
                            <span className="admin-cell-strong">{department.name}</span>
                            <div className="admin-cell-muted">{department.code}</div>
                          </td>
                          <td className="admin-numeric">{formatNumber(department.tokens)}</td>
                          <td className="admin-numeric">{formatNumber(department.completed)}</td>
                          <td>{formatDate(department.lastVisit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <div className="admin-panel-title" style={{ marginBottom: 8 }}>
                Token history (latest 50)
              </div>
              {detail.tokens.length === 0 ? (
                <EmptyState title="No tokens booked yet" />
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table" style={{ minWidth: 520 }}>
                    <thead>
                      <tr>
                        <th>Token</th>
                        <th>Hospital</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.tokens.map((token) => (
                        <tr key={token._id}>
                          <td className="admin-cell-strong">{token.tokenDisplay}</td>
                          <td>{token.hospitalId?.name || '—'}</td>
                          <td>{token.departmentId?.name || '—'}</td>
                          <td>
                            <StatusBadge status={token.status} />
                          </td>
                          <td>{formatDate(token.date || token.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(statusAction)}
        title={statusAction?.nextStatus === 'suspended' ? 'Suspend patient account' : 'Reactivate patient account'}
        description={
          statusAction?.nextStatus === 'suspended'
            ? 'The patient will be signed out and blocked from logging in or booking tokens. Their history is preserved.'
            : 'The patient regains access and can book tokens again.'
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
            <label htmlFor="patient-suspend-reason">Reason (shown in the activity log)</label>
            <textarea
              id="patient-suspend-reason"
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
