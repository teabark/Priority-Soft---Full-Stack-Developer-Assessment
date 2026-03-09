const mongoose = require('mongoose');

// Sub-schema for operating hours
const operatingHoursSchema = new mongoose.Schema({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6
  },
  openTime: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please use HH:MM format']
  },
  closeTime: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please use HH:MM format']
  },
  isClosed: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Sub-schema for location features
const featuresSchema = new mongoose.Schema({
  hasParking: { type: Boolean, default: false },
  hasOutdoorSeating: { type: Boolean, default: false },
  hasDelivery: { type: Boolean, default: false },
  hasTakeout: { type: Boolean, default: false },
  capacity: { type: Number, min: 0, default: 0 },
  squareFootage: Number,
  kitchenType: [{
    type: String,
    enum: ['full', 'prep', 'ghost', 'food_truck']
  }]
}, { _id: false });

// Sub-schema for timezone boundaries (for locations near state lines)
const timezoneBoundarySchema = new mongoose.Schema({
  crossesBoundary: { type: Boolean, default: false },
  alternateTimezone: String,
  boundaryDescription: String,
  affectedAreas: [String]
}, { _id: false });

const locationSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Please add a location name'],
    trim: true,
    unique: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Please add a location code'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [10, 'Code cannot be more than 10 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  
  // Address Information
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, default: 'USA' },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // Timezone Handling (CRITICAL for requirements)
  timezone: {
    type: String,
    required: true,
    enum: [
      'America/New_York',    // Eastern Time
      'America/Chicago',      // Central Time
      'America/Denver',       // Mountain Time
      'America/Los_Angeles',  // Pacific Time
      'America/Anchorage',    // Alaska
      'Pacific/Honolulu'      // Hawaii
    ],
    default: 'America/New_York'
  },
  
  // For locations spanning timezone boundaries (requirement)
  timezoneBoundary: timezoneBoundarySchema,
  
  // Operating Information
  operatingHours: [operatingHoursSchema],
  
  // Features and Capacity
  features: {
    type: featuresSchema,
    default: () => ({})
  },
  
  // Staff Management
  managers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  staff: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date, default: Date.now },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true }
  }],
  
  // Required Skills at this location
  requiredSkills: [{
    skill: {
      type: String,
      enum: ['bartender', 'line_cook', 'server', 'host', 'manager', 'dishwasher', 'busser']
    },
    minimumCount: { type: Number, default: 1 },
    isEssential: { type: Boolean, default: false }
  }],
  
  // Schedule Settings
  scheduleSettings: {
    publishCutoff: {
      type: Number, // hours before shift
      default: 48
    },
    minHoursBetweenShifts: {
      type: Number, // hours
      default: 10
    },
    maxWeeklyHours: {
      type: Number,
      default: 40
    },
    maxDailyHours: {
      type: Number,
      default: 12
    },
    overtimeThreshold: {
      type: Number,
      default: 35 // hours at which warning appears
    },
    defaultShiftDuration: {
      type: Number, // hours
      default: 8
    }
  },
  
  // Premium Shift Definition (Fri/Sat evenings)
  premiumShifts: {
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6,
      default: [5, 6] // Friday and Saturday
    }],
    startTime: {
      type: String,
      default: '18:00' // 6 PM
    },
    endTime: {
      type: String,
      default: '23:00' // 11 PM
    },
    multiplier: {
      type: Number,
      default: 1.5 // 1.5x pay or premium points
    }
  },
  
  // Location Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'closed'],
    default: 'active'
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Holiday Schedule (special operating hours)
  holidaySchedule: [{
    date: Date,
    name: String, // e.g., "Christmas Day"
    openTime: String,
    closeTime: String,
    isClosed: Boolean
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for active staff count
locationSchema.virtual('activeStaffCount').get(function() {
  return this.staff.filter(s => s.isActive).length;
});

// Virtual for shifts at this location
locationSchema.virtual('shifts', {
  ref: 'Shift',
  localField: '_id',
  foreignField: 'location'
});

// Virtual for current on-duty staff
locationSchema.virtual('onDutyStaff', {
  ref: 'Shift',
  localField: '_id',
  foreignField: 'location',
  match: { 
    status: 'in_progress',
    date: { $gte: new Date().setHours(0,0,0,0) }
  }
});

// Check if location is open at specific time
locationSchema.methods.isOpenAt = function(dateTime) {
  const moment = require('moment-timezone');
  const localTime = moment(dateTime).tz(this.timezone);
  
  const dayOfWeek = localTime.day();
  const timeString = localTime.format('HH:mm');
  
  const dayHours = this.operatingHours.find(h => h.dayOfWeek === dayOfWeek);
  
  if (!dayHours || dayHours.isClosed) {
    return false;
  }
  
  return timeString >= dayHours.openTime && timeString <= dayHours.closeTime;
};

// Check if a shift qualifies as premium
locationSchema.methods.isPremiumShift = function(startTime, endTime) {
  const moment = require('moment-timezone');
  const localStart = moment(startTime).tz(this.timezone);
  const localEnd = moment(endTime).tz(this.timezone);
  
  // Check if it's a premium day (Fri/Sat)
  if (!this.premiumShifts.daysOfWeek.includes(localStart.day())) {
    return false;
  }
  
  // Parse premium hours
  const [premiumHour, premiumMin] = this.premiumShifts.startTime.split(':').map(Number);
  const [premiumEndHour, premiumEndMin] = this.premiumShifts.endTime.split(':').map(Number);
  
  const premiumStart = moment(localStart).hour(premiumHour).minute(premiumMin);
  const premiumEnd = moment(localStart).hour(premiumEndHour).minute(premiumEndMin);
  
  // If shift spans past midnight, adjust premium end
  if (premiumEnd.isBefore(premiumStart)) {
    premiumEnd.add(1, 'day');
  }
  
  // Check overlap with premium hours
  return localStart.isBefore(premiumEnd) && localEnd.isAfter(premiumStart);
};

// Get timezone offset for display
locationSchema.methods.getCurrentOffset = function() {
  const moment = require('moment-timezone');
  return moment.tz(this.timezone).format('Z');
};

// Convert time to location timezone
locationSchema.methods.toLocationTime = function(dateTime) {
  const moment = require('moment-timezone');
  return moment(dateTime).tz(this.timezone);
};

// Get next business day
locationSchema.methods.getNextBusinessDay = function(fromDate, daysAhead = 1) {
  const moment = require('moment-timezone');
  let checkDate = moment(fromDate).tz(this.timezone).add(daysAhead, 'days');
  
  // Check if open on that day
  while (true) {
    const dayOfWeek = checkDate.day();
    const dayHours = this.operatingHours.find(h => h.dayOfWeek === dayOfWeek);
    
    if (dayHours && !dayHours.isClosed) {
      return checkDate.toDate();
    }
    
    checkDate.add(1, 'day');
  }
};

// Add manager to location
locationSchema.methods.addManager = async function(managerId, addedBy) {
  if (!this.managers.includes(managerId)) {
    this.managers.push(managerId);
    this.updatedBy = addedBy;
    await this.save();
  }
  return this;
};

// Remove manager from location
locationSchema.methods.removeManager = async function(managerId, removedBy) {
  this.managers = this.managers.filter(
    id => id.toString() !== managerId.toString()
  );
  this.updatedBy = removedBy;
  await this.save();
  return this;
};

// Assign staff to location
locationSchema.methods.assignStaff = async function(staffId, assignedBy) {
  const existing = this.staff.find(s => s.user.toString() === staffId.toString());
  
  if (existing) {
    existing.isActive = true;
    existing.assignedAt = Date.now();
    existing.assignedBy = assignedBy;
  } else {
    this.staff.push({
      user: staffId,
      assignedBy: assignedBy,
      isActive: true
    });
  }
  
  this.updatedBy = assignedBy;
  await this.save();
  return this;
};

// Remove staff from location
locationSchema.methods.removeStaff = async function(staffId, removedBy) {
  const staffIndex = this.staff.findIndex(
    s => s.user.toString() === staffId.toString()
  );
  
  if (staffIndex !== -1) {
    this.staff[staffIndex].isActive = false;
    this.updatedBy = removedBy;
    await this.save();
  }
  
  return this;
};

// Get staff with specific skill
locationSchema.methods.getStaffWithSkill = function(skill) {
  return this.staff
    .filter(s => s.isActive)
    .map(s => s.user)
    .filter(user => user.skills && user.skills.includes(skill));
};

// Validate operating hours
locationSchema.methods.validateOperatingHours = function() {
  const errors = [];
  
  this.operatingHours.forEach((hours, index) => {
    const open = hours.openTime.split(':').map(Number);
    const close = hours.closeTime.split(':').map(Number);
    
    const openMinutes = open[0] * 60 + open[1];
    const closeMinutes = close[0] * 60 + close[1];
    
    // If not closed, check valid times
    if (!hours.isClosed) {
      if (closeMinutes <= openMinutes) {
        errors.push(`Day ${hours.dayOfWeek}: Close time must be after open time`);
      }
      
      // Check minimum operating hours (e.g., 4 hours)
      if (closeMinutes - openMinutes < 240) {
        errors.push(`Day ${hours.dayOfWeek}: Minimum operating hours is 4 hours`);
      }
    }
  });
  
  return errors;
};

// Static method to get locations by timezone
locationSchema.statics.findByTimezone = function(timezone) {
  return this.find({ 
    $or: [
      { timezone: timezone },
      { 'timezoneBoundary.alternateTimezone': timezone }
    ]
  });
};

// Static method to get all locations with active staff
locationSchema.statics.getLocationsWithStaff = function() {
  return this.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'staff.user',
        foreignField: '_id',
        as: 'staffDetails'
      }
    },
    {
      $project: {
        name: 1,
        code: 1,
        timezone: 1,
        activeStaffCount: {
          $size: {
            $filter: {
              input: '$staff',
              as: 's',
              cond: '$$s.isActive'
            }
          }
        },
        staffDetails: 1
      }
    }
  ]);
};

// Indexes for performance
// locationSchema.index({ code: 1 });
// locationSchema.index({ timezone: 1 });
// locationSchema.index({ 'staff.user': 1, 'staff.isActive': 1 });
// locationSchema.index({ managers: 1 });
// locationSchema.index({ status: 1 });
// locationSchema.index({ 'address.zipCode': 1 });
// locationSchema.index({ 'address.city': 1, 'address.state': 1 });

const Location = mongoose.model('Location', locationSchema);

module.exports = Location;