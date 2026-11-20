import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { staffAPI, queueAPI, departmentAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeWaiting: 0,
    currentlyServing: 0,
    completedToday: 0,
    estimatedWaitTime: 0,
    avgConsultationMinutes: 15,
  });
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const statsRes = await staffAPI.getDashboardStats();
      if (statsRes.data?.data) {
        setStats(statsRes.data.data);
      }

      if (user?.hospitalId) {
        const hospitalId = typeof user.hospitalId === 'object' ? user.hospitalId._id : user.hospitalId;
        const [deptsRes, queueStatusRes] = await Promise.all([
          departmentAPI.getDepartments(hospitalId).catch(() => ({ data: { data: [] } })),
          queueAPI.getQueueStatus(hospitalId).catch(() => ({ data: { data: [] } })),
        ]);
        
        const deptsData = queueStatusRes.data?.data?.length > 0
          ? queueStatusRes.data.data
          : deptsRes.data?.data || [];
        setDepartments(deptsData);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Unable to load latest dashboard statistics. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();

    // Listen to real-time socket events
    const socket = getSocket();
    const handleQueueUpdate = () => {
      fetchDashboardData();
    };

    socket.on('queue_updated', handleQueueUpdate);
    return () => {
      socket.off('queue_updated', handleQueueUpdate);
    };
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <p style={{ color: 'var(--color-slate-500)', fontSize: '1rem' }}>Loading live operational data...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-slate-900)', marginBottom: '4px' }}>
            Hospital Dashboard
          </h1>
          <p style={{ color: 'var(--color-slate-500)', fontSize: '0.95rem' }}>
            {user?.hospitalId?.name || 'Central Facility'} &bull; Welcome back, {user?.name || 'Staff Officer'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={fetchDashboardData} className="btn btn-secondary">
            ↻ Refresh
          </button>
          <Link to="/queue" className="btn btn-primary">
            Open Queue Console &rarr;
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)', fontWeight: 600, textTransform: 'uppercase' }}>
            Active Waiting
          </span>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '8px' }}>
            {stats.activeWaiting}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-400)' }}>Patients currently in queue</span>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)', fontWeight: 600, textTransform: 'uppercase' }}>
            Currently Serving
          </span>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '8px' }}>
            {stats.currentlyServing}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-400)' }}>Consultation in progress</span>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-slate-600)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)', fontWeight: 600, textTransform: 'uppercase' }}>
            Completed Today
          </span>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-slate-700)', marginTop: '8px' }}>
            {stats.completedToday}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-400)' }}>Tokens successfully treated</span>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)', fontWeight: 600, textTransform: 'uppercase' }}>
            Est. Queue Wait
          </span>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '8px' }}>
            {stats.estimatedWaitTime} <span style={{ fontSize: '1rem', fontWeight: 500 }}>mins</span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-400)' }}>Based on ~{stats.avgConsultationMinutes || 15}m per patient</span>
        </div>
      </div>

      {/* Departments Overview */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--color-slate-900)' }}>Department Outpatient Status</h2>
          <span className="badge badge-waiting">Live Updates Active</span>
        </div>

        {departments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-slate-500)' }}>
            No departments configured yet. Go to the Departments tab to setup hospital clinics.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Code</th>
                <th>Active Waiting</th>
                <th>Now Serving</th>
                <th>Total Today</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept, idx) => {
                const name = dept.department?.name || dept.name || 'General';
                const code = dept.department?.code || dept.code || 'GEN';
                const waiting = dept.activeWaiting !== undefined ? dept.activeWaiting : '--';
                const serving = dept.currentlyServing?.tokenDisplay || 'None';
                const total = dept.totalIssued !== undefined ? dept.totalIssued : '--';

                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{name}</td>
                    <td><span className="badge badge-waiting">{code}</span></td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{waiting}</td>
                    <td>
                      <span className={`badge ${serving !== 'None' ? 'badge-serving' : 'badge-completed'}`}>
                        {serving}
                      </span>
                    </td>
                    <td>{total}</td>
                    <td>
                      <Link to="/queue" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                        Manage
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
