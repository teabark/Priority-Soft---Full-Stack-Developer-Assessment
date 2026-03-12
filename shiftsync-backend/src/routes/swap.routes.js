const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Shift = require("../models/Shift");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

// @desc    Create a swap request
// @route   POST /api/swaps/request
// @access  Private (Staff)
router.post("/request", protect, async (req, res) => {
  try {
    const { shiftId, targetStaffId, type, notes } = req.body;

    console.log(`📝 Creating ${type} request for shift: ${shiftId}`);

    // Find the shift
    const shift = await Shift.findById(shiftId);
    if (!shift) {
      return res.status(404).json({ 
        success: false, 
        message: "Shift not found" 
      });
    }

    // Check if user is assigned to this shift
    if (!shift.assignedStaff.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "You can only request swaps for shifts you are assigned to",
      });
    }

    // ===== FIX: Count ONLY pending requests (not approved/rejected) =====
    const ShiftModel = mongoose.model('Shift');
    
    // Find ALL shifts that have requests from this user
    const allShifts = await ShiftModel.find({
      'swapRequests.requestingStaff': req.user.id
    });
    
    // Count only requests that are still pending (waiting for response)
    let pendingCount = 0;
    allShifts.forEach(shift => {
      shift.swapRequests.forEach(request => {
        // Only count if:
        // 1. This user is the requester
        // 2. Status is 'pending' (waiting for Staff B) OR 'pending_approval' (waiting for manager)
        // 3. NOT approved, rejected, or cancelled
        if (request.requestingStaff?.toString() === req.user.id && 
            (request.status === 'pending' || request.status === 'pending_approval')) {
          pendingCount++;
        }
      });
    });
    
    console.log(`📊 User ${req.user.id} has ${pendingCount} pending requests`);
    
    // Check pending request limit (max 3)
    if (pendingCount >= 3) {
      return res.status(400).json({
        success: false,
        message: "You have reached the maximum of 3 pending requests. Please wait for existing requests to be resolved before creating new ones.",
      });
    }
    // ===== END FIX =====

    // Check if shift is still editable (within cutoff)
    const now = new Date();
    const shiftStart = new Date(shift.startTime);
    const hoursUntilShift = (shiftStart - now) / (1000 * 60 * 60);
    
    if (hoursUntilShift < 24) {
      return res.status(400).json({
        success: false,
        message: "Cannot request changes to shifts starting in less than 24 hours",
      });
    }

    // For swap requests, validate target staff
    if (type === 'swap') {
      if (!targetStaffId) {
        return res.status(400).json({
          success: false,
          message: "Please select a staff member to swap with",
        });
      }

      // Check if target staff exists
      const targetStaff = await User.findById(targetStaffId);
      if (!targetStaff) {
        return res.status(404).json({
          success: false,
          message: "Target staff member not found",
        });
      }

      // Check if target staff has required skills
      if (!targetStaff.skills?.includes(shift.requiredSkill)) {
        return res.status(400).json({
          success: false,
          message: `${targetStaff.name} does not have the required skill: ${shift.requiredSkill}`,
        });
      }

      // Check if target staff is certified for this location
      if (!targetStaff.locations?.includes(shift.location.toString())) {
        return res.status(400).json({
          success: false,
          message: `${targetStaff.name} is not certified for this location`,
        });
      }

      // Check if target staff is available
      // This would need more complex availability checking
    }

    // Calculate expiration (24 hours before shift for drops)
    let expiresAt = null;
    if (type === "drop") {
      expiresAt = new Date(shift.startTime);
      expiresAt.setHours(expiresAt.getHours() - 24);
    }

    // Create swap request with proper status
    // Status flow: pending (Staff B needs to accept) → pending_approval (Manager needs to approve) → approved
    const swapRequest = {
      _id: new mongoose.Types.ObjectId(),
      requestingStaff: req.user.id,
      targetStaff: targetStaffId,
      type,
      status: "pending", // Initial status: waiting for Staff B to accept
      requestedAt: new Date(),
      expiresAt,
      notes: notes || "",
      history: [
        {
          action: "created",
          timestamp: new Date(),
          performedBy: req.user.id,
        },
      ],
    };

    // Add to shift
    if (!shift.swapRequests) shift.swapRequests = [];
    shift.swapRequests.push(swapRequest);
    shift.hasPendingSwap = true;

    await shift.save();

    // Update user's pending requests count in User model
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'pendingRequests.count': 1 },
      $push: { 'pendingRequests.requestIds': swapRequest._id }
    });

    console.log(`✅ ${type} request created successfully with ID: ${swapRequest._id}`);

    // Notify relevant parties (you'll implement this later)
    if (type === "swap" && targetStaffId) {
      // Notify target staff
      console.log(`📨 Notification to Staff B: You have a swap request from ${req.user.id}`);
    }
    
    if (type === "drop") {
      // Notify managers
      console.log(`📨 Notification to Managers: Drop request submitted for shift ${shiftId}`);
    }

    res.status(201).json({
      success: true,
      message: type === 'swap' ? 'Swap request sent successfully' : 'Drop request submitted successfully',
      data: swapRequest,
    });

  } catch (error) {
    console.error("❌ Error creating swap request:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "An error occurred while creating the request" 
    });
  }
});

