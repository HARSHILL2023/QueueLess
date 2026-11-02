import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  profile: null,
  role: null, // 'patient' | 'staff' | 'admin'
  hospitalId: null,
  isLoading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.profile = action.payload.profile;
      state.role = action.payload.role;
      state.hospitalId = action.payload.hospitalId;
      state.error = null;
    },
    updateProfile: (state, action) => {
      state.profile = { ...state.profile, ...action.payload };
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearUser: (state) => {
      state.profile = null;
      state.role = null;
      state.hospitalId = null;
      state.error = null;
    },
  },
});

export const { setUser, updateProfile, setLoading, setError, clearUser } = userSlice.actions;
export default userSlice.reducer;