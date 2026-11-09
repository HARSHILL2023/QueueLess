import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { hospitalAPI } from '../services/api';

export default function Settings() {
  const { user } = useAuth();
  const [hospital, setHospital] = useState(null);
  const [settings, setSettings] = useState({
    openTime: '08:00',
    closeTime: '20:00',
    maxTokensPerDay: 200,
    avgConsultationMinutes: 15,
    allowOnlineBooking: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const hospitalId = typeof user?.hospitalId === 'object' ? user.hospitalId._id : user?.hospitalId;

  useEffect(() => {
    if (!hospitalId) return;
    hospitalAPI.getHospital(hospitalId)
      .then((res) => {
        setHospital(res.data?.data || null);
        if (res.data?.data?.settings) {
          setSettings(res.data.data.settings);
        }
      })
      .catch((err) => console.error('Failed to load hospital settings:', err))
      .finally(() => setLoading(false));
  }, [hospitalId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await hospitalAPI.updateSettings(hospitalId, {
        ...settings,
        maxTokensPerDay: Number(settings.maxTokensPerDay),
        avgConsultationMinutes: Number(settings.avgConsultationMinutes),
      });
      setFeedback({ type: 'success', text: 'Hospital settings saved successfully.' });
    } catch (err) {
      setFeedback({ type: 'danger', text: err.response?.data?.error || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading settings...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-slate-900)', margin: '0 0 4px' }}>Hospital Settings</h1>
        <p style={{ margin: 0, color: 'var(--color-slate-500)' }}>
          Manage operating hours, daily token caps, and virtual queue policies.
        </p>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Operating Rules Form */}
        <div className="card">
          <h2 style={{ fontSize: '1.2rem', color: 'var(--color-slate-900)', marginBottom: '16px' }}>Virtual Queue Rules</h2>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">OPD Opening Time</label>
                <input
                  type="time"
                  value={settings.openTime}
                  onChange={(e) => setSettings({ ...settings, openTime: e.target.value })}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label className="form-label">OPD Closing Time</label>
                <input
                  type="time"
                  value={settings.closeTime}
                  onChange={(e) => setSettings({ ...settings, closeTime: e.target.value })}
                  className="form-control"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Max Online Tokens / Day (Hospital-wide)</label>
              <input
                type="number"
                min="1"
                value={settings.maxTokensPerDay}
                onChange={(e) => setSettings({ ...settings, maxTokensPerDay: e.target.value })}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default Consultation Duration (Mins)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={settings.avgConsultationMinutes}
                onChange={(e) => setSettings({ ...settings, avgConsultationMinutes: e.target.value })}
                className="form-control"
              />
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
              <input
                type="checkbox"
                id="allowOnline"
                checked={settings.allowOnlineBooking}
                onChange={(e) => setSettings({ ...settings, allowOnlineBooking: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="allowOnline" style={{ fontSize: '0.9rem', color: 'var(--color-slate-700)', cursor: 'pointer', fontWeight: 500 }}>
                Allow Patients to Book Online Virtual Tokens
              </label>
            </div>

            <button type="submit" disabled={saving} className="btn btn-primary" style={{ marginTop: '16px' }}>
              {saving ? 'Saving...' : 'Save Queue Settings'}
            </button>
          </form>
        </div>

        {/* Hospital Info Card */}
        <div className="card">
          <h2 style={{ fontSize: '1.2rem', color: 'var(--color-slate-900)', marginBottom: '16px' }}>Facility Information</h2>
          {hospital ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>Facility Name</span>
                <div style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{hospital.name}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>Hospital Code</span>
                <div><span className="badge badge-waiting">{hospital.code}</span></div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>Verification Status</span>
                <div><span className="badge badge-serving">{hospital.isVerified ? 'Platform Verified' : 'Pending Verification'}</span></div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>Contact Email & Phone</span>
                <div>{hospital.email} &bull; {hospital.phone}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>Address</span>
                <div>
                  {hospital.address?.street ? `${hospital.address.street}, ` : ''}
                  {hospital.address?.city}, {hospital.address?.state} {hospital.address?.zipCode}
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--color-slate-500)' }}>No hospital record linked.</p>
          )}
        </div>
      </div>
    </div>
  );
}
