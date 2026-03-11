const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Shift = require('../models/Shift');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const OvertimeService = require('../services/overtime.service');

// Initialize overtime service (will be set in server.js)
let overtimeService;

// Middleware to attach overtime service
router.use((req, res, next) => {
  if (!overtimeService) {
    // Get from app if not already set
    overtimeService = req.app.get('overtimeService');
  }
  next();
});

// @desc    Check overtime impact for a potential shift assignment
// @route   POST /api/overtime/check-assignment
// @access  Private (Managers, Admins)
router.post('/check-assignment', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { shiftId, staffId } = req.body;
    
    console.log('🔍 Checking overtime impact:', { shiftId, staffId });

    // Get the shift
    const shift = await Shift.findById(shiftId).populate('location');
    if (!shift) {
      return res.status(404).json({ 
        success: false, 
        message: 'Shift not found' 
      });
    }

    // Get overtime service
    const service = req.app.get('overtimeService') || overtimeService;
    if (!service) {
      return res.status(500).json({ 
        success: false, 
        message: 'Overtime service not initialized' 
      });
    }

    // Check the assignment
    const result = await service.checkShiftAssignment(shift, staffId);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error checking overtime:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Get weekly hours for a specific staff member
// @route   GET /api/overtime/staff/:staffId/weekly
// @access  Private (Managers, Admins)
router.get('/staff/:staffId/weekly', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { staffId } = req.params;
    const { date } = req.query;
    
    console.log('🔍 Getting weekly hours for staff:', staffId);

    const service = req.app.get('overtimeService') || overtimeService;
    if (!service) {
      return res.status(500).json({ 
        success: false, 
        message: 'Overtime service not initialized' 
      });
    }

    const targetDate = date ? new Date(date) : new Date();
    const weekly = await service.calculateWeeklyHours(staffId, targetDate);

    // Get staff details
    const staff = await User.findById(staffId).select('name email');

    // Ensure shifts is an array before mapping
    const shiftsArray = weekly.shifts || [];
    
    res.json({
      success: true,
      data: {
        staff: staff,
        weekStart: weekly.weekStart,
        weekEnd: weekly.weekEnd,
        weeklyHours: weekly.weeklyHours,
        shiftCount: shiftsArray.length,
        shifts: shiftsArray.map(s => ({
          id: s._id,
          date: s.startTime,
          location: s.location,
          hours: (s.duration || 0) / 60
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error getting weekly hours:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Get daily hours for a specific staff member
// @route   GET /api/overtime/staff/:staffId/daily
// @access  Private (Managers, Admins)
router.get('/staff/:staffId/daily', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { staffId } = req.params;
    const { date } = req.query; // Optional date parameter
    
    console.log('🔍 Getting daily hours for staff:', staffId);

    const service = req.app.get('overtimeService') || overtimeService;
    if (!service) {
      return res.status(500).json({ 
        success: false, 
        message: 'Overtime service not initialized' 
      });
    }

    const targetDate = date ? new Date(date) : new Date();
    const daily = await service.calculateDailyHours(staffId, targetDate);

    // Get staff details
    const staff = await User.findById(staffId).select('name email');

    res.json({
      success: true,
      data: {
        staff: staff,
        date: daily.date,
        dailyHours: daily.dailyHours,
        shiftCount: daily.shifts.length,
        shifts: daily.shifts.map(s => ({
          id: s._id,
          startTime: s.startTime,
          endTime: s.endTime,
          location: s.location,
          hours: (s.duration || 0) / 60
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error getting daily hours:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Check consecutive days for a staff member
// @route   GET /api/overtime/staff/:staffId/consecutive-days
// @access  Private (Managers, Admins)
router.get('/staff/:staffId/consecutive-days', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { staffId } = req.params;
    const { date } = req.query; // Optional date parameter
    
    console.log('🔍 Checking consecutive days for staff:', staffId);

    const service = req.app.get('overtimeService') || overtimeService;
    if (!service) {
      return res.status(500).json({ 
        success: false, 
        message: 'Overtime service not initialized' 
      });
    }

    const targetDate = date ? new Date(date) : new Date();
    const consecutive = await service.checkConsecutiveDays(staffId, targetDate);

    // Get staff details
    const staff = await User.findById(staffId).select('name email');

    res.json({
      success: true,
      data: {
        staff: staff,
        consecutiveDays: consecutive.consecutiveDays,
        dates: consecutive.dates,
        warning: consecutive.consecutiveDays >= 6,
        block: consecutive.consecutiveDays >= 7
      }
    });

  } catch (error) {
    console.error('❌ Error checking consecutive days:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Get overtime dashboard for manager
// @route   GET /api/overtime/dashboard
// @access  Private (Managers, Admins)
router.get('/dashboard', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    console.log('🔍 Getting overtime dashboard for manager:', req.user.id);

    const service = req.app.get('overtimeService');
    if (!service) {
      return res.status(500).json({ 
        success: false, 
        message: 'Overtime service not initialized' 
      });
    }

    // Get location IDs based on role
    let locationIds = [];
    if (req.user.role === 'manager') {
      locationIds = req.user.locations || [];
    } else if (req.user.role === 'admin') {
      const mongoose = require('mongoose');
      const Location = mongoose.model('Location');
      const locations = await Location.find();
      locationIds = locations.map(l => l._id);
    }
    
    console.log('📌 Location IDs:', locationIds);

    // Call the service method
    const dashboardData = await service.getLocationOvertimeReport(req.user.id, locationIds);
    
    // Ensure the data structure is correct
    const responseData = {
      totalOvertimeCost: dashboardData.totalOvertimeCost || 0,
      atRiskStaff: Array.isArray(dashboardData.atRiskStaff) ? dashboardData.atRiskStaff : [],
      warnings: Array.isArray(dashboardData.warnings) ? dashboardData.warnings : [],
      weeklySummary: Array.isArray(dashboardData.weeklySummary) ? dashboardData.weeklySummary : []
    };
    
    console.log('✅ Dashboard data prepared:', {
      atRiskCount: responseData.atRiskStaff.length,
      warningsCount: responseData.warnings.length
    });

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error in dashboard route:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Override 7-day consecutive work block
// @route   POST /api/overtime/override-consecutive
// @access  Private (Managers, Admins)
router.post('/override-consecutive', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { staffId, shiftId, reason } = req.body;
    
    console.log('🔍 Override request for consecutive days:', { staffId, shiftId, reason });

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'A detailed reason is required for override (minimum 10 characters)' 
      });
    }

    // Find the shift
    const shift = await Shift.findById(shiftId);
    if (!shift) {
      return res.status(404).json({ 
        success: false, 
        message: 'Shift not found' 
      });
    }

    // Add override to shift compliance history
    if (!shift.complianceWarnings) shift.complianceWarnings = [];
    shift.complianceWarnings.push({
      type: 'consecutive_days',
      severity: 'critical',
      message: `7-day consecutive work override by ${req.user.name}`,
      resolvedAt: new Date(),
      resolvedBy: req.user.id,
      notes: reason
    });

    shift.updatedBy = req.user.id;
    await shift.save();

    // Log the override
    console.log('✅ Consecutive days override recorded:', {
      staffId,
      shiftId,
      manager: req.user.id,
      reason
    });

    res.json({
      success: true,
      message: 'Override recorded successfully',
      data: {
        shiftId,
        overriddenBy: req.user.id,
        reason,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Error processing override:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;