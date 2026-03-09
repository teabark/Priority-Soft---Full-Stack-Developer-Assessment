const express = require('express');
const Shift = require('../models/Shift'); 
const mongoose = require('mongoose');
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

// SIMPLE SHIFTS ENDPOINT - Works like the debug endpoint
router.get('/simple-list', protect, async (req, res) => {
  try {
    console.log('📡 Simple shifts requested by:', req.user.email);
    
    const db = mongoose.connection.db;
    
    // Build query based on user role
    let query = {};
    if (req.user.role === 'manager' && req.user.locations && req.user.locations.length > 0) {
      const locationIds = req.user.locations.map(id => 
        typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
      );
      query.location = { $in: locationIds };
    }
    
    // Get shifts
    const shifts = await db.collection('shifts').find(query).toArray();
    
    // Get locations for reference
    const locations = await db.collection('locations').find().toArray();
    const locationMap = {};
    locations.forEach(loc => {
      locationMap[loc._id.toString()] = {
        _id: loc._id,
        name: loc.name,
        code: loc.code,
        timezone: loc.timezone
      };
    });
    
    // Get users for staff reference
    const users = await db.collection('users').find().toArray();
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      };
    });
    
    // Format shifts
    const formattedShifts = shifts.map(shift => ({
      _id: shift._id,
      location: locationMap[shift.location?.toString()] || { name: 'Unknown', _id: shift.location },
      startTime: shift.startTime,
      endTime: shift.endTime,
      requiredSkill: shift.requiredSkill,
      requiredCount: shift.requiredCount,
      assignedStaff: (shift.assignedStaff || []).map(id => 
        userMap[id.toString()] || { name: 'Unknown', _id: id }
      ),
      status: shift.status || 'draft',
      isPremiumShift: shift.isPremiumShift || false,
      createdAt: shift.createdAt
    }));
    
    console.log(`✅ Found ${formattedShifts.length} shifts for ${req.user.email}`);
    
    res.json({
      success: true,
      count: formattedShifts.length,
      data: formattedShifts
    });
    
  } catch (error) {
    console.error('❌ Error in simple-list:', error);
    res.status(200).json({
      success: true,
      count: 0,
      data: []
    });
  }
});

// TEMPORARY SIMPLE SHIFTS ENDPOINT - Add this near the top of the file
router.get('/manager-shifts', protect, async (req, res) => {
  try {
    console.log('📡 Manager shifts requested by:', req.user.email);
    
    // Build query based on user role
    let query = {};
    if (req.user.role === 'manager') {
      // Managers see only their locations
      query.location = { $in: req.user.locations };
    }
    
    const shifts = await Shift.find(query)
      .populate('location', 'name timezone code')
      .populate('assignedStaff', 'name email')
      .sort({ startTime: -1 });
    
    console.log(`✅ Found ${shifts.length} shifts for manager`);
    
    res.status(200).json({
      success: true,
      count: shifts.length,
      data: shifts
    });
  } catch (error) {
    console.error('❌ Error in manager-shifts:', error);
    res.status(200).json({
      success: true,
      count: 0,
      data: []
    });
  }
});
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