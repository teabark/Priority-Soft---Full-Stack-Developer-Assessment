const Schedule = require('../models/Schedule');
const Shift = require('../models/Shift');
const Location = require('../models/Location');

// @desc    Create new schedule
// @route   POST /api/schedules
// @access  Private/Manager/Admin
const createSchedule = async (req, res) => {
  try {
    // Check if schedule already exists for this week and locations
    const existingSchedule = await Schedule.findOne({
      weekStartDate: new Date(req.body.weekStartDate),
      locations: { $in: req.body.locations }
    });
    
    if (existingSchedule) {
      return res.status(400).json({
        success: false,
        message: 'Schedule already exists for this week and location(s)'
      });
    }
    
    // Add creator info
    req.body.createdBy = req.user.id;
    req.body.updatedBy = req.user.id;
    
    const schedule = await Schedule.create(req.body);
    
    // Emit real-time update
    const io = req.app.get('io');
    schedule.locations.forEach(locId => {
      io.to(`location-${locId}`).emit('scheduleCreated', schedule);
    });
    
    res.status(201).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all schedules
// @route   GET /api/schedules
// @access  Private
const getSchedules = async (req, res) => {
  try {
    const { startDate, endDate, location, status } = req.query;
    const query = {};
    
    // Date range filter
    if (startDate || endDate) {
      query.weekStartDate = {};
      if (startDate) query.weekStartDate.$gte = new Date(startDate);
      if (endDate) query.weekStartDate.$lte = new Date(endDate);
    }
    
    // Location filter
    if (location) {
      query.locations = location;
    } else if (req.user.role === 'manager') {
      // Managers see only their locations
      query.locations = { $in: req.user.locations };
    }
    
    // Status filter
    if (status) {
      query.status = status;
    }
    
    const schedules = await Schedule.find(query)
      .populate('locations', 'name code timezone')
      .populate('publishedBy', 'name email')
      .populate('createdBy', 'name email')
      .sort({ weekStartDate: -1 });
    
    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single schedule
// @route   GET /api/schedules/:id
// @access  Private
const getSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('locations', 'name code timezone operatingHours')
      .populate({
        path: 'shifts',
        populate: [
          { path: 'location', select: 'name timezone' },
          { path: 'assignedStaff', select: 'name email skills' },
          { path: 'swapRequests.requestingStaff', select: 'name email' },
          { path: 'swapRequests.targetStaff', select: 'name email' }
        ]
      })
      .populate('publishedBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('versionHistory.publishedBy', 'name email');
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    // If staff member, return filtered view
    if (req.user.role === 'staff') {
      const staffView = schedule.getStaffView(req.user.id);
      return res.status(200).json({
        success: true,
        data: staffView
      });
    }
    
    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update schedule
// @route   PUT /api/schedules/:id
// @access  Private/Manager/Admin
const updateSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    // Check if schedule is editable
    if (!schedule.isEditable) {
      return res.status(400).json({
        success: false,
        message: 'Schedule is no longer editable'
      });
    }
    
    req.body.updatedBy = req.user.id;
    
    const updatedSchedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    // Emit real-time update
    const io = req.app.get('io');
    updatedSchedule.locations.forEach(locId => {
      io.to(`location-${locId}`).emit('scheduleUpdated', updatedSchedule);
    });
    
    res.status(200).json({
      success: true,
      data: updatedSchedule
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add shift to schedule
// @route   POST /api/schedules/:id/shifts
// @access  Private/Manager/Admin
const addShiftToSchedule = async (req, res) => {
  try {
    const { shiftId } = req.body;
    
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    const shift = await Shift.findById(shiftId);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    // Check if shift belongs to one of the schedule's locations
    if (!schedule.locations.includes(shift.location)) {
      return res.status(400).json({
        success: false,
        message: 'Shift location does not match schedule locations'
      });
    }
    
    await schedule.addShift(shiftId, req.user.id);
    
    // Recalculate stats and compliance
    await schedule.calculateStats();
    await schedule.checkCompliance();
    await schedule.calculateFairnessMetrics();
    
    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Remove shift from schedule
// @route   DELETE /api/schedules/:id/shifts/:shiftId
// @access  Private/Manager/Admin
const removeShiftFromSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    await schedule.removeShift(
      req.params.shiftId, 
      req.user.id, 
      req.query.reason
    );
    
    // Recalculate stats and compliance
    await schedule.calculateStats();
    await schedule.checkCompliance();
    await schedule.calculateFairnessMetrics();
    
    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Publish schedule
// @route   POST /api/schedules/:id/publish
// @access  Private/Manager/Admin
const publishSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    // Final compliance check
    await schedule.checkCompliance();
    
    if (schedule.complianceSummary?.criticalIssues?.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish due to critical compliance issues',
        issues: schedule.complianceSummary.criticalIssues
      });
    }
    
    await schedule.publish(req.user.id, req.body.notes);
    
    // Notify all staff at these locations
    const io = req.app.get('io');
    schedule.locations.forEach(locId => {
      io.to(`location-${locId}`).emit('schedulePublished', {
        scheduleId: schedule._id,
        weekStart: schedule.weekStartDate
      });
    });
    
    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Unpublish schedule
// @route   POST /api/schedules/:id/unpublish
// @access  Private/Manager/Admin
const unpublishSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    await schedule.unpublish(req.user.id, req.body.reason);
    
    // Notify all staff at these locations
    const io = req.app.get('io');
    schedule.locations.forEach(locId => {
      io.to(`location-${locId}`).emit('scheduleUnpublished', {
        scheduleId: schedule._id,
        reason: req.body.reason
      });
    });
    
    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get schedule statistics
// @route   GET /api/schedules/:id/stats
// @access  Private/Manager/Admin
const getScheduleStats = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    // Refresh stats
    await schedule.calculateStats();
    await schedule.calculateFairnessMetrics();
    
    res.status(200).json({
      success: true,
      data: {
        stats: schedule.stats,
        fairness: schedule.fairnessMetrics,
        compliance: schedule.complianceSummary
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get manager dashboard
// @route   GET /api/schedules/:id/dashboard
// @access  Private/Manager/Admin
const getManagerDashboard = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    const dashboard = await schedule.getManagerDashboard();
    
    res.status(200).json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Compare two schedules
// @route   GET /api/schedules/compare/:id1/:id2
// @access  Private/Manager/Admin
const compareSchedules = async (req, res) => {
  try {
    const comparison = await Schedule.compareSchedules(
      req.params.id1,
      req.params.id2
    );
    
    res.status(200).json({
      success: true,
      data: comparison
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get schedule history for location
// @route   GET /api/schedules/history/location/:locationId
// @access  Private/Manager/Admin
const getLocationHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const schedules = await Schedule.getHistoryForLocation(
      req.params.locationId,
      limit
    );
    
    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current week schedule
// @route   GET /api/schedules/current/:locationId
// @access  Private
const getCurrentWeekSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.getCurrentWeekForLocation(req.params.locationId)
      .populate({
        path: 'shifts',
        populate: [
          { path: 'assignedStaff', select: 'name email' },
          { path: 'location', select: 'name timezone' }
        ]
      });
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'No schedule found for current week'
      });
    }
    
    // If staff, return filtered view
    if (req.user.role === 'staff') {
      const staffView = schedule.getStaffView(req.user.id);
      return res.status(200).json({
        success: true,
        data: staffView
      });
    }
    
    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
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
};