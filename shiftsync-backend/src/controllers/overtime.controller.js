const OvertimeService = require('../services/overtime.service');

// @desc    Get overtime dashboard
// @route   GET /api/overtime/dashboard
// @access  Private (Manager/Admin)
exports.getDashboard = async (req, res) => {
  try {
    console.log('📊 Overtime dashboard requested by:', req.user.id);
    console.log('📊 User role:', req.user.role);
    console.log('📊 User locations:', req.user.locations);
    
    const overtimeService = req.app.get('overtimeService');
    
    if (!overtimeService) {
      console.error('❌ Overtime service not found in app');
      return res.status(500).json({ 
        success: false, 
        message: 'Overtime service not initialized' 
      });
    }
    
    let locationIds = [];
    if (req.user.role === 'manager') {
      locationIds = req.user.locations || [];
    } else if (req.user.role === 'admin') {
      const Location = require('../models/Location');
      const locations = await Location.find();
      locationIds = locations.map(l => l._id);
    }
    
    console.log('📊 Location IDs:', locationIds);
    
    const dashboardData = await overtimeService.getDashboardData(req.user.id, locationIds);
    
    console.log('✅ Dashboard data retrieved successfully');
    
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('❌ Error in getDashboard:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};