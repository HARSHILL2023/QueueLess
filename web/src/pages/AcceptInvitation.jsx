import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { invitationAPI } from '../services/api';

const roleLabels = {
  doctor: 'Consulting Doctor',
  nurse: 'Clinical Nurse',
  receptionist: 'Triage / Receptionist',
  admin: 'Hospital Administrator',
  staff: 'Clinical Staff',
};

export default function AcceptInvitation() {
  const { token } = useParams();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let active = true;

    invitationAPI
      .getInvitation(token)
      .then((res) => {
        if (active) setInvitation(res.data?.data || null);
      })
      .catch((err) => {
        if (active) setLoadError(err.response?.data?.error || 'This invitation link is invalid.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await invitationAPI.acceptInvitation(token, { name: name.trim(), password });
      const { token: accessToken, refreshToken } = res.data.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      window.location.assign('/dashboard');
    } catch (err) {
      setFormError(err.response?.data?.error || 'Unable to accept this invitation.');
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      fontFamily: 'var(--font-sans)',
      padding: '16px',
    }}>
      <div style={{
        background: '#ffffff',
        padding: '36px',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#e0f2fe',
            color: '#0284c7',
            fontSize: '1.5rem',
            marginBottom: '12px',
          }}>
            ⚡
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            Join QueueLess Staff
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Accept your hospital invitation to access the queue console.
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
            Validating invitation…
          </div>
        )}

        {!loading && loadError && (
          <div>
            <div style={{
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              marginBottom: '16px',
            }}>
              {loadError}
            </div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center' }}>
              Ask your hospital administrator for a new invitation, or{' '}
              <Link to="/login" style={{ color: '#0284c7', fontWeight: 600 }}>sign in</Link>.
            </p>
          </div>
        )}

        {!loading && !loadError && invitation && (
          <>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '14px 16px',
              marginBottom: '20px',
            }}>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600 }}>
                Invitation for
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                {invitation.email}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '8px' }}>
                <strong>{invitation.hospitalName}</strong>
                {invitation.departmentName ? ` • ${invitation.departmentName}` : ' • All departments'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '2px' }}>
                Role: {roleLabels[invitation.staffRole] || invitation.staffRole}
              </div>
            </div>

            {formError && (
              <div style={{
                background: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                marginBottom: '16px',
              }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Your Name"
                  className="form-control"
                />
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                  Required for new accounts. Leave blank if you already have an account.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder={name ? 'Create a password (6+ characters)' : 'Your existing password'}
                  className="form-control"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', marginTop: '4px' }}
              >
                {submitting ? 'Joining hospital…' : 'Accept Invitation'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
