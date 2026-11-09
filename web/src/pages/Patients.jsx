import { useState, useEffect, useCallback } from 'react';
import { patientAPI } from '../services/api';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await patientAPI.getPatients({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setPatients(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'waiting':
        return <span className="badge badge-waiting">Waiting</span>;
      case 'called':
        return <span className="badge badge-called">Called</span>;
      case 'serving':
        return <span className="badge badge-serving">Serving</span>;
      case 'completed':
        return <span className="badge badge-completed">Completed</span>;
      case 'cancelled':
        return <span className="badge badge-danger">Cancelled</span>;
      case 'no-show':
        return <span className="badge badge-danger">No Show</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-slate-900)', margin: '0 0 4px' }}>Patients Directory</h1>
          <p style={{ margin: 0, color: 'var(--color-slate-500)' }}>
            Real-time outpatient records and booked token tracking.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              placeholder="Search by patient name, phone, or token (e.g. CARD-001)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control"
            />
          </div>

          <div style={{ width: '180px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control"
            >
              <option value="">All Statuses</option>
              <option value="waiting">Waiting</option>
              <option value="called">Called</option>
              <option value="serving">Serving</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No Show</option>
            </select>
          </div>

          <button onClick={fetchPatients} className="btn btn-secondary">
            Apply Filters
          </button>
        </div>
      </div>

      {/* Patients Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-slate-500)' }}>
            Loading patient records...
          </div>
        ) : patients.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-slate-500)' }}>
            No patient bookings match your filter criteria.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient Name</th>
                <th>Phone</th>
                <th>Department</th>
                <th>Status</th>
                <th>Wait Time</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p._id}>
                  <td><span className="badge badge-waiting">{p.tokenDisplay}</span></td>
                  <td style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{p.patientName}</td>
                  <td>{p.patientPhone || '—'}</td>
                  <td>{p.departmentId?.name || 'General Clinic'}</td>
                  <td>{getStatusBadge(p.status)}</td>
                  <td>{p.estimatedWaitMinutes || 0} mins</td>
                  <td>
                    <button
                      onClick={() => setSelectedPatient(p)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="modal-overlay" onClick={() => setSelectedPatient(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--color-slate-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-slate-900)' }}>
                Token Record Details
              </h3>
              <button onClick={() => setSelectedPatient(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>Token Display</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>{selectedPatient.tokenDisplay}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>Status</span>
                  <div>{getStatusBadge(selectedPatient.status)}</div>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>Patient Name</span>
                <div style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{selectedPatient.patientName}</div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>Department</span>
                <div>{selectedPatient.departmentId?.name || 'General Clinic'} ({selectedPatient.departmentId?.code || 'GEN'})</div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>Contact Phone</span>
                <div>{selectedPatient.patientPhone || 'Not provided'}</div>
              </div>

              {selectedPatient.notes && (
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>Patient Notes</span>
                  <div style={{ background: 'var(--color-slate-100)', padding: '10px', borderRadius: '6px', fontSize: '0.9rem' }}>
                    {selectedPatient.notes}
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--color-slate-200)', paddingTop: '12px', fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
                <div>Booked Date: {selectedPatient.date}</div>
                {selectedPatient.calledAt && <div>Called At: {new Date(selectedPatient.calledAt).toLocaleTimeString()}</div>}
                {selectedPatient.servedAt && <div>Served At: {new Date(selectedPatient.servedAt).toLocaleTimeString()}</div>}
                {selectedPatient.completedAt && <div>Completed At: {new Date(selectedPatient.completedAt).toLocaleTimeString()}</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
