require('dotenv').config();
const mongoose = require('mongoose');
const Shift = require('../models/Shift');
const User = require('../models/User');
const Location = require('../models/Location');

const seedFreshShifts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Clear ALL existing shifts
    console.log('🧹 Clearing all shifts...');
    await Shift.deleteMany({});
    console.log('✅ All shifts cleared');

    // Get users and locations
    const users = await User.find();
    const locations = await Location.find();

    const alex = users.find(u => u.email === 'alex.j@coastaleats.com');
    const sam = users.find(u => u.email === 'sam.c@coastaleats.com');
    const admin = users.find(u => u.role === 'admin');

    const seattle = locations.find(l => l.code === 'SEA-DT');
    const bellevue = locations.find(l => l.code === 'BEL');
    const miami = locations.find(l => l.code === 'MIA-BCH');
    const orlando = locations.find(l => l.code === 'ORL');

    const shifts = [];
    
    // 4 weeks of data
    const weekStarts = [
      new Date('2026-03-08'), // Week 1 - PUBLISHED
      new Date('2026-03-15'), // Week 2 - PUBLISHED
      new Date('2026-03-22'), // Week 3 - PUBLISHED
      new Date('2026-03-29')  // Week 4 - PUBLISHED
    ];

    // Track weekly hours
    const weeklyHours = {
      alex: { week1: 0, week2: 0, week3: 0, week4: 0 },
      sam: { week1: 0, week2: 0, week3: 0, week4: 0 }
    };

    // For each week
    for (let w = 0; w < weekStarts.length; w++) {
      const weekStart = weekStarts[w];
      const weekNum = w + 1;
      
      console.log(`\n📅 Creating Week ${weekNum} shifts...`);
      
      // Different patterns for each week
      let alexShifts = [];
      let samShifts = [];
      
      if (weekNum === 1) {
        // Week 1: Alex OVER (42h), Sam UNDER (26h)
        alexShifts = [
          { day: 1, hour: 9, duration: 8, loc: seattle, skill: 'bartender' }, // Mon 8h
          { day: 2, hour: 9, duration: 8, loc: seattle, skill: 'server' },    // Tue 8h
          { day: 3, hour: 13, duration: 8, loc: miami, skill: 'line_cook' },  // Wed 8h
          { day: 4, hour: 9, duration: 8, loc: seattle, skill: 'host' },      // Thu 8h
          { day: 5, hour: 17, duration: 6, loc: miami, skill: 'bartender' },  // Fri 6h (premium)
          { day: 6, hour: 17, duration: 4, loc: miami, skill: 'server' }      // Sat 4h (premium)
        ]; // Alex total: 42h
        
        samShifts = [
          { day: 1, hour: 13, duration: 8, loc: bellevue, skill: 'server' },   // Mon 8h
          { day: 3, hour: 9, duration: 8, loc: orlando, skill: 'line_cook' },  // Wed 8h
          { day: 5, hour: 17, duration: 6, loc: bellevue, skill: 'bartender' }, // Fri 6h (premium)
          { day: 6, hour: 10, duration: 4, loc: orlando, skill: 'host' }       // Sat 4h
        ]; // Sam total: 26h
      }
      else if (weekNum === 2) {
        // Week 2: Alex UNDER (28h), Sam OVER (44h)
        alexShifts = [
          { day: 1, hour: 9, duration: 8, loc: seattle, skill: 'bartender' },  // Mon 8h
          { day: 3, hour: 9, duration: 8, loc: miami, skill: 'server' },       // Wed 8h
          { day: 4, hour: 13, duration: 6, loc: seattle, skill: 'host' },      // Thu 6h
          { day: 6, hour: 17, duration: 6, loc: miami, skill: 'line_cook' }    // Sat 6h (premium)
        ]; // Alex total: 28h
        
        samShifts = [
          { day: 1, hour: 13, duration: 8, loc: bellevue, skill: 'server' },   // Mon 8h
          { day: 2, hour: 9, duration: 8, loc: bellevue, skill: 'bartender' }, // Tue 8h
          { day: 3, hour: 17, duration: 8, loc: orlando, skill: 'line_cook' }, // Wed 8h (premium)
          { day: 4, hour: 9, duration: 8, loc: bellevue, skill: 'host' },      // Thu 8h
          { day: 5, hour: 17, duration: 8, loc: orlando, skill: 'server' },    // Fri 8h (premium)
          { day: 6, hour: 10, duration: 4, loc: bellevue, skill: 'bartender' } // Sat 4h
        ]; // Sam total: 44h
      }
      else if (weekNum === 3) {
        // Week 3: Alex OVER (46h), Sam UNDER (30h)
        alexShifts = [
          { day: 1, hour: 9, duration: 8, loc: seattle, skill: 'bartender' },  // Mon 8h
          { day: 2, hour: 9, duration: 8, loc: seattle, skill: 'server' },     // Tue 8h
          { day: 3, hour: 13, duration: 8, loc: miami, skill: 'line_cook' },   // Wed 8h
          { day: 4, hour: 9, duration: 8, loc: seattle, skill: 'host' },       // Thu 8h
          { day: 5, hour: 17, duration: 8, loc: miami, skill: 'bartender' },   // Fri 8h (premium)
          { day: 6, hour: 17, duration: 6, loc: miami, skill: 'server' }       // Sat 6h (premium)
        ]; // Alex total: 46h
        
        samShifts = [
          { day: 1, hour: 13, duration: 8, loc: bellevue, skill: 'server' },   // Mon 8h
          { day: 3, hour: 9, duration: 8, loc: orlando, skill: 'line_cook' },  // Wed 8h
          { day: 4, hour: 13, duration: 6, loc: bellevue, skill: 'host' },     // Thu 6h
          { day: 5, hour: 17, duration: 8, loc: orlando, skill: 'bartender' }  // Fri 8h (premium)
        ]; // Sam total: 30h
      }
      else if (weekNum === 4) {
        // Week 4: Alex UNDER (26h), Sam OVER (40h)
        alexShifts = [
          { day: 1, hour: 9, duration: 8, loc: seattle, skill: 'bartender' },  // Mon 8h
          { day: 3, hour: 9, duration: 8, loc: miami, skill: 'server' },       // Wed 8h
          { day: 4, hour: 13, duration: 6, loc: seattle, skill: 'host' },      // Thu 6h
          { day: 6, hour: 10, duration: 4, loc: miami, skill: 'line_cook' }    // Sat 4h
        ]; // Alex total: 26h
        
        samShifts = [
          { day: 1, hour: 13, duration: 8, loc: bellevue, skill: 'server' },   // Mon 8h
          { day: 2, hour: 9, duration: 8, loc: bellevue, skill: 'bartender' }, // Tue 8h
          { day: 3, hour: 17, duration: 8, loc: orlando, skill: 'line_cook' }, // Wed 8h (premium)
          { day: 4, hour: 9, duration: 8, loc: bellevue, skill: 'host' },      // Thu 8h
          { day: 5, hour: 17, duration: 8, loc: orlando, skill: 'server' }     // Fri 8h (premium)
        ]; // Sam total: 40h
      }

      // Create Alex's shifts for this week
      for (const shiftData of alexShifts) {
        const shiftDate = new Date(weekStart);
        shiftDate.setDate(weekStart.getDate() + shiftData.day);
        
        const startTime = new Date(shiftDate);
        startTime.setHours(shiftData.hour, 0, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + shiftData.duration);
        
        const editCutoff = new Date(startTime);
        editCutoff.setHours(editCutoff.getHours() - 48);

        const isPremium = (shiftData.day === 5 || shiftData.day === 6) && shiftData.hour >= 17;

        shifts.push({
          location: shiftData.loc._id,
          date: shiftDate,
          startTime: startTime,
          endTime: endTime,
          duration: shiftData.duration * 60,
          requiredSkill: shiftData.skill,
          requiredCount: 2,
          assignedStaff: [alex._id],
          status: 'published',
          editCutoff: editCutoff,
          isPremiumShift: isPremium,
          publishedAt: new Date(),
          publishedBy: admin?._id || alex._id,
          createdBy: admin?._id || alex._id,
          swapRequests: [],
          complianceWarnings: [],
          history: [],
          assignmentHistory: []
        });

        weeklyHours.alex[`week${weekNum}`] += shiftData.duration;
      }

      // Create Sam's shifts for this week
      for (const shiftData of samShifts) {
        const shiftDate = new Date(weekStart);
        shiftDate.setDate(weekStart.getDate() + shiftData.day);
        
        const startTime = new Date(shiftDate);
        startTime.setHours(shiftData.hour, 0, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + shiftData.duration);
        
        const editCutoff = new Date(startTime);
        editCutoff.setHours(editCutoff.getHours() - 48);

        const isPremium = (shiftData.day === 5 || shiftData.day === 6) && shiftData.hour >= 17;

        shifts.push({
          location: shiftData.loc._id,
          date: shiftDate,
          startTime: startTime,
          endTime: endTime,
          duration: shiftData.duration * 60,
          requiredSkill: shiftData.skill,
          requiredCount: 2,
          assignedStaff: [sam._id],
          status: 'published',
          editCutoff: editCutoff,
          isPremiumShift: isPremium,
          publishedAt: new Date(),
          publishedBy: admin?._id || sam._id,
          createdBy: admin?._id || sam._id,
          swapRequests: [],
          complianceWarnings: [],
          history: [],
          assignmentHistory: []
        });

        weeklyHours.sam[`week${weekNum}`] += shiftData.duration;
      }
    }

    // Insert all shifts
    console.log(`\n📊 Creating ${shifts.length} total shifts...`);
    await Shift.insertMany(shifts);
    console.log('✅ All shifts created!');

    // Display weekly hours
    console.log('\n📊 WEEKLY HOURS SUMMARY:');
    console.log('='.repeat(60));
    console.log('Week\tAlex Hours\tSam Hours\tStatus');
    console.log('='.repeat(60));
    
    for (let w = 1; w <= 4; w++) {
      const alexHours = weeklyHours.alex[`week${w}`];
      const samHours = weeklyHours.sam[`week${w}`];
      
      const alexStatus = alexHours > 35 ? 'OVER ⚠️' : 'UNDER ✅';
      const samStatus = samHours > 35 ? 'OVER ⚠️' : 'UNDER ✅';
      
      console.log(`Week ${w}\t${alexHours}h\t\t${samHours}h\t\tAlex: ${alexStatus}, Sam: ${samStatus}`);
    }
    console.log('='.repeat(60));

    // Premium shift counts
    const premiumByStaff = await Shift.aggregate([
      { $match: { isPremiumShift: true } },
      { $unwind: '$assignedStaff' },
      { $lookup: { from: 'users', localField: 'assignedStaff', foreignField: '_id', as: 'staff' } },
      { $unwind: '$staff' },
      { $group: { _id: '$staff.name', count: { $sum: 1 } } }
    ]);
    
    console.log('\n⭐ PREMIUM SHIFT TOTALS:');
    premiumByStaff.forEach(s => {
      console.log(`   ${s._id}: ${s.count} premium shifts`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected');
  }
};

seedFreshShifts();