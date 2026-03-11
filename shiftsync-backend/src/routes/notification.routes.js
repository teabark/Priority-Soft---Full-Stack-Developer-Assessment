const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const {
  getNotifications,
  getNotificationSummary,
  getNotification,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  completeAction,
  updatePreferences,
  getPreferences,
  deleteNotification,
  cleanupExpired
} = require('../controllers/notification.controller');
const { protect, authorize } = require('../middleware/auth');
const {
  validateNotificationPreferences,
  validateMarkAsRead,
  validateGetNotifications,
  validateAction,
  handleValidationErrors
} = require('../validations/notificationValidation');

// All routes require authentication
router.use(protect);

// Preferences routes
router.get('/preferences', getPreferences);
router.put(
  '/preferences',
  validateNotificationPreferences,
  handleValidationErrors,
  updatePreferences
);

// TEMPORARY TEST ENDPOINT
router.post('/test', protect, async (req, res) => {
  console.log('='.repeat(50));
  console.log('🔔 TEST NOTIFICATION ENDPOINT HIT');
  console.log('='.repeat(50));
  
  try {
    console.log('📌 User:', req.user.id);
    
    const Notification = require('../models/Notification');
    
    const notification = new Notification({
      recipient: req.user.id,
      type: 'system_alert',
      title: '🔔 Test Notification',
      message: 'Your notification system is working!',
      priority: 'normal',
      channels: ['in_app']
    });
    
    console.log('📌 Saving notification...');
    await notification.save();
    console.log('✅ Notification saved:', notification._id);
    
    // Send real-time
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.user.id}`).emit('notification:new', {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        createdAt: notification.createdAt,
        read: false
      });
      console.log('📢 Real-time notification sent');
    }
    
    res.json({ success: true, data: notification });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
// router.get('/', protect, async (req, res) => {
//   try {
//     console.log('📡 Fetching notifications for user:', req.user.id);
    
//     const notifications = await Notification.find({ 
//       recipient: req.user.id 
//     })
//     .sort({ createdAt: -1 })
//     .limit(50);
    
//     const unreadCount = await Notification.countDocuments({
//       recipient: req.user.id,
//       read: false
//     });
    
//     console.log(`✅ Found ${notifications.length} notifications, ${unreadCount} unread`);
    
//     res.json({
//       success: true,
//       data: notifications,
//       unreadCount
//     });
//   } catch (error) {
//     console.error('❌ Error fetching notifications:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: error.message 
//     });
//   }
// });

// Summary route
router.get('/summary', getNotificationSummary);

// Cleanup route (admin only)
router.post('/cleanup', authorize('admin'), cleanupExpired);

// Bulk operations
router.put('/read-all', markAllAsRead);

// CRUD routes
router.get('/', validateGetNotifications, handleValidationErrors, getNotifications);
router.get('/:id', getNotification);

router.put(
  '/:id/read',
  validateMarkAsRead,
  handleValidationErrors,
  markAsRead
);

router.put('/:id/dismiss', dismissNotification);

router.put(
  '/:id/actions/:actionId',
  validateAction,
  handleValidationErrors,
  completeAction
);

router.delete('/:id', deleteNotification);

module.exports = router;