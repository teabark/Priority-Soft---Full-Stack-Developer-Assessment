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

    // Find the shift
    const shift = await Shift.findById(shiftId);
    if (!shift) {
      return res
        .status(404)
        .json({ success: false, message: "Shift not found" });
    }

    // Check if user is assigned to this shift
    if (!shift.assignedStaff.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "You can only request swaps for shifts you are assigned to",
      });
    }

    // Check pending request limit (max 3)
    const user = await User.findById(req.user.id);
    if (user.pendingRequests.count >= 3) {
      return res.status(400).json({
        success: false,
        message: "You have reached the maximum of 3 pending requests",
      });
    }

    // Calculate expiration (24 hours before shift for drops)
    let expiresAt = null;
    if (type === "drop") {
      expiresAt = new Date(shift.startTime);
      expiresAt.setHours(expiresAt.getHours() - 24);
    }

    // Create swap request
    const swapRequest = {
      _id: new mongoose.Types.ObjectId(),
      requestingStaff: req.user.id,
      targetStaff: targetStaffId,
      type,
      status: "pending",
      requestedAt: new Date(),
      expiresAt,
      notes,
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

    // Ensure editCutoff exists
    if (!shift.editCutoff) {
      const cutoffDate = new Date(shift.startTime);
      cutoffDate.setHours(cutoffDate.getHours() - 48);
      shift.editCutoff = cutoffDate;
    }

    await shift.save();

    // Increment user's pending requests
    user.pendingRequests.count += 1;
    user.pendingRequests.requestIds.push(swapRequest._id);
    await user.save();

    // ========== USE NOTIFICATION HELPER ==========
    const notificationHelper = req.app.get("notificationHelper");
    const Location = mongoose.model("Location");
    const location = await Location.findById(shift.location);

    // 1. Notify target staff (for swap) using the helper
    if (type === "swap" && targetStaffId) {
      await notificationHelper.notifySwapRequested(
        swapRequest,
        shift,
        req.user.id,
        targetStaffId
      );
    }

    // 2. Notify managers at this location (for approval) using the helper
    if (location && location.managers && location.managers.length > 0) {
      await notificationHelper.notifyManagersSwapPending(
        shift,
        swapRequest,
        req.user.id
      );
    }

    res.status(201).json({
      success: true,
      data: swapRequest,
    });
  } catch (error) {
    console.error("❌ Error creating swap request:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get available shifts for pickup
// @route   GET /api/swaps/available
// @access  Private (Staff)
router.get("/available", protect, async (req, res) => {
  try {
    console.log("📡 Fetching available shifts for staff:", req.user.id);

    // Log the query we're about to run
    const query = {
      availableForPickup: true,
      startTime: { $gt: new Date() },
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
        availableForPickup: availableShifts[0].availableForPickup,
      });
    }

    res.json({
      success: true,
      count: availableShifts.length,
      data: availableShifts,
    });
  } catch (error) {
    console.error("❌ Error fetching available shifts:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get pending requests for current user
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

// @desc    Get pending requests for manager approval
// @route   GET /api/swaps/pending-approvals
// @access  Private (Manager/Admin)
router.get("/pending-approvals", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "manager") {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    console.log("📡 Fetching pending approvals for manager:", req.user.id);
    console.log("📡 Manager locations:", req.user.locations);

    let locationFilter = {};
    if (
      req.user.role === "manager" &&
      req.user.locations &&
      req.user.locations.length > 0
    ) {
      locationFilter = { location: { $in: req.user.locations } };
    }

    // Find all shifts with swap requests that need manager attention
    // This includes:
    // 1. New requests (status = 'pending' AND no target staff acceptance yet)
    // 2. Requests where target staff has accepted (status = 'pending_approval')
    const shifts = await Shift.find({
      ...locationFilter,
      $or: [
        { "swapRequests.status": "pending" },
        { "swapRequests.status": "pending_approval" },
      ],
    }).populate("location", "name");

    console.log(`📊 Found ${shifts.length} shifts with pending requests`);

    const pendingRequests = [];

    shifts.forEach((shift) => {
      shift.swapRequests.forEach((request) => {
        // Show both pending and pending_approval requests to manager
        if (
          request.status === "pending" ||
          request.status === "pending_approval"
        ) {
          pendingRequests.push({
            ...request.toObject(),
            shiftId: shift._id,
            shiftInfo: {
              location: shift.location,
              startTime: shift.startTime,
              endTime: shift.endTime,
            },
          });
        }
      });
    });

    console.log(
      `✅ Found ${pendingRequests.length} pending requests for manager`,
    );
    res.json({
      success: true,
      count: pendingRequests.length,
      data: pendingRequests,
    });
  } catch (error) {
    console.error("❌ Error fetching pending approvals:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @desc    Approve or reject a swap request
// @route   PUT /api/swaps/:requestId
// @access  Private (Manager/Admin or Target Staff for swaps)
router.put("/:requestId", protect, async (req, res) => {
  try {
    const { status, reason } = req.body;
    const { requestId } = req.params;

    const shift = await Shift.findOne({
      'swapRequests._id': requestId
    }).populate('swapRequests.requestingStaff', 'name email');

    if (!shift) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const request = shift.swapRequests.id(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const isManager = req.user.role === 'admin' || req.user.role === 'manager';
    const isTargetStaff = request.targetStaff?.toString() === req.user.id;

    if (!isManager && !isTargetStaff) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const notificationHelper = req.app.get('notificationHelper');
    const Location = mongoose.model('Location');
    const location = await Location.findById(shift.location);

    // Target staff accepts the swap
    if (request.type === 'swap' && isTargetStaff && status === 'accepted') {
      request.status = 'pending_approval';
      request.history.push({
        action: 'accepted',
        timestamp: new Date(),
        performedBy: req.user.id,
      });

      // Notify managers that swap is ready for approval
      if (location && location.managers) {
        await notificationHelper.sendToUsers(location.managers, {
          sender: req.user.id,
          type: 'swap_ready_for_approval',
          title: '⚡ Swap Ready for Approval',
          message: `Both staff have agreed to swap. Pending your approval.`,
          relatedTo: { model: 'Shift', id: shift._id },
          data: { swapRequestId: requestId, shiftId: shift._id }
        });
      }
    } 
    // Manager approves/rejects
    else if (isManager) {
      const oldStatus = request.status;
      request.status = status;
      request.respondedAt = new Date();
      request.history.push({
        action: status,
        timestamp: new Date(),
        performedBy: req.user.id,
        reason,
      });

      // If approved and it's a swap, swap the staff
      if (status === 'approved' && request.type === 'swap') {
        const requestingStaffIndex = shift.assignedStaff.findIndex(
          (id) => id.toString() === request.requestingStaff._id.toString(),
        );
        if (requestingStaffIndex !== -1) {
          shift.assignedStaff[requestingStaffIndex] = request.targetStaff;
        }

        // Notify both staff members
        await notificationHelper.sendToUser(request.requestingStaff._id, {
          sender: req.user.id,
          type: 'swap_approved',
          title: '✅ Swap Request Approved',
          message: 'Your swap request has been approved',
          data: { swapRequestId: requestId, shiftId: shift._id }
        });

        if (request.targetStaff) {
          await notificationHelper.sendToUser(request.targetStaff, {
            sender: req.user.id,
            type: 'swap_approved',
            title: '📅 New Shift Assigned',
            message: 'You have been assigned to a new shift via swap',
            data: { swapRequestId: requestId, shiftId: shift._id }
          });
        }
      } 
      // If approved and it's a drop, remove the staff
      else if (status === 'approved' && request.type === 'drop') {
        shift.assignedStaff = shift.assignedStaff.filter(
          (id) => id.toString() !== request.requestingStaff._id.toString(),
        );
        shift.availableForPickup = true;
        shift.needsCoverage = true;

        // Notify the staff who dropped
        await notificationHelper.sendToUser(request.requestingStaff._id, {
          sender: req.user.id,
          type: 'drop_approved',
          title: '✅ Drop Request Approved',
          message: 'Your drop request has been approved',
          data: { swapRequestId: requestId, shiftId: shift._id }
        });
      }

      // If rejected, notify the requester
      if (status === 'rejected') {
        await notificationHelper.sendToUser(request.requestingStaff._id, {
          sender: req.user.id,
          type: 'swap_rejected',
          title: '❌ Swap Request Rejected',
          message: reason || 'Your swap request has been rejected',
          data: { swapRequestId: requestId, shiftId: shift._id }
        });
      }

      // Update pending request count
      if (oldStatus === 'pending' && (status === 'approved' || status === 'rejected')) {
        const requester = await User.findById(request.requestingStaff._id);
        if (requester) {
          requester.pendingRequests.count = Math.max(0, requester.pendingRequests.count - 1);
          requester.pendingRequests.requestIds = requester.pendingRequests.requestIds.filter(
            (id) => id.toString() !== requestId
          );
          await requester.save();
        }
      }
    }

    shift.hasPendingSwap = shift.swapRequests.some(r => r.status === 'pending');
    await shift.save();

    res.json({ success: true, data: request });

  } catch (error) {
    console.error('❌ Error updating swap request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Cancel a swap request (by requester)
// @route   DELETE /api/swaps/:requestId
// @access  Private
router.delete("/:requestId", protect, async (req, res) => {
  try {
    const { requestId } = req.params;

    const shift = await Shift.findOne({
      "swapRequests._id": requestId,
    });

    if (!shift) {
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    }

    const request = shift.swapRequests.id(requestId);
    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    }

    // Only the requester can cancel
    if (request.requestingStaff.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Remove the request
    request.remove();

    // Update pending request count
    const requester = await User.findById(req.user.id);
    if (requester) {
      requester.pendingRequests.count = Math.max(
        0,
        requester.pendingRequests.count - 1,
      );
      requester.pendingRequests.requestIds =
        requester.pendingRequests.requestIds.filter(
          (id) => id.toString() !== requestId,
        );
      await requester.save();
    }

    shift.hasPendingSwap = shift.swapRequests.some(
      (r) => r.status === "pending",
    );
    await shift.save();

    res.json({
      success: true,
      message: "Request cancelled",
    });
  } catch (error) {
    console.error("❌ Error cancelling request:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
