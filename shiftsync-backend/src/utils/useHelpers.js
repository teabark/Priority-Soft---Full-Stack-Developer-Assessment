const User = require('../models/User');

// Generate employee ID
const generateEmployeeId = async () => {
  const prefix = 'EMP';
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const employeeId = `${prefix}${randomNum}`;
  
  // Check if exists
  const existing = await User.findOne({ employeeId });
  if (existing) {
    return generateEmployeeId(); // Recursive until unique
  }
  
  return employeeId;
};

// Validate availability times
const validateAvailability = (availability) => {
  const errors = [];
  
  availability.forEach((slot, index) => {
    // Parse times
    const start = slot.startTime.split(':').map(Number);
    const end = slot.endTime.split(':').map(Number);
    
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    
    // Check if end time is after start time
    if (endMinutes <= startMinutes) {
      errors.push(`Availability slot ${index + 1}: End time must be after start time`);
    }
    
    // Check for minimum duration (e.g., 2 hours)
    if (endMinutes - startMinutes < 120) {
      errors.push(`Availability slot ${index + 1}: Minimum duration is 2 hours`);
    }
  });
  
  return errors;
};

// Check for overlapping availability slots
const checkOverlappingAvailability = (availability) => {
  const overlaps = [];
  
  for (let i = 0; i < availability.length; i++) {
    for (let j = i + 1; j < availability.length; j++) {
      if (availability[i].dayOfWeek === availability[j].dayOfWeek) {
        const start1 = availability[i].startTime;
        const end1 = availability[i].endTime;
        const start2 = availability[j].startTime;
        const end2 = availability[j].endTime;
        
        if ((start1 < end2) && (start2 < end1)) {
          overlaps.push(`Overlap between slot ${i + 1} and slot ${j + 1} on day ${availability[i].dayOfWeek}`);
        }
      }
    }
  }
  
  return overlaps;
};

module.exports = {
  generateEmployeeId,
  validateAvailability,
  checkOverlappingAvailability
};