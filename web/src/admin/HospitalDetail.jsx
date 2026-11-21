import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import adminAPI from '../services/adminApi';
import HospitalForm from './components/HospitalForm';
import {
  Panel,
  StatCard,
  ErrorPanel,
  EmptyState,
  StatusBadge,
  RoleBadge,
  Loading,
  ConfirmDialog,
} from './components/UI';
import { formatDate, formatDateTime, formatNumber } from './format';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'departments', label: 'Departments' },
  { id: 'doctors', label: 'Doctors' },
  { id: 'people', label: 'Administrators & staff' },
  { id: 'patients', label: 'Patients' },
  { id: 'tokens', label: 'Recent tokens' },
];

export default function HospitalDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState('');
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-hospital', id],
    queryFn: async () => (await adminAPI.getHospital(id)).data.data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-hospital', id] });
    queryClient.invalidateQueries({ queryKey: ['admin-hospitals'] });
    queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    queryClient.invalidateQueries({ queryKey: ['admin-activity'] });
  };

  const updateMutation = useMutation({
    mutationFn: (payload) => adminAPI.updateHospital(id, payload),
    onSuccess: () => {
      setEditOpen(false);
      setEditError('');
      invalidate();
    },
    onError: (mutationError) => {
      const details = mutationError?.response?.data?.details;
      setEditError(
        Array.isArray(details)
          ? details.map((item) => item.message || item).join(' ')
          : mutationError?.response?.data?.error || 'Could not save the hospital.'
      );
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ type }) => {
      if (type === 'approve') return adminAPI.approveHospital(id);
      if (type === 'reject') return adminAPI.rejectHospital(id, reason.trim());
      if (type === 'activate') return adminAPI.setHospitalStatus(id, 'active', reason.trim());
      return adminAPI.setHospitalStatus(id, 'suspended', reason.trim());
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

  if (isLoading) {
    return (
      <>
        <Link to="/admin/hospitals" className="admin-back">
          ← All hospitals
        </Link>
        <Loading label="Loading hospital profile…" />
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Link to="/admin/hospitals" className="admin-back">
          ← All hospitals
        </Link>
        <ErrorPanel
          message={error?.response?.data?.error || 'Unable to load this hospital.'}
          onRetry={refetch}
        />
      </>
    );
  }

  const { hospital, stats, departments, doctors, admins, staff, patients, recentTokens } = data;
  const pending = !hospital.isVerified || hospital.status === 'pending';

  const actionCopy = {
    approve: {
      title: 'Approve hospital',
      description: 'Verifies and activates this hospital so patients can book tokens.',
      confirmLabel: 'Approve',
      variant: 'success',
    },
    reject: {
      title: 'Reject hospital',
      description: 'Suspends the hospital and clears its verified flag. Records are preserved.',
      confirmLabel: 'Reject',
      variant: 'danger',
    },
    suspend: {
      title: 'Suspend hospital',
      description: 'Stops new tokens at this hospital. Existing queues and history stay intact.',
      confirmLabel: 'Suspend',
      variant: 'danger',
    },
    activate: {
      title: 'Activate hospital',
      description: 'Restores this hospital and verifies it for online token booking.',
      confirmLabel: 'Activate',
      variant: 'success',
    },
  };

  const needsReason = action === 'reject' || action === 'suspend';
  const copy = action ? actionCopy[action] : null;

  const submitAction = () => {
    if (needsReason && reason.trim().length < 3) {
      setActionError('Please provide a short reason (at least 3 characters).');
      return;
    }
    actionMutation.mutate({ type: action });
  };

  return (
    <>
      <Link to="/admin/hospitals" className="admin-back">
        ← All hospitals
      </Link>

      <header className="admin-topbar">
        <div>
          <h2>{hospital.name}</h2>
          <p style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span>{hospital.code}</span>
            <StatusBadge status={pending ? 'pending' : hospital.status} />
            <span>·</span>
            <span>
              {hospital.address?.city}, {hospital.address?.state}
            </span>
            <span>·</span>
            <span>Registered {formatDate(hospital.createdAt)}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => {
              setEditError('');
              setEditOpen(true);
            }}
          >
            Edit details
          </button>
          {pending ? (
            <>
              <button
                type="button"
                className="admin-btn admin-btn-sm admin-btn-success"
                onClick={() => {
                  setAction('approve');
                  setReason('');
                  setActionError('');
                }}
              >
                Approve
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-sm admin-btn-danger"
                onClick={() => {
                  setAction('reject');
                  setReason('');
                  setActionError('');
                }}
              >
                Reject
              </button>
            </>
          ) : hospital.status === 'suspended' ? (
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-success"
              onClick={() => {
                setAction('activate');
                setReason('');
                setActionError('');
              }}
            >
              Activate
            </button>
          ) : (
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-warn"
              onClick={() => {
                setAction('suspend');
                setReason('');
                setActionError('');
              }}
            >
              Suspend
            </button>
          )}
          <button type="button" className="admin-btn admin-btn-sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </header>

      <div className="admin-stat-grid">
        <StatCard label="Tokens (all time)" value={formatNumber(stats.total)} meta={`${formatNumber(stats.today)} today`} />
        <StatCard label="Completed" value={formatNumber(stats.completed)} meta="Patients treated" accent="linear-gradient(90deg,#34d399,transparent 70%)" />
        <StatCard label="Waiting" value={formatNumber(stats.waiting)} meta="In queue right now" accent="linear-gradient(90deg,#38bdf8,transparent 70%)" />
        <StatCard label="Serving" value={formatNumber(stats.serving)} meta="Called or consulting" />
        <StatCard label="Cancelled" value={formatNumber(stats.cancelled)} meta="Patient cancellations" accent="linear-gradient(90deg,#f87171,transparent 70%)" />
        <StatCard label="No-show" value={formatNumber(stats['no-show'])} meta="Missed tokens" />
      </div>

      <div className="admin-tabs" style={{ marginTop: 18 }}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`admin-tab ${tab === item.id ? 'active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.id === 'departments' && ` (${departments.length})`}
            {item.id === 'doctors' && ` (${doctors.length})`}
            {item.id === 'people' && ` (${admins.length + staff.length})`}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="admin-detail-grid">
          <Panel title="Hospital information">
            <dl className="admin-kv">
              <dt>Status</dt>
              <dd>
                <StatusBadge status={pending ? 'pending' : hospital.status} />{' '}
                {hospital.isVerified ? 'Verified' : 'Not verified'}
              </dd>
              <dt>Registered</dt>
              <dd>{formatDateTime(hospital.createdAt)}</dd>
              <dt>Phone</dt>
              <dd>{hospital.phone || '—'}</dd>
              <dt>Email</dt>
              <dd>{hospital.email || '—'}</dd>
              <dt>Website</dt>
              <dd>
                {hospital.website ? (
                  <a href={hospital.website} target="_blank" rel="noreferrer" style={{ color: '#9adaff' }}>
                    {hospital.website}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
              <dt>Address</dt>
              <dd>
                {[hospital.address?.street, hospital.address?.city, hospital.address?.state, hospital.address?.zipCode, hospital.address?.country]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </dd>
              <dt>Description</dt>
              <dd>{hospital.description || '—'}</dd>
            </dl>
          </Panel>

          <Panel title="Facility settings">
            <dl className="admin-kv">
              <dt>Opening hours</dt>
              <dd>
                {hospital.settings?.openTime || '—'} – {hospital.settings?.closeTime || '—'}
              </dd>
              <dt>Daily token cap</dt>
              <dd>{formatNumber(hospital.settings?.maxTokensPerDay)}</dd>
              <dt>Avg consultation</dt>
              <dd>{hospital.settings?.avgConsultationMinutes || '—'} minutes</dd>
              <dt>Online booking</dt>
              <dd>{hospital.settings?.allowOnlineBooking ? 'Enabled' : 'Disabled'}</dd>
              <dt>Departments</dt>
              <dd>{formatNumber(departments.length)}</dd>
              <dt>Doctors</dt>
              <dd>{formatNumber(doctors.length)}</dd>
              <dt>Hospital admins</dt>
              <dd>{formatNumber(admins.length)}</dd>
              <dt>Other staff</dt>
              <dd>{formatNumber(staff.length)}</dd>
            </dl>
          </Panel>
        </div>
      )}

      {tab === 'departments' && (
        <Panel title="Departments" subtitle="Queue statistics per department">
          {departments.length === 0 ? (
            <EmptyState title="No departments yet">
              This hospital has not configured any outpatient departments.
            </EmptyState>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Floor / room</th>
                    <th>Status</th>
                    <th className="admin-numeric">Today</th>
                    <th className="admin-numeric">Total</th>
                    <th className="admin-numeric">Waiting</th>
                    <th className="admin-numeric">Serving</th>
                    <th className="admin-numeric">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((department) => (
                    <tr key={department._id}>
                      <td>
                        <span className="admin-cell-strong">{department.name}</span>
                        <div className="admin-cell-muted">{department.code}</div>
                      </td>
                      <td>
                        {department.floor || '—'}
                        <div className="admin-cell-muted">Room {department.roomNumber || '—'}</div>
                      </td>
                      <td>
                        <StatusBadge status={department.isActive ? 'active' : 'suspended'} />
                      </td>
                      <td className="admin-numeric">{formatNumber(department.stats.today)}</td>
                      <td className="admin-numeric">{formatNumber(department.stats.total)}</td>
                      <td className="admin-numeric">{formatNumber(department.stats.waiting)}</td>
                      <td className="admin-numeric">{formatNumber(department.stats.serving)}</td>
                      <td className="admin-numeric">{formatNumber(department.stats.completed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {tab === 'doctors' && (
        <Panel title="Doctors" subtitle="Consultants registered for this hospital">
          {doctors.length === 0 ? (
            <EmptyState title="No doctors listed">Doctors added by hospital staff appear here.</EmptyState>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Specialisation</th>
                    <th>Qualification</th>
                    <th>Department</th>
                    <th>Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doctor) => (
                    <tr key={doctor._id}>
                      <td className="admin-cell-strong">{doctor.name}</td>
                      <td>{doctor.specialization}</td>
                      <td>{doctor.qualification || '—'}</td>
                      <td>{doctor.departmentId?.name || '—'}</td>
                      <td>
                        <StatusBadge status={doctor.isAvailable ? 'active' : 'suspended'} />
                        <div className="admin-cell-muted">{(doctor.availableDays || []).join(', ')}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {tab === 'people' && (
        <div className="admin-section-stack">
          <Panel title="Hospital administrators" subtitle="Managerial accounts for this hospital">
            {admins.length === 0 ? (
              <EmptyState title="No hospital administrators">
                Invite one from the hospital staff console.
              </EmptyState>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Last login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((person) => (
                      <tr key={person._id}>
                        <td className="admin-cell-strong">{person.name}</td>
                        <td>{person.email}</td>
                        <td>{person.departmentId?.name || '—'}</td>
                        <td>
                          <StatusBadge status={person.status || 'active'} />
                        </td>
                        <td>{formatDateTime(person.lastLoginAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Hospital staff" subtitle="Doctors, nurses and reception accounts">
            {staff.length === 0 ? (
              <EmptyState title="No staff accounts">Staff invited to this hospital appear here.</EmptyState>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Last login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((person) => (
                      <tr key={person._id}>
                        <td className="admin-cell-strong">{person.name}</td>
                        <td>{person.email}</td>
                        <td>
                          <RoleBadge role={person.role} staffRole={person.staffRole} />
                        </td>
                        <td>{person.departmentId?.name || '—'}</td>
                        <td>
                          <StatusBadge status={person.status || 'active'} />
                        </td>
                        <td>{formatDateTime(person.lastLoginAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {tab === 'patients' && (
        <Panel title="Recent patients" subtitle="Patients with a token at this hospital (latest 50)">
          {patients.length === 0 ? (
            <EmptyState title="No patient activity">Patients who book tokens here will show up in this list.</EmptyState>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th className="admin-numeric">Tokens</th>
                    <th className="admin-numeric">Completed</th>
                    <th>Last visit</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.patientId}>
                      <td>
                        <Link to={`/admin/patients?focus=${patient.patientId}`} className="admin-cell-strong">
                          {patient.name}
                        </Link>
                      </td>
                      <td>{patient.email || '—'}</td>
                      <td>{patient.phone || '—'}</td>
                      <td>
                        <StatusBadge status={patient.status || 'active'} />
                      </td>
                      <td className="admin-numeric">{formatNumber(patient.tokens)}</td>
                      <td className="admin-numeric">{formatNumber(patient.completed)}</td>
                      <td>{formatDateTime(patient.lastVisit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {tab === 'tokens' && (
        <Panel title="Recent tokens" subtitle="Latest 25 tokens at this hospital. Clinical notes are never shown.">
          {recentTokens.length === 0 ? (
            <EmptyState title="No tokens yet">Token activity at this hospital will appear here.</EmptyState>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Patient</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTokens.map((token) => (
                    <tr key={token._id}>
                      <td className="admin-cell-strong">{token.tokenDisplay}</td>
                      <td>
                        {token.patientName || token.patientId?.name || '—'}
                        <div className="admin-cell-muted">{token.patientPhone || token.patientId?.phone || ''}</div>
                      </td>
                      <td>{token.departmentId?.name || '—'}</td>
                      <td>
                        <StatusBadge status={token.status} />
                      </td>
                      <td>{formatDate(token.date || token.createdAt)}</td>
                      <td>{formatDateTime(token.completedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      <HospitalForm
        open={editOpen}
        hospital={hospital}
        busy={updateMutation.isPending}
        error={editError}
        onClose={() => setEditOpen(false)}
        onSubmit={(payload) => updateMutation.mutate(payload)}
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
        {needsReason && (
          <div className="admin-field">
            <label htmlFor="hospital-action-reason">Reason (stored in the activity log)</label>
            <textarea
              id="hospital-action-reason"
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
