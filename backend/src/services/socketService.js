const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Department = require('../models/Department');
const { JWT_SECRET } = require('../middleware/auth');

const getHandshakeToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  if (authToken) return authToken;

  const header = socket.handshake.headers?.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length);
  }

  return null;
};

const initSocket = (io) => {
  // Authenticate every socket before it can join any room.
  io.use(async (socket, next) => {
    try {
      const token = getHandshakeToken(socket);
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select('role hospitalId departmentId');

      if (!user) {
        return next(new Error('User no longer exists'));
      }

      socket.user = {
        id: user._id.toString(),
        role: user.role,
        hospitalId: user.hospitalId ? user.hospitalId.toString() : null,
        departmentId: user.departmentId ? user.departmentId.toString() : null,
      };

      next();
    } catch (error) {
      next(new Error(error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Join personal patient room (own room only).
    socket.on('join_user', (userId) => {
      if (!userId || !socket.user) return;

      const requested = userId.toString();
      if (requested === socket.user.id || socket.user.role === 'admin') {
        socket.join(`user_${requested}`);
      }
    });

    // Join department live queue room (staff of that hospital or admins only).
    socket.on('join_department', async (departmentId) => {
      if (!departmentId || !socket.user) return;

      try {
        if (socket.user.role === 'admin') {
          socket.join(`department_${departmentId}`);
          return;
        }

        if (socket.user.role !== 'staff' || !socket.user.hospitalId) return;

        const department = await Department.findById(departmentId).select('hospitalId');
        if (!department) return;

        if (department.hospitalId.toString() === socket.user.hospitalId) {
          socket.join(`department_${departmentId}`);
        }
      } catch (error) {
        // Invalid ids are treated as unauthorized room joins.
      }
    });

    // Leave department room.
    socket.on('leave_department', (departmentId) => {
      if (departmentId) {
        socket.leave(`department_${departmentId}`);
      }
    });

    // Join hospital room (staff of that hospital or admins only).
    socket.on('join_hospital', (hospitalId) => {
      if (!hospitalId || !socket.user) return;

      if (
        socket.user.role === 'admin' ||
        (socket.user.role === 'staff' && socket.user.hospitalId === hospitalId.toString())
      ) {
        socket.join(`hospital_${hospitalId}`);
      }
    });

    socket.on('disconnect', () => {
      // Automatic cleanup handled by socket.io
    });
  });
};

const emitQueueUpdate = (io, departmentId, data) => {
  if (io && departmentId) {
    io.to(`department_${departmentId}`).emit('queue_updated', data);
  }
};

const emitTokenUpdate = (io, userId, tokenData) => {
  if (io && userId) {
    io.to(`user_${userId}`).emit('token_status_changed', tokenData);
  }
};

module.exports = {
  initSocket,
  emitQueueUpdate,
  emitTokenUpdate,
};
