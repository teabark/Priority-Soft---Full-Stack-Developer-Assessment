const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');

const setupSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST']
    },
    // Connection settings
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  // Store online users
  const onlineUsers = new Map();
  const userSockets = new Map(); // userId -> Set of socketIds

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }
      
      socket.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        locations: user.locations.map(l => l.toString())
      };
      
      next();
    } catch (error) {
      console.error('Socket auth error:', error);
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.user.name} (${socket.user.id})`);

    // Track online user
    onlineUsers.set(socket.user.id, {
      userId: socket.user.id,
      name: socket.user.name,
      role: socket.user.role,
      connectedAt: new Date(),
      socketId: socket.id
    });

    // Track socket for user
    if (!userSockets.has(socket.user.id)) {
      userSockets.set(socket.user.id, new Set());
    }
    userSockets.get(socket.user.id).add(socket.id);

    // Join personal room
    socket.join(`user:${socket.user.id}`);

    // Join role-based room
    socket.join(`role:${socket.user.role}`);

    // Join location rooms based on user's locations
    if (socket.user.locations && socket.user.locations.length > 0) {
      socket.user.locations.forEach(locationId => {
        socket.join(`location:${locationId}`);
        
        if (socket.user.role === 'manager') {
          socket.join(`location:${locationId}:managers`);
        }
      });
    }

    // If admin, join all admin rooms
    if (socket.user.role === 'admin') {
      socket.join('admins');
    }

    // Broadcast online status to relevant users
    broadcastOnlineStatus(socket.user.id, true);

    // ========== SHIFT EVENTS ==========
    
    // Staff viewing their shifts
    socket.on('shifts:subscribe', (data) => {
      const { weekStart, locationId } = data;
      const room = locationId 
        ? `shifts:${locationId}:${weekStart}`
        : `shifts:user:${socket.user.id}:${weekStart}`;
      socket.join(room);
      console.log(`User ${socket.user.id} subscribed to ${room}`);
    });

    // Manager creating/updating shift
    socket.on('shift:create', async (shiftData, callback) => {
      try {
        const io = socket.server; // Get io instance
        
        // Emit to relevant rooms
        io.to(`location:${shiftData.location}`).emit('shift:created', {
          shift: shiftData,
          createdBy: socket.user,
          timestamp: new Date()
        });

        // Notify managers at this location
        io.to(`location:${shiftData.location}:managers`).emit('shift:manager-notification', {
          type: 'shift_created',
          message: `${socket.user.name} created a new shift`,
          shift: shiftData
        });

        if (callback) callback({ success: true });
      } catch (error) {
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Shift assignment
    socket.on('shift:assign', async (data, callback) => {
      try {
        const { shiftId, staffId, shift } = data;
        const io = socket.server;

        // Notify assigned staff
        io.to(`user:${staffId}`).emit('shift:assigned', {
          shiftId,
          shift,
          assignedBy: socket.user,
          message: `You have been assigned to a shift`,
          timestamp: new Date()
        });

        // Update shift room
        io.to(`location:${shift.location}`).emit('shift:updated', {
          shiftId,
          action: 'assigned',
          staffId,
          updatedBy: socket.user
        });

        if (callback) callback({ success: true });
      } catch (error) {
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Shift unassignment
    socket.on('shift:unassign', async (data, callback) => {
      try {
        const { shiftId, staffId, shift, reason } = data;
        const io = socket.server;

        // Notify affected staff
        io.to(`user:${staffId}`).emit('shift:unassigned', {
          shiftId,
          reason,
          unassignedBy: socket.user,
          message: `You have been unassigned from a shift`,
          timestamp: new Date()
        });

        // Update shift room
        io.to(`location:${shift.location}`).emit('shift:updated', {
          shiftId,
          action: 'unassigned',
          staffId,
          reason,
          updatedBy: socket.user
        });

        if (callback) callback({ success: true });
      } catch (error) {
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Shift publish
    socket.on('shift:publish', async (data, callback) => {
      try {
        const { shiftId, shift } = data;
        const io = socket.server;

        // Notify all staff at location
        io.to(`location:${shift.location}`).emit('shift:published', {
          shiftId,
          shift,
          publishedBy: socket.user,
          message: `A new shift has been published`,
          timestamp: new Date()
        });

        if (callback) callback({ success: true });
      } catch (error) {
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // ========== SWAP REQUEST EVENTS ==========

    // Swap request created
    socket.on('swap:request', async (data, callback) => {
      try {
        const { swapRequest, shift, targetStaffId } = data;
        const io = socket.server;

        // Notify target staff
        io.to(`user:${targetStaffId}`).emit('swap:requested', {
          swapRequest,
          shift,
          requestedBy: socket.user,
          message: `${socket.user.name} wants to swap shifts with you`,
          timestamp: new Date()
        });

        // Notify managers
        io.to(`location:${shift.location}:managers`).emit('swap:manager-notification', {
          type: 'swap_requested',
          swapRequest,
          shift,
          requestingStaff: socket.user,
          message: `New swap request pending approval`
        });

        if (callback) callback({ success: true });
      } catch (error) {
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Swap request response (approve/reject)
    socket.on('swap:respond', async (data, callback) => {
      try {
        const { swapRequestId, shift, approved, requestingStaffId, targetStaffId } = data;
        const io = socket.server;
        const event = approved ? 'swap:approved' : 'swap:rejected';

        // Notify requesting staff
        io.to(`user:${requestingStaffId}`).emit(event, {
          swapRequestId,
          shift,
          respondedBy: socket.user,
          message: approved ? 'Swap request approved' : 'Swap request rejected',
          timestamp: new Date()
        });

        // Notify target staff if different
        if (targetStaffId && targetStaffId !== requestingStaffId) {
          io.to(`user:${targetStaffId}`).emit(event, {
            swapRequestId,
            shift,
            respondedBy: socket.user,
            message: approved ? 'Swap approved' : 'Swap rejected',
            timestamp: new Date()
          });
        }

        if (callback) callback({ success: true });
      } catch (error) {
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // ========== SCHEDULE EVENTS ==========

    // Schedule publish
    socket.on('schedule:publish', async (data, callback) => {
      try {
        const { schedule, locationIds } = data;
        const io = socket.server;

        // Notify all staff at affected locations
        locationIds.forEach(locId => {
          io.to(`location:${locId}`).emit('schedule:published', {
            scheduleId: schedule._id,
            weekStart: schedule.weekStartDate,
            weekEnd: schedule.weekEndDate,
            publishedBy: socket.user,
            message: `Schedule for week of ${new Date(schedule.weekStartDate).toLocaleDateString()} has been published`,
            timestamp: new Date()
          });
        });

        if (callback) callback({ success: true });
      } catch (error) {
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Schedule update
    socket.on('schedule:update', async (data, callback) => {
      try {
        const { scheduleId, changes, locationIds } = data;
        const io = socket.server;

        locationIds.forEach(locId => {
          io.to(`location:${locId}`).emit('schedule:updated', {
            scheduleId,
            changes,
            updatedBy: socket.user,
            message: 'Schedule has been updated',
            timestamp: new Date()
          });
        });

        if (callback) callback({ success: true });
      } catch (error) {
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // ========== COMPLIANCE EVENTS ==========

    // Overtime warning
    socket.on('compliance:overtime-warning', async (data) => {
      try {
        const { staffId, hours, shift } = data;
        const io = socket.server;

        io.to(`user:${staffId}`).emit('compliance:warning', {
          type: 'overtime',
          hours,
          shift,
          message: `Warning: This shift would push you to ${hours} hours`,
          severity: hours > 40 ? 'critical' : 'warning',
          timestamp: new Date()
        });

        // Notify managers
        if (shift && shift.location) {
          io.to(`location:${shift.location}:managers`).emit('compliance:manager-alert', {
            type: 'overtime',
            staffId,
            hours,
            shift,
            message: `Staff member approaching overtime limit`,
            severity: hours > 40 ? 'critical' : 'warning'
          });
        }
      } catch (error) {
        console.error('Overtime warning error:', error);
      }
    });

    // Conflict detection
    socket.on('compliance:conflict', async (data) => {
      try {
        const { staffId, conflictType, shift, conflictingShifts } = data;
        const io = socket.server;

        io.to(`user:${staffId}`).emit('compliance:conflict', {
          type: conflictType,
          shift,
          conflictingShifts,
          message: `Schedule conflict detected`,
          timestamp: new Date()
        });

        // If two managers trying to assign same staff
        if (conflictType === 'concurrent_assignment') {
          io.to(`location:${shift.location}:managers`).emit('compliance:concurrent-conflict', {
            staffId,
            shift,
            message: `This staff member is being assigned by another manager`,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Conflict detection error:', error);
      }
    });

    // ========== NOTIFICATION EVENTS ==========

    // Send notification
    socket.on('notification:send', async (data, callback) => {
      try {
        const { recipientId, notification } = data;
        const io = socket.server;

        io.to(`user:${recipientId}`).emit('notification:new', {
          notification,
          timestamp: new Date()
        });

        if (callback) callback({ success: true });
      } catch (error) {
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Notification read
    socket.on('notification:read', async (notificationId, callback) => {
      try {
        const io = socket.server;
        
        // Update in database
        await Notification.findByIdAndUpdate(notificationId, {
          status: 'read',
          readAt: new Date()
        });

        // Notify other devices
        io.to(`user:${socket.user.id}`).emit('notification:read', {
          notificationId,
          userId: socket.user.id,
          timestamp: new Date()
        });

        if (callback) callback({ success: true });
      } catch (error) {
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // ========== ON-DUTY DASHBOARD ==========

    // Staff clock in
    socket.on('duty:clock-in', async (data, callback) => {
      try {
        const { shiftId, locationId } = data;
        const io = socket.server;

        // Add to on-duty room
        socket.join(`duty:${locationId}`);

        // Notify dashboard
        io.to(`location:${locationId}`).emit('duty:staff-on-duty', {
          staff: {
            id: socket.user.id,
            name: socket.user.name,
            role: socket.user.role
          },
          shiftId,
          clockInTime: new Date(),
          locationId
        });

        // Notify managers
        io.to(`location:${locationId}:managers`).emit('duty:manager-update', {
          type: 'clock_in',
          staff: socket.user,
          shiftId,
          timestamp: new Date()
        });

        if (callback) callback({ success: true });
      } catch (error) {
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Staff clock out
    socket.on('duty:clock-out', async (data, callback) => {
      try {
        const { shiftId, locationId } = data;
        const io = socket.server;

        // Leave on-duty room
        socket.leave(`duty:${locationId}`);

        // Notify dashboard
        io.to(`location:${locationId}`).emit('duty:staff-off-duty', {
          staffId: socket.user.id,
          shiftId,
          clockOutTime: new Date(),
          locationId
        });

        if (callback) callback({ success: true });
      } catch (error) {
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Subscribe to on-duty dashboard
    socket.on('duty:subscribe', (locationId) => {
      socket.join(`duty:${locationId}`);
      console.log(`User ${socket.user.id} subscribed to duty dashboard for location ${locationId}`);
    });

    // Unsubscribe from on-duty dashboard
    socket.on('duty:unsubscribe', (locationId) => {
      socket.leave(`duty:${locationId}`);
    });

    // ========== CONCURRENT EDITING PREVENTION ==========

    // User editing a shift
    socket.on('edit:start', (data) => {
      const { entityType, entityId } = data;
      const room = `editing:${entityType}:${entityId}`;
      
      // Check if someone else is already editing
      const editors = io.sockets.adapter.rooms.get(room);
      if (editors && editors.size > 0) {
        // Notify current user that someone else is editing
        socket.emit('edit:conflict', {
          entityType,
          entityId,
          message: 'Another user is currently editing this item'
        });
      } else {
        // Join editing room
        socket.join(room);
        
        // Notify others that this user is editing
        socket.to(`location:${data.locationId}`).emit('edit:started', {
          entityType,
          entityId,
          user: {
            id: socket.user.id,
            name: socket.user.name
          },
          timestamp: new Date()
        });
      }
    });

    // User stopped editing
    socket.on('edit:stop', (data) => {
      const { entityType, entityId } = data;
      const room = `editing:${entityType}:${entityId}`;
      
      socket.leave(room);
      
      // Notify others that editing has stopped
      socket.to(`location:${data.locationId}`).emit('edit:stopped', {
        entityType,
        entityId,
        user: {
          id: socket.user.id,
          name: socket.user.name
        },
        timestamp: new Date()
      });
    });

    // ========== HEARTBEAT ==========

    // Heartbeat to keep connection alive
    socket.on('heartbeat', () => {
      socket.emit('heartbeat:ack', { timestamp: new Date() });
    });

    // ========== DISCONNECTION ==========

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.user.name} (${socket.user.id})`);

      // Remove from online users
      onlineUsers.delete(socket.user.id);
      
      // Remove socket from user's socket set
      if (userSockets.has(socket.user.id)) {
        userSockets.get(socket.user.id).delete(socket.id);
        if (userSockets.get(socket.user.id).size === 0) {
          userSockets.delete(socket.user.id);
        }
      }

      // Broadcast offline status
      broadcastOnlineStatus(socket.user.id, false);

      // Notify about stopped editing
      const rooms = Array.from(socket.rooms);
      rooms.forEach(room => {
        if (room.startsWith('editing:')) {
          const [_, entityType, entityId] = room.split(':');
          socket.to(`location:${data?.locationId}`).emit('edit:stopped', {
            entityType,
            entityId,
            user: {
              id: socket.user.id,
              name: socket.user.name
            },
            timestamp: new Date(),
            reason: 'disconnected'
          });
        }
      });
    });
  });

  // Helper function to broadcast online status
  const broadcastOnlineStatus = (userId, isOnline) => {
    const user = onlineUsers.get(userId);
    if (user) {
      io.emit('user:status-change', {
        userId,
        isOnline,
        user: isOnline ? {
          id: user.userId,
          name: user.name,
          role: user.role
        } : undefined,
        timestamp: new Date()
      });
    }
  };

  // ========== PUBLIC API METHODS ==========

  // Emit to specific user
  io.toUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  // Emit to multiple users
  io.toUsers = (userIds, event, data) => {
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit(event, data);
    });
  };

  // Emit to location
  io.toLocation = (locationId, event, data, options = {}) => {
    io.to(`location:${locationId}`).emit(event, data);
    
    if (options.includeManagers) {
      io.to(`location:${locationId}:managers`).emit(event, data);
    }
  };

  // Emit to managers of location
  io.toManagers = (locationId, event, data) => {
    io.to(`location:${locationId}:managers`).emit(event, data);
  };

  // Emit to role
  io.toRole = (role, event, data) => {
    io.to(`role:${role}`).emit(event, data);
  };

  // Emit to admins
  io.toAdmins = (event, data) => {
    io.to('admins').emit(event, data);
  };

  // Emit to shift subscribers
  io.toShift = (shiftId, event, data) => {
    io.to(`shift:${shiftId}`).emit(event, data);
  };

  // Emit to schedule subscribers
  io.toSchedule = (scheduleId, event, data) => {
    io.to(`schedule:${scheduleId}`).emit(event, data);
  };

  // Get online users
  io.getOnlineUsers = () => {
    return Array.from(onlineUsers.values());
  };

  // Check if user is online
  io.isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  // Get user's active sockets count
  io.getUserSocketCount = (userId) => {
    return userSockets.get(userId)?.size || 0;
  };

  return io;
};

module.exports = setupSocket;