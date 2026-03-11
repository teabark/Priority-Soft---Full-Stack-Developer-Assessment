// Simple timezone utility for ShiftSync

/**
 * Format shift time in location's timezone
 */
export const formatShiftTime = (utcTime, timezone, format = 'short') => {
  if (!utcTime) return 'N/A';
  
  const date = new Date(utcTime);
  
  // If no timezone, return local time
  if (!timezone) {
    if (format === 'full') {
      return date.toLocaleString();
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  const options = {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  
  if (format === 'full') {
    options.weekday = 'short';
    options.month = 'short';
    options.day = 'numeric';
  }
  
  try {
    return date.toLocaleString('en-US', options);
  } catch (error) {
    // Fallback to local time
    return format === 'full' 
      ? date.toLocaleString() 
      : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
};

/**
 * Get just the date in location's timezone
 */
export const getShiftDate = (utcTime, timezone) => {
  if (!utcTime) return 'N/A';
  
  const date = new Date(utcTime);
  
  if (!timezone) {
    return date.toLocaleDateString();
  }
  
  try {
    return date.toLocaleDateString('en-US', {
      timeZone: timezone,
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return date.toLocaleDateString();
  }
};

/**
 * Check if a shift is overnight (ends on next day in location's timezone)
 */
export const isOvernightShift = (startUtc, endUtc, timezone) => {
  if (!startUtc || !endUtc) return false;
  
  const start = new Date(startUtc);
  const end = new Date(endUtc);
  
  if (!timezone) {
    return end.getDate() !== start.getDate() || end.getMonth() !== start.getMonth();
  }
  
  try {
    // Convert to location timezone strings then back to dates for comparison
    const startStr = start.toLocaleString('en-US', { timeZone: timezone });
    const endStr = end.toLocaleString('en-US', { timeZone: timezone });
    
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    
    return endDate.getDate() !== startDate.getDate() || 
           endDate.getMonth() !== startDate.getMonth();
  } catch (error) {
    return end.getDate() !== start.getDate();
  }
};