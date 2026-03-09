const { body, param, validationResult } = require('express-validator');

const validateUserCreate = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters')
    .trim(),
  
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'staff']).withMessage('Invalid role'),
  
  body('skills')
    .optional()
    .isArray().withMessage('Skills must be an array')
    .custom((skills) => {
      const validSkills = ['bartender', 'line_cook', 'server', 'host', 'manager', 'dishwasher', 'busser'];
      return skills.every(skill => validSkills.includes(skill));
    }).withMessage('Invalid skill provided'),
  
  body('locations')
    .optional()
    .isArray().withMessage('Locations must be an array'),
  
  body('availability')
    .optional()
    .isArray().withMessage('Availability must be an array')
];

const validateUserUpdate = [
  param('id')
    .isMongoId().withMessage('Invalid user ID'),
  
  body('name')
    .optional()
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters')
    .trim(),
  
  body('email')
    .optional()
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('skills')
    .optional()
    .isArray().withMessage('Skills must be an array')
];

const validateCertification = [
  param('id')
    .isMongoId().withMessage('Invalid user ID'),
  
  body('locationId')
    .notEmpty().withMessage('Location ID is required')
    .isMongoId().withMessage('Invalid location ID'),
  
  body('reason')
    .optional()
    .isString().withMessage('Reason must be a string')
    .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters')
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
  validateUserCreate,
  validateUserUpdate,
  validateCertification,
  handleValidationErrors
};