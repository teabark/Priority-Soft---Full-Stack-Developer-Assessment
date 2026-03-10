const express = require('express');
const router = express.Router();
const OvertimeService = require('../services/overtime.service');
const { protect, authorize } = require('../middleware/auth');

const overtimeService = new OvertimeService();

// @desc    Get overtime report for current user
// @route   GET /api/overtime/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const { weekStart } = req.query;
    const startDate = weekStart ? new Date(weekStart) : new Date();
    
    const report = await overtimeService.calculateWeeklyHours(req.user.id, startDate);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error getting overtime report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get overtime report for a location (manager only)
// @route   GET /api/overtime/location/:locationId
// @access  Private/Manager
router.get('/location/:locationId', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { weekStart } = req.query;
    const startDate = weekStart ? new Date(weekStart) : new Date();
    
    const report = await overtimeService.getLocationOvertimeReport(req.params.locationId, startDate);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error getting location overtime report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Check shift impact before assignment
// @route   POST /api/overtime/check-shift
// @access  Private/Manager
router.post('/check-shift', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { shift, staffId } = req.body;
    
    const impact = await overtimeService.checkShiftImpact(shift, staffId);
    
    res.json({
      success: true,
      data: impact
    });
  } catch (error) {
    console.error('Error checking shift impact:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;