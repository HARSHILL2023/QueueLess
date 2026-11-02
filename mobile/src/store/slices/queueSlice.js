import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentToken: null,
  queueStatus: null, // 'waiting' | 'called' | 'serving' | 'completed' | 'cancelled'
  estimatedWaitTime: null,
  positionInQueue: null,
  hospitalQueue: [],
  history: [],
  isLoading: false,
  error: null,
};

const queueSlice = createSlice({
  name: 'queue',
  initialState,
  reducers: {
    setCurrentToken: (state, action) => {
      state.currentToken = action.payload;
    },
    updateQueueStatus: (state, action) => {
      state.queueStatus = action.payload.status;
      state.estimatedWaitTime = action.payload.estimatedWaitTime;
      state.positionInQueue = action.payload.positionInQueue;
    },
    setHospitalQueue: (state, action) => {
      state.hospitalQueue = action.payload;
    },
    addToHistory: (state, action) => {
      state.history.unshift(action.payload);
    },
    setHistory: (state, action) => {
      state.history = action.payload;
    },
    clearCurrentToken: (state) => {
      state.currentToken = null;
      state.queueStatus = null;
      state.estimatedWaitTime = null;
      state.positionInQueue = null;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
});

export const {
  setCurrentToken,
  updateQueueStatus,
  setHospitalQueue,
  addToHistory,
  setHistory,
  clearCurrentToken,
  setLoading,
  setError,
} = queueSlice.actions;
export default queueSlice.reducer;