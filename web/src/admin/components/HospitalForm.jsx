import { useEffect, useState } from 'react';
import { Modal } from './UI';

const EMPTY = {
  name: '',
  code: '',
  description: '',
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'India',
  phone: '',
  email: '',
  website: '',
  openTime: '08:00',
  closeTime: '20:00',
  maxTokensPerDay: 200,
  avgConsultationMinutes: 15,
  allowOnlineBooking: true,
};

const fromHospital = (hospital) => ({
  name: hospital.name || '',
  code: hospital.code || '',
  description: hospital.description || '',
  street: hospital.address?.street || '',
  city: hospital.address?.city || '',
  state: hospital.address?.state || '',
  zipCode: hospital.address?.zipCode || '',
  country: hospital.address?.country || 'India',
  phone: hospital.phone || '',
  email: hospital.email || '',
  website: hospital.website || '',
  openTime: hospital.settings?.openTime || '08:00',
  closeTime: hospital.settings?.closeTime || '20:00',
  maxTokensPerDay: hospital.settings?.maxTokensPerDay ?? 200,
  avgConsultationMinutes: hospital.settings?.avgConsultationMinutes ?? 15,
  allowOnlineBooking: hospital.settings?.allowOnlineBooking ?? true,
});

export default function HospitalForm({ open, hospital, busy, error, onClose, onSubmit }) {
  const [values, setValues] = useState(EMPTY);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (open) {
      setValues(hospital ? fromHospital(hospital) : EMPTY);
      setLocalError('');
    }
  }, [open, hospital]);

  const set = (field) => (event) => {
    const { type, checked, value } = event.target;
    setValues((current) => ({ ...current, [field]: type === 'checkbox' ? checked : value }));
  };

  const submit = (event) => {
    event.preventDefault();

    if (values.name.trim().length < 2) return setLocalError('Hospital name is required.');
    if (!hospital && (values.code.trim().length < 2 || values.code.trim().length > 10)) {
      return setLocalError('Hospital code must be between 2 and 10 characters.');
    }
    if (!values.city.trim()) return setLocalError('City is required.');
    if (!values.state.trim()) return setLocalError('State is required.');
    if (values.phone.trim().length < 5) return setLocalError('A contact phone number is required.');
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) return setLocalError('A valid email address is required.');

    const payload = {
      name: values.name.trim(),
      description: values.description.trim(),
      address: {
        street: values.street.trim(),
        city: values.city.trim(),
        state: values.state.trim(),
        zipCode: values.zipCode.trim(),
        country: values.country.trim() || 'India',
      },
      phone: values.phone.trim(),
      email: values.email.trim(),
      website: values.website.trim(),
      settings: {
        openTime: values.openTime,
        closeTime: values.closeTime,
        maxTokensPerDay: Number(values.maxTokensPerDay) || 1,
        avgConsultationMinutes: Number(values.avgConsultationMinutes) || 1,
        allowOnlineBooking: Boolean(values.allowOnlineBooking),
      },
    };

    if (!hospital) payload.code = values.code.trim().toUpperCase();

    setLocalError('');
    onSubmit(payload);
  };

  return (
    <Modal
      open={open}
      title={hospital ? `Edit ${hospital.name}` : 'Register a new hospital'}
      onClose={busy ? () => {} : onClose}
      width="680px"
      footer={
        <>
          <button type="button" className="admin-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="hospital-form" className="admin-btn admin-btn-primary" disabled={busy}>
            {busy ? 'Saving…' : hospital ? 'Save changes' : 'Create hospital'}
          </button>
        </>
      }
    >
      {(localError || error) && <div className="admin-notice danger">{localError || error}</div>}

      <form id="hospital-form" onSubmit={submit}>
        <div className="admin-field-row">
          <div className="admin-field">
            <label htmlFor="hf-name">Hospital name</label>
            <input id="hf-name" className="admin-input" value={values.name} onChange={set('name')} required />
          </div>
          <div className="admin-field">
            <label htmlFor="hf-code">Hospital code {hospital ? '(fixed)' : ''}</label>
            <input
              id="hf-code"
              className="admin-input"
              value={values.code}
              onChange={set('code')}
              placeholder="ACH"
              maxLength={10}
              disabled={Boolean(hospital)}
              required={!hospital}
            />
          </div>
        </div>

        <div className="admin-field">
          <label htmlFor="hf-description">Description</label>
          <textarea
            id="hf-description"
            className="admin-textarea"
            rows={2}
            maxLength={500}
            value={values.description}
            onChange={set('description')}
          />
        </div>

        <div className="admin-field">
          <label htmlFor="hf-street">Street</label>
          <input id="hf-street" className="admin-input" value={values.street} onChange={set('street')} />
        </div>

        <div className="admin-field-row-3">
          <div className="admin-field">
            <label htmlFor="hf-city">City</label>
            <input id="hf-city" className="admin-input" value={values.city} onChange={set('city')} required />
          </div>
          <div className="admin-field">
            <label htmlFor="hf-state">State</label>
            <input id="hf-state" className="admin-input" value={values.state} onChange={set('state')} required />
          </div>
          <div className="admin-field">
            <label htmlFor="hf-zip">ZIP / Postal code</label>
            <input id="hf-zip" className="admin-input" value={values.zipCode} onChange={set('zipCode')} />
          </div>
        </div>

        <div className="admin-field-row-3">
          <div className="admin-field">
            <label htmlFor="hf-country">Country</label>
            <input id="hf-country" className="admin-input" value={values.country} onChange={set('country')} />
          </div>
          <div className="admin-field">
            <label htmlFor="hf-phone">Phone</label>
            <input id="hf-phone" className="admin-input" value={values.phone} onChange={set('phone')} required />
          </div>
          <div className="admin-field">
            <label htmlFor="hf-email">Email</label>
            <input id="hf-email" type="email" className="admin-input" value={values.email} onChange={set('email')} required />
          </div>
        </div>

        <div className="admin-field">
          <label htmlFor="hf-website">Website</label>
          <input id="hf-website" className="admin-input" value={values.website} onChange={set('website')} />
        </div>

        <div className="admin-field-row-3">
          <div className="admin-field">
            <label htmlFor="hf-open">Opens</label>
            <input id="hf-open" type="time" className="admin-input" value={values.openTime} onChange={set('openTime')} />
          </div>
          <div className="admin-field">
            <label htmlFor="hf-close">Closes</label>
            <input id="hf-close" type="time" className="admin-input" value={values.closeTime} onChange={set('closeTime')} />
          </div>
          <div className="admin-field">
            <label htmlFor="hf-max">Daily token cap</label>
            <input
              id="hf-max"
              type="number"
              min="1"
              className="admin-input"
              value={values.maxTokensPerDay}
              onChange={set('maxTokensPerDay')}
            />
          </div>
        </div>

        <div className="admin-field-row">
          <div className="admin-field">
            <label htmlFor="hf-avg">Avg consultation (minutes)</label>
            <input
              id="hf-avg"
              type="number"
              min="1"
              className="admin-input"
              value={values.avgConsultationMinutes}
              onChange={set('avgConsultationMinutes')}
            />
          </div>
          <div className="admin-field" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <label className="admin-checkbox">
              <input type="checkbox" checked={values.allowOnlineBooking} onChange={set('allowOnlineBooking')} />
              Allow online token booking
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
}
