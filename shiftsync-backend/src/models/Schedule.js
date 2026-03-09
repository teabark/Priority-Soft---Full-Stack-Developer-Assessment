const mongoose = require('mongoose');

// Sub-schema for schedule version history
const scheduleVersionSchema = new mongoose.Schema({
  version: {
    type: Number,
    required: true
  },
  publishedAt: {
    type: Date,
    required: true
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shifts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift'
  }],
  changes: [{
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
    action: { type: String, enum: ['added', 'removed', 'modified'] },
    previousState: mongoose.Schema.Types.Mixed
  }],
  summary: {
    totalShifts: Number,
    totalHours: Number,
    staffCount: Number,
    locations: [mongoose.Schema.Types.ObjectId]
  },
  notes: String
}, { _id: false });

// Sub-schema for schedule stats
const scheduleStatsSchema = new mongoose.Schema({
  totalShifts: { type: Number, default: 0 },
  filledShifts: { type: Number, default: 0 },
  unfilledShifts: { type: Number, default: 0 },
  totalHours: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  premiumShifts: { type: Number, default: 0 },
  staffCount: { type: Number, default: 0 },
  locations: [{
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    shiftCount: Number,
    hours: Number,
    staffCount: Number
  }],
  compliance: {
    hasGapViolations: { type: Boolean, default: false },
    hasOvertimeWarnings: { type: Boolean, default: false },
    hasCertificationIssues: { type: Boolean, default: false },
    hasAvailabilityIssues: { type: Boolean, default: false },
    warnings: [{
      type: String,
      count: Number,
      severity: { type: String, enum: ['low', 'medium', 'high'] }
    }]
  }
}, { _id: false });

// Sub-schema for fairness metrics
const fairnessMetricsSchema = new mongoose.Schema({
  staffHours: [{
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scheduledHours: Number,
    premiumShifts: Number,
    desiredHours: Number,
    deviationFromDesired: Number,
    fairnessScore: { type: Number, min: 0, max: 100 }
  }],
  premiumShiftDistribution: {
    total: Number,
    perStaff: [{
      staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      count: Number
    }],
    giniCoefficient: Number, // Measure of inequality (0 = perfect equality, 1 = perfect inequality)
    isEquitable: Boolean
  },
  overallFairnessScore: { type: Number, min: 0, max: 100 }
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
  // Core Schedule Information
  weekStartDate: {
    type: Date,
    required: [true, 'Week start date is required'],
    index: true
  },
  weekEndDate: {
    type: Date,
    required: [true, 'Week end date is required']
  },
  
  // Which locations are included in this schedule
  locations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  }],
  
  // All shifts in this schedule
  shifts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift'
  }],
  
  // Schedule Status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'cancelled'],
    default: 'draft'
  },
  
  // Version Control
  version: {
    type: Number,
    default: 1
  },
  versionHistory: [scheduleVersionSchema],
  
  // Publishing Info
  publishedAt: Date,
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  publishedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Staff who have viewed the published schedule
  }],
  
  // Cutoff Settings (can override location defaults)
  cutoffOverrides: {
    editCutoff: { type: Number, default: 48 }, // hours before shift
    swapDeadline: { type: Number, default: 24 }, // hours before shift
    publishDeadline: { type: Number, default: 72 } // hours before week starts
  },
  
  // Schedule Statistics
  stats: {
    type: scheduleStatsSchema,
    default: () => ({})
  },
  
  // Fairness Metrics
  fairnessMetrics: {
    type: fairnessMetricsSchema,
    default: () => ({})
  },
  
  // Manager Notes
  notes: {
    internal: String, // Only visible to managers
    public: String    // Visible to staff
  },
  
  // Compliance Summary
  complianceSummary: {
    hasIssues: { type: Boolean, default: false },
    criticalIssues: [{
      type: String,
      description: String,
      affectedShifts: [mongoose.Schema.Types.ObjectId]
    }],
    warnings: [{
      type: String,
      description: String,
      affectedShifts: [mongoose.Schema.Types.ObjectId]
    }]
  },
  
  // Approval Workflow (if needed)
  approvals: [{
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    comments: String
  }],
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for unique schedule per week per location combination
scheduleSchema.index({ weekStartDate: 1, locations: 1 }, { unique: true });

// Indexes for performance
scheduleSchema.index({ status: 1, weekStartDate: -1 });
scheduleSchema.index({ 'stats.compliance.hasIssues': 1 });
scheduleSchema.index({ publishedAt: -1 });

