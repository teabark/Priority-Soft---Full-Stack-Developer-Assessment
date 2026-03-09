const express = require('express');
const router = express.Router();
const {
  createShift,
  getShifts,
  getShift,
  updateShift,
  assignStaff,
  unassignStaff,
  publishShift,
  createSwapRequest,
  approveSwapRequest,
  rejectSwapRequest,
  getShiftsNeedingAttention,
  checkConflicts
} = require('../controllers/shift.controller');
const { protect, authorize, checkLocationAccess } = require('../middleware/auth');
const {
  validateShiftCreate,
  validateShiftUpdate,
  validateStaffAssignment,
  validateSwapRequest,
  validateDateRange,
  handleValidationErrors
} = require('../validations/shiftValidation');

// All routes require authentication
router.use(protect);

// Special routes first
router.get('/attention', authorize('admin', 'manager'), getShiftsNeedingAttention);
router.get('/range', validateDateRange, handleValidationErrors, getShifts);

// Shift CRUD
router.post(
  '/',
  authorize('admin', 'manager'),
  validateShiftCreate,
  handleValidationErrors,
  createShift
);

router.get('/', getShifts);
router.get('/:id', getShift);

router.put(
  '/:id',
  authorize('admin', 'manager'),
  checkLocationAccess,
  validateShiftUpdate,
  handleValidationErrors,
  updateShift
);

// Staff assignment
router.post(
  '/:id/assign',
  authorize('admin', 'manager'),
  checkLocationAccess,
  validateStaffAssignment,
  handleValidationErrors,
  assignStaff
);

router.post(
  '/:id/unassign',
  authorize('admin', 'manager'),
  checkLocationAccess,
  validateStaffAssignment,
  handleValidationErrors,
  unassignStaff
);

// Publishing
router.post(
  '/:id/publish',
  authorize('admin', 'manager'),
  checkLocationAccess,
  publishShift
);

// Swap requests
router.post(
  '/:id/swap-request',
  authorize('staff', 'manager', 'admin'),
  validateSwapRequest,
  handleValidationErrors,
  createSwapRequest
);

router.post(
  '/:id/swap-request/:requestId/approve',
  authorize('admin', 'manager'),
  checkLocationAccess,
  approveSwapRequest
);

router.post(
  '/:id/swap-request/:requestId/reject',
  authorize('admin', 'manager'),
  checkLocationAccess,
  rejectSwapRequest
);

// Conflict checking
router.get(
  '/:id/conflicts',
  authorize('admin', 'manager'),
  checkLocationAccess,
  checkConflicts
);

module.exports = router;