const { body, param, query } = require('express-validator');
const Location = require('../models/Location');

const validateLocationCreate = [
  body('name')
    .notEmpty().withMessage('Location name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters')
    .trim()
    .custom(async (name) => {
      const existing = await Location.findOne({ name });
      if (existing) {
        throw new Error('Location name already exists');
      }
      return true;
    }),
  
  body('code')
    .notEmpty().withMessage('Location code is required')
    .isLength({ max: 10 }).withMessage('Code cannot exceed 10 characters')
    .isUppercase().withMessage('Code must be uppercase')
    .trim()
    .custom(async (code) => {
      const existing = await Location.findOne({ code });
      if (existing) {
        throw new Error('Location code already exists');
      }
      return true;
    }),
  
  body('address.street')
    .notEmpty().withMessage('Street address is required'),
  
  body('address.city')
    .notEmpty().withMessage('City is required'),
  
  body('address.state')
    .notEmpty().withMessage('State is required')
    .isLength({ min: 2, max: 2 }).withMessage('State must be 2 characters'),
  
  body('address.zipCode')
    .notEmpty().withMessage('Zip code is required')
    .matches(/^\d{5}(-\d{4})?$/).withMessage('Invalid zip code format'),
  
  body('timezone')
    .notEmpty().withMessage('Timezone is required')
    .isIn([
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Anchorage',
      'Pacific/Honolulu'
    ]).withMessage('Invalid timezone'),
  
  body('operatingHours')
    .isArray().withMessage('Operating hours must be an array')
    .custom((hours) => {
      // Should have exactly 7 days
      if (hours.length !== 7) {
        throw new Error('Operating hours must cover all 7 days');
      }
      
      // Check each day appears once
      const days = hours.map(h => h.dayOfWeek);
      const uniqueDays = [...new Set(days)];
      if (uniqueDays.length !== 7) {
        throw new Error('Each day of week must appear exactly once');
      }
      
      return true;
    })
];

const validateLocationUpdate = [
  param('id')
    .isMongoId().withMessage('Invalid location ID'),
  
  body('name')
    .optional()
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters')
    .trim(),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'maintenance', 'closed']).withMessage('Invalid status'),
  
  body('operatingHours')
    .optional()
    .isArray().withMessage('Operating hours must be an array')
];

const validateStaffAssignment = [
  param('id')
    .isMongoId().withMessage('Invalid location ID'),
  
  body('staffId')
    .notEmpty().withMessage('Staff ID is required')
    .isMongoId().withMessage('Invalid staff ID')
];

const validateTimezoneQuery = [
  query('timezone')
    .optional()
    .isIn([
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles'
    ]).withMessage('Invalid timezone')
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
  validateLocationCreate,
  validateLocationUpdate,
  validateStaffAssignment,
  validateTimezoneQuery,
  handleValidationErrors
};