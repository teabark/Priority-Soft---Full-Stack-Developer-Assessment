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

// @desc    Publish a week's schedule
// @route   POST /api/schedules/publish-week
// @access  Private (Manager/Admin)
router.post('/publish-week', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { weekStartDate, locationIds } = req.body;
    
    const weekStart = new Date(weekStartDate);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Find all shifts in this week for these locations
    const Shift = require('../models/Shift');
    const shifts = await Shift.find({
      location: { $in: locationIds },
      startTime: { $gte: weekStart, $lte: weekEnd }
    });
    
    // Update all shifts to published
    const shiftIds = [];
    for (const shift of shifts) {
      shift.status = 'published';
      shift.publishedAt = new Date();
      shift.publishedBy = req.user.id;
      await shift.save();
      shiftIds.push(shift._id);
    }
    
    // Create or update schedule record
    const Schedule = require('../models/Schedule');
    let schedule = await Schedule.findOne({ weekStartDate: weekStart });
    
    if (schedule) {
      schedule.status = 'published';
      schedule.publishedAt = new Date();
      schedule.publishedBy = req.user.id;
      schedule.shifts = shiftIds;
    } else {
      schedule = new Schedule({
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        locations: locationIds,
        status: 'published',
        publishedAt: new Date(),
        publishedBy: req.user.id,
        shifts: shiftIds,
        createdBy: req.user.id
      });
    }
    
    await schedule.save();
    
    // Send notifications to staff
    const notificationHelper = req.app.get('notificationHelper');
    const staffIds = [...new Set(shifts.flatMap(s => s.assignedStaff))];
    
    if (notificationHelper && staffIds.length > 0) {
      await notificationHelper.notifySchedulePublished(schedule, staffIds);
    }
    
    res.json({
      success: true,
      data: {
        schedule,
        publishedCount: shifts.length
      },
      message: `Published ${shifts.length} shifts`
    });
  } catch (error) {
    console.error('Error publishing week:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Unpublish a week's schedule
// @route   POST /api/schedules/unpublish-week
// @access  Private (Manager/Admin)
router.post('/unpublish-week', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { weekStartDate, locationIds } = req.body;
    
    const weekStart = new Date(weekStartDate);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Find all published shifts in this week
    const Shift = require('../models/Shift');
    const shifts = await Shift.find({
      location: { $in: locationIds },
      startTime: { $gte: weekStart, $lte: weekEnd },
      status: 'published'
    });
    
    // Update all shifts back to draft
    for (const shift of shifts) {
      shift.status = 'draft';
      shift.publishedAt = null;
      shift.publishedBy = null;
      await shift.save();
    }
    
    // Update schedule record
    const Schedule = require('../models/Schedule');
    const schedule = await Schedule.findOne({ weekStartDate: weekStart });
    if (schedule) {
      schedule.status = 'draft';
      schedule.publishedAt = null;
      schedule.publishedBy = null;
      await schedule.save();
    }
    
    res.json({
      success: true,
      data: {
        unpublishedCount: shifts.length
      },
      message: `Unpublished ${shifts.length} shifts`
    });
  } catch (error) {
    console.error('Error unpublishing week:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

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