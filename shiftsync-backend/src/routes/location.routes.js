const express = require('express');
const router = express.Router();
const {
  createLocation,
  getLocations,
  getLocation,
  updateLocation,
  deleteLocation,
  assignStaff,
  removeStaff,
  getOnDutyStaff,
  validateOperatingHours
} = require('../controllers/location.controller');
const { protect, authorize, checkLocationAccess } = require('../middleware/auth');
const {
  validateLocationCreate,
  validateLocationUpdate,
  validateStaffAssignment,
  validateTimezoneQuery,
  handleValidationErrors
} = require('../validations/locationValidation');

// All routes require authentication
router.use(protect);

// GET routes
router.get('/', validateTimezoneQuery, handleValidationErrors, getLocations);
router.get('/:id', getLocation);
router.get('/:id/on-duty', getOnDutyStaff);
router.get('/:id/validate-hours', authorize('admin'), validateOperatingHours);

// POST routes
router.post(
  '/',
  authorize('admin'),
  validateLocationCreate,
  handleValidationErrors,
  createLocation
);

router.post(
  '/:id/staff',
  authorize('admin', 'manager'),
  checkLocationAccess,
  validateStaffAssignment,
  handleValidationErrors,
  assignStaff
);

// PUT routes
router.put(
  '/:id',
  authorize('admin'),
  validateLocationUpdate,
  handleValidationErrors,
  updateLocation
);


// DELETE routes
router.delete(
  '/:id',
  authorize('admin'),
  deleteLocation // Use the controller function
);

router.delete(
  '/:id/staff/:staffId',
  authorize('admin', 'manager'),
  checkLocationAccess,
  removeStaff
);

module.exports = router;