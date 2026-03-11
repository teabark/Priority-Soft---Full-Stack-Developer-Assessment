const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get user's notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const {
      status,
      type,
      limit = 20,
      page = 1,
      includeExpired = false
    } = req.query;
    
    const query = { recipient: req.user.id };
    
    // Status filter
    if (status) {
      query.status = status;
    } else {
      // Default: exclude archived unless requested
      query.status = { $ne: 'archived' };
    }
    
    // Type filter
    if (type) {
      query.type = type;
    }
    
    // Expiration filter
    if (!includeExpired) {
      query.$or = [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: null }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const notifications = await Notification.find(query)
      .populate('sender', 'name email')
      .populate('relatedTo.id')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await Notification.countDocuments(query);
    
    // ===== ADD THIS - Calculate unread count =====
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      read: false,
      status: { $ne: 'archived' }
    });
    // =============================================
    
    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: notifications,
      unreadCount: unreadCount // ADD THIS LINE
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get notification summary
// @route   GET /api/notifications/summary
// @access  Private
const getNotificationSummary = async (req, res) => {
  try {
    const summary = await Notification.getSummaryForUser(req.user.id);
    
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single notification
// @route   GET /api/notifications/:id
// @access  Private
const getNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id
    })
      .populate('sender', 'name email')
      .populate('relatedTo.id');
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    // Use the model method if it exists
    if (typeof notification.markAsRead === 'function') {
      await notification.markAsRead(req.body.channel || 'in_app');
    } else {
      // Fallback if method doesn't exist
      notification.read = true;
      notification.readAt = new Date();
      notification.status = 'read';
      await notification.save();
    }
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.user.id}`).emit('notificationRead', {
        notificationId: notification._id
      });
    }
    
    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        recipient: req.user.id,
        status: { $in: ['pending', 'sent', 'delivered'] }
      },
      {
        status: 'read',
        readAt: new Date(),
        $inc: { readCount: 1 }
      }
    );
    
    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user-${req.user.id}`).emit('allNotificationsRead');
    
    res.status(200).json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Dismiss notification
// @route   PUT /api/notifications/:id/dismiss
// @access  Private
const dismissNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    await notification.dismiss();
    
    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user-${req.user.id}`).emit('notificationDismissed', {
      notificationId: notification._id
    });
    
    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Complete action on notification
// @route   PUT /api/notifications/:id/actions/:actionId
// @access  Private
const completeAction = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    const action = notification.actions.id(req.params.actionId);
    
    if (!action) {
      return res.status(404).json({
        success: false,
        message: 'Action not found'
      });
    }
    
    await notification.completeAction(action.type, req.body.data);
    
    // Handle action-specific logic
    switch (action.type) {
      case 'approve_swap':
        // Trigger swap approval
        // This would call the swap controller
        break;
      case 'reject_swap':
        // Trigger swap rejection
        break;
      case 'pickup_available':
        // Trigger shift pickup
        break;
    }
    
    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user-${req.user.id}`).emit('actionCompleted', {
      notificationId: notification._id,
      actionId: action._id
    });
    
    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
const updatePreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update notification preferences
    user.notificationPreferences = {
      ...user.notificationPreferences.toObject(),
      ...req.body
    };
    
    await user.save();
    
    res.status(200).json({
      success: true,
      data: user.notificationPreferences
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get notification preferences
// @route   GET /api/notifications/preferences
// @access  Private
const getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('notificationPreferences');
    
    res.status(200).json({
      success: true,
      data: user.notificationPreferences
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user-${req.user.id}`).emit('notificationDeleted', {
      notificationId: notification._id
    });
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cleanup expired notifications (admin only)
// @route   POST /api/notifications/cleanup
// @access  Private/Admin
const cleanupExpired = async (req, res) => {
  try {
    const result = await Notification.cleanupExpired();
    
    res.status(200).json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getNotifications,
  getNotificationSummary,
  getNotification,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  completeAction,
  updatePreferences,
  getPreferences,
  deleteNotification,
  cleanupExpired
};