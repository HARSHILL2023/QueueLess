import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
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