// Calculate week end date before save
scheduleSchema.pre('save', function(next) {
  if (this.weekStartDate && !this.weekEndDate) {
    this.weekEndDate = new Date(this.weekStartDate);
    this.weekEndDate.setDate(this.weekEndDate.getDate() + 6);
    this.weekEndDate.setHours(23, 59, 59, 999);
  }
  
  this.updatedAt = Date.now();
  next();
});

// Virtual for week number
scheduleSchema.virtual('weekNumber').get(function() {
  const startDate = new Date(this.weekStartDate);
  const oneJan = new Date(startDate.getFullYear(), 0, 1);
  const numberOfDays = Math.floor((startDate - oneJan) / (24 * 60 * 60 * 1000));
  return Math.ceil((startDate.getDay() + 1 + numberOfDays) / 7);
});

// Virtual for year
scheduleSchema.virtual('year').get(function() {
  return this.weekStartDate.getFullYear();
});

// Virtual for isEditable
scheduleSchema.virtual('isEditable').get(function() {
  if (this.status !== 'draft') return false;
  
  const now = new Date();
  const publishDeadline = new Date(this.weekStartDate);
  publishDeadline.setHours(publishDeadline.getHours() - this.cutoffOverrides.publishDeadline);
  
  return now < publishDeadline;
});

// Virtual for canPublish
scheduleSchema.virtual('canPublish').get(function() {
  if (this.status !== 'draft') return false;
  
  // Check if all required shifts are filled
  const unfilledShifts = this.stats?.unfilledShifts || 0;
  if (unfilledShifts > 0) return false;
  
  // Check for critical compliance issues
  if (this.complianceSummary?.criticalIssues?.length > 0) return false;
  
  return true;
});

// Method to calculate schedule statistics
scheduleSchema.methods.calculateStats = async function() {
  const Shift = mongoose.model('Shift');
  
  // Get all shifts in this schedule
  const shifts = await Shift.find({ _id: { $in: this.shifts } })
    .populate('assignedStaff')
    .populate('location');
  
  const stats = {
    totalShifts: shifts.length,
    filledShifts: shifts.filter(s => s.isFullyStaffed).length,
    unfilledShifts: shifts.filter(s => !s.isFullyStaffed).length,
    totalHours: 0,
    overtimeHours: 0,
    premiumShifts: shifts.filter(s => s.isPremiumShift).length,
    staffCount: 0,
    locations: [],
    compliance: {
      hasGapViolations: false,
      hasOvertimeWarnings: false,
      hasCertificationIssues: false,
      hasAvailabilityIssues: false,
      warnings: []
    }
  };
  
  // Track unique staff
  const staffSet = new Set();
  const locationHours = new Map();
  const staffHours = new Map();
  const warnings = [];
  
  for (const shift of shifts) {
    // Total hours
    stats.totalHours += shift.duration / 60;
    
    // Staff tracking
    shift.assignedStaff.forEach(staff => {
      staffSet.add(staff._id.toString());
      
      // Track staff hours
      const currentHours = staffHours.get(staff._id.toString()) || 0;
      staffHours.set(staff._id.toString(), currentHours + (shift.duration / 60));
    });
    
    // Location tracking
    const locId = shift.location._id.toString();
    if (!locationHours.has(locId)) {
      locationHours.set(locId, {
        location: shift.location._id,
        shiftCount: 0,
        hours: 0,
        staffCount: 0
      });
    }
    
    const locStats = locationHours.get(locId);
    locStats.shiftCount++;
    locStats.hours += shift.duration / 60;
    
    // Check for issues
    if (shift.overtimeImpact?.causesOvertime) {
      stats.overtimeHours += shift.duration / 60;
      stats.compliance.hasOvertimeWarnings = true;
      warnings.push({
        type: 'Overtime',
        count: 1,
        severity: 'high'
      });
    }
    
    // Check compliance warnings
    if (shift.complianceWarnings && shift.complianceWarnings.length > 0) {
      shift.complianceWarnings.forEach(warning => {
        if (warning.type === 'gap_violation') {
          stats.compliance.hasGapViolations = true;
        } else if (warning.type === 'certification_mismatch') {
          stats.compliance.hasCertificationIssues = true;
        } else if (warning.type === 'availability_violation') {
          stats.compliance.hasAvailabilityIssues = true;
        }
      });
    }
  }
  
  // Aggregate warnings
  const warningCounts = warnings.reduce((acc, w) => {
    const existing = acc.find(a => a.type === w.type);
    if (existing) {
      existing.count += w.count;
    } else {
      acc.push({ type: w.type, count: w.count, severity: w.severity });
    }
    return acc;
  }, []);
  
  stats.compliance.warnings = warningCounts;
  stats.staffCount = staffSet.size;
  stats.locations = Array.from(locationHours.values());
  
  // Update location staff counts
  for (const locStat of stats.locations) {
    const locationShifts = shifts.filter(s => 
      s.location._id.toString() === locStat.location.toString()
    );
    const locationStaff = new Set();
    locationShifts.forEach(s => {
      s.assignedStaff.forEach(staff => {
        locationStaff.add(staff._id.toString());
      });
    });
    locStat.staffCount = locationStaff.size;
  }
  
  this.stats = stats;
  return stats;
};

