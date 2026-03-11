const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");

// All routes require authentication
router.use(protect);

// @desc    Get all users
// @route   GET /api/users
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
router.post("/", authorize("admin"), async (req, res) => {
  try {
    const { name, email, password, role, locations, skills } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || "staff",
      locations: locations || [],
      skills: skills || [],
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        locations: user.locations,
        skills: user.skills,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("locations", "name code");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if manager has access to this user
    if (req.user.role === "manager" && user.role !== "staff") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this user",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin (managers can update staff at their locations)
router.put("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check permissions
    const isAdmin = req.user.role === "admin";
    const isManager = req.user.role === "manager";
    const isSelf = req.user.id === req.params.id;

    // Managers can only update staff at their locations
    if (isManager) {
      const canUpdate =
        user.role === "staff" &&
        user.locations?.some((loc) =>
          req.user.locations?.includes(loc.toString()),
        );

      if (!canUpdate && !isSelf) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this user",
        });
      }
    } else if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this user",
      });
    }

    // Update fields
    const { name, email, password, role, locations, skills } = req.body;

    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = password;
    if (role && isAdmin) user.role = role; // Only admins can change roles
    if (locations) user.locations = locations;
    if (skills) user.skills = skills;

    await user.save();

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        locations: user.locations,
        skills: user.skills,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, email, password, role, locations, skills } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password'
      });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    // Create user - the password will be hashed by the pre-save hook
    const user = await User.create({
      name,
      email,
      password, // This will trigger the pre-save hook
      role: role || 'staff',
      locations: locations || [],
      skills: skills || []
    });
    
    // Return user without password
    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        locations: user.locations,
        skills: user.skills
      }
    });
  } catch (error) {
    console.error('❌ Error creating user:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete("/:id", authorize("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    

    // Don't allow deleting yourself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    await user.deleteOne();

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
