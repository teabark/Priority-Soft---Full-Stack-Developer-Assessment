const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const availabilitySchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0, // Sunday = 0
      max: 6, // Saturday = 6
    },
    startTime: {
      type: String,
      required: true,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please use HH:MM format"],
    },
    endTime: {
      type: String,
      required: true,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please use HH:MM format"],
    },
    timezone: {
      type: String,
      required: true,
      default: "America/New_York",
    },
    isRecurring: {
      type: Boolean,
      default: true,
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
    },
    exceptions: [
      {
        date: Date,
        isAvailable: Boolean,
        reason: String,
      },
    ],
  },
  { _id: false },
);

const certificationSchema = new mongoose.Schema(
  {
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    certifiedAt: {
      type: Date,
      default: Date.now,
    },
    certifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    expiresAt: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    decertificationReason: String,
    decertifiedAt: Date,
    decertifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: false },
);

const notificationPreferencesSchema = new mongoose.Schema(
  {
    inApp: {
      type: Boolean,
      default: true,
    },
    email: {
      type: Boolean,
      default: true,
    },
    shiftAssigned: { type: Boolean, default: true },
    shiftChanged: { type: Boolean, default: true },
    shiftPublished: { type: Boolean, default: true },
    swapRequestReceived: { type: Boolean, default: true },
    swapRequestUpdated: { type: Boolean, default: true },
    overtimeWarning: { type: Boolean, default: true },
    schedulePublished: { type: Boolean, default: true },
    availabilityChange: { type: Boolean, default: false },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, "Please add a name"],
      trim: true,
      maxlength: [100, "Name cannot be more than 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "manager", "staff"],
      default: "staff",
    },

    // Professional Information
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
    },
    phoneNumber: {
      type: String,
      // More flexible regex that accepts various formats:
      // +1-206-555-1000, (206) 555-1000, 2065551000, +1234567890, etc.
    //   match: [
    //     /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{3,6}[-\s.]?[0-9]{0,4}$/,
    //     "Please add a valid phone number",
    //   ],
      sparse: true,
    },
    skills: [
      {
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
      },
    ],

    // Location Management
    locations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Location",
      },
    ],

    // Detailed certifications (to handle history)
    certifications: [certificationSchema],

    // Availability
    availability: [availabilitySchema],

    // Staff Preferences
    desiredHours: {
      min: {
        type: Number,
        min: 0,
        max: 168,
        default: 0,
      },
      max: {
        type: Number,
        min: 0,
        max: 168,
        default: 40,
      },
      preferred: {
        type: Number,
        min: 0,
        max: 168,
        default: 30,
      },
    },

    // Notification Preferences
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({}),
    },

    // Work Statistics (cached for performance)
    workStats: {
      totalHoursThisWeek: { type: Number, default: 0 },
      totalHoursThisMonth: { type: Number, default: 0 },
      consecutiveDaysWorked: { type: Number, default: 0 },
      lastShiftDate: Date,
      premiumShiftsCount: { type: Number, default: 0 },
      overtimeHours: { type: Number, default: 0 },
    },

    // Swap/Drop Request Limits
    pendingRequests: {
      count: { type: Number, default: 0, max: 3 },
      requestIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SwapRequest",
        },
      ],
    },

    // Account Status
    isActive: {
      type: Boolean,
      default: true,
    },
    deactivatedAt: Date,
    deactivationReason: String,

    // Password Reset
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // Metadata
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for shifts (populated when needed)
userSchema.virtual("shifts", {
  ref: "Shift",
  localField: "_id",
  foreignField: "assignedStaff",
});

// Virtual for swap requests
userSchema.virtual("swapRequests", {
  ref: "SwapRequest",
  localField: "_id",
  foreignField: "requestingStaff",
});

// Virtual for swap offers
userSchema.virtual("swapOffers", {
  ref: "SwapRequest",
  localField: "_id",
  foreignField: "targetStaff",
});

// ENCRYPT PASSWORD BEFORE SAVE - SIMPLE WORKING VERSION
// userSchema.pre('save', async function(next) {
//   // Only hash the password if it's modified (or new)
//   if (!this.isModified('password')) {
//     this.updatedAt = Date.now();
//     return next();
//   }
  
//   try {
//     // Use sync methods to avoid callback issues
//     const salt = await bcrypt.genSaltSync(parseInt(process.env.BCRYPT_ROUNDS) || 10);
//     this.password = await bcrypt.hashSync(this.password, salt);
//     this.updatedAt = Date.now();
//     return next();
//   } catch (error) {
//     return next(error);
//   }
// });

