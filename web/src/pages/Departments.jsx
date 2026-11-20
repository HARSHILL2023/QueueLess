import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { departmentAPI } from '../services/api';

export default function Departments() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    floor: 'Ground Floor',
    roomNumber: '101',
    avgWaitMinutes: 15,
    maxTokensPerDay: 100,
    description: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hospitalId = typeof user?.hospitalId === 'object' ? user.hospitalId._id : user?.hospitalId;

  const fetchDepartments = useCallback(async () => {
    if (!hospitalId) return;
    try {
      setLoading(true);
      const res = await departmentAPI.getDepartments(hospitalId);
      setDepartments(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await departmentAPI.createDepartment(hospitalId, {
        ...formData,
        avgWaitMinutes: Number(formData.avgWaitMinutes),
        maxTokensPerDay: Number(formData.maxTokensPerDay),
      });
      setShowAddModal(false);
      setFormData({
        name: '',
        code: '',
        floor: 'Ground Floor',
        roomNumber: '101',
        avgWaitMinutes: 15,
        maxTokensPerDay: 100,
        description: '',
      });
      await fetchDepartments();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create department.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-slate-900)', margin: '0 0 4px' }}>Departments & Clinics</h1>
          <p style={{ margin: 0, color: 'var(--color-slate-500)' }}>
            Configure outpatient clinics, consultation rooms, and wait time benchmarks.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          + Add Department
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-slate-500)' }}>
            Loading hospital departments...
          </div>
        ) : departments.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-slate-500)' }}>
            No departments found. Click &quot;+ Add Department&quot; to create your first clinical department.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Code</th>
                <th>Location</th>
                <th>Avg Wait Time</th>
                <th>Daily Limit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept._id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{dept.name}</td>
                  <td><span className="badge badge-waiting">{dept.code}</span></td>
                  <td>{dept.floor}, Room {dept.roomNumber}</td>
                  <td>{dept.avgWaitMinutes} mins</td>
                  <td>{dept.maxTokensPerDay} tokens</td>
                  <td><span className="badge badge-serving">Active</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Department Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--color-slate-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-slate-900)' }}>Add New Department</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '20px' }}>
              {formError && (
                <div style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>
                  {formError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cardiology"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Code Prefix</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="e.g. CARD"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Floor</label>
                  <input
                    type="text"
                    placeholder="e.g. 2nd Floor"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Room Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 204"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Avg Wait Time (Mins)</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={formData.avgWaitMinutes}
                    onChange={(e) => setFormData({ ...formData, avgWaitMinutes: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Max Tokens / Day</label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxTokensPerDay}
                  onChange={(e) => setFormData({ ...formData, maxTokensPerDay: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Creating...' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
