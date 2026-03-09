const socketIo = require('socket.io');
const Notification = require('../models/Notification');

const setupSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }
  });

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      // Verify JWT and attach user
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const User = require('../models/User');
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }
      
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.user.role})`);

    // Join personal room
    socket.join(`user-${socket.user._id}`);

    // Join location rooms based on user's locations
    if (socket.user.locations && socket.user.locations.length > 0) {
      socket.user.locations.forEach(locationId => {
        socket.join(`location-${locationId}`);
        
        if (socket.user.role === 'manager') {
          socket.join(`location-${locationId}-managers`);
        }
      });
    }

    // Handle notification read
    socket.on('notification:read', async (notificationId) => {
      try {
        const notification = await Notification.findOne({
          _id: notificationId,
          recipient: socket.user._id
        });
        
        if (notification) {
          await notification.markAsRead('in_app');
          
          // Notify other devices
          socket.to(`user-${socket.user._id}`).emit('notification:read', {
            notificationId
          });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle action completion
    socket.on('action:complete', async ({ notificationId, actionId, data }) => {
      try {
        const notification = await Notification.findOne({
          _id: notificationId,
          recipient: socket.user._id
        });
        
        if (notification) {
          await notification.completeAction(actionId, data);
          
          // Emit success
          socket.emit('action:completed', {
            notificationId,
            actionId
          });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Join schedule room
    socket.on('schedule:subscribe', (scheduleId) => {
      socket.join(`schedule-${scheduleId}`);
    });

    // Leave schedule room
    socket.on('schedule:unsubscribe', (scheduleId) => {
      socket.leave(`schedule-${scheduleId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.name}`);
    });
  });

  // Helper function to emit to user
  io.toUser = (userId, event, data) => {
    io.to(`user-${userId}`).emit(event, data);
  };

  // Helper function to emit to location
  io.toLocation = (locationId, event, data, includeManagers = false) => {
    io.to(`location-${locationId}`).emit(event, data);
    if (includeManagers) {
      io.to(`location-${locationId}-managers`).emit(event, data);
    }
  };

  // Helper function to emit to managers of location
  io.toManagers = (locationId, event, data) => {
    io.to(`location-${locationId}-managers`).emit(event, data);
  };

  // Helper function to emit to schedule subscribers
  io.toSchedule = (scheduleId, event, data) => {
    io.to(`schedule-${scheduleId}`).emit(event, data);
  };

  return io;
};

module.exports = setupSocket;