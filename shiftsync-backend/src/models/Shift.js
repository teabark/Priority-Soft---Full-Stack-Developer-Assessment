const mongoose = require("mongoose");

// Sub-schema for shift history (audit trail)
const shiftHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        "created",
        "updated",
        "assigned",
        "unassigned",
        "published",
        "unpublished",
        "cancelled",
        "swap_requested",
        "swap_approved",
        "swap_rejected",
        "completed",
      ],
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    changes: {
      type: mongoose.Schema.Types.Mixed, // Store before/after state
    },
    reason: String,
  },
  { _id: false },
);

// Sub-schema for swap requests on this shift
const swapRequestSchema = new mongoose.Schema(
  {
    requestingStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: ["swap", "drop", "pickup"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "expired"],
      default: "pending",
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: Date,
    expiresAt: Date,
    notes: String,
    history: [
      {
        action: String,
        timestamp: Date,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  { timestamps: true },
);

// Sub-schema for compliance warnings
const complianceWarningSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "overtime_weekly",
      "overtime_daily",
      "consecutive_days",
      "gap_violation",
      "skill_mismatch",
      "certification_mismatch",
      "availability_violation",
      "double_booking",
    ],
    required: true,
  },
  severity: {
    type: String,
    enum: ["warning", "critical", "info"],
    default: "warning",
  },
  message: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const shiftSchema = new mongoose.Schema(
  {
    // Core Shift Information
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: [true, "Location is required"],
    },

    // Time Information (stored in UTC, displayed in location timezone)
    date: {
      type: Date,
      required: [true, "Shift date is required"],
    },
    startTime: {
      type: Date,
      required: [true, "Start time is required"],
    },
    endTime: {
      type: Date,
      required: [true, "End time is required"],
    },

    // Duration in minutes (cached for performance)
    duration: {
      type: Number,
      min: [30, "Shift must be at least 30 minutes"],
      max: [720, "Shift cannot exceed 12 hours"], // 12 hours max
    },

    // Overnight shift handling
    isOvernight: {
      type: Boolean,
      default: false,
    },

    // Requirements
    requiredSkill: {
      type: String,
      enum: [
        "bartender",
        "line_cook",
        "server",
        "host",
        "manager",
        "dishwasher",
        "busser",
      ],
      required: [true, "Required skill is required"],
    },
    requiredCount: {
      type: Number,
      required: [true, "Required staff count is required"],
      min: [1, "At least 1 staff required"],
      max: [10, "Maximum 10 staff per shift"],
    },

    // Staff Assignment
    assignedStaff: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Track assignment history for fairness metrics
    assignmentHistory: [
      {
        staff: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        assignedAt: Date,
        assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        unassignedAt: Date,
        unassignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reason: String,
      },
    ],

    // Status Management
    status: {
      type: String,
      enum: ["draft", "published", "in_progress", "completed", "cancelled"],
      default: "draft",
    },

    // Publishing info
    publishedAt: Date,
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Cutoff for edits (48 hours before shift by default)
    editCutoff: {
      type: Date,
      required: true,
    },

    // Add to shiftSchema
    // locationTimezone: {
    //   type: String,
    //   required: true,
    // },
    // Swap/Drop Management
    swapRequests: [swapRequestSchema],

    // Whether this shift is currently involved in any pending swap
    hasPendingSwap: {
      type: Boolean,
      default: false,
    },

    needsCoverage: {
      type: Boolean,
      default: false,
    },

    // Whether this shift is available for other staff to pick up
    availableForPickup: {
      type: Boolean,
      default: false,
    },

    // Compliance Tracking
    complianceWarnings: [complianceWarningSchema],

    // Overtime tracking
    overtimeImpact: {
      causesOvertime: { type: Boolean, default: false },
      projectedWeeklyHours: { type: Number, default: 0 },
      projectedDailyHours: { type: Number, default: 0 },
      affectedStaff: [
        {
          staff: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          weeklyHours: Number,
          dailyHours: Number,
          exceedsWeekly: Boolean,
          exceedsDaily: Boolean,
        },
      ],
    },

    // Premium shift indicator (Fri/Sat evenings)
    isPremiumShift: {
      type: Boolean,
      default: false,
    },

    // Notes and Comments
    managerNotes: String,
    staffNotes: String,

    // Audit Trail
    history: [shiftHistorySchema],

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// // Calculate duration before save - FIXED VERSION
// shiftSchema.pre('save', function(next) {
//   try {
//     if (this.startTime && this.endTime) {
//       // Calculate duration in minutes
//       this.duration = Math.round((this.endTime - this.startTime) / (1000 * 60));

//       // Check if overnight (end time is earlier in the day than start time)
//       const startHour = this.startTime.getHours();
//       const endHour = this.endTime.getHours();
//       this.isOvernight = endHour < startHour ||
//         (endHour === startHour && this.endTime.getMinutes() < this.startTime.getMinutes());
//     }

//     // Set edit cutoff (48 hours before shift start)
//     if (this.startTime) {
//       const cutoffDate = new Date(this.startTime);
//       cutoffDate.setHours(cutoffDate.getHours() - 48);
//       this.editCutoff = cutoffDate;
//     }

//     this.updatedAt = Date.now();
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// // Update timestamps on update
// shiftSchema.pre('findOneAndUpdate', function(next) {
//   this.set({ updatedAt: Date.now() });
//   next();
// });

// // For updateOne
// shiftSchema.pre('updateOne', function(next) {
//   this.set({ updatedAt: Date.now() });
//   next();
// });

// Virtual for available positions - FIXED
shiftSchema.virtual("availablePositions").get(function () {
  const assignedCount = this.assignedStaff ? this.assignedStaff.length : 0;
  return Math.max(0, (this.requiredCount || 0) - assignedCount);
});

// Virtual for isFullyStaffed - FIXED
shiftSchema.virtual("isFullyStaffed").get(function () {
  const assignedCount = this.assignedStaff ? this.assignedStaff.length : 0;
  return assignedCount >= (this.requiredCount || 0);
});

// Virtual for isEditable (check if past cutoff) - FIXED
shiftSchema.virtual("isEditable").get(function () {
  if (!this.editCutoff) return false;
  return new Date() < this.editCutoff && this.status === "draft";
});

// Method to check if staff can be assigned
shiftSchema.methods.canAssignStaff = async function (staffId) {
  const User = mongoose.model("User");
  const staff = await User.findById(staffId);

  if (!staff) {
    return { allowed: false, reason: "Staff not found" };
  }

  const errors = [];
  const warnings = [];

  // Check if already assigned - FIXED: Check if assignedStaff exists
  if (this.assignedStaff && this.assignedStaff.includes(staffId)) {
    errors.push("Staff already assigned to this shift");
  }

  // Check skill requirement - FIXED: Check if staff.skills exists
  if (!staff.skills || !staff.skills.includes(this.requiredSkill)) {
    errors.push(`Staff lacks required skill: ${this.requiredSkill}`);
  }

  // Check location certification - FIXED: Add null check
  if (
    !staff.isCertifiedForLocation ||
    !staff.isCertifiedForLocation(this.location)
  ) {
    errors.push("Staff not certified for this location");
  }

  // Check availability - FIXED: Add null check
  if (
    !staff.isAvailableAt ||
    !staff.isAvailableAt(this.startTime, this.duration)
  ) {
    errors.push("Staff not available during shift time");
  }

  // Check for double booking (other shifts at same time)
  const Shift = mongoose.model("Shift");
  const overlappingShifts = await Shift.find({
    _id: { $ne: this._id },
    assignedStaff: staffId,
    status: { $in: ["draft", "published", "in_progress"] },
    $or: [
      {
        startTime: { $lt: this.endTime },
        endTime: { $gt: this.startTime },
      },
    ],
  });

  // FIXED: Check if overlappingShifts exists
  if (overlappingShifts && overlappingShifts.length > 0) {
    errors.push("Staff has overlapping shift at this time");
  }

  // Check 10-hour gap requirement
  const nearbyShifts = await Shift.find({
    _id: { $ne: this._id },
    assignedStaff: staffId,
    status: { $in: ["draft", "published", "in_progress"] },
    $or: [
      {
        endTime: {
          $gt: new Date(this.startTime.getTime() - 10 * 60 * 60 * 1000),
          $lt: this.startTime,
        },
      },
      {
        startTime: {
          $gt: this.endTime,
          $lt: new Date(this.endTime.getTime() + 10 * 60 * 60 * 1000),
        },
      },
    ],
  });

  // FIXED: Check if nearbyShifts exists
  if (nearbyShifts && nearbyShifts.length > 0) {
    errors.push("Minimum 10 hours required between shifts");
  }

  // Check weekly hours
  const weekStart = new Date(this.startTime);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekShifts = await Shift.find({
    assignedStaff: staffId,
    status: { $in: ["draft", "published", "in_progress"] },
    startTime: { $gte: weekStart, $lt: weekEnd },
  });

  // FIXED: Safe calculation with null checks
  let weeklyHours = 0;
  if (weekShifts && weekShifts.length > 0) {
    weeklyHours =
      weekShifts.reduce((total, shift) => {
        return total + (shift.duration || 0);
      }, 0) / 60;
  }

  const newWeeklyHours = weeklyHours + (this.duration || 0) / 60;

  if (newWeeklyHours > 40) {
    errors.push(
      `This would exceed 40 weekly hours (${newWeeklyHours.toFixed(1)} hours)`,
    );
  } else if (newWeeklyHours > 35) {
    // Just a warning, not a hard block
    // FIXED: Initialize complianceWarnings if it doesn't exist
    if (!this.complianceWarnings) {
      this.complianceWarnings = [];
    }
    this.complianceWarnings.push({
      type: "overtime_weekly",
      severity: "warning",
      message: `Staff would have ${newWeeklyHours.toFixed(1)} weekly hours (approaching 40)`,
    });
    warnings.push({
      type: "overtime_weekly",
      severity: "warning",
      message: `Staff would have ${newWeeklyHours.toFixed(1)} weekly hours (approaching 40)`,
    });
  }

  return {
    allowed: errors.length === 0,
    errors,
    warnings: warnings,
  };
};

// Method to assign staff
shiftSchema.methods.assignStaff = async function (staffId, assignedBy) {
  const check = await this.canAssignStaff(staffId);

  if (!check.allowed) {
    throw new Error(check.errors.join(", "));
  }

  // Add to assigned staff
  this.assignedStaff.push(staffId);

  // Add to history
  this.assignmentHistory.push({
    staff: staffId,
    assignedAt: new Date(),
    assignedBy: assignedBy,
  });

  // Add to audit trail
  this.history.push({
    action: "assigned",
    performedBy: assignedBy,
    timestamp: new Date(),
    changes: { added: [staffId] },
  });

  this.updatedBy = assignedBy;
  await this.save();

  return this;
};

// Method to unassign staff
shiftSchema.methods.unassignStaff = async function (
  staffId,
  unassignedBy,
  reason,
) {
  // Check if shift is editable
  if (!this.isEditable && this.status !== "draft") {
    throw new Error(
      "Cannot unassign staff from published shift within 48 hours",
    );
  }

  // Remove from assigned staff
  this.assignedStaff = this.assignedStaff.filter(
    (id) => id.toString() !== staffId.toString(),
  );

  // Update assignment history
  const assignment = this.assignmentHistory.find(
    (a) => a.staff.toString() === staffId.toString() && !a.unassignedAt,
  );

  if (assignment) {
    assignment.unassignedAt = new Date();
    assignment.unassignedBy = unassignedBy;
    assignment.reason = reason;
  }

  // Add to audit trail
  this.history.push({
    action: "unassigned",
    performedBy: unassignedBy,
    timestamp: new Date(),
    changes: { removed: [staffId] },
    reason,
  });

  this.updatedBy = unassignedBy;
  await this.save();

  return this;
};

// Method to create swap request
shiftSchema.methods.createSwapRequest = async function (requestData) {
  const { requestingStaff, targetStaff, type, notes } = requestData;

  // Check if staff is assigned to this shift
  if (!this.assignedStaff.includes(requestingStaff)) {
    throw new Error("Staff is not assigned to this shift");
  }

  // Check pending request limit
  const User = mongoose.model("User");
  const requester = await User.findById(requestingStaff);

  if (requester.pendingRequests.count >= 3) {
    throw new Error("Maximum pending requests (3) reached");
  }

  // Set expiration (24 hours before shift)
  const expiresAt = new Date(this.startTime);
  expiresAt.setHours(expiresAt.getHours() - 24);

  const swapRequest = {
    requestingStaff,
    targetStaff,
    type,
    status: "pending",
    requestedAt: new Date(),
    expiresAt,
    notes,
    history: [
      {
        action: "created",
        timestamp: new Date(),
        performedBy: requestingStaff,
      },
    ],
  };

  this.swapRequests.push(swapRequest);
  this.hasPendingSwap = true;

  // Add to audit trail
  this.history.push({
    action: "swap_requested",
    performedBy: requestingStaff,
    timestamp: new Date(),
    changes: { swapRequest: swapRequest },
  });

  await this.save();

  // Increment requester's pending requests
  await requester.incrementPendingRequests(
    this.swapRequests[this.swapRequests.length - 1]._id,
  );

  return this.swapRequests[this.swapRequests.length - 1];
};

// Method to approve swap request
shiftSchema.methods.approveSwapRequest = async function (
  requestId,
  approvedBy,
) {
  const request = this.swapRequests.id(requestId);

  if (!request) {
    throw new Error("Swap request not found");
  }

  if (request.status !== "pending") {
    throw new Error("Swap request is not pending");
  }

  if (request.type === "swap") {
    // For swap, we need to reassign the shift
    await this.unassignStaff(
      request.requestingStaff,
      approvedBy,
      "Swap approved",
    );
    await this.assignStaff(request.targetStaff, approvedBy);
  } else if (request.type === "drop") {
    // For drop, just remove the staff
    await this.unassignStaff(
      request.requestingStaff,
      approvedBy,
      "Drop approved",
    );

    this.needsCoverage = true;
    this.availableForPickup = true;
  } else if (request.type === "pickup") {
    // For pickup, add the staff
    await this.assignStaff(request.targetStaff, approvedBy);

    this.needsCoverage = false;
    this.availableForPickup = false;
  }

  request.status = "approved";
  request.respondedAt = new Date();
  request.history.push({
    action: "approved",
    timestamp: new Date(),
    performedBy: approvedBy,
  });

  this.hasPendingSwap = false;

  // Decrement requester's pending requests
  const User = mongoose.model("User");
  const requester = await User.findById(request.requestingStaff);
  if (requester) {
    await requester.decrementPendingRequests(requestId);
  }

  await this.save();

  return request;
};

// Method to reject swap request
shiftSchema.methods.rejectSwapRequest = async function (
  requestId,
  rejectedBy,
  reason,
) {
  const request = this.swapRequests.id(requestId);

  if (!request) {
    throw new Error("Swap request not found");
  }

  request.status = "rejected";
  request.respondedAt = new Date();
  request.history.push({
    action: "rejected",
    timestamp: new Date(),
    performedBy: rejectedBy,
    reason,
  });

  this.hasPendingSwap = this.swapRequests.some((r) => r.status === "pending");

  // Decrement requester's pending requests
  const User = mongoose.model("User");
  const requester = await User.findById(request.requestingStaff);
  if (requester) {
    await requester.decrementPendingRequests(requestId);
  }

  await this.save();

  return request;
};

// Method to check and expire old swap requests
shiftSchema.methods.expireOldSwapRequests = async function () {
  const now = new Date();
  let expired = false;

  this.swapRequests.forEach((request) => {
    if (
      request.status === "pending" &&
      request.expiresAt &&
      request.expiresAt < now
    ) {
      request.status = "expired";
      request.history.push({
        action: "expired",
        timestamp: now,
        performedBy: null,
        reason: "Auto-expired",
      });
      expired = true;
    }
  });

  if (expired) {
    this.hasPendingSwap = this.swapRequests.some((r) => r.status === "pending");
    await this.save();
  }

  return this;
};

// Static method to get shifts needing attention (pending swaps, unassigned)
shiftSchema.statics.getShiftsNeedingAttention = function () {
  const now = new Date();

  return this.find({
    $or: [
      { hasPendingSwap: true },
      {
        status: "published",
        startTime: { $gt: now },
        $expr: { $lt: [{ $size: "$assignedStaff" }, "$requiredCount"] },
      },
    ],
  }).populate("location", "name timezone");
};

// Static method to get shifts by date range
shiftSchema.statics.getShiftsInRange = function (
  startDate,
  endDate,
  locationId = null,
) {
  const query = {
    startTime: { $gte: startDate, $lte: endDate },
  };

  if (locationId) {
    query.location = locationId;
  }

  return this.find(query)
    .populate("location", "name timezone")
    .populate("assignedStaff", "name email skills")
    .sort({ startTime: 1 });
};

// Method to check for conflicts with other shifts
shiftSchema.methods.findConflicts = async function () {
  const conflicts = [];

  // Check each assigned staff for conflicts
  for (const staffId of this.assignedStaff) {
    const Shift = mongoose.model("Shift");

    // Find overlapping shifts
    const overlapping = await Shift.find({
      _id: { $ne: this._id },
      assignedStaff: staffId,
      status: { $in: ["draft", "published", "in_progress"] },
      $or: [
        {
          startTime: { $lt: this.endTime },
          endTime: { $gt: this.startTime },
        },
      ],
    });

    if (overlapping.length > 0) {
      conflicts.push({
        staff: staffId,
        type: "overlap",
        conflictingShifts: overlapping,
      });
    }

    // Check 10-hour gap
    const gapViolations = await Shift.find({
      _id: { $ne: this._id },
      assignedStaff: staffId,
      status: { $in: ["draft", "published", "in_progress"] },
      $or: [
        {
          endTime: {
            $gt: new Date(this.startTime.getTime() - 10 * 60 * 60 * 1000),
            $lt: this.startTime,
          },
        },
        {
          startTime: {
            $gt: this.endTime,
            $lt: new Date(this.endTime.getTime() + 10 * 60 * 60 * 1000),
          },
        },
      ],
    });

    if (gapViolations.length > 0) {
      conflicts.push({
        staff: staffId,
        type: "gap_violation",
        conflictingShifts: gapViolations,
      });
    }
  }

  return conflicts;
};

// Indexes for performance
shiftSchema.index({ location: 1, startTime: 1 });
shiftSchema.index({ assignedStaff: 1, startTime: 1 });
shiftSchema.index({ status: 1, startTime: 1 });
shiftSchema.index({ "swapRequests.status": 1 });
shiftSchema.index({ hasPendingSwap: 1 });
shiftSchema.index({ createdAt: -1 });
shiftSchema.index({ startTime: 1, endTime: 1 });
shiftSchema.index({ "complianceWarnings.type": 1 });
shiftSchema.index({ availableForPickup: 1, startTime: 1 });
shiftSchema.index({ needsCoverage: 1 });

const Shift = mongoose.model("Shift", shiftSchema);

module.exports = Shift;
