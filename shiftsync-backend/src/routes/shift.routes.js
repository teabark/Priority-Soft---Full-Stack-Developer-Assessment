const express = require("express");
const Shift = require("../models/Shift");
const mongoose = require("mongoose");
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
  checkConflicts,
} = require("../controllers/shift.controller");
const {
  protect,
  authorize,
  checkLocationAccess,
} = require("../middleware/auth");
const {
  validateShiftCreate,
  validateShiftUpdate,
  validateStaffAssignment,
  validateSwapRequest,
  validateDateRange,
  handleValidationErrors,
} = require("../validations/shiftValidation");

// All routes require authentication
router.use(protect);

// Special routes first

// SIMPLE SHIFTS ENDPOINT - Works like the debug endpoint
router.get("/simple-list", protect, async (req, res) => {
  try {
    console.log("📡 Simple shifts requested by:", req.user.email);

    const db = mongoose.connection.db;

    // Build query based on user role
    let query = {};
    if (
      req.user.role === "manager" &&
      req.user.locations &&
      req.user.locations.length > 0
    ) {
      const locationIds = req.user.locations.map((id) =>
        typeof id === "string" ? new mongoose.Types.ObjectId(id) : id,
      );
      query.location = { $in: locationIds };
    }

    // Get shifts
    const shifts = await db.collection("shifts").find(query).toArray();

    // Get locations for reference
    const locations = await db.collection("locations").find().toArray();
    const locationMap = {};
    locations.forEach((loc) => {
      locationMap[loc._id.toString()] = {
        _id: loc._id,
        name: loc.name,
        code: loc.code,
        timezone: loc.timezone,
      };
    });

    // Get users for staff reference
    const users = await db.collection("users").find().toArray();
    const userMap = {};
    users.forEach((user) => {
      userMap[user._id.toString()] = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    });

    // Format shifts
    const formattedShifts = shifts.map((shift) => ({
      _id: shift._id,
      location: locationMap[shift.location?.toString()] || {
        name: "Unknown",
        _id: shift.location,
      },
      startTime: shift.startTime,
      endTime: shift.endTime,
      requiredSkill: shift.requiredSkill,
      requiredCount: shift.requiredCount,
      assignedStaff: (shift.assignedStaff || []).map(
        (id) => userMap[id.toString()] || { name: "Unknown", _id: id },
      ),
      status: shift.status || "draft",
      isPremiumShift: shift.isPremiumShift || false,
      createdAt: shift.createdAt,
    }));

    console.log(
      `✅ Found ${formattedShifts.length} shifts for ${req.user.email}`,
    );

    res.json({
      success: true,
      count: formattedShifts.length,
      data: formattedShifts,
    });
  } catch (error) {
    console.error("❌ Error in simple-list:", error);
    res.status(200).json({
      success: true,
      count: 0,
      data: [],
    });
  }
});

// TEMPORARY SIMPLE SHIFTS ENDPOINT - Add this near the top of the file
router.get("/manager-shifts", protect, async (req, res) => {
  try {
    console.log("📡 Manager shifts requested by:", req.user.email);

    // Build query based on user role
    let query = {};
    if (req.user.role === "manager") {
      // Managers see only their locations
      query.location = { $in: req.user.locations };
    }

    const shifts = await Shift.find(query)
      .populate("location", "name timezone code")
      .populate("assignedStaff", "name email")
      .sort({ startTime: -1 });

    console.log(`✅ Found ${shifts.length} shifts for manager`);

    res.status(200).json({
      success: true,
      count: shifts.length,
      data: shifts,
    });
  } catch (error) {
    console.error("❌ Error in manager-shifts:", error);
    res.status(200).json({
      success: true,
      count: 0,
      data: [],
    });
  }
});
router.get(
  "/attention",
  authorize("admin", "manager"),
  getShiftsNeedingAttention,
);
router.get("/range", validateDateRange, handleValidationErrors, getShifts);

// Shift CRUD
router.post(
  "/",
  authorize("admin", "manager"),
  validateShiftCreate,
  handleValidationErrors,
  createShift,
);

