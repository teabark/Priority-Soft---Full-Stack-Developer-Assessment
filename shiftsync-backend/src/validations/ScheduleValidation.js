const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');

const validateScheduleCreate = [
  body('weekStartDate')
    .notEmpty().withMessage('Week start date is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((date) => {
      // Ensure it's a Sunday
      const startDate = new Date(date);
      if (startDate.getDay() !== 0) {
        throw new Error('Week start date must be a Sunday');
      }
      return true;
    }),
  
  body('locations')
    .isArray({ min: 1 }).withMessage('At least one location is required')
    .custom((locations) => {
      return locations.every(id => mongoose.Types.ObjectId.isValid(id));
    }).withMessage('Invalid location ID format'),
  
  body('cutoffOverrides')
    .optional()
    .isObject().withMessage('Cutoff overrides must be an object'),
  
  body('cutoffOverrides.editCutoff')
    .optional()
    .isInt({ min: 1, max: 168 }).withMessage('Edit cutoff must be between 1 and 168 hours'),
  
  body('cutoffOverrides.swapDeadline')
    .optional()
    .isInt({ min: 1, max: 72 }).withMessage('Swap deadline must be between 1 and 72 hours'),
  
  body('cutoffOverrides.publishDeadline')
    .optional()
    .isInt({ min: 24, max: 336 }).withMessage('Publish deadline must be between 24 and 336 hours'),
  
  body('notes.internal')
    .optional()
    .isString().withMessage('Internal notes must be string')
    .isLength({ max: 1000 }).withMessage('Internal notes cannot exceed 1000 characters'),
  
  body('notes.public')
    .optional()
    .isString().withMessage('Public notes must be string')
    .isLength({ max: 500 }).withMessage('Public notes cannot exceed 500 characters')
];

const validateScheduleUpdate = [
  param('id')
    .isMongoId().withMessage('Invalid schedule ID'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived', 'cancelled']).withMessage('Invalid status'),
  
  body('notes')
    .optional()
    .isObject().withMessage('Notes must be an object')
];

const validateAddShift = [
  param('id')
    .isMongoId().withMessage('Invalid schedule ID'),
  
  body('shiftId')
    .notEmpty().withMessage('Shift ID is required')
    .isMongoId().withMessage('Invalid shift ID')
];

const validatePublish = [
  param('id')
    .isMongoId().withMessage('Invalid schedule ID'),
  
  body('notes')
    .optional()
    .isString().withMessage('Notes must be string')
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
];

const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format')
    .custom((endDate, { req }) => {
      if (req.query.startDate && new Date(endDate) <= new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
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
  validateScheduleCreate,
  validateScheduleUpdate,
  validateAddShift,
  validatePublish,
  validateDateRange,
  handleValidationErrors
};