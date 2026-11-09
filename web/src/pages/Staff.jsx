import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { staffManagementAPI, departmentAPI } from '../services/api';

export default function Staff() {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDept, setInviteDept] = useState('');
  const [inviteRole, setInviteRole] = useState('doctor');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const hospitalId = typeof user?.hospitalId === 'object' ? user.hospitalId._id : user?.hospitalId;

  const fetchStaffData = useCallback(async () => {
    if (!hospitalId) return;
    try {
      setLoading(true);
      const [staffRes, deptRes] = await Promise.all([
        staffManagementAPI.getStaff(hospitalId),
        departmentAPI.getDepartments(hospitalId),
      ]);
      setStaffList(staffRes.data?.data?.staff || []);
      setInvitations(staffRes.data?.data?.invitations || []);
      setDepartments(deptRes.data?.data || []);
      if (deptRes.data?.data?.length > 0) {
        setInviteDept(deptRes.data.data[0]._id);
      }
    } catch (err) {
      console.error('Error fetching staff data:', err);
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    fetchStaffData();
  }, [fetchStaffData]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      await staffManagementAPI.inviteStaff(hospitalId, {
        email: inviteEmail,
        departmentId: inviteDept || undefined,
        staffRole: inviteRole,
        role: 'staff',
      });
      setShowInviteModal(false);
      setInviteEmail('');
      setFeedback({ type: 'success', text: `Invitation generated for ${inviteEmail}` });
      await fetchStaffData();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.response?.data?.error || 'Failed to send invitation.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (invitationId) => {
    try {
      await staffManagementAPI.revokeInvitation(hospitalId, invitationId);
      await fetchStaffData();
    } catch (err) {
      console.error('Failed to revoke invitation:', err);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-slate-900)', margin: '0 0 4px' }}>Staff & Clinical Team</h1>
          <p style={{ margin: 0, color: 'var(--color-slate-500)' }}>
            Manage doctors, nurses, triage officers, and department permissions.
          </p>
        </div>
        <button onClick={() => setShowInviteModal(true)} className="btn btn-primary">
          + Invite Staff Member
        </button>
      </div>

      {feedback && (
        <div style={{
          background: feedback.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
          color: feedback.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          {feedback.text}
        </div>
      )}

      {/* Staff Directory Table */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--color-slate-900)', marginBottom: '16px' }}>Active Staff Directory</h2>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-slate-500)' }}>Loading staff...</div>
        ) : staffList.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-slate-500)' }}>No staff members registered.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((member) => (
                <tr key={member._id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{member.name}</td>
                  <td>{member.email}</td>
                  <td>
                    <span className="badge badge-waiting">
                      {member.staffRole || member.role}
                    </span>
                  </td>
                  <td>{member.departmentId?.name || 'All Hospital Departments'}</td>
                  <td>{new Date(member.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pending Invitations Table */}
      {invitations.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '1.2rem', color: 'var(--color-slate-900)', marginBottom: '16px' }}>Pending Invitations ({invitations.length})</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invited Email</th>
                <th>Assigned Role</th>
                <th>Department</th>
                <th>Expires</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv._id}>
                  <td style={{ fontWeight: 600 }}>{inv.email}</td>
                  <td><span className="badge badge-called">{inv.staffRole}</span></td>
                  <td>{inv.departmentId?.name || 'All'}</td>
                  <td>{new Date(inv.expiresAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      onClick={() => handleRevoke(inv._id)}
                      className="btn btn-danger"
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--color-slate-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-slate-900)' }}>Invite Hospital Staff</h3>
              <button onClick={() => setShowInviteModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleInvite} style={{ padding: '20px' }}>
              <div className="form-group">
                <label className="form-label">Staff Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="doctor@hospital.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role Title</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="form-control"
                >
                  <option value="doctor">Consulting Doctor</option>
                  <option value="nurse">Clinical Nurse</option>
                  <option value="receptionist">Triage / Receptionist</option>
                  <option value="admin">Hospital Administrator</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Department</label>
                <select
                  value={inviteDept}
                  onChange={(e) => setInviteDept(e.target.value)}
                  className="form-control"
                >
                  <option value="">All Departments (General)</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowInviteModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Generating...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
