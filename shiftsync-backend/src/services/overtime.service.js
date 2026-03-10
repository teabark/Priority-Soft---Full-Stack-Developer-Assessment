const Shift = require('../models/Shift');
const User = require('../models/User');

class OvertimeService {
  // Calculate hours for a staff member in a given week
  async calculateWeeklyHours(staffId, weekStart) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const shifts = await Shift.find({
      assignedStaff: staffId,
      startTime: { $gte: weekStart, $lt: weekEnd },
      status: { $in: ['published', 'in_progress', 'completed'] }
    }).sort({ startTime: 1 });

    let totalHours = 0;
    const dailyHours = {};
    const consecutiveDays = new Set();
    const warnings = [];
    const blocks = [];

    shifts.forEach(shift => {
      const hours = (new Date(shift.endTime) - new Date(shift.startTime)) / (1000 * 60 * 60);
      totalHours += hours;
      
      const day = new Date(shift.startTime).toDateString();
      dailyHours[day] = (dailyHours[day] || 0) + hours;
      consecutiveDays.add(day);
    });

    // Weekly hour checks
    if (totalHours > 40) {
      blocks.push({
        type: 'weekly_hours',
        message: `Exceeds 40 hour weekly limit (${totalHours.toFixed(1)} hours)`,
        severity: 'critical'
      });
    } else if (totalHours > 35) {
      warnings.push({
        type: 'weekly_hours',
        message: `Approaching 40 hour limit (${totalHours.toFixed(1)} hours)`,
        severity: 'warning'
      });
    }

    // Daily hour checks
    Object.entries(dailyHours).forEach(([day, hours]) => {
      if (hours > 12) {
        blocks.push({
          type: 'daily_hours',
          day,
          message: `Exceeds 12 hour daily limit (${hours.toFixed(1)} hours on ${day})`,
          severity: 'critical'
        });
      } else if (hours > 8) {
        warnings.push({
          type: 'daily_hours',
          day,
          message: `Exceeds 8 hour daily limit (${hours.toFixed(1)} hours on ${day})`,
          severity: 'warning'
        });
      }
    });

    // Consecutive day checks
    const consecutiveCount = consecutiveDays.size;
    if (consecutiveCount >= 7) {
      blocks.push({
        type: 'consecutive_days',
        message: `Working 7 consecutive days requires manager override`,
        severity: 'critical',
        requiresOverride: true
      });
    } else if (consecutiveCount >= 6) {
      warnings.push({
        type: 'consecutive_days',
        message: `Working ${consecutiveCount} consecutive days`,
        severity: 'warning'
      });
    }

    return {
      staffId,
      weekStart,
      totalHours: Math.round(totalHours * 10) / 10,
      dailyHours,
      consecutiveDays: consecutiveCount,
      shifts: shifts.length,
      warnings,
      blocks
    };
  }

  // Get overtime report for all staff at a location
  async getLocationOvertimeReport(locationId, weekStart) {
    const staff = await User.find({ 
      role: 'staff',
      locations: locationId,
      isActive: true
    });

    const reports = [];
    for (const staffMember of staff) {
      const report = await this.calculateWeeklyHours(staffMember._id, weekStart);
      reports.push({
        staff: {
          id: staffMember._id,
          name: staffMember.name,
          email: staffMember.email
        },
        ...report
      });
    }

    return {
      locationId,
      weekStart,
      totalStaff: staff.length,
      staffWithWarnings: reports.filter(r => r.warnings.length > 0).length,
      staffWithBlocks: reports.filter(r => r.blocks.length > 0).length,
      reports
    };
  }

  // Check if shift assignment would cause overtime
  async checkShiftImpact(shift, staffId) {
    const weekStart = new Date(shift.startTime);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const currentReport = await this.calculateWeeklyHours(staffId, weekStart);
    
    // Add this shift
    const shiftHours = (new Date(shift.endTime) - new Date(shift.startTime)) / (1000 * 60 * 60);
    const newTotal = currentReport.totalHours + shiftHours;
    
    const impact = {
      current: currentReport,
      wouldExceedWeekly: newTotal > 40,
      wouldWarnWeekly: newTotal > 35 && newTotal <= 40,
      newTotal: Math.round(newTotal * 10) / 10,
      warnings: [],
      blocks: []
    };

    if (newTotal > 40) {
      impact.blocks.push({
        type: 'weekly_hours',
        message: `This shift would exceed 40 hours (${newTotal.toFixed(1)} total)`
      });
    } else if (newTotal > 35) {
      impact.warnings.push({
        type: 'weekly_hours',
        message: `This shift would push you to ${newTotal.toFixed(1)} hours (approaching 40)`
      });
    }

    return impact;
  }
}

module.exports = OvertimeService;