import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { departmentAPI } from '../services/api';

const emptyForm = {
  name: '',
  code: '',
  floor: 'Ground Floor',
  roomNumber: '101',
  avgWaitMinutes: 15,
  maxTokensPerDay: 100,
  description: '',
};

export default function Departments() {
  const { activeHospitalId } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  // Removal flow
  const [removeTarget, setRemoveTarget] = useState(null);
  const [impact, setImpact] = useState(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactError, setImpactError] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [removing, setRemoving] = useState(false);

  const hospitalId = activeHospitalId;

  const fetchDepartments = useCallback(async () => {
    if (!hospitalId) return;
    try {
      setLoading(true);
      setLoadError('');
      const res = await departmentAPI.getDepartments(hospitalId);
      setDepartments(res.data?.data || []);
    } catch (err) {
      setLoadError(err.response?.data?.error || 'Failed to load departments.');
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

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
      setFormData(emptyForm);
      setNotice({ type: 'success', text: `${formData.name} was added.` });
      await fetchDepartments();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create department.');
    } finally {
      setSubmitting(false);
    }
  };

  const openRemove = async (dept) => {
    setRemoveTarget(dept);
    setImpact(null);
    setImpactError('');
    setConfirmCode('');
    setImpactLoading(true);
    try {
      const res = await departmentAPI.getDepartmentImpact(hospitalId, dept._id);
      setImpact(res.data?.data || null);
    } catch (err) {
      setImpactError(err.response?.data?.error || 'Failed to check this department’s records.');
    } finally {
      setImpactLoading(false);
    }
  };

  const closeRemove = () => {
    if (removing) return;
    setRemoveTarget(null);
    setImpact(null);
    setImpactError('');
    setConfirmCode('');
  };

  const handleRemove = async () => {
    if (!removeTarget || !impact) return;
    setRemoving(true);
    setImpactError('');
    try {
      const res = await departmentAPI.deleteDepartment(hospitalId, removeTarget._id);
      setNotice({
        type: 'success',
        text: res.data?.message || `${removeTarget.name} was removed.`,
      });
      setRemoveTarget(null);
      setImpact(null);
      setConfirmCode('');
      await fetchDepartments();
    } catch (err) {
      setImpactError(err.response?.data?.error || 'Failed to remove department.');
    } finally {
      setRemoving(false);
    }
  };

  const willDelete = impact?.recommendedAction === 'delete';
  const isBlocked = impact?.recommendedAction === 'blocked';
  const deleteConfirmed = !willDelete || confirmCode.trim().toUpperCase() === removeTarget?.code;

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

      {notice && (
        <div
          role="status"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            background: notice.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            color: notice.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '0.85rem',
            marginBottom: '16px',
          }}
        >
          <span>{notice.text}</span>
          <button
            onClick={() => setNotice(null)}
            aria-label="Dismiss message"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-slate-500)' }}>
            Loading hospital departments...
          </div>
        ) : loadError ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-danger)' }}>
            {loadError}{' '}
            <button onClick={fetchDepartments} className="btn btn-secondary" style={{ marginLeft: '12px' }}>
              Retry
            </button>
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
                <th style={{ textAlign: 'right' }}>Actions</th>
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
                  <td>
                    <span className={`badge ${dept.isActive === false ? 'badge-completed' : 'badge-serving'}`}>
                      {dept.isActive === false ? 'Archived' : 'Active'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => openRemove(dept)}
                      className="btn btn-danger"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      Remove
                    </button>
                  </td>
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

      {/* Remove Department Modal */}
      {removeTarget && (
        <div className="modal-overlay" onClick={closeRemove}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--color-slate-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-slate-900)' }}>
                Remove {removeTarget.name}?
              </h3>
              <button onClick={closeRemove} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '20px' }}>
              {impactLoading ? (
                <p style={{ margin: 0, color: 'var(--color-slate-500)' }}>Checking existing records...</p>
              ) : impactError && !impact ? (
                <div style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem' }}>
                  {impactError}
                </div>
              ) : impact ? (
                <>
                  <p style={{ marginTop: 0, color: 'var(--color-slate-600)', fontSize: '0.9rem' }}>
                    This department currently has:
                  </p>
                  <ul style={{ margin: '0 0 16px', paddingLeft: '20px', color: 'var(--color-slate-600)', fontSize: '0.9rem' }}>
                    <li>{impact.doctors} doctor{impact.doctors === 1 ? '' : 's'}</li>
                    <li>{impact.staff} staff member{impact.staff === 1 ? '' : 's'} assigned</li>
                    <li>{impact.issuedTokens} patient token{impact.issuedTokens === 1 ? '' : 's'} issued ({impact.activeTokens} active today)</li>
                    <li>{impact.queueRecords} queue record{impact.queueRecords === 1 ? '' : 's'}</li>
                  </ul>

                  {isBlocked ? (
                    <div style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem' }}>
                      {impact.activeTokens} token(s) are still active in today’s queue. Complete or cancel them before removing this department.
                    </div>
                  ) : willDelete ? (
                    <div style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem' }}>
                      No doctors, staff, tokens, or queue history reference this department, so it will be permanently deleted. This cannot be undone.
                    </div>
                  ) : (
                    <div style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem' }}>
                      This department has existing records, so it will be archived instead of deleted. It stops accepting new bookings, but every patient visit, token and queue record is preserved.
                    </div>
                  )}

                  {willDelete && !isBlocked && (
                    <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
                      <label className="form-label">
                        Type <strong>{removeTarget.code}</strong> to confirm permanent deletion
                      </label>
                      <input
                        type="text"
                        value={confirmCode}
                        onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
                        className="form-control"
                        autoFocus
                      />
                    </div>
                  )}

                  {impactError && (
                    <div style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', marginTop: '12px' }}>
                      {impactError}
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-slate-200)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" onClick={closeRemove} className="btn btn-secondary" disabled={removing}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="btn btn-danger"
                disabled={removing || impactLoading || !impact || isBlocked || !deleteConfirmed}
              >
                {removing ? 'Removing...' : willDelete ? 'Delete Permanently' : 'Archive Department'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
