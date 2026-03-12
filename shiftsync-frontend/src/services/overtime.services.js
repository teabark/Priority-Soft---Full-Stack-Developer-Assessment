const Shift = require("../models/Shift");
const User = require("../models/User");

class OvertimeService {
  constructor(io) {
    this.io = io;
  }

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

      // Find all shifts for this staff in the week
      const shifts = await Shift.find({
        assignedStaff: staffId,
        status: { $in: ["published", "in_progress", "completed"] },
        startTime: { $gte: weekStart, $lte: weekEnd },
      }).populate("location", "name");

      // Calculate total hours
      let totalMinutes = 0;
      shifts.forEach((shift) => {
        if (shift.duration) {
          totalMinutes += shift.duration;
        }
      });

      const weeklyHours = totalMinutes / 60;

      return {
        weeklyHours,
        shifts,
        weekStart,
        weekEnd,
      };
    } catch (error) {
      console.error("❌ Error calculating weekly hours:", error);
      throw error;
    }
  }
  /**
   * Calculate daily hours for a staff member on a specific date
   */
  async calculateDailyHours(staffId, date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const shifts = await Shift.find({
      assignedStaff: staffId,
      status: { $in: ["published", "in_progress", "completed"] },
      startTime: { $gte: dayStart, $lte: dayEnd },
    });

    let totalMinutes = 0;
    shifts.forEach((shift) => {
      if (shift.duration) {
        totalMinutes += shift.duration;
      }
    });

    const dailyHours = totalMinutes / 60;

    return {
      dailyHours,
      shifts,
      date: dayStart,
    };
  }

  /**
   * Check consecutive days worked
   */
  async checkConsecutiveDays(staffId, targetDate = new Date()) {
    // Look backwards to find consecutive days
    let consecutiveDays = 0;
    let currentDate = new Date(targetDate);
    currentDate.setHours(0, 0, 0, 0);

    // Check if staff works on target date
    const worksOnTarget = await this.hasShiftOnDate(staffId, currentDate);
    if (!worksOnTarget) {
      return { consecutiveDays: 0, dates: [] };
    }

    consecutiveDays = 1;
    const dates = [new Date(currentDate)];

    // Look backwards
    let checkDate = new Date(currentDate);
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1);
      const hasShift = await this.hasShiftOnDate(staffId, checkDate);
      if (hasShift) {
        consecutiveDays++;
        dates.unshift(new Date(checkDate));
      } else {
        break;
      }
    }

    // Look forwards
    checkDate = new Date(currentDate);
    while (true) {
      checkDate.setDate(checkDate.getDate() + 1);
      const hasShift = await this.hasShiftOnDate(staffId, checkDate);
      if (hasShift) {
        consecutiveDays++;
        dates.push(new Date(checkDate));
      } else {
        break;
      }
    }

    return {
      consecutiveDays,
      dates,
    };
  }

  /**
   * Check if staff has a shift on a specific date
   */
  async hasShiftOnDate(staffId, date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const shift = await Shift.findOne({
      assignedStaff: staffId,
      status: { $in: ["published", "in_progress", "completed"] },
      startTime: { $gte: dayStart, $lte: dayEnd },
    });

    return !!shift;
  }

  /**
   * Check if assigning a shift would cause overtime violations
   */
  async checkShiftAssignment(shift, staffId) {
    const warnings = [];
    const errors = [];

    // Get staff details
    const staff = await User.findById(staffId);
    if (!staff) {
      return { allowed: false, errors: ["Staff not found"] };
    }

    // Calculate shift duration in hours
    const shiftHours = (shift.duration || 0) / 60;

    // 1. Check weekly hours
    const weekly = await this.calculateWeeklyHours(staffId, shift.startTime);
    const newWeeklyHours = weekly.weeklyHours + shiftHours;

    if (newWeeklyHours > 40) {
      errors.push({
        type: "weekly_overtime",
        message: `This would exceed 40 weekly hours (${newWeeklyHours.toFixed(1)} hours)`,
        severity: "error",
      });
    } else if (newWeeklyHours > 35) {
      warnings.push({
        type: "weekly_approaching",
        message: `Staff would have ${newWeeklyHours.toFixed(1)} weekly hours (approaching 40)`,
        severity: "warning",
      });
    }

    // 2. Check daily hours
    const daily = await this.calculateDailyHours(staffId, shift.startTime);
    const newDailyHours = daily.dailyHours + shiftHours;

    if (newDailyHours > 12) {
      errors.push({
        type: "daily_overtime_block",
        message: `Cannot exceed 12 daily hours (${newDailyHours.toFixed(1)} hours)`,
        severity: "error",
      });
    } else if (newDailyHours > 8) {
      warnings.push({
        type: "daily_approaching",
        message: `Staff would have ${newDailyHours.toFixed(1)} daily hours (exceeds 8)`,
        severity: "warning",
      });
    }

    // 3. Check consecutive days
    const consecutive = await this.checkConsecutiveDays(
      staffId,
      shift.startTime,
    );

    if (consecutive.consecutiveDays >= 7) {
      errors.push({
        type: "consecutive_days_block",
        message: `Staff would work ${consecutive.consecutiveDays} consecutive days (max 6)`,
        severity: "error",
        requiresOverride: true,
      });
    } else if (consecutive.consecutiveDays >= 6) {
      warnings.push({
        type: "consecutive_days_warning",
        message: `Staff would work ${consecutive.consecutiveDays} consecutive days`,
        severity: "warning",
      });
    }

    return {
      allowed: errors.length === 0,
      errors,
      warnings,
      stats: {
        currentWeekly: weekly.weeklyHours,
        newWeekly: newWeeklyHours,
        currentDaily: daily.dailyHours,
        newDaily: newDailyHours,
        consecutiveDays: consecutive.consecutiveDays,
      },
    };
  }

  /**
   * Get overtime dashboard data for a manager
   */
  /**
   * Get overtime dashboard data for a manager
   */
  async getDashboardData(managerId, locationIds) {
    try {
      console.log("🔍 Getting dashboard data for locations:", locationIds);

      if (!locationIds || locationIds.length === 0) {
        console.log("⚠️ No location IDs provided, returning empty dashboard");
        return {
          totalOvertimeCost: 0,
          atRiskStaff: [],
          warnings: [],
          weeklySummary: [],
        };
      }

      // Get all staff at these locations
      const User = require("../models/User");
      const staff = await User.find({
        role: "staff",
        locations: { $in: locationIds },
      });

      console.log(`🔍 Found ${staff.length} staff members`);

      const dashboardData = {
        totalOvertimeCost: 0,
        atRiskStaff: [],
        warnings: [],
        weeklySummary: [],
      };

      for (const staffMember of staff) {
        try {
          const weekly = await this.calculateWeeklyHours(staffMember._id);

          // Check if staff is at risk (over 35 hours)
          if (weekly.weeklyHours > 35) {
            const overtimeHours = Math.max(0, weekly.weeklyHours - 40);
            const overtimeCost = overtimeHours * 1.5 * 20; // Assume $20/hr base pay

            dashboardData.totalOvertimeCost += overtimeCost;

            dashboardData.atRiskStaff.push({
              staffId: staffMember._id,
              name: staffMember.name,
              weeklyHours: weekly.weeklyHours,
              overtimeHours,
              overtimeCost,
              shifts: weekly.shifts.map((s) => ({
                id: s._id,
                date: s.startTime,
                location: s.location,
                hours: (s.duration || 0) / 60,
              })),
            });
          }

          // Check for warnings (over 35 hours)
          if (weekly.weeklyHours > 35) {
            dashboardData.warnings.push({
              staff: staffMember.name,
              type: "weekly_hours",
              message: `${staffMember.name} has ${weekly.weeklyHours.toFixed(1)} hours this week`,
              severity: weekly.weeklyHours > 40 ? "critical" : "warning",
            });
          }

          // Add to weekly summary
          dashboardData.weeklySummary.push({
            staffId: staffMember._id,
            name: staffMember.name,
            weeklyHours: weekly.weeklyHours,
            shiftCount: weekly.shifts.length,
          });
        } catch (staffError) {
          console.error(
            `❌ Error processing staff ${staffMember._id}:`,
            staffError,
          );
        }
      }

      // Sort atRiskStaff by weekly hours (highest first)
      dashboardData.atRiskStaff.sort((a, b) => b.weeklyHours - a.weeklyHours);

      console.log("✅ Dashboard data prepared successfully");
      console.log(
        `   Total overtime cost: $${dashboardData.totalOvertimeCost.toFixed(2)}`,
      );
      console.log(`   At-risk staff: ${dashboardData.atRiskStaff.length}`);

      return dashboardData;
    } catch (error) {
      console.error("❌ Error in getDashboardData:", error);
      console.error("❌ Error stack:", error.stack);
      throw error;
    }
  }
}

module.exports = OvertimeService;
