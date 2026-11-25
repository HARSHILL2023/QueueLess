import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { staffAPI } from '../services/api';

/**
 * Sidebar hospital picker for the global staff account only.
 * Normal staff keep working in their assigned hospital and never see this.
 */
export default function HospitalSwitcher() {
  const { isGlobalStaff, activeHospitalId, selectHospital } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isGlobalStaff) return undefined;

    let cancelled = false;
    setLoading(true);
    staffAPI
      .getHospitals()
      .then((res) => {
        if (cancelled) return;
        const list = res.data?.data || [];
        setHospitals(list);
        setError('');
        if (list.length > 0 && !list.some((h) => h._id === activeHospitalId)) {
          selectHospital(list[0]._id);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.error || 'Unable to load hospitals.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isGlobalStaff, activeHospitalId, selectHospital]);

  if (!isGlobalStaff) return null;

  const selected = hospitals.find((h) => h._id === activeHospitalId) || null;
  const unavailable = selected && selected.status !== 'active';

  return (
    <div style={{ marginTop: '16px', padding: '0 8px' }}>
      <label
        htmlFor="hospital-switcher"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.7rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          fontWeight: 700,
          color: '#94a3b8',
          marginBottom: '6px',
        }}
      >
        <span>Hospital</span>
        <span style={{ color: '#38bdf8', textTransform: 'none', letterSpacing: 0 }}>Global</span>
      </label>

      {loading ? (
        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Loading hospitals…</div>
      ) : error ? (
        <div style={{ fontSize: '0.8rem', color: '#f87171' }}>{error}</div>
      ) : hospitals.length === 0 ? (
        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No hospitals available.</div>
      ) : (
        <>
          <select
            id="hospital-switcher"
            value={activeHospitalId || ''}
            onChange={(e) => selectHospital(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#f8fafc',
              fontSize: '0.85rem',
            }}
          >
            {hospitals.map((hospital) => (
              <option key={hospital._id} value={hospital._id}>
                {hospital.name} ({hospital.code})
              </option>
            ))}
          </select>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px' }}>
            {selected
              ? `${selected.address?.city || 'No city'}${selected.status !== 'active' ? ` · ${selected.status}` : ''}`
              : 'Select a hospital to manage'}
          </div>
          {unavailable && (
            <div style={{ fontSize: '0.72rem', color: '#fbbf24', marginTop: '4px' }}>
              This hospital is {selected.status}.
            </div>
          )}
        </>
      )}
    </div>
  );
}
