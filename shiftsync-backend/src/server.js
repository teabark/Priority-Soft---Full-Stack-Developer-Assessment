require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('./config/app');
const cors = require('cors');
const NotificationHelper = require('./services/notification.helper');
const connectDB = require('./config/database');
const setupSocket = require('./socket');
const { errorHandler } = require('./middleware/errorHandler');

// Connect to database
connectDB();

import cors from "cors";
app.use(cors({
  origin: "*", // or specify your frontend URL
  credentials: true
}));

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.io with the server
const io = setupSocket(server);
console.log('✅ Socket.io initialized');


// Make io accessible to routes and controllers
app.set('io', io);
console.log('✅ io set in app');

const notificationHelper = new NotificationHelper(io);
app.set('notificationHelper', notificationHelper);
console.log('✅ NotificationHelper initialized');

// ===== ADDED: Initialize NotificationService and make it available to routes =====
const NotificationService = require('./services/notification.service');
const notificationService = new NotificationService(io);
app.set('notificationService', notificationService);
console.log('✅ NotificationService initialized and attached to app');
// =============================================================================

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const locationRoutes = require('./routes/location.routes');
const shiftRoutes = require('./routes/shift.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const swapRoutes = require('./routes/swap.routes');
const overtimeRoutes = require('./routes/overtime.routes');
const notificationRoutes = require('./routes/notification.routes');
// After notification service initialization
const OvertimeService = require('./services/overtime.service');
const overtimeService = new OvertimeService(io);
app.set('overtimeService', overtimeService);
console.log('✅ OvertimeService initialized and attached to app');


app.set('overtimeService', overtimeService);
console.log('🔍 OvertimeService initialized. Available methods:', 
  Object.getOwnPropertyNames(Object.getPrototypeOf(overtimeService)));
console.log('🔍 getDashboardData exists:', typeof overtimeService.getDashboardData === 'function' ? '✅ YES' : '❌ NO');

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    socketio: true,
    onlineUsers: io.getOnlineUsers().length
  });
});

// Socket.io status endpoint
app.get('/socket-status', (req, res) => {
  res.status(200).json({
    onlineUsers: io.getOnlineUsers(),
    totalOnline: io.getOnlineUsers().length,
    rooms: Array.from(io.sockets.adapter.rooms.keys()),
    timestamp: new Date().toISOString()
  });
});

// Use routes
// SUPER SIMPLE DEBUG ENDPOINT - NO AUTH, NO MODELS, JUST RAW DATA
app.get('/api/debug/all-shifts', async (req, res) => {
  try {
    console.log('🔍 Debug: Fetching all shifts directly from MongoDB...');
    
    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    // Get all collections
    const shifts = await db.collection('shifts').find().toArray();
    const locations = await db.collection('locations').find().toArray();
    const users = await db.collection('users').find().toArray();
    
    console.log(`📊 Found ${shifts.length} shifts, ${locations.length} locations, ${users.length} users`);
    
    // Create lookup maps
    const locationMap = {};
    locations.forEach(loc => {
      locationMap[loc._id.toString()] = {
        name: loc.name,
        code: loc.code,
        timezone: loc.timezone,
        address: loc.address
      };
    });
    
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = {
        name: user.name,
        email: user.email,
        role: user.role
      };
    });
    
    // Format shifts with populated data
    const formattedShifts = shifts.map(shift => ({
      _id: shift._id,
      location: locationMap[shift.location?.toString()] || { name: 'Unknown Location' },
      startTime: shift.startTime,
      endTime: shift.endTime,
      requiredSkill: shift.requiredSkill,
      requiredCount: shift.requiredCount,
      assignedStaff: (shift.assignedStaff || []).map(id => 
        userMap[id.toString()] || { name: 'Unknown Staff' }
      ),
      status: shift.status || 'draft',
      isPremiumShift: shift.isPremiumShift || false,
      createdAt: shift.createdAt
    }));
    
    res.json({
      success: true,
      count: formattedShifts.length,
      data: formattedShifts,
      debug: {
        shiftsCount: shifts.length,
        locationsCount: locations.length,
        usersCount: users.length
      }
    });
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    });
  }
});

// TEMPORARY PUBLIC ENDPOINT - NO AUTH REQUIRED
app.get('/api/public/shifts', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const shifts = await db.collection('shifts').find().toArray();
    
    console.log(`📊 Public endpoint: Found ${shifts.length} shifts`);
    
    res.json({
      success: true,
      count: shifts.length,
      data: shifts
    });
  } catch (error) {
    console.error('Public endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/swaps', swapRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/overtime', overtimeRoutes);

// 404 handler - fix the wildcard syntax
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.originalUrl} not found` 
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get("/hello", (res, req) => {
  res.send('Hello World');
})

app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// TEMPORARY - Simple shifts endpoint for managers
app.get('/api/manager-shifts', async (req,res) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token' });
    }

    // Decode token to get user ID
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(decoded.id) });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('👤 User:', user.email, 'Role:', user.role, 'Locations:', user.locations);

    // Build query based on user role
    let query = {};
    if (user.role === 'manager') {
      // Managers see only their locations
      query.location = { $in: user.locations.map(id => new mongoose.Types.ObjectId(id)) };
    }

    // Get shifts
    const shifts = await db.collection('shifts').find(query).toArray();
    
    // Populate location names
    const locations = await db.collection('locations').find().toArray();
    const locationMap = {};
    locations.forEach(loc => { locationMap[loc._id.toString()] = loc; });

    const shiftsWithDetails = shifts.map(shift => ({
      ...shift,
      location: locationMap[shift.location?.toString()] || { name: 'Unknown' }
    }));

    console.log(`📊 Found ${shifts.length} shifts for user`);

    res.json({
      success: true,
      count: shifts.length,
      data: shiftsWithDetails
    });

  } catch (error) {
    console.error('❌ Error in manager-shifts:', error);
    res.status(200).json({
      success: true,
      count: 0,
      data: []
    });
  }
});

// Error handler middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server initialized`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...');
  
  // Notify all connected clients
  io.emit('server:shutdown', {
    message: 'Server is shutting down for maintenance',
    timestamp: new Date()
  });
  
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Log to error tracking service here
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  // Log to error tracking service here
});

module.exports = { app, server, io };