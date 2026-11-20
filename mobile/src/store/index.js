import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, createTransform } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import queueReducer from './slices/queueSlice';

// JWTs are kept in SecureStore. Strip them from the unencrypted AsyncStorage
// snapshot, while still persisting the flags needed to restore the session.
const stripTokens = createTransform(
  (inboundState) => ({ ...inboundState, token: null, refreshToken: null }),
  (outboundState) => ({ ...outboundState, token: null, refreshToken: null }),
  { whitelist: ['auth'] }
);

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'user'],
  transforms: [stripTokens],
};

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  queue: queueReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);