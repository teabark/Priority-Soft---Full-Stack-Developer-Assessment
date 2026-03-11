const mongoose = require('mongoose');

// Sub-schema for notification delivery attempts
const deliveryAttemptSchema = new mongoose.Schema({
  channel: {
    type: String,
    enum: ['in_app', 'email', 'push', 'sms'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'delivered', 'read'],
    default: 'pending'
  },
  attemptedAt: {
    type: Date,
    default: Date.now
  },
  deliveredAt: Date,
  readAt: Date,
  error: String,
  retryCount: {
    type: Number,
    default: 0
  }
}, { _id: false });

// Sub-schema for notification actions
const notificationActionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['view_shift', 'approve_swap', 'reject_swap', 'view_schedule', 
           'contact_manager', 'acknowledge', 'dismiss'],
    required: true
  },
  label: {
    type: String,
    required: true
  },
  url: String,
  data: mongoose.Schema.Types.Mixed,
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date
}, { _id: false });

// Sub-schema for notification templates
const templateSchema = new mongoose.Schema({
  subject: String,
  body: String,
  html: String,
  variables: [String] // Expected variables to be replaced
}, { _id: false });

const notificationSchema = new mongoose.Schema({
  // Recipient
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Sender (if any)
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Notification Type
  type: {
    type: String,
    enum: [
      // Shift related
      'shift_assigned',
      'shift_changed',
      'shift_cancelled',
      'shift_published',
      'shift_reminder',
      'shift_callout',
      
      // Schedule related
      'schedule_published',
      'schedule_updated',
      'schedule_draft',
      
      // Swap/Drop related
      'swap_requested',
      'swap_received',
      'swap_approved',
      'swap_rejected',
      'swap_cancelled',
      'swap_expired',
      'drop_requested',
      'pickup_available',
      'pickup_taken',
      
      // Compliance related
      'overtime_warning',
      'gap_violation',
      'certification_expiring',
      'availability_conflict',
      
      // Staff related
      'staff_availability_changed',
      'staff_certified',
      'staff_decertified',
      
      // System
      'system_alert',
      'reminder',
      'announcement'
    ],
    required: true
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Content
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  shortMessage: {
    type: String,
    maxlength: [100, 'Short message cannot exceed 100 characters']
  },
  
  // Template (for reusable notifications)
  template: templateSchema,
  
  // Rich Content
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Related entities
  relatedTo: {
    model: {
      type: String,
      enum: ['User', 'Shift', 'Schedule', 'Location', 'SwapRequest']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedTo.model'
    },
    summary: String
  },
  
  // Actions available
  actions: [notificationActionSchema],
  
  // Delivery tracking
  deliveryAttempts: [deliveryAttemptSchema],
  
  // Channels to use
  channels: [{
    type: String,
    enum: ['in_app', 'email', 'push', 'sms'],
    default: ['in_app']
  }],
  
  // User notification preferences override
  preferenceOverride: {
    type: Map,
    of: Boolean
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'delivered', 'read', 'archived'],
    default: 'pending',
    index: true
  },
  
  // Read tracking
  readAt: Date,
  readCount: {
    type: Number,
    default: 0
  },
  
  // Expiration
  expiresAt: Date,
  
  // Grouping (for similar notifications)
  groupKey: {
    type: String,
    index: true
  },
  groupCount: {
    type: Number,
    default: 1
  },
  
  // Dismissible
  isDismissible: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
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

// Indexes for performance
notificationSchema.index({ recipient: 1, status: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, readAt: 1 });
notificationSchema.index({ 'relatedTo.model': 1, 'relatedTo.id': 1 });
notificationSchema.index({ groupKey: 1, recipient: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index


// Virtual for time since creation
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffMs = now - this.createdAt;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
});

// Virtual for isExpired
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

// Virtual for needsAction
notificationSchema.virtual('needsAction').get(function() {
  return this.actions.some(action => !action.completed);
});

// Method to mark as read
notificationSchema.methods.markAsRead = async function(channel = 'in_app') {
  this.status = 'read';
  this.readAt = new Date();
  this.readCount += 1;
  
  // Update delivery attempt
  const attempt = this.deliveryAttempts.find(a => a.channel === channel);
  if (attempt) {
    attempt.status = 'read';
    attempt.readAt = new Date();
  }
  
  await this.save();
  return this;
};

// Method to mark as delivered
notificationSchema.methods.markAsDelivered = async function(channel) {
  let attempt = this.deliveryAttempts.find(a => a.channel === channel);
  
  if (!attempt) {
    attempt = {
      channel,
      status: 'delivered',
      deliveredAt: new Date()
    };
    this.deliveryAttempts.push(attempt);
  } else {
    attempt.status = 'delivered';
    attempt.deliveredAt = new Date();
  }
  
  // If all channels delivered, update status
  const allDelivered = this.channels.every(ch => 
    this.deliveryAttempts.some(a => a.channel === ch && a.status === 'delivered')
  );
  
  if (allDelivered) {
    this.status = 'delivered';
  }
  
  await this.save();
  return this;
};

// Method to mark as failed
notificationSchema.methods.markAsFailed = async function(channel, error) {
  let attempt = this.deliveryAttempts.find(a => a.channel === channel);
  
  if (!attempt) {
    attempt = {
      channel,
      status: 'failed',
      attemptedAt: new Date(),
      error,
      retryCount: 1
    };
    this.deliveryAttempts.push(attempt);
  } else {
    attempt.status = 'failed';
    attempt.error = error;
    attempt.retryCount += 1;
  }
  
  await this.save();
  return this;
};

// Method to retry failed notification
notificationSchema.methods.retry = async function(channel) {
  const attempt = this.deliveryAttempts.find(a => a.channel === channel);
  
  if (attempt && attempt.status === 'failed') {
    attempt.status = 'pending';
    attempt.error = null;
    await this.save();
  }
  
  return this;
};

// Method to complete an action
notificationSchema.methods.completeAction = async function(actionType, data = {}) {
  const action = this.actions.find(a => a.type === actionType && !a.completed);
  
  if (action) {
    action.completed = true;
    action.completedAt = new Date();
    if (data) {
      action.data = { ...action.data, ...data };
    }
    await this.save();
  }
  
  return this;
};

// Method to dismiss notification
notificationSchema.methods.dismiss = async function() {
  if (!this.isDismissible) {
    throw new Error('This notification cannot be dismissed');
  }
  
  this.status = 'archived';
  await this.save();
  return this;
};

// Static method to create shift assignment notification
notificationSchema.statics.createShiftAssignedNotification = async function(staffId, shift, assignedBy) {
  const location = await mongoose.model('Location').findById(shift.location);
  
  const startTime = new Date(shift.startTime).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: location?.timezone || 'UTC'
  });
  
  const notification = new this({
    recipient: staffId,
    sender: assignedBy,
    type: 'shift_assigned',
    priority: 'high',
    title: 'New Shift Assigned',
    message: `You have been assigned to ${shift.requiredSkill} shift on ${startTime} at ${location?.name || 'Unknown location'}`,
    shortMessage: `New shift: ${location?.name} - ${startTime}`,
    relatedTo: {
      model: 'Shift',
      id: shift._id,
      summary: `${location?.name}: ${shift.requiredSkill} - ${startTime}`
    },
    actions: [
      {
        type: 'view_shift',
        label: 'View Shift',
        url: `/shifts/${shift._id}`,
        data: { shiftId: shift._id }
      },
      {
        type: 'dismiss',
        label: 'Dismiss',
        data: {}
      }
    ],
    channels: ['in_app', 'email'],
    expiresAt: new Date(shift.startTime) // Expire when shift starts
  });
  
  await notification.save();
  return notification;
};

