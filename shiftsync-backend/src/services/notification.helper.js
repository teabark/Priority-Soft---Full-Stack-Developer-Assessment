const Notification = require('../models/Notification');

class NotificationHelper {
  constructor(io) {
    this.io = io;
  }

  /**
   * Send notification to a single user
   */
  async sendToUser(userId, data) {
    try {
      // Save to database
      const notification = await Notification.create({
        recipient: userId,
        sender: data.sender,
        type: data.type,
        title: data.title,
        message: data.message,
        priority: data.priority || 'normal',
        relatedTo: data.relatedTo,
        data: data.data,
        actions: data.actions || [],
        channels: data.channels || ['in_app']
      });

      // Send real-time if user is online
      if (this.io) {
        this.io.to(`user:${userId}`).emit('notification:new', {
          _id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          actions: notification.actions,
          createdAt: notification.createdAt
        });
        console.log(`📢 Real-time notification sent to user:${userId}`);
      }

      return notification;
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      return null;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(userIds, data) {
    const promises = userIds.map(userId => this.sendToUser(userId, data));
    return Promise.all(promises);
  }

  /**
   * Send notification to all managers at a location
   */
  async sendToLocationManagers(locationId, data) {
    try {
      const Location = require('../models/Location');
      const location = await Location.findById(locationId).populate('managers');
      
      if (location && location.managers) {
        const managerIds = location.managers.map(m => m._id);
        return this.sendToUsers(managerIds, data);
      }
    } catch (error) {
      console.error('❌ Error sending to location managers:', error);
    }
  }

  /**
   * Send shift assignment notification
   */
  async notifyShiftAssigned(shift, staffId, assignedBy) {
    const staff = await require('../models/User').findById(staffId);
    const location = await require('../models/Location').findById(shift.location);
    
    const startTime = new Date(shift.startTime).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    return this.sendToUser(staffId, {
      sender: assignedBy,
      type: 'shift_assigned',
      title: '📅 New Shift Assigned',
      message: `You've been assigned to ${shift.requiredSkill} shift at ${location?.name} on ${startTime}`,
      priority: 'high',
      relatedTo: { model: 'Shift', id: shift._id },
      data: { shiftId: shift._id },
      actions: [
        {
          type: 'view_shift',
          label: 'View Shift',
          url: `/shifts/${shift._id}`
        }
      ]
    });
  }

  /**
   * Notify swap request to target staff
   */
  async notifySwapRequested(swapRequest, shift, requestingStaff, targetStaffId) {
    const location = await require('../models/Location').findById(shift.location);
    const requester = await require('../models/User').findById(requestingStaff);
    
    const startTime = new Date(shift.startTime).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    return this.sendToUser(targetStaffId, {
      sender: requestingStaff,
      type: 'swap_received',
      title: '🔄 New Swap Request',
      message: `${requester?.name} wants to swap shifts with you on ${startTime} at ${location?.name}`,
      priority: 'high',
      relatedTo: { model: 'Shift', id: shift._id },
      data: { swapRequestId: swapRequest._id, shiftId: shift._id },
      actions: [
        {
          type: 'approve_swap',
          label: 'Accept Swap',
          data: { swapRequestId: swapRequest._id }
        },
        {
          type: 'reject_swap',
          label: 'Decline',
          data: { swapRequestId: swapRequest._id }
        }
      ]
    });
  }

  /**
   * Notify managers of pending approval
   */
  async notifyManagersSwapPending(shift, swapRequest, requestingStaff) {
    const location = await require('../models/Location').findById(shift.location);
    const requester = await require('../models/User').findById(requestingStaff);
    
    if (!location || !location.managers) return;

    return this.sendToUsers(location.managers, {
      sender: requestingStaff,
      type: 'swap_pending_approval',
      title: '⚠️ Swap Request Needs Approval',
      message: `${requester?.name} has requested to ${swapRequest.type} a shift at ${location?.name}`,
      priority: 'high',
      relatedTo: { model: 'Shift', id: shift._id },
      data: { swapRequestId: swapRequest._id, shiftId: shift._id },
      actions: [
        {
          type: 'approve_swap',
          label: 'Approve',
          data: { swapRequestId: swapRequest._id }
        },
        {
          type: 'reject_swap',
          label: 'Reject',
          data: { swapRequestId: swapRequest._id }
        }
      ]
    });
  }

  /**
   * Notify schedule published to all affected staff
   */
  async notifySchedulePublished(schedule, staffIds) {
    const weekStart = new Date(schedule.weekStartDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    return this.sendToUsers(staffIds, {
      sender: schedule.publishedBy,
      type: 'schedule_published',
      title: '📋 Schedule Published',
      message: `The schedule for week of ${weekStart} has been published`,
      priority: 'high',
      relatedTo: { model: 'Schedule', id: schedule._id },
      data: { scheduleId: schedule._id },
      actions: [
        {
          type: 'view_schedule',
          label: 'View Schedule',
          url: `/schedule`
        }
      ]
    });
  }

  /**
   * Notify overtime warning
   */
  async notifyOvertimeWarning(staffId, weeklyHours, locationIds) {
    const staff = await require('../models/User').findById(staffId);
    
    return this.sendToUser(staffId, {
      type: 'overtime_warning',
      title: '⚠️ Overtime Warning',
      message: `You have ${weeklyHours.toFixed(1)} hours scheduled this week (approaching 40)`,
      priority: 'urgent',
      data: { weeklyHours, locationIds },
      actions: [
        {
          type: 'view_schedule',
          label: 'View Schedule',
          url: `/schedule`
        },
        {
          type: 'contact_manager',
          label: 'Contact Manager'
        }
      ]
    });
  }

  /**
   * Notify conflict when two managers assign same staff
   */
  async notifyAssignmentConflict(shift, staffId, conflictingManager) {
    const shift_ = await require('../models/Shift').findById(shift._id).populate('location');
    const staff = await require('../models/User').findById(staffId);
    const manager = await require('../models/User').findById(conflictingManager);

    return this.sendToUser(conflictingManager, {
      type: 'system_alert',
      title: '⚠️ Assignment Conflict',
      message: `${staff?.name} was just assigned to ${shift_?.location?.name} by another manager`,
      priority: 'urgent',
      data: { shiftId: shift._id, staffId },
      actions: [
        {
          type: 'view_shift',
          label: 'View Shift',
          url: `/shifts/${shift._id}`
        }
      ]
    });
  }
}

module.exports = NotificationHelper;