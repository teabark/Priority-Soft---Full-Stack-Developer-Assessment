const express = require('express');
const router = express.Router();
const {
  createSchedule,
  getSchedules,
  getSchedule,
  updateSchedule,
  addShiftToSchedule,
  removeShiftFromSchedule,
  publishSchedule,
  unpublishSchedule,
  getScheduleStats,
  getManagerDashboard,
  compareSchedules,
  getLocationHistory,
  getCurrentWeekSchedule
} = require('../controllers/schedule.controller');
const { protect, authorize, checkLocationAccess } = require('../middleware/auth');
const {
  validateScheduleCreate,
  validateScheduleUpdate,
  validateAddShift,
  validatePublish,
  validateDateRange,
  handleValidationErrors
} = require('../validations/scheduleValidation');

// All routes require authentication
router.use(protect);

// Special routes first
router.get('/history/location/:locationId', authorize('admin', 'manager'), getLocationHistory);
router.get('/current/:locationId', getCurrentWeekSchedule);
router.get('/compare/:id1/:id2', authorize('admin', 'manager'), compareSchedules);

// CRUD routes
router.post(
  '/',
  authorize('admin', 'manager'),
  validateScheduleCreate,
  handleValidationErrors,
  createSchedule
);

router.get('/', validateDateRange, handleValidationErrors, getSchedules);
router.get('/:id', getSchedule);
router.get('/:id/stats', authorize('admin', 'manager'), getScheduleStats);
router.get('/:id/dashboard', authorize('admin', 'manager'), getManagerDashboard);

router.put(
  '/:id',
  authorize('admin', 'manager'),
  checkLocationAccess,
  validateScheduleUpdate,
  handleValidationErrors,
  updateSchedule
);

// Shift management
router.post(
  '/:id/shifts',
  authorize('admin', 'manager'),
  checkLocationAccess,
  validateAddShift,
  handleValidationErrors,
  addShiftToSchedule
);

router.delete(
  '/:id/shifts/:shiftId',
  authorize('admin', 'manager'),
  checkLocationAccess,
  removeShiftFromSchedule
);

// Publishing
router.post(
  '/:id/publish',
  authorize('admin', 'manager'),
  checkLocationAccess,
  validatePublish,
  handleValidationErrors,
  publishSchedule
);

router.post(
  '/:id/unpublish',
  authorize('admin', 'manager'),
  checkLocationAccess,
  validatePublish,
  handleValidationErrors,
  unpublishSchedule
);

module.exports = router;