// @desc    Staff B accepts a swap request
// @route   PUT /api/swaps/:requestId/accept
// @access  Private (Staff B)
router.put("/:requestId/accept", protect, async (req, res) => {
  try {
    const { requestId } = req.params;
    console.log(`✅ Staff B accepting request: ${requestId}`);

    // Find shift containing this request
    const shift = await Shift.findOne({
      "swapRequests._id": requestId
    });

    if (!shift) {
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found' 
      });
    }

    // Find the specific request
    const request = shift.swapRequests.id(requestId);
    if (!request) {
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found' 
      });
    }

    console.log(`📋 Request details:`, {
      requestingStaff: request.requestingStaff,
      targetStaff: request.targetStaff,
      currentUser: req.user.id,
      status: request.status
    });

    // Check if this user is the target staff
    if (request.targetStaff?.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'This request is not for you' 
      });
    }

    // Check if request is still pending
    if (request.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: `This request is already ${request.status}` 
      });
    }

    // Update status to pending_approval (waiting for manager)
    request.status = 'pending_approval';
    request.history.push({
      action: 'accepted_by_target',
      timestamp: new Date(),
      performedBy: req.user.id
    });

    await shift.save();

    // ===== Recalculate pending count for requester =====
    await recalculatePendingCount(request.requestingStaff);
    // ==================================================

    console.log(`✅ Request ${requestId} accepted, now pending manager approval`);

    res.json({
      success: true,
      message: 'Swap request accepted, waiting for manager approval',
      data: request
    });

  } catch (error) {
    console.error('❌ Error accepting request:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Manager rejects a request (direct rejection)
// @route   PUT /api/swaps/:requestId/reject
// @access  Private (Manager/Admin)
router.put("/:requestId/reject", protect, async (req, res) => {
  try {
    const { requestId } = req.params;
    console.log(`👔 Manager rejecting request: ${requestId}`);

    // Check if user is manager or admin
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only managers can reject requests' 
      });
    }

    // Find shift containing this request
    const shift = await Shift.findOne({
      "swapRequests._id": requestId
    });

    if (!shift) {
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found' 
      });
    }

    const request = shift.swapRequests.id(requestId);
    if (!request) {
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found' 
      });
    }

    // Can reject if pending OR pending_approval
    if (request.status !== 'pending' && request.status !== 'pending_approval') {
      return res.status(400).json({ 
        success: false, 
        message: `This request cannot be rejected (current status: ${request.status})` 
      });
    }

    // Update status to rejected
    request.status = 'rejected';
    request.history.push({
      action: 'rejected_by_manager',
      timestamp: new Date(),
      performedBy: req.user.id
    });

    shift.hasPendingSwap = shift.swapRequests.some(r => 
      r.status === 'pending' || r.status === 'pending_approval'
    );

    await shift.save();
    await recalculatePendingCount(request.requestingStaff);

    console.log(`✅ Request ${requestId} rejected by manager`);

    res.json({
      success: true,
      message: 'Request rejected successfully'
    });

  } catch (error) {
    console.error('❌ Error rejecting request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Manager approves a request (direct approval)
// @route   PUT /api/swaps/:requestId/approve
// @access  Private (Manager/Admin)
router.put("/:requestId/approve", protect, async (req, res) => {
  try {
    const { requestId } = req.params;
    console.log(`👔 Manager approving request: ${requestId}`);

    // Check if user is manager or admin
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only managers can approve requests' 
      });
    }

    // Find shift containing this request
    const shift = await Shift.findOne({
      "swapRequests._id": requestId
    });

    if (!shift) {
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found' 
      });
    }

    // Find the specific request
    const request = shift.swapRequests.id(requestId);
    if (!request) {
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found' 
      });
    }

    // Can approve if pending OR pending_approval
    if (request.status !== 'pending' && request.status !== 'pending_approval') {
      return res.status(400).json({ 
        success: false, 
        message: `This request cannot be approved (current status: ${request.status})` 
      });
    }

    // For swap requests, swap the shifts
    if (request.type === 'swap') {
      console.log(`🔄 Swapping shift ${shift._id} from ${request.requestingStaff} to ${request.targetStaff}`);
      
      // Remove requesting staff from shift
      shift.assignedStaff = shift.assignedStaff.filter(
        id => id.toString() !== request.requestingStaff.toString()
      );
      
      // Add target staff to shift
      if (!shift.assignedStaff.includes(request.targetStaff)) {
        shift.assignedStaff.push(request.targetStaff);
      }
      
      // Not available for pickup since it's assigned to target staff
      shift.availableForPickup = false;
    }

    // For drop requests, make the shift available for pickup
    if (request.type === 'drop') {
      console.log(`📥 Processing drop request for shift ${shift._id}`);
      
      // Remove requesting staff from shift
      shift.assignedStaff = shift.assignedStaff.filter(
        id => id.toString() !== request.requestingStaff.toString()
      );
      
      // CRITICAL: Mark as available for pickup
      shift.availableForPickup = true;
      
      console.log(`✅ Shift ${shift._id} is now AVAILABLE FOR PICKUP`);
    }

    // Update status to approved
    request.status = 'approved';
    request.history.push({
      action: 'approved_by_manager',
      timestamp: new Date(),
      performedBy: req.user.id
    });

    // Check if there are any other pending requests
    shift.hasPendingSwap = shift.swapRequests.some(r => 
      r.status === 'pending' || r.status === 'pending_approval'
    );

    await shift.save();
    await recalculatePendingCount(request.requestingStaff);

    console.log(`✅ Request ${requestId} approved successfully`);

    res.json({
      success: true,
      message: request.type === 'drop' 
        ? 'Drop request approved. Shift is now available for pickup.' 
        : 'Swap request approved successfully',
      data: request
    });

  } catch (error) {
    console.error('❌ Error approving request:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Get available shifts for pickup
// @route   GET /api/swaps/available
// @access  Private (Staff)
router.get("/available", protect, async (req, res) => {
  try {
    console.log("📡 Fetching available shifts for staff:", req.user.id);

    // Find shifts that are:
    // 1. Marked as availableForPickup = true
    // 2. Not assigned to the current user
    // 3. Start time is in the future
    const query = {
      availableForPickup: true,
      startTime: { $gt: new Date() },
      assignedStaff: { $ne: req.user.id } // Don't show shifts already assigned to this user
    };
    
    console.log("🔍 Query:", JSON.stringify(query, null, 2));

    const availableShifts = await Shift.find(query)
      .populate("location", "name timezone")
      .sort({ startTime: 1 });

    console.log(`✅ Found ${availableShifts.length} available shifts`);

    if (availableShifts.length > 0) {
      console.log("✅ First available shift:", {
        id: availableShifts[0]._id,
        location: availableShifts[0].location?.name,
        startTime: availableShifts[0].startTime,
        assignedStaff: availableShifts[0].assignedStaff.length,
        availableForPickup: availableShifts[0].availableForPickup,
      });
    } else {
      console.log("⚠️ No available shifts found");
    }

    res.json({
      success: true,
      count: availableShifts.length,
      data: availableShifts,
    });
  } catch (error) {
    console.error("❌ Error fetching available shifts:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Pick up an available shift
// @route   PUT /api/shifts/:shiftId/assign
// @access  Private (Staff)
// This should be in your shifts.routes.js
router.put("/:shiftId/assign", protect, async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { staffId } = req.body;
    
    const shift = await Shift.findById(shiftId);
    
    if (!shift) {
      return res.status(404).json({ 
        success: false, 
        message: "Shift not found" 
      });
    }
    
    // Check if shift is available for pickup
    if (!shift.availableForPickup) {
      return res.status(400).json({ 
        success: false, 
        message: "This shift is not available for pickup" 
      });
    }
    
    // Add staff to assignedStaff
    if (!shift.assignedStaff.includes(staffId)) {
      shift.assignedStaff.push(staffId);
    }
    
    // Mark as no longer available for pickup
    shift.availableForPickup = false;
    
    await shift.save();
    
    res.json({
      success: true,
      message: "Shift picked up successfully",
      data: shift
    });
    
  } catch (error) {
    console.error("❌ Error picking up shift:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});


// @desc    Staff A withdraws their request
// @route   DELETE /api/swaps/:requestId
// @access  Private
router.delete('/:requestId', protect, async (req, res) => {
  try {
    const { requestId } = req.params;
    console.log(`🗑️ Staff withdrawing request: ${requestId}`);

    // Find shift containing this request
    const shift = await Shift.findOne({
      'swapRequests._id': requestId
    });

    if (!shift) {
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found' 
      });
    }

    // Find the specific request
    const request = shift.swapRequests.id(requestId);
    if (!request) {
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found' 
      });
    }

    // Only the requester can withdraw
    if (request.requestingStaff.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to withdraw this request' 
      });
    }

    // Can withdraw if pending (not approved/rejected)
    if (request.status !== 'pending' && request.status !== 'pending_approval') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot withdraw request with status: ${request.status}` 
      });
    }

    // Remove the request
    shift.swapRequests = shift.swapRequests.filter(
      r => r._id.toString() !== requestId
    );

    shift.hasPendingSwap = shift.swapRequests.some(r => 
      r.status === 'pending' || r.status === 'pending_approval'
    );

    await shift.save();
    await recalculatePendingCount(req.user.id);

    console.log(`✅ Request ${requestId} withdrawn successfully`);

    res.json({
      success: true,
      message: 'Request withdrawn successfully'
    });

  } catch (error) {
    console.error('❌ Error withdrawing request:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Get pending requests for current user (as requester OR target)
// @route   GET /api/swaps/my-requests
// @access  Private
router.get("/my-requests", protect, async (req, res) => {
  try {
    console.log("📡 Fetching my requests for user:", req.user.id);

    const shifts = await Shift.find({
      swapRequests: { $exists: true, $ne: [] },
    }).populate("location", "name");

    const myRequests = [];

    shifts.forEach((shift) => {
      shift.swapRequests.forEach((request) => {
        const isRequester = request.requestingStaff?.toString() === req.user.id;
        const isTarget = request.targetStaff?.toString() === req.user.id;

        if (isRequester || isTarget) {
          myRequests.push({
            ...request.toObject(),
            shiftId: shift._id,
            shiftInfo: {
              location: shift.location,
              startTime: shift.startTime,
              endTime: shift.endTime,
            },
            // Add role info for UI
            userRole: isRequester ? 'requester' : (isTarget ? 'target' : 'other')
          });
        }
      });
    });

    console.log(`✅ Found ${myRequests.length} requests for user`);
    res.json({ success: true, data: myRequests });
  } catch (error) {
    console.error("❌ Error fetching my requests:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get pending approvals for managers
// @route   GET /api/swaps/pending-approvals
// @access  Private (Manager/Admin)
router.get("/pending-approvals", protect, async (req, res) => {
  try {
    console.log("📡 Fetching pending approvals for user:", req.user.id);
    console.log("👤 User role:", req.user.role);
    
    // Check if user is manager or admin
    if (req.user.role !== "admin" && req.user.role !== "manager") {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized" 
      });
    }

    // Get manager's locations
    let managerLocationIds = [];
    
    if (req.user.role === "manager") {
      // Managers see only their assigned locations
      managerLocationIds = req.user.locations || [];
      console.log("📍 Manager locations:", managerLocationIds);
      
      if (managerLocationIds.length === 0) {
        console.log("⚠️ Manager has no locations assigned");
        return res.json({
          success: true,
          count: 0,
          data: [],
          message: "No locations assigned to you"
        });
      }
    }

    // Build query based on role
    let query = {};
    
    if (req.user.role === "manager") {
      // For managers: only show requests from their locations
      query = {
        location: { $in: managerLocationIds },
        "swapRequests.status": { $in: ["pending", "pending_approval"] }
      };
    } else {
      // For admins: show all pending requests
      query = {
        "swapRequests.status": { $in: ["pending", "pending_approval"] }
      };
    }

    console.log("🔍 Query:", JSON.stringify(query, null, 2));

    // Find all shifts with pending swap requests
    const shifts = await Shift.find(query)
      .populate("location", "name code")
      .populate({
        path: "swapRequests.requestingStaff",
        model: "User",
        select: "name email"
      })
      .populate({
        path: "swapRequests.targetStaff",
        model: "User",
        select: "name email"
      })
      .sort({ "swapRequests.requestedAt": -1 });

    console.log(`📊 Found ${shifts.length} shifts with pending requests`);

    // Extract and format pending requests
    const pendingRequests = [];

    shifts.forEach((shift) => {
      // Make sure shift has swapRequests
      if (!shift.swapRequests || shift.swapRequests.length === 0) return;

      shift.swapRequests.forEach((request) => {
        // Only include requests that need manager attention
        // For managers: show both pending and pending_approval
        // But filter based on location
        if (request.status === "pending" || request.status === "pending_approval") {
          
          // Double-check location access for managers
          if (req.user.role === "manager") {
            const shiftLocationId = shift.location?._id?.toString();
            if (!shiftLocationId || !managerLocationIds.includes(shiftLocationId)) {
              console.log(`⏭️ Skipping request - location mismatch: ${shiftLocationId}`);
              return;
            }
          }

          // Get staff names
          let requestingStaffName = "Unknown";
          let targetStaffName = "Unknown";
          
          if (request.requestingStaff) {
            if (typeof request.requestingStaff === 'object') {
              requestingStaffName = request.requestingStaff.name;
            } else {
              // Try to find in populated data
              const staff = shift.swapRequests.find(r => 
                r.requestingStaff?.toString() === request.requestingStaff?.toString()
              );
              requestingStaffName = staff?.name || "Unknown";
            }
          }

          if (request.targetStaff) {
            if (typeof request.targetStaff === 'object') {
              targetStaffName = request.targetStaff.name;
            }
          }

          pendingRequests.push({
            _id: request._id,
            type: request.type,
            status: request.status,
            requestedAt: request.requestedAt,
            notes: request.notes,
            requestingStaff: request.requestingStaff,
            requestingStaffName: requestingStaffName,
            targetStaff: request.targetStaff,
            targetStaffName: targetStaffName,
            shiftId: shift._id,
            shiftInfo: {
              location: shift.location,
              startTime: shift.startTime,
              endTime: shift.endTime,
              requiredSkill: shift.requiredSkill,
              assignedStaff: shift.assignedStaff
            },
            history: request.history
          });
        }
      });
    });

    // Sort by date (newest first)
    pendingRequests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

    console.log(`✅ Found ${pendingRequests.length} pending requests for manager`);
    
    if (pendingRequests.length > 0) {
      console.log("📋 First pending request:", {
        id: pendingRequests[0]._id,
        type: pendingRequests[0].type,
        status: pendingRequests[0].status,
        location: pendingRequests[0].shiftInfo?.location?.name
      });
    }

    res.json({
      success: true,
      count: pendingRequests.length,
      data: pendingRequests
    });

  } catch (error) {
    console.error("❌ Error fetching pending approvals:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ... (keep your existing DELETE and other routes)
// ===== HELPER FUNCTION: Recalculate pending count =====
const recalculatePendingCount = async (userId) => {
  try {
    console.log(`🔄 Recalculating pending count for user: ${userId}`);
    
    const Shift = mongoose.model('Shift');
    const User = mongoose.model('User');
    
    // Find ALL shifts that have requests from this user
    const allShifts = await Shift.find({
      'swapRequests.requestingStaff': userId
    });
    
    // Count only requests that are still pending
    let pendingCount = 0;
    const pendingRequestIds = [];
    
    allShifts.forEach(shift => {
      shift.swapRequests.forEach(request => {
        if (request.requestingStaff?.toString() === userId && 
            (request.status === 'pending' || request.status === 'pending_approval')) {
          pendingCount++;
          pendingRequestIds.push(request._id);
        }
      });
    });
    
    console.log(`📊 Recalculated: User ${userId} has ${pendingCount} pending requests`);
    
    // Update user's pending count in User model
    await User.findByIdAndUpdate(userId, {
      'pendingRequests.count': pendingCount,
      'pendingRequests.requestIds': pendingRequestIds
    });
    
    return pendingCount;
  } catch (error) {
    console.error('❌ Error recalculating pending count:', error);
    return 0;
  }
};
// ===== END HELPER =====


module.exports = router;