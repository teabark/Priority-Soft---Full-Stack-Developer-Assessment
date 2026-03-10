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