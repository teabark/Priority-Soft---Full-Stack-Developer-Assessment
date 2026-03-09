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

// Check if user has access to a specific location
const checkLocationAccess = (req, res, next) => {
  const locationId = req.params.locationId || req.body.location;
  
  if (req.user.role === 'admin') {
    return next();
  }
  
  if (req.user.role === 'manager' && 
      req.user.locations.some(loc => loc.toString() === locationId)) {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Not authorized to access this location'
  });
};

module.exports = { protect, authorize, checkLocationAccess };