// Update timestamps on update
// userSchema.pre('findOneAndUpdate', function(next) {
//   this.set({ updatedAt: Date.now() });
//   next();
// });

// For updateOne
// userSchema.pre('updateOne', function(next) {
//   this.set({ updatedAt: Date.now() });
//   next();
// });

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to check if user is certified for a location
userSchema.methods.isCertifiedForLocation = function (locationId) {
  const certification = this.certifications.find(
    (cert) =>
      cert.location.toString() === locationId.toString() &&
      cert.isActive === true,
  );

  return !!certification;
};

// Method to check if user has a skill
userSchema.methods.hasSkill = function (skill) {
  return this.skills.includes(skill);
};

// Method to check availability for a specific time
userSchema.methods.isAvailableAt = function (date, duration, timezone) {
  const shiftStart = new Date(date);
  const shiftEnd = new Date(shiftStart.getTime() + duration * 60000); // duration in minutes

  // Check recurring availability
  const dayOfWeek = shiftStart.getDay();
  const timeString = shiftStart.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  const recurringSlot = this.availability.find(
    (slot) =>
      slot.dayOfWeek === dayOfWeek &&
      slot.isRecurring === true &&
      timeString >= slot.startTime &&
      timeString <= slot.endTime,
  );

  if (!recurringSlot) {
    return false;
  }

  // Check exceptions
  const exception = this.availability
    .flatMap((a) => a.exceptions)
    .find((e) => e.date.toDateString() === shiftStart.toDateString());

  if (exception && !exception.isAvailable) {
    return false;
  }

  return true;
};

// Method to increment pending requests
userSchema.methods.incrementPendingRequests = async function (requestId) {
  if (this.pendingRequests.count >= 3) {
    throw new Error("Maximum pending requests (3) reached");
  }

  this.pendingRequests.count += 1;
  this.pendingRequests.requestIds.push(requestId);
  await this.save();

  return this.pendingRequests;
};

// Method to decrement pending requests
userSchema.methods.decrementPendingRequests = async function (requestId) {
  this.pendingRequests.requestIds = this.pendingRequests.requestIds.filter(
    (id) => id.toString() !== requestId.toString(),
  );
  this.pendingRequests.count = this.pendingRequests.requestIds.length;
  await this.save();

  return this.pendingRequests;
};

// Method to certify for a location
userSchema.methods.certifyForLocation = async function (
  locationId,
  certifiedBy,
) {
  // Deactivate any existing certifications for this location
  this.certifications = this.certifications.map((cert) => {
    if (cert.location.toString() === locationId.toString()) {
      cert.isActive = false;
    }
    return cert;
  });

  // Add new certification
  this.certifications.push({
    location: locationId,
    certifiedAt: Date.now(),
    certifiedBy: certifiedBy,
    isActive: true,
  });

  // Add location to user's locations if not already there
  if (!this.locations.includes(locationId)) {
    this.locations.push(locationId);
  }

  await this.save();
  return this;
};

// Method to decertify from a location
userSchema.methods.decertifyFromLocation = async function (
  locationId,
  reason,
  decertifiedBy,
) {
  const certification = this.certifications.find(
    (cert) =>
      cert.location.toString() === locationId.toString() && cert.isActive,
  );

  if (certification) {
    certification.isActive = false;
    certification.decertificationReason = reason;
    certification.decertifiedAt = Date.now();
    certification.decertifiedBy = decertifiedBy;

    // Remove from locations array
    this.locations = this.locations.filter(
      (loc) => loc.toString() !== locationId.toString(),
    );

    await this.save();
  }

  return this;
};

// Static method to get users with pending requests
userSchema.statics.getUsersWithPendingRequests = function () {
  return this.find({ "pendingRequests.count": { $gt: 0 } });
};

// Indexes for performance
// userSchema.index({ email: 1 });
// userSchema.index({ role: 1 });
// userSchema.index({ locations: 1 });
// userSchema.index({ skills: 1 });
// userSchema.index({
//   "certifications.location": 1,
//   "certifications.isActive": 1,
// });
// userSchema.index({ "availability.dayOfWeek": 1 });
// userSchema.index({ createdAt: -1 });

const User = mongoose.model("User", userSchema);

module.exports = User;
