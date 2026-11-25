// Key used in localStorage for the hospital a global staff account is managing.
export const HOSPITAL_SELECTION_KEY = 'selectedHospitalId';

// The global permission only ever applies to staff accounts.
export const isGlobalStaffUser = (user) =>
  Boolean(user && user.role === 'staff' && user.isGlobalStaff === true);

// hospitalId may be a populated document (login/profile responses) or an id.
export const readHospitalId = (hospitalId) => {
  if (!hospitalId) return null;
  return typeof hospitalId === 'object' ? hospitalId._id : hospitalId;
};
