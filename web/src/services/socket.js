import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

const getAuthPayload = () => ({ token: localStorage.getItem('accessToken') });

const createSocket = () => {
  const instance = io(SOCKET_URL, {
    autoConnect: true,
    auth: getAuthPayload(),
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Access tokens are rotated by the API interceptor; use the latest one on
  // every reconnect attempt instead of the token captured at construction.
  instance.io.on('reconnect_attempt', () => {
    instance.auth = getAuthPayload();
  });

  return instance;
};

export const getSocket = () => {
  if (!socket) {
    socket = createSocket();
  } else if (!socket.connected) {
    socket.auth = getAuthPayload();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinDepartmentQueue = (departmentId) => {
  const s = getSocket();
  if (s && departmentId) {
    s.emit('join_department', departmentId);
  }
};

export const leaveDepartmentQueue = (departmentId) => {
  const s = getSocket();
  if (s && departmentId) {
    s.emit('leave_department', departmentId);
  }
};
