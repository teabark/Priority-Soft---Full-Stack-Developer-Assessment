const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const validateShiftCreate = [
  body('location')
    .notEmpty().withMessage('Location is required')
    .isMongoId().withMessage('Invalid location ID'),
  
  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Invalid date format'),
  
  body('startTime')
    .notEmpty().withMessage('Start time is required')
    .isISO8601().withMessage('Invalid start time format'),
  
  body('endTime')
    .notEmpty().withMessage('End time is required')
    .isISO8601().withMessage('Invalid end time format')
    .custom((endTime, { req }) => {
      if (new Date(endTime) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  
  body('requiredSkill')
    .notEmpty().withMessage('Required skill is required')
    .isIn(['bartender', 'line_cook', 'server', 'host', 'manager', 'dishwasher', 'busser'])
    .withMessage('Invalid skill'),
  
  body('requiredCount')
    .notEmpty().withMessage('Required count is required')
    .isInt({ min: 1, max: 10 }).withMessage('Required count must be between 1 and 10'),
  
  body('assignedStaff')
    .optional()
    .isArray().withMessage('Assigned staff must be an array')
    .custom((staff) => {
      return staff.every(id => mongoose.Types.ObjectId.isValid(id));
    }).withMessage('Invalid staff ID format'),
  
  body('managerNotes')
    .optional()
    .isString().withMessage('Notes must be string')
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
];

const validateShiftUpdate = [
  param('id')
    .isMongoId().withMessage('Invalid shift ID'),
  
  body('requiredSkill')
    .optional()
    .isIn(['bartender', 'line_cook', 'server', 'host', 'manager', 'dishwasher', 'busser'])
    .withMessage('Invalid skill'),
  
  body('requiredCount')
    .optional()
    .isInt({ min: 1, max: 10 }).withMessage('Required count must be between 1 and 10'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Invalid status')
];

const validateStaffAssignment = [
  param('id')
    .isMongoId().withMessage('Invalid shift ID'),
  
  body('staffId')
    .notEmpty().withMessage('Staff ID is required')
    .isMongoId().withMessage('Invalid staff ID')
];

const validateSwapRequest = [
  param('id')
    .isMongoId().withMessage('Invalid shift ID'),
  
  body('requestingStaff')
    .notEmpty().withMessage('Requesting staff is required')
    .isMongoId().withMessage('Invalid requesting staff ID'),
  
  body('targetStaff')
    .optional()
    .isMongoId().withMessage('Invalid target staff ID'),
  
  body('type')
    .notEmpty().withMessage('Request type is required')
    .isIn(['swap', 'drop', 'pickup']).withMessage('Invalid request type'),
  
  body('notes')
    .optional()
    .isString().withMessage('Notes must be string')
    .isLength({ max: 300 }).withMessage('Notes cannot exceed 300 characters')
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
  validateShiftCreate,
  validateShiftUpdate,
  validateStaffAssignment,
  validateSwapRequest,
  validateDateRange,
  handleValidationErrors
};