router.get("/", getShifts);
router.get("/:id", getShift);

router.put(
  "/:id",
  authorize("admin", "manager"),
  checkLocationAccess,
  validateShiftUpdate,
  handleValidationErrors,
  updateShift,
);

// Staff assignment
router.post(
  "/:id/assign",
  authorize("admin", "manager"),
  checkLocationAccess,
  validateStaffAssignment,
  handleValidationErrors,
  assignStaff,
);

// Staff picking up available shifts (different from manager assignment)
router.put(
  "/:id/assign",
  protect, // All authenticated users can access
  async (req, res) => {
    try {
      const { id } = req.params;
      const { staffId, reason } = req.body;

      console.log("🔍 Staff pickup attempt:", { shiftId: id, staffId, reason });
      console.log("🔍 User:", req.user.id, req.user.role);

      const shift = await Shift.findById(id).populate("location");

      if (!shift) {
        return res.status(404).json({
          success: false,
          message: "Shift not found",
        });
      }

      // Check if shift is available for pickup
      if (!shift.availableForPickup) {
        return res.status(400).json({
          success: false,
          message: "This shift is not available for pickup",
        });
      }

      // Check if shift is already full
      if (shift.assignedStaff.length >= shift.requiredCount) {
        return res.status(400).json({
          success: false,
          message: "This shift is already fully staffed",
        });
      }

      // Check if staff is already assigned
      if (shift.assignedStaff.includes(staffId)) {
        return res.status(400).json({
          success: false,
          message: "You are already assigned to this shift",
        });
      }

      // Add staff to assignedStaff
      shift.assignedStaff.push(staffId);

      // Mark as no longer available for pickup
      shift.availableForPickup = false;
      shift.needsCoverage = false;

      // Add to assignment history
      if (!shift.assignmentHistory) shift.assignmentHistory = [];
      shift.assignmentHistory.push({
        staff: staffId,
        assignedAt: new Date(),
        assignedBy: req.user.id,
        reason: reason || "Picked up from available shifts",
      });

      // Add to audit trail
      if (!shift.history) shift.history = [];
      shift.history.push({
        action: "assigned",
        performedBy: req.user.id,
        timestamp: new Date(),
        changes: { added: [staffId] },
        reason: reason || "Picked up from available shifts",
      });

      shift.updatedBy = req.user.id;

      await shift.save();
      console.log("✅ Shift picked up successfully");

      // Send notification
      const notificationService = req.app.get("notificationService");
      if (notificationService) {
        await notificationService.sendToUser(staffId, {
          sender: req.user.id,
          type: "shift_picked_up",
          title: "✅ Shift Picked Up",
          message: `You have successfully picked up a shift at ${shift.location?.name || "unknown location"}`,
          relatedTo: { model: "Shift", id: shift._id },
          data: { shiftId: shift._id },
        });
      }

      res.json({
        success: true,
        data: shift,
        message: "Shift picked up successfully",
      });
    } catch (error) {
      console.error("❌ Error in staff pickup:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

router.post(
  "/:id/unassign",
  authorize("admin", "manager"),
  checkLocationAccess,
  validateStaffAssignment,
  handleValidationErrors,
  unassignStaff,
);

// Publishing
router.post(
  "/:id/publish",
  authorize("admin", "manager"),
  checkLocationAccess,
  publishShift,
);

// Swap requests
router.post(
  "/:id/swap-request",
  authorize("staff", "manager", "admin"),
  validateSwapRequest,
  handleValidationErrors,
  createSwapRequest,
);

router.post(
  "/:id/swap-request/:requestId/approve",
  authorize("admin", "manager"),
  checkLocationAccess,
  approveSwapRequest,
);

router.post(
  "/:id/swap-request/:requestId/reject",
  authorize("admin", "manager"),
  checkLocationAccess,
  rejectSwapRequest,
);

// Conflict checking
router.get(
  "/:id/conflicts",
  authorize("admin", "manager"),
  checkLocationAccess,
  checkConflicts,
);

module.exports = router;
