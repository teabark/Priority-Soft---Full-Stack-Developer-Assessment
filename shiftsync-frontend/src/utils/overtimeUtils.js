import axios from 'axios';

export const checkOvertimeImpact = async (staffId, shiftDate, shiftDuration, token) => {
  try {
    // Get start of week for this shift
    const date = new Date(shiftDate);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    
    // Fetch current week hours for staff
    const res = await axios.get(
      `${process.env.REACT_APP_API_URL}/overtime/me?weekStart=${weekStart.toISOString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const currentData = res.data.data;
    const shiftHours = shiftDuration / 60; // Convert minutes to hours
    
    // Calculate new totals
    const newWeeklyTotal = currentData.totalHours + shiftHours;
    
    // Check daily hours for that specific day
    const shiftDay = date.toDateString();
    const currentDailyHours = currentData.dailyHours?.[shiftDay] || 0;
    const newDailyTotal = currentDailyHours + shiftHours;
    
    const warnings = [];
    const blocks = [];
    let requiresOverride = false;
    
    // Weekly checks
    if (newWeeklyTotal > 40) {
      blocks.push({
        type: 'weekly',
        message: `This assignment would exceed 40 hours (${newWeeklyTotal.toFixed(1)} total)`,
        severity: 'critical'
      });
    } else if (newWeeklyTotal > 35) {
      warnings.push({
        type: 'weekly',
        message: `This assignment would push to ${newWeeklyTotal.toFixed(1)} hours (approaching limit)`,
        severity: 'warning'
      });
    }
    
    // Daily checks
    if (newDailyTotal > 12) {
      blocks.push({
        type: 'daily',
        message: `This assignment would exceed 12 hours on ${shiftDay} (${newDailyTotal.toFixed(1)} hours)`,
        severity: 'critical'
      });
    } else if (newDailyTotal > 8) {
      warnings.push({
        type: 'daily',
        message: `This assignment would exceed 8 hours on ${shiftDay} (${newDailyTotal.toFixed(1)} hours)`,
        severity: 'warning'
      });
    }
    
    // Consecutive days check
    if (currentData.consecutiveDays >= 6) {
      const newConsecutive = currentData.consecutiveDays + 1;
      if (newConsecutive >= 7) {
        blocks.push({
          type: 'consecutive',
          message: `This would be the 7th consecutive day. Manager override required.`,
          severity: 'critical',
          requiresOverride: true
        });
        requiresOverride = true;
      } else if (newConsecutive === 6) {
        warnings.push({
          type: 'consecutive',
          message: `This would be the 6th consecutive day`,
          severity: 'warning'
        });
      }
    }
    
    return {
      allowed: blocks.length === 0 || requiresOverride,
      requiresOverride,
      warnings,
      blocks,
      current: {
        weekly: currentData.totalHours,
        daily: currentDailyHours,
        consecutive: currentData.consecutiveDays
      },
      new: {
        weekly: newWeeklyTotal,
        daily: newDailyTotal,
        consecutive: currentData.consecutiveDays + 1
      }
    };
    
  } catch (error) {
    console.error('Error checking overtime:', error);
    return {
      allowed: true,
      requiresOverride: false,
      warnings: [],
      blocks: [],
      error: error.message
    };
  }
};