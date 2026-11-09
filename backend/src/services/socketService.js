const initSocket = (io) => {
  io.on('connection', (socket) => {
    // Join personal patient room
    socket.on('join_user', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
      }
    });

    // Join department live queue room
    socket.on('join_department', (departmentId) => {
      if (departmentId) {
        socket.join(`department_${departmentId}`);
      }
    });

    // Leave department room
    socket.on('leave_department', (departmentId) => {
      if (departmentId) {
        socket.leave(`department_${departmentId}`);
      }
    });

    // Join hospital room (for broad staff announcements)
    socket.on('join_hospital', (hospitalId) => {
      if (hospitalId) {
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
