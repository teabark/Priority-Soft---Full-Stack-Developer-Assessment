const Shift = require('../models/Shift');
const User = require('../models/User');
const Location = require('../models/Location');

// @desc    Create new shift
// @route   POST /api/shifts
// @access  Private/Manager/Admin
const createShift = async (req, res) => {
  try {
    // Add creator info
    req.body.createdBy = req.user.id;
    req.body.updatedBy = req.user.id;
    
    // Check if location exists and user has access
    const location = await Location.findById(req.body.location);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
    
    // Check if it's a premium shift
    req.body.isPremiumShift = location.isPremiumShift(req.body.startTime, req.body.endTime);
    
    const shift = await Shift.create(req.body);
    
    // Emit real-time update
    const io = req.app.get('io');
    io.to(`location-${shift.location}`).emit('shiftCreated', shift);
    
    res.status(201).json({
      success: true,
      data: shift
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all shifts
// @route   GET /api/shifts
// @access  Private
const getShifts = async (req, res) => {
  try {
    const { startDate, endDate, location, status } = req.query;
    const query = {};
    
    // Date range filter
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }
    
    // Location filter
    if (location) {
      query.location = location;
    } else if (req.user.role === 'manager') {
      // Managers see only their locations
      query.location = { $in: req.user.locations };
    }
    
    // Status filter
    if (status) {
      query.status = status;
    }
    
    const shifts = await Shift.find(query)
      .populate('location', 'name timezone code')
      .populate('assignedStaff', 'name email skills')
      .populate('createdBy', 'name email')
      .sort({ startTime: 1 });
    
    res.status(200).json({
      success: true,
      count: shifts.length,
      data: shifts
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single shift
// @route   GET /api/shifts/:id
// @access  Private
const getShift = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id)
      .populate('location', 'name timezone code operatingHours')
      .populate('assignedStaff', 'name email skills certifications')
      .populate('swapRequests.requestingStaff', 'name email')
      .populate('swapRequests.targetStaff', 'name email')
      .populate('history.performedBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: shift
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update shift
// @route   PUT /api/shifts/:id
// @access  Private/Manager/Admin
const updateShift = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    // Check if shift is editable
    if (!shift.isEditable) {
      return res.status(400).json({
        success: false,
        message: 'Shift cannot be edited within 48 hours of start time'
      });
    }
    
    // Track changes for audit
    const changes = {};
    Object.keys(req.body).forEach(key => {
      if (shift[key] !== req.body[key]) {
        changes[key] = { from: shift[key], to: req.body[key] };
      }
    });
    
    // Update
    req.body.updatedBy = req.user.id;
    const updatedShift = await Shift.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    // Add to history
    updatedShift.history.push({
      action: 'updated',
      performedBy: req.user.id,
      timestamp: new Date(),
      changes
    });
    await updatedShift.save();
    
    // Emit real-time update
    const io = req.app.get('io');
    io.to(`location-${updatedShift.location}`).emit('shiftUpdated', updatedShift);
    
    res.status(200).json({
      success: true,
      data: updatedShift
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Assign staff to shift
// @route   POST /api/shifts/:id/assign
// @access  Private/Manager/Admin
const assignStaff = async (req, res) => {
  try {
    const { staffId } = req.body;
    
    const shift = await Shift.findById(req.params.id);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    const staff = await User.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }
    
    await shift.assignStaff(staffId, req.user.id);
    
    // Emit real-time update
    const io = req.app.get('io');
    io.to(`location-${shift.location}`).emit('staffAssigned', {
      shiftId: shift._id,
      staffId
    });
    
    res.status(200).json({
      success: true,
      data: shift
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Unassign staff from shift
// @route   POST /api/shifts/:id/unassign
// @access  Private/Manager/Admin
const unassignStaff = async (req, res) => {
  try {
    const { staffId, reason } = req.body;
    
    const shift = await Shift.findById(req.params.id);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    await shift.unassignStaff(staffId, req.user.id, reason);
    
    // Emit real-time update
    const io = req.app.get('io');
    io.to(`location-${shift.location}`).emit('staffUnassigned', {
      shiftId: shift._id,
      staffId
    });
    
    res.status(200).json({
      success: true,
      data: shift
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Publish shift
// @route   POST /api/shifts/:id/publish
// @access  Private/Manager/Admin
const publishShift = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    shift.status = 'published';
    shift.publishedAt = new Date();
    shift.publishedBy = req.user.id;
    shift.history.push({
      action: 'published',
      performedBy: req.user.id,
      timestamp: new Date()
    });
    
    await shift.save();
    
    // Emit real-time update to all staff at this location
    const io = req.app.get('io');
    io.to(`location-${shift.location}`).emit('shiftPublished', shift);
    
    res.status(200).json({
      success: true,
      data: shift
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create swap request
// @route   POST /api/shifts/:id/swap-request
// @access  Private/Staff
const createSwapRequest = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    // Check if shift is published
    if (shift.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Can only request swap for published shifts'
      });
    }
    
    const swapRequest = await shift.createSwapRequest({
      ...req.body,
      requestingStaff: req.user.id // Ensure requesting staff is current user
    });
    
    // Notify managers
    const io = req.app.get('io');
    io.to(`location-${shift.location}-managers`).emit('swapRequestCreated', {
      shiftId: shift._id,
      request: swapRequest
    });
    
    res.status(201).json({
      success: true,
      data: swapRequest
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Approve swap request
// @route   POST /api/shifts/:id/swap-request/:requestId/approve
// @access  Private/Manager/Admin
const approveSwapRequest = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    const request = await shift.approveSwapRequest(req.params.requestId, req.user.id);
    
    // Emit updates
    const io = req.app.get('io');
    io.to(`location-${shift.location}`).emit('swapRequestApproved', {
      shiftId: shift._id,
      requestId: req.params.requestId
    });
    
    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Reject swap request
// @route   POST /api/shifts/:id/swap-request/:requestId/reject
// @access  Private/Manager/Admin
const rejectSwapRequest = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    const request = await shift.rejectSwapRequest(
      req.params.requestId, 
      req.user.id,
      req.body.reason
    );
    
    // Emit updates
    const io = req.app.get('io');
    io.to(`location-${shift.location}`).emit('swapRequestRejected', {
      shiftId: shift._id,
      requestId: req.params.requestId
    });
    
    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get shifts needing attention
// @route   GET /api/shifts/attention
// @access  Private/Manager/Admin
const getShiftsNeedingAttention = async (req, res) => {
  try {
    const shifts = await Shift.getShiftsNeedingAttention()
      .populate('location', 'name code')
      .populate('assignedStaff', 'name email')
      .populate('swapRequests.requestingStaff', 'name email');
    
    res.status(200).json({
      success: true,
      count: shifts.length,
      data: shifts
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Check shift for conflicts
// @route   GET /api/shifts/:id/conflicts
// @access  Private/Manager/Admin
const checkConflicts = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    const conflicts = await shift.findConflicts();
    
    res.status(200).json({
      success: true,
      hasConflicts: conflicts.length > 0,
      conflicts
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
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
};