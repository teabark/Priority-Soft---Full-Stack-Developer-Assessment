const Shift = require('../models/Shift');
const User = require('../models/User');

class OvertimeService {
/**
 * Calculate weekly hours for a staff member
 */
async calculateWeeklyHours(staffId, targetDate = new Date()) {
  try {
    const Shift = require("../models/Shift");

    // Get start and end of week (Sunday to Saturday)
    const weekStart = new Date(targetDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);

    console.log(`📅 Calculating weekly hours for staff ${staffId} from ${weekStart} to ${weekEnd}`);

    // Find all shifts for this staff in the week
    const shifts = await Shift.find({
      assignedStaff: staffId,
      status: { $in: ["published", "in_progress", "completed"] },
      startTime: { $gte: weekStart, $lte: weekEnd },
    }).populate("location", "name");

    console.log(`📊 Found ${shifts.length} shifts`);

    // Calculate total hours
    let totalMinutes = 0;
    shifts.forEach((shift) => {
      if (shift.duration) {
        totalMinutes += shift.duration;
        console.log(`   Shift: ${shift._id}, Duration: ${shift.duration} minutes`);
      }
    });

    const weeklyHours = totalMinutes / 60;

    // IMPORTANT: Always return shifts as an array
    return {
      weeklyHours,
      shifts: shifts || [], // Ensure it's always an array
      weekStart,
      weekEnd,
    };
  } catch (error) {
    console.error("❌ Error calculating weekly hours:", error);
    // Return a default structure even on error
    return {
      weeklyHours: 0,
      shifts: [],
      weekStart: new Date(),
      weekEnd: new Date(),
    };
  }
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