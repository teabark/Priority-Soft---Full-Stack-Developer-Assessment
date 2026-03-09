const express = require('express');
const router = express.Router();
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