const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('🔑 Token received:', token ? 'Yes' : 'No');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('📝 Decoded token:', decoded);
      
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        console.log('❌ User not found for ID:', decoded.id);
        return res.status(401).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      console.log('✅ User authenticated:', req.user.email, 'Role:', req.user.role);
      next();
    } catch (error) {
      console.error('❌ Auth error:', error.message);
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized' 
      });
    }
  }

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized, no token' 
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user has access to the location
const checkLocationAccess = async (req, res, next) => {
  try {
    // For admin, allow all access
    if (req.user.role === 'admin') {
      return next();
    }

    // For manager, check if they have access to the location
    let locationId = req.params.locationId || req.body.location || req.query.location;
    
    // If this is a delete/update request with shift ID, get location from the shift
    if (!locationId && req.params.id) {
      const Shift = require('../models/Shift');
      const shift = await Shift.findById(req.params.id);
      if (shift) {
        locationId = shift.location;
      }
    }

    if (!locationId) {
      return res.status(400).json({
        success: false,
        message: 'Location ID is required'
      });
    }

    // Check if the location is in manager's locations
    const hasAccess = req.user.locations?.some(id => id.toString() === locationId.toString());
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this location'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { protect, authorize, checkLocationAccess };