// Static method to create swap request notification
notificationSchema.statics.createSwapRequestNotification = async function(swapRequest, shift, requestingStaff, targetStaff) {
  const location = await mongoose.model('Location').findById(shift.location);
  
  const startTime = new Date(shift.startTime).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: location?.timezone || 'UTC'
  });
  
  const notification = new this({
    recipient: targetStaff,
    sender: requestingStaff,
    type: 'swap_received',
    priority: 'high',
    title: 'Shift Swap Request',
    message: `${requestingStaff.name} has requested to swap shifts with you on ${startTime} at ${location?.name}`,
    shortMessage: `Swap request: ${location?.name} - ${startTime}`,
    relatedTo: {
      model: 'SwapRequest',
      id: swapRequest._id,
      summary: `Swap request for shift at ${location?.name} on ${startTime}`
    },
    data: {
      swapRequestId: swapRequest._id,
      shiftId: shift._id
    },
    actions: [
      {
        type: 'view_shift',
        label: 'View Shift',
        url: `/shifts/${shift._id}`,
        data: { shiftId: shift._id }
      },
      {
        type: 'approve_swap',
        label: 'Approve Swap',
        data: { swapRequestId: swapRequest._id }
      },
      {
        type: 'reject_swap',
        label: 'Reject',
        data: { swapRequestId: swapRequest._id }
      }
    ],
    channels: ['in_app', 'email'],
    expiresAt: swapRequest.expiresAt
  });
  
  await notification.save();
  return notification;
};

