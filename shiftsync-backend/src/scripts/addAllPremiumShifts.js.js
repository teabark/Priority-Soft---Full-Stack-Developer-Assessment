require('dotenv').config();
const mongoose = require('mongoose');
const Shift = require('../models/Shift');
const User = require('../models/User');
const Location = require('../models/Location');

const addAllPremiumShifts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Get users
    const users = await User.find();
    const alex = users.find(u => u.email === 'alex.j@coastaleats.com');
    const sam = users.find(u => u.email === 'sam.c@coastaleats.com');
    const admin = users.find(u => u.role === 'admin');

    // Get locations
    const locations = await Location.find();
    const seattle = locations.find(l => l.code === 'SEA-DT');
    const bellevue = locations.find(l => l.code === 'BEL');
    const miami = locations.find(l => l.code === 'MIA-BCH');
    const orlando = locations.find(l => l.code === 'ORL');

    if (!alex || !sam) {
      console.log('❌ Staff not found');
      return;
    }

    console.log(`✅ Found: ${alex.name} and ${sam.name}`);

    // First, delete ALL existing premium shifts to avoid duplicates
    console.log('\n🧹 Removing existing premium shifts...');
    await Shift.deleteMany({ isPremiumShift: true });
    console.log('✅ Removed all existing premium shifts');

    // All premium shifts for 4 weeks
    const premiumShifts = [
      // ===== WEEK 1 (March 8-14) =====
      {
        date: '2026-03-13', // Friday
        hour: 17,
        duration: 6,
        staff: alex,
        location: miami,
        skill: 'bartender'
      },
      {
        date: '2026-03-14', // Saturday
        hour: 17,
        duration: 4,
        staff: alex,
        location: miami,
        skill: 'server'
      },
      {
        date: '2026-03-13', // Friday
        hour: 17,
        duration: 5,
        staff: sam,
        location: bellevue,
        skill: 'bartender'
      },
      
      // ===== WEEK 2 (March 15-21) =====
      {
        date: '2026-03-20', // Friday
        hour: 17,
        duration: 6,
        staff: alex,
        location: miami,
        skill: 'line_cook'
      },
      {
        date: '2026-03-21', // Saturday
        hour: 17,
        duration: 8,
        staff: sam,
        location: orlando,
        skill: 'server'
      },
      {
        date: '2026-03-20', // Friday
        hour: 17,
        duration: 8,
        staff: sam,
        location: orlando,
        skill: 'bartender'
      },
      
      // ===== WEEK 3 (March 22-28) =====
      {
        date: '2026-03-27', // Friday
        hour: 17,
        duration: 8,
        staff: alex,
        location: miami,
        skill: 'bartender'
      },
      {
        date: '2026-03-28', // Saturday
        hour: 17,
        duration: 6,
        staff: alex,
        location: miami,
        skill: 'server'
      },
      {
        date: '2026-03-27', // Friday
        hour: 17,
        duration: 8,
        staff: sam,
        location: orlando,
        skill: 'line_cook'
      },
      
      // ===== WEEK 4 (March 29 - April 4) =====
      {
        date: '2026-04-03', // Friday
        hour: 17,
        duration: 8,
        staff: sam,
        location: orlando,
        skill: 'bartender'
      },
      {
        date: '2026-04-04', // Saturday
        hour: 17,
        duration: 8,
        staff: sam,
        location: orlando,
        skill: 'server'
      }
    ];

    console.log(`\n📊 Adding ${premiumShifts.length} premium shifts...`);

    for (let i = 0; i < premiumShifts.length; i++) {
      const s = premiumShifts[i];
      
      const shiftDate = new Date(s.date);
      shiftDate.setHours(0, 0, 0, 0);
      
      const startTime = new Date(shiftDate);
      startTime.setHours(s.hour, 0, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + s.duration);
      
      const editCutoff = new Date(startTime);
      editCutoff.setHours(editCutoff.getHours() - 48);

      const shift = new Shift({
        location: s.location._id,
        date: shiftDate,
        startTime: startTime,
        endTime: endTime,
        duration: s.duration * 60,
        requiredSkill: s.skill,
        requiredCount: 2,
        assignedStaff: [s.staff._id],
        status: 'published',
        editCutoff: editCutoff,
        isPremiumShift: true,
        publishedAt: new Date(),
        publishedBy: admin?._id || s.staff._id,
        createdBy: admin?._id || s.staff._id,
        swapRequests: [],
        complianceWarnings: [],
        history: [{
          action: 'published',
          performedBy: admin?._id || s.staff._id,
          timestamp: new Date()
        }],
        assignmentHistory: [{
          staff: s.staff._id,
          assignedAt: new Date(),
          assignedBy: admin?._id || s.staff._id
        }],
        locationTimezone: s.location.timezone // <-- Add this line
      });

      await shift.save();
      console.log(`✅ ${i + 1}/${premiumShifts.length}: ${s.date} - ${s.staff.name} at ${s.location.name}`);
    }

    console.log('\n🎉 All premium shifts added successfully!');

    // Verify final counts
    const totalPremium = await Shift.countDocuments({ isPremiumShift: true });
    const byStaff = await Shift.aggregate([
      { $match: { isPremiumShift: true } },
      { $unwind: '$assignedStaff' },
      { $lookup: { from: 'users', localField: 'assignedStaff', foreignField: '_id', as: 'staff' } },
      { $unwind: '$staff' },
      { $group: { _id: '$staff.name', count: { $sum: 1 } } }
    ]);
    
    console.log('\n📊 Final Premium Shift Counts:');
    console.log(`   Total premium shifts: ${totalPremium}`);
    byStaff.forEach(s => {
      console.log(`   ${s._id}: ${s.count} premium shifts`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected');
  }
};

addAllPremiumShifts();