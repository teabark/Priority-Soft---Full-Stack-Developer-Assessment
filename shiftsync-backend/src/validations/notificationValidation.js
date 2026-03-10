const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const validateNotificationPreferences = [
  body('inApp')
    .optional()
    .isBoolean().withMessage('inApp must be a boolean'),
  
  body('email')
    .optional()
    .isBoolean().withMessage('email must be a boolean'),
  
  body('push')
    .optional()
    .isBoolean().withMessage('push must be a boolean'),
  
  body('sms')
    .optional()
    .isBoolean().withMessage('sms must be a boolean'),
  
  body('shiftAssigned')
    .optional()
    .isBoolean().withMessage('shiftAssigned must be a boolean'),
  
  body('shiftChanged')
    .optional()
    .isBoolean().withMessage('shiftChanged must be a boolean'),
  
  body('shiftPublished')
    .optional()
    .isBoolean().withMessage('shiftPublished must be a boolean'),
  
  body('swapRequestReceived')
    .optional()
    .isBoolean().withMessage('swapRequestReceived must be a boolean'),
  
  body('swapRequestUpdated')
    .optional()
    .isBoolean().withMessage('swapRequestUpdated must be a boolean'),
  
  body('overtimeWarning')
    .optional()
    .isBoolean().withMessage('overtimeWarning must be a boolean'),
  
  body('schedulePublished')
    .optional()
    .isBoolean().withMessage('schedulePublished must be a boolean')
];

const validateMarkAsRead = [
  param('id')
    .isMongoId().withMessage('Invalid notification ID'),
  
  body('channel')
    .optional()
    .isIn(['in_app', 'email', 'push', 'sms']).withMessage('Invalid channel')
];

const validateGetNotifications = [
  query('status')
    .optional()
    .isIn(['pending', 'sent', 'delivered', 'read', 'archived']).withMessage('Invalid status'),
  
  query('type')
    .optional()
    .isString().withMessage('Type must be string'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('includeExpired')
    .optional()
    .isBoolean().withMessage('includeExpired must be a boolean')
];

const validateAction = [
  param('id')
    .isMongoId().withMessage('Invalid notification ID'),
  
  param('actionId')
    .isMongoId().withMessage('Invalid action ID'),
  
  body('data')
    .optional()
    .isObject().withMessage('Data must be an object')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  validateNotificationPreferences,
  validateMarkAsRead,
  validateGetNotifications,
  validateAction,
  handleValidationErrors
};