// Static method to create swap approval notification
notificationSchema.statics.createSwapApprovedNotification = async function(swapRequest, shift, approvingManager, requestingStaff, targetStaff) {
  const location = await mongoose.model('Location').findById(shift.location);
  
  const startTime = new Date(shift.startTime).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: location?.timezone || 'UTC'
  });
  
  // Notify requesting staff
  const notification1 = new this({
    recipient: requestingStaff,
    sender: approvingManager,
    type: 'swap_approved',
    priority: 'high',
    title: 'Swap Request Approved',
    message: `Your swap request for shift on ${startTime} at ${location?.name} has been approved. You are no longer assigned to this shift.`,
    shortMessage: `Swap approved: ${location?.name} - ${startTime}`,
    relatedTo: {
      model: 'SwapRequest',
      id: swapRequest._id,
      summary: `Swap approved for shift at ${location?.name}`
    },
    actions: [
      {
        type: 'view_schedule',
        label: 'View Schedule',
        url: `/schedule`,
        data: {}
      }
    ],
    channels: ['in_app', 'email']
  });
  
  // Notify target staff
  const notification2 = new this({
    recipient: targetStaff,
    sender: approvingManager,
    type: 'swap_approved',
    priority: 'high',
    title: 'New Shift Assigned via Swap',
    message: `You have been assigned to a shift on ${startTime} at ${location?.name} via swap approval.`,
    shortMessage: `New shift via swap: ${location?.name} - ${startTime}`,
    relatedTo: {
      model: 'Shift',
      id: shift._id,
      summary: `Shift at ${location?.name} on ${startTime}`
    },
    actions: [
      {
        type: 'view_shift',
        label: 'View Shift',
        url: `/shifts/${shift._id}`,
        data: { shiftId: shift._id }
      }
    ],
    channels: ['in_app', 'email']
  });
  
  await notification1.save();
  await notification2.save();
  
  return [notification1, notification2];
};

// Static method to create overtime warning notification
notificationSchema.statics.createOvertimeWarningNotification = async function(staffId, hours, weekStartDate, locationIds) {
  const locations = await mongoose.model('Location').find({ _id: { $in: locationIds } });
  const locationNames = locations.map(l => l.name).join(', ');
  
  const notification = new this({
    recipient: staffId,
    type: 'overtime_warning',
    priority: 'urgent',
    title: 'Overtime Warning',
    message: `You are approaching overtime limits with ${hours.toFixed(1)} hours scheduled this week. Please review your schedule.`,
    shortMessage: `Overtime warning: ${hours.toFixed(1)} hours scheduled`,
    relatedTo: {
      model: 'Schedule',
      summary: `Week of ${new Date(weekStartDate).toLocaleDateString()}`
    },
    data: {
      weekStartDate,
      scheduledHours: hours,
      locations: locationNames
    },
    actions: [
      {
        type: 'view_schedule',
        label: 'View Schedule',
        url: `/schedule`,
        data: { weekStart: weekStartDate }
      },
      {
        type: 'contact_manager',
        label: 'Contact Manager',
        data: {}
      }
    ],
    channels: ['in_app', 'email'],
    priority: 'high'
  });
  
  await notification.save();
  return notification;
};

