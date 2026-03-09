const Location = require('../models/Location');
const User = require('../models/User');

// @desc    Create new location
// @route   POST /api/locations
// @access  Private/Admin
const createLocation = async (req, res) => {
  try {
    // Add creator info
    req.body.createdBy = req.user.id;
    req.body.updatedBy = req.user.id;
    
    const location = await Location.create(req.body);
    
    res.status(201).json({
      success: true,
      data: location
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all locations
// @route   GET /api/locations
// @access  Private
const getLocations = async (req, res) => {
  try {
    let query = {};
    
    // Filter by timezone if provided
    if (req.query.timezone) {
      query = {
        $or: [
          { timezone: req.query.timezone },
          { 'timezoneBoundary.alternateTimezone': req.query.timezone }
        ]
      };
    }
    
    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Managers see only their locations
    if (req.user.role === 'manager') {
      query._id = { $in: req.user.locations };
    }
    
    const locations = await Location.find(query)
      .populate('managers', 'name email')
      .populate('staff.user', 'name email skills');
    
    res.status(200).json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single location
// @route   GET /api/locations/:id
// @access  Private
const getLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id)
      .populate('managers', 'name email')
      .populate('staff.user', 'name email skills certifications');
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update location
// @route   PUT /api/locations/:id
// @access  Private/Admin
const updateLocation = async (req, res) => {
  try {
    req.body.updatedBy = req.user.id;
    
    const location = await Location.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Assign staff to location
// @route   POST /api/locations/:id/staff
// @access  Private/Admin/Manager
const assignStaff = async (req, res) => {
  try {
    const { staffId } = req.body;
    
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
    
    const staff = await User.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }
    
    await location.assignStaff(staffId, req.user.id);
    
    // Also certify the staff for this location
    await staff.certifyForLocation(location._id, req.user.id);
    
    res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Remove staff from location
// @route   DELETE /api/locations/:id/staff/:staffId
// @access  Private/Admin/Manager
const removeStaff = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
    
    const staff = await User.findById(req.params.staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }
    
    await location.removeStaff(req.params.staffId, req.user.id);
    
    // Decertify from location
    await staff.decertifyFromLocation(
      location._id,
      'Removed from location',
      req.user.id
    );
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get location's current on-duty staff
// @route   GET /api/locations/:id/on-duty
// @access  Private
const getOnDutyStaff = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id)
      .populate({
        path: 'onDutyStaff',
        populate: {
          path: 'assignedStaff',
          select: 'name email skills'
        }
      });
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: location.onDutyStaff
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Validate location's operating hours
// @route   GET /api/locations/:id/validate-hours
// @access  Private/Admin
const validateOperatingHours = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
    
    const errors = location.validateOperatingHours();
    
    res.status(200).json({
      success: true,
      isValid: errors.length === 0,
      errors
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createLocation,
  getLocations,
  getLocation,
  updateLocation,
  assignStaff,
  removeStaff,
  getOnDutyStaff,
  validateOperatingHours
};