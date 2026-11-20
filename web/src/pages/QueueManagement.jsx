import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { queueAPI, departmentAPI } from '../services/api';
import { getSocket, joinDepartmentQueue, leaveDepartmentQueue } from '../services/socket';

export default function QueueManagement() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const hospitalId = typeof user?.hospitalId === 'object' ? user.hospitalId._id : user?.hospitalId;

  // Load departments
  useEffect(() => {
    if (!hospitalId) return;
    departmentAPI.getDepartments(hospitalId)
      .then((res) => {
        const depts = res.data?.data || [];
        setDepartments(depts);
        if (depts.length > 0) {
          // If staff has an assigned department, select that by default
          const defaultDept = user?.departmentId
            ? depts.find((d) => d._id === (typeof user.departmentId === 'object' ? user.departmentId._id : user.departmentId))
            : depts[0];
          setSelectedDeptId(defaultDept ? defaultDept._id : depts[0]._id);
        }
      })
      .catch((err) => console.error('Error fetching departments:', err))
      .finally(() => setLoading(false));
  }, [hospitalId, user]);

  // Fetch queue data for selected department
  const fetchQueue = useCallback(async () => {
    if (!hospitalId || !selectedDeptId) return;
    try {
      const res = await queueAPI.getDepartmentQueue(hospitalId, selectedDeptId);
      setQueueData(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching department queue:', err);
    }
  }, [hospitalId, selectedDeptId]);

  useEffect(() => {
    if (!selectedDeptId) return;
    fetchQueue();

    joinDepartmentQueue(selectedDeptId);
    const socket = getSocket();
    const handleQueueUpdate = () => {
      fetchQueue();
    };

    socket.on('queue_updated', handleQueueUpdate);

    return () => {
      leaveDepartmentQueue(selectedDeptId);
      socket.off('queue_updated', handleQueueUpdate);
    };
  }, [selectedDeptId, fetchQueue]);

  // Operational Actions
  const handleCallNext = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await queueAPI.callNext(hospitalId, selectedDeptId);
      setActionMessage({ type: 'success', text: res.data?.data?.message || 'Patient called.' });
      await fetchQueue();
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.response?.data?.error || 'Failed to call next patient.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkServing = async (tokenId) => {
    setActionLoading(true);
    try {
      await queueAPI.markServing(tokenId);
      await fetchQueue();
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.response?.data?.error || 'Failed to update token.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkCompleted = async (tokenId) => {
    setActionLoading(true);
    try {
      await queueAPI.markCompleted(tokenId);
      await fetchQueue();
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.response?.data?.error || 'Failed to complete token.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkNoShow = async (tokenId) => {
    setActionLoading(true);
    try {
      await queueAPI.markNoShow(tokenId);
      await fetchQueue();
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.response?.data?.error || 'Failed to mark no-show.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading queue console...</div>;
  }

  const currentServing = queueData?.grouped?.serving?.[0] || null;
  const currentCalled = queueData?.grouped?.called?.[0] || null;
  const activeToken = currentServing || currentCalled;
  const waitingList = queueData?.grouped?.waiting || [];
  const completedList = queueData?.grouped?.completed || [];

  return (
    <div>
      {/* Header & Department Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-slate-900)', margin: '0 0 4px' }}>
            Live Queue Management
          </h1>
          <p style={{ margin: 0, color: 'var(--color-slate-500)' }}>
            Real-time outpatient token control for staff and clinical officers.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label htmlFor="dept-select" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-slate-700)' }}>
            Department:
          </label>
          <select
            id="dept-select"
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="form-control"
            style={{ width: '240px', padding: '8px 12px' }}
          >
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
          <button onClick={fetchQueue} className="btn btn-secondary" title="Refresh">
            ↻
          </button>
        </div>
      </div>

      {actionMessage && (
        <div style={{
          background: actionMessage.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
          color: actionMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Primary Action & Active Patient Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', marginBottom: '32px' }}>
        {/* Active Consultation Spotlight */}
        <div className="card" style={{ border: '2px solid var(--color-primary-light)', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Patient Currently At Counter / Consultation
            </span>
            {activeToken && (
              <span className={`badge ${activeToken.status === 'serving' ? 'badge-serving' : 'badge-called'}`}>
                {activeToken.status === 'serving' ? 'In Consultation' : 'Called (Waiting Entry)'}
              </span>
            )}
          </div>

          {activeToken ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '12px' }}>
                <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '-0.5px' }}>
                  {activeToken.tokenDisplay}
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
                    {activeToken.patientName}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>
                    Phone: {activeToken.patientPhone || 'Not provided'} {activeToken.notes ? `• Note: ${activeToken.notes}` : ''}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px', borderTop: '1px solid var(--color-slate-200)', paddingTop: '16px' }}>
                {activeToken.status === 'called' && (
                  <button
                    onClick={() => handleMarkServing(activeToken._id)}
                    disabled={actionLoading}
                    className="btn btn-primary"
                  >
                    Start Consultation
                  </button>
                )}
                <button
                  onClick={() => handleMarkCompleted(activeToken._id)}
                  disabled={actionLoading}
                  className="btn btn-success"
                >
                  ✓ Mark Treatment Complete
                </button>
                <button
                  onClick={() => handleMarkNoShow(activeToken._id)}
                  disabled={actionLoading}
                  className="btn btn-danger"
                >
                  ✕ Mark No-Show
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--color-slate-400)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏥</div>
              <p style={{ fontWeight: 600, color: 'var(--color-slate-600)' }}>No patient is currently called or in consultation.</p>
              <p style={{ fontSize: '0.85rem' }}>Click &quot;Call Next Patient&quot; to advance the virtual line.</p>
            </div>
          )}
        </div>

        {/* Call Next Patient Button Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', background: '#0f172a', color: '#ffffff' }}>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
            Queue Control
          </span>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#38bdf8', marginBottom: '4px' }}>
            {waitingList.length}
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '24px' }}>Patients waiting in line</p>

          <button
            onClick={handleCallNext}
            disabled={actionLoading || waitingList.length === 0}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '1rem',
              backgroundColor: waitingList.length === 0 ? '#475569' : '#0284c7',
              cursor: waitingList.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {actionLoading ? 'Calling...' : '📢 Call Next Patient'}
          </button>
        </div>
      </div>

      {/* Waiting List Table */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.15rem', color: 'var(--color-slate-900)' }}>
            Waiting Patients ({waitingList.length})
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>Strict sequential order</span>
        </div>

        {waitingList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-slate-400)' }}>
            All caught up! No patients waiting in the virtual queue.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Token</th>
                <th>Patient Name</th>
                <th>Phone</th>
                <th>Est. Wait</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {waitingList.map((token, idx) => (
                <tr key={token._id}>
                  <td style={{ fontWeight: 700, color: 'var(--color-slate-500)' }}>#{idx + 1}</td>
                  <td><span className="badge badge-waiting">{token.tokenDisplay}</span></td>
                  <td style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{token.patientName}</td>
                  <td>{token.patientPhone || '—'}</td>
                  <td>{token.estimatedWaitMinutes || 0} mins</td>
                  <td>
                    <button
                      onClick={() => handleMarkServing(token._id)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                    >
                      Serve Direct
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Completed Today Table */}
      {completedList.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', color: 'var(--color-slate-900)', marginBottom: '16px' }}>
            Completed Outpatients ({completedList.length})
          </h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient Name</th>
                <th>Completed At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {completedList.slice(-10).reverse().map((token) => (
                <tr key={token._id}>
                  <td><span className="badge badge-completed">{token.tokenDisplay}</span></td>
                  <td>{token.patientName}</td>
                  <td>{token.completedAt ? new Date(token.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td><span className="badge badge-serving">Completed</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