// Static method to create schedule published notification
notificationSchema.statics.createSchedulePublishedNotification = async function(schedule, staffIds) {
  const locations = await mongoose.model('Location').find({ _id: { $in: schedule.locations } });
  const locationNames = locations.map(l => l.name).join(', ');
  
  const weekStart = new Date(schedule.weekStartDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
  
  const notifications = [];
  
  for (const staffId of staffIds) {
    const notification = new this({
      recipient: staffId,
      sender: schedule.publishedBy,
      type: 'schedule_published',
      priority: 'high',
      title: 'Schedule Published',
      message: `The schedule for week of ${weekStart} at ${locationNames} has been published. Please review your shifts.`,
      shortMessage: `Schedule published: week of ${weekStart}`,
      relatedTo: {
        model: 'Schedule',
        id: schedule._id,
        summary: `Schedule for week of ${weekStart}`
      },
      data: {
        scheduleId: schedule._id,
        weekStartDate: schedule.weekStartDate,
        locations: schedule.locations
      },
      actions: [
        {
          type: 'view_schedule',
          label: 'View Schedule',
          url: `/schedule/${schedule._id}`,
          data: { scheduleId: schedule._id }
        }
      ],
      channels: ['in_app', 'email']
    });
    
    notifications.push(notification);
  }
  
  await this.insertMany(notifications);
  return notifications;
};

// Static method to create availability conflict notification
notificationSchema.statics.createAvailabilityConflictNotification = async function(staffId, shift, conflictType) {
  const location = await mongoose.model('Location').findById(shift.location);
  
  const startTime = new Date(shift.startTime).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: location?.timezone || 'UTC'
  });
  
  const conflictMessages = {
    double_booking: 'This shift overlaps with another assigned shift',
    gap_violation: 'This shift violates the 10-hour gap requirement',
    skill_mismatch: 'This shift requires skills you don\'t have',
    certification_mismatch: 'You are not certified for this location',
    availability_violation: 'This shift is outside your availability window'
  };
  
  const notification = new this({
    recipient: staffId,
    type: 'availability_conflict',
    priority: 'urgent',
    title: 'Schedule Conflict Detected',
    message: conflictMessages[conflictType] || 'A conflict has been detected with your schedule',
    shortMessage: `Schedule conflict: ${startTime}`,
    relatedTo: {
      model: 'Shift',
      id: shift._id,
      summary: `Conflict with shift at ${location?.name} on ${startTime}`
    },
    data: {
      shiftId: shift._id,
      conflictType,
      startTime: shift.startTime
    },
    actions: [
      {
        type: 'view_shift',
        label: 'View Shift',
        url: `/shifts/${shift._id}`,
        data: { shiftId: shift._id }
      },
      {
        type: 'contact_manager',
        label: 'Contact Manager',
        data: {}
      }
    ],
    channels: ['in_app', 'email']
  });
  
  await notification.save();
  return notification;
};

// Static method to create shift callout notification (for emergency coverage)
notificationSchema.statics.createShiftCalloutNotification = async function(shift, qualifiedStaffIds) {
  const location = await mongoose.model('Location').findById(shift.location);
  
  const startTime = new Date(shift.startTime).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: location?.timezone || 'UTC'
  });
  
  const timeUntilShift = Math.round((shift.startTime - new Date()) / (1000 * 60 * 60));
  
  const notifications = [];
  
  for (const staffId of qualifiedStaffIds) {
    const notification = new this({
      recipient: staffId,
      type: 'shift_callout',
      priority: 'urgent',
      title: 'URGENT: Shift Coverage Needed',
      message: `A ${shift.requiredSkill} shift at ${location?.name} starting ${startTime} (in ${timeUntilShift} hours) needs immediate coverage.`,
      shortMessage: `URGENT: Shift coverage needed at ${location?.name}`,
      relatedTo: {
        model: 'Shift',
        id: shift._id,
        summary: `Emergency coverage for shift at ${location?.name}`
      },
      data: {
        shiftId: shift._id,
        location: location?.name,
        startTime: shift.startTime,
        requiredSkill: shift.requiredSkill
      },
      actions: [
        {
          type: 'view_shift',
          label: 'View Shift',
          url: `/shifts/${shift._id}`,
          data: { shiftId: shift._id }
        },
        {
          type: 'pickup_available',
          label: 'I Can Work',
          data: { shiftId: shift._id }
        }
      ],
      channels: ['in_app', 'email', 'push', 'sms'], // Use all channels for urgency
      expiresAt: shift.startTime // Expire when shift starts
    });
    
    notifications.push(notification);
  }
  
  await this.insertMany(notifications);
  return notifications;
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    recipient: userId,
    status: { $in: ['pending', 'sent', 'delivered'] },
    $or: [
      { expiresAt: { $gt: new Date() } },
      { expiresAt: null }
    ]
  });
};

// Static method to get notification summary for user
notificationSchema.statics.getSummaryForUser = async function(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const summary = await this.aggregate([
    {
      $match: {
        recipient: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: {
          type: '$type',
          priority: '$priority'
        },
        count: { $sum: 1 },
        unread: {
          $sum: {
            $cond: [
              { $in: ['$status', ['pending', 'sent', 'delivered']] },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $group: {
        _id: '$_id.type',
        priority: { $first: '$_id.priority' },
        total: { $sum: '$count' },
        unread: { $sum: '$unread' }
      }
    },
    {
      $sort: { priority: -1 }
    }
  ]);
  
  const totalUnread = await this.getUnreadCount(userId);
  
  return {
    totalUnread,
    byType: summary
  };
};

// Static method to cleanup expired notifications
notificationSchema.statics.cleanupExpired = async function() {
  const result = await this.updateMany(
    {
      expiresAt: { $lt: new Date() },
      status: { $ne: 'archived' }
    },
    {
      status: 'archived'
    }
  );
  
  return result;
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;