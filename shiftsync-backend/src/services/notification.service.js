const Notification = require('../models/Notification');

class NotificationService {
  constructor(io) {
    this.io = io;
  }

  async sendToUser(userId, data) {
    try {
      // Save to database
      const notification = await Notification.create({
        recipient: userId,
        sender: data.sender,
        type: data.type,
        title: data.title,
        message: data.message,
        relatedTo: data.relatedTo,
        data: data.data
      });

      // Send real-time if user is online
      if (this.io) {
        this.io.to(`user:${userId}`).emit('notification:new', {
          _id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          createdAt: notification.createdAt
        });
        console.log(`📢 Notification sent to user:${userId}`);
      }

      return notification;
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      return null;
    }
  }

  async sendToUsers(userIds, data) {
    const promises = userIds.map(userId => this.sendToUser(userId, data));
    return Promise.all(promises);
  }
}

module.exports = NotificationService;