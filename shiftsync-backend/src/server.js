require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');

const app = require('./config/app');
const connectDB = require('./config/database');
const setupSocket = require('./socket');
const { errorHandler } = require('./middleware/errorHandler');

// Connect to database
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.io with the server
const io = setupSocket(server);

// Make io accessible to routes and controllers
app.set('io', io);

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const locationRoutes = require('./routes/location.routes');
const shiftRoutes = require('./routes/shift.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const swapRoutes = require('./routes/swap.routes');
const notificationRoutes = require('./routes/notification.routes');

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
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/swaps', swapRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
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