// Method to calculate fairness metrics
scheduleSchema.methods.calculateFairnessMetrics = async function() {
  const Shift = mongoose.model('Shift');
  const User = mongoose.model('User');
  
  // Get all shifts with populated data
  const shifts = await Shift.find({ _id: { $in: this.shifts } })
    .populate('assignedStaff', 'name email desiredHours')
    .populate('location');
  
  // Track staff hours and premium shifts
  const staffData = new Map();
  
  for (const shift of shifts) {
    for (const staff of shift.assignedStaff) {
      const staffId = staff._id.toString();
      
      if (!staffData.has(staffId)) {
        staffData.set(staffId, {
          staff: staff._id,
          scheduledHours: 0,
          premiumShifts: 0,
          desiredHours: staff.desiredHours?.preferred || 30
        });
      }
      
      const data = staffData.get(staffId);
      data.scheduledHours += shift.duration / 60;
      if (shift.isPremiumShift) {
        data.premiumShifts++;
      }
    }
  }
  
  // Calculate deviation from desired hours
  const staffHours = [];
  let totalPremiumShifts = 0;
  
  for (const [staffId, data] of staffData) {
    data.deviationFromDesired = Math.abs(data.scheduledHours - data.desiredHours);
    
    // Calculate fairness score for this staff (simplified)
    // Lower deviation = higher score
    const maxDeviation = 40; // Assume max desired hours is 40
    data.fairnessScore = Math.max(0, 100 - (data.deviationFromDesired / maxDeviation * 100));
    
    staffHours.push(data);
    totalPremiumShifts += data.premiumShifts;
  }
  
  // Calculate premium shift distribution
  const premiumDistribution = staffHours.map(s => ({
    staff: s.staff,
    count: s.premiumShifts
  }));
  
  // Calculate Gini coefficient for premium shifts
  const giniCoefficient = this.calculateGiniCoefficient(
    premiumDistribution.map(d => d.count)
  );
  
  const fairnessMetrics = {
    staffHours,
    premiumShiftDistribution: {
      total: totalPremiumShifts,
      perStaff: premiumDistribution,
      giniCoefficient,
      isEquitable: giniCoefficient < 0.3 // Threshold for equity
    },
    overallFairnessScore: staffHours.reduce((sum, s) => sum + s.fairnessScore, 0) / staffHours.length
  };
  
  this.fairnessMetrics = fairnessMetrics;
  return fairnessMetrics;
};

// Helper method to calculate Gini coefficient
scheduleSchema.methods.calculateGiniCoefficient = function(values) {
  if (values.length === 0) return 0;
  if (values.every(v => v === 0)) return 0;
  
  const sorted = values.sort((a, b) => a - b);
  const n = sorted.length;
  
  let cumulative = 0;
  let giniSum = 0;
  
  for (let i = 0; i < n; i++) {
    cumulative += sorted[i];
    giniSum += (i + 1) * sorted[i];
  }
  
  if (cumulative === 0) return 0;
  
  const gini = (2 * giniSum) / (n * cumulative) - (n + 1) / n;
  return gini;
};

// Method to check compliance for all shifts
scheduleSchema.methods.checkCompliance = async function() {
  const Shift = mongoose.model('Shift');
  
  const criticalIssues = [];
  const warnings = [];
  
  for (const shiftId of this.shifts) {
    const shift = await Shift.findById(shiftId)
      .populate('assignedStaff')
      .populate('complianceWarnings');
    
    if (!shift) continue;
    
    // Check for critical issues
    if (shift.overtimeImpact?.causesOvertime) {
      shift.overtimeImpact.affectedStaff.forEach(affected => {
        if (affected.exceedsWeekly || affected.exceedsDaily) {
          criticalIssues.push({
            type: 'Overtime Violation',
            description: `Staff member would exceed ${affected.exceedsWeekly ? 'weekly' : 'daily'} hour limit`,
            affectedShifts: [shiftId]
          });
        }
      });
    }
    
    // Check for hard constraint violations
    if (shift.complianceWarnings) {
      shift.complianceWarnings.forEach(warning => {
        if (warning.severity === 'critical') {
          criticalIssues.push({
            type: warning.type,
            description: warning.message,
            affectedShifts: [shiftId]
          });
        } else if (warning.severity === 'warning') {
          warnings.push({
            type: warning.type,
            description: warning.message,
            affectedShifts: [shiftId]
          });
        }
      });
    }
    
    // Check if shift is understaffed
    if (!shift.isFullyStaffed) {
      warnings.push({
        type: 'Understaffed',
        description: `Shift requires ${shift.requiredCount} staff but has ${shift.assignedStaff.length}`,
        affectedShifts: [shiftId]
      });
    }
  }
  
  this.complianceSummary = {
    hasIssues: criticalIssues.length > 0 || warnings.length > 0,
    criticalIssues,
    warnings
  };
  
  return this.complianceSummary;
};

// Method to publish schedule
scheduleSchema.methods.publish = async function(publishedBy, notes = '') {
  if (!this.canPublish) {
    throw new Error('Schedule cannot be published due to unfilled shifts or compliance issues');
  }
  
  // Save current state to version history
  const versionData = {
    version: this.version,
    publishedAt: new Date(),
    publishedBy,
    shifts: [...this.shifts],
    changes: [],
    summary: {
      totalShifts: this.stats.totalShifts,
      totalHours: this.stats.totalHours,
      staffCount: this.stats.staffCount,
      locations: this.locations
    },
    notes
  };
  
  this.versionHistory.push(versionData);
  this.version += 1;
  this.status = 'published';
  this.publishedAt = new Date();
  this.publishedBy = publishedBy;
  
  // Update all shifts to published status
  const Shift = mongoose.model('Shift');
  await Shift.updateMany(
    { _id: { $in: this.shifts } },
    { 
      status: 'published',
      publishedAt: new Date(),
      publishedBy
    }
  );
  
  await this.save();
  return this;
};

// Method to unpublish schedule
scheduleSchema.methods.unpublish = async function(unpublishedBy, reason) {
  if (this.status !== 'published') {
    throw new Error('Schedule is not published');
  }
  
  this.status = 'draft';
  
  // Update all shifts back to draft
  const Shift = mongoose.model('Shift');
  await Shift.updateMany(
    { _id: { $in: this.shifts } },
    { status: 'draft' }
  );
  
  // Add to version history
  this.versionHistory.push({
    version: this.version,
    publishedAt: new Date(),
    publishedBy: unpublishedBy,
    shifts: [...this.shifts],
    changes: [{ action: 'unpublished', reason }],
    summary: this.stats,
    notes: `Unpublished: ${reason}`
  });
  
  this.version += 1;
  await this.save();
  
  return this;
};

// Method to add shift to schedule
scheduleSchema.methods.addShift = async function(shiftId, addedBy) {
  if (this.status !== 'draft') {
    throw new Error('Cannot add shifts to non-draft schedule');
  }
  
  if (!this.shifts.includes(shiftId)) {
    this.shifts.push(shiftId);
    this.updatedBy = addedBy;
    
    // Recalculate stats
    await this.calculateStats();
    await this.save();
  }
  
  return this;
};

// Method to remove shift from schedule
scheduleSchema.methods.removeShift = async function(shiftId, removedBy, reason) {
  if (this.status !== 'draft') {
    throw new Error('Cannot remove shifts from non-draft schedule');
  }
  
  this.shifts = this.shifts.filter(id => id.toString() !== shiftId.toString());
  this.updatedBy = removedBy;
  
  // Recalculate stats
  await this.calculateStats();
  await this.save();
  
  return this;
};

// Method to get shifts by location
scheduleSchema.methods.getShiftsByLocation = function(locationId) {
  return this.shifts.filter(shift => 
    shift.location.toString() === locationId.toString()
  );
};

// Method to get shifts by staff
scheduleSchema.methods.getShiftsByStaff = function(staffId) {
  return this.shifts.filter(shift => 
    shift.assignedStaff.includes(staffId)
  );
};

// Method to get staff schedule view
scheduleSchema.methods.getStaffView = function(staffId) {
  const staffShifts = this.shifts.filter(shift => 
    shift.assignedStaff.some(s => s.toString() === staffId.toString())
  );
  
  return {
    weekStartDate: this.weekStartDate,
    weekEndDate: this.weekEndDate,
    shifts: staffShifts,
    totalHours: staffShifts.reduce((sum, shift) => sum + shift.duration, 0) / 60,
    premiumShifts: staffShifts.filter(s => s.isPremiumShift).length,
    status: this.status
  };
};

// Method to get manager dashboard
scheduleSchema.methods.getManagerDashboard = async function() {
  await this.populate('shifts', 'location startTime endTime requiredSkill assignedStaff status')
    .populate('locations', 'name timezone')
    .execPopulate();
  
  return {
    weekInfo: {
      startDate: this.weekStartDate,
      endDate: this.weekEndDate,
      weekNumber: this.weekNumber,
      year: this.year,
      status: this.status
    },
    stats: this.stats,
    compliance: this.complianceSummary,
    fairness: {
      score: this.fairnessMetrics?.overallFairnessScore || 0,
      premiumShiftDistribution: this.fairnessMetrics?.premiumShiftDistribution || {},
      staffWithLowFairness: this.fairnessMetrics?.staffHours
        ?.filter(s => s.fairnessScore < 50)
        .map(s => s.staff) || []
    },
    locations: this.locations.map(loc => ({
      id: loc._id,
      name: loc.name,
      timezone: loc.timezone,
      shiftCount: this.stats.locations.find(l => 
        l.location.toString() === loc._id.toString()
      )?.shiftCount || 0
    }))
  };
};

// Static method to get current week schedule for location
scheduleSchema.statics.getCurrentWeekForLocation = function(locationId) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return this.findOne({
    locations: locationId,
    weekStartDate: { $lte: startOfWeek },
    weekEndDate: { $gte: endOfWeek }
  });
};

// Static method to get schedule history for location
scheduleSchema.statics.getHistoryForLocation = function(locationId, limit = 10) {
  return this.find({ locations: locationId })
    .sort({ weekStartDate: -1 })
    .limit(limit)
    .populate('publishedBy', 'name email')
    .select('weekStartDate weekEndDate status publishedAt stats version');
};

// Static method to compare two schedules
scheduleSchema.statics.compareSchedules = async function(scheduleId1, scheduleId2) {
  const schedule1 = await this.findById(scheduleId1).populate('shifts');
  const schedule2 = await this.findById(scheduleId2).populate('shifts');
  
  if (!schedule1 || !schedule2) {
    throw new Error('One or both schedules not found');
  }
  
  const comparison = {
    weekComparison: {
      week1: schedule1.weekStartDate,
      week2: schedule2.weekStartDate,
      isSameWeek: schedule1.weekStartDate.toDateString() === schedule2.weekStartDate.toDateString()
    },
    statsComparison: {
      totalShifts: {
        week1: schedule1.stats.totalShifts,
        week2: schedule2.stats.totalShifts,
        difference: schedule2.stats.totalShifts - schedule1.stats.totalShifts
      },
      totalHours: {
        week1: schedule1.stats.totalHours,
        week2: schedule2.stats.totalHours,
        difference: schedule2.stats.totalHours - schedule1.stats.totalHours
      },
      overtimeHours: {
        week1: schedule1.stats.overtimeHours,
        week2: schedule2.stats.overtimeHours,
        difference: schedule2.stats.overtimeHours - schedule1.stats.overtimeHours
      }
    },
    fairnessComparison: {
      score1: schedule1.fairnessMetrics?.overallFairnessScore || 0,
      score2: schedule2.fairnessMetrics?.overallFairnessScore || 0,
      improvement: (schedule2.fairnessMetrics?.overallFairnessScore || 0) - 
                  (schedule1.fairnessMetrics?.overallFairnessScore || 0)
    },
    shiftDifferences: {
      added: schedule2.shifts.filter(s2 => 
        !schedule1.shifts.some(s1 => s1._id.toString() === s2._id.toString())
      ),
      removed: schedule1.shifts.filter(s1 => 
        !schedule2.shifts.some(s2 => s2._id.toString() === s1._id.toString())
      )
    }
  };
  
  return comparison;
};

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;