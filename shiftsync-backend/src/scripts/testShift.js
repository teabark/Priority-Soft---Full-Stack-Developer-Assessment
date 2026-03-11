require('dotenv').config();
const mongoose = require('mongoose');
const Shift = require('../models/Shift');
const User = require('../models/User');
const Location = require('../models/Location');

const seedFreshShifts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // 🔥 DELETE ALL EXISTING SHIFTS
    console.log('🧹 Deleting all existing shifts...');
    const deleteResult = await Shift.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} shifts`);

    // Get users and locations
    const users = await User.find();
    const locations = await Location.find();

    // Find staff members
    const alex = users.find(u => u.email === 'alex.j@coastaleats.com');
    const sam = users.find(u => u.email === 'sam.c@coastaleats.com');
    const admin = users.find(u => u.role === 'admin');

    if (!alex || !sam) {
      console.log('❌ Staff not found');
      return;
    }

    console.log(`✅ Found staff: ${alex.name} and ${sam.name}`);
    console.log(`📍 Found ${locations.length} locations`);

    const shifts = [];
    
    // Locations
    const seattle = locations.find(l => l.code === 'SEA-DT');
    const bellevue = locations.find(l => l.code === 'BEL');
    const miami = locations.find(l => l.code === 'MIA-BCH');
    const orlando = locations.find(l => l.code === 'ORL');

    // Define 4 weeks starting March 8, 2026
    const weekStarts = [
      new Date('2026-03-08'), // Week 1: Alex OVER (42h), Sam UNDER (25h)
      new Date('2026-03-15'), // Week 2: Alex UNDER (28h), Sam OVER (44h)
      new Date('2026-03-22'), // Week 3: Alex OVER (46h), Sam UNDER (30h)
      new Date('2026-03-29')  // Week 4: Alex UNDER (26h), Sam OVER (40h)
    ];

    let totalShifts = 0;
    let weeklyStats = [];

    // Process each week
    for (let weekIndex = 0; weekIndex < weekStarts.length; weekIndex++) {
      const weekStart = weekStarts[weekIndex];
      weekStart.setHours(0, 0, 0, 0);
      
      // ALL weeks are PUBLISHED for testing
      const isPublished = true;
      
      console.log(`\n📅 Week ${weekIndex + 1}: ${weekStart.toLocaleDateString()}`);

      // ===== WEEK 1: Alex OVER (42h), Sam UNDER (25h) =====
      if (weekIndex === 0) {
        // ALEX - 42 hours (OVER) with 2 premium
        const alexShifts = [
          { day: 1, hour: 9, duration: 8, location: seattle, skill: 'bartender' },  // Mon 8h
          { day: 2, hour: 9, duration: 8, location: seattle, skill: 'server' },     // Tue 8h
          { day: 3, hour: 13, duration: 8, location: miami, skill: 'line_cook' },   // Wed 8h
          { day: 4, hour: 9, duration: 8, location: seattle, skill: 'host' },       // Thu 8h
          { day: 5, hour: 17, duration: 6, location: miami, skill: 'bartender' },   // Fri 6h (PREMIUM)
          { day: 6, hour: 17, duration: 4, location: miami, skill: 'server' }       // Sat 4h (PREMIUM)
        ]; // Total: 42 hours, 2 premium

        // SAM - 25 hours (UNDER) with 1 premium
        const samShifts = [
          { day: 1, hour: 13, duration: 8, location: bellevue, skill: 'server' },   // Mon 8h
          { day: 3, hour: 9, duration: 8, location: orlando, skill: 'line_cook' },  // Wed 8h
          { day: 5, hour: 17, duration: 5, location: bellevue, skill: 'bartender' }, // Fri 5h (PREMIUM)
          { day: 6, hour: 10, duration: 4, location: orlando, skill: 'host' }       // Sat 4h
        ]; // Total: 25 hours, 1 premium

        await createShifts(alexShifts, alex, weekStart, isPublished, admin, shifts);
        await createShifts(samShifts, sam, weekStart, isPublished, admin, shifts);
        
        weeklyStats.push({
          week: weekIndex + 1,
          alexHours: 42,
          samHours: 25,
          alexPremium: 2,
          samPremium: 1,
          alexStatus: 'OVER ⚠️',
          samStatus: 'UNDER ✅'
        });
      }
      
      // ===== WEEK 2: Alex UNDER (28h), Sam OVER (44h) =====
      else if (weekIndex === 1) {
        // ALEX - 28 hours (UNDER) with 1 premium
        const alexShifts = [
          { day: 1, hour: 9, duration: 8, location: seattle, skill: 'bartender' },  // Mon 8h
          { day: 3, hour: 9, duration: 8, location: miami, skill: 'server' },       // Wed 8h
          { day: 4, hour: 13, duration: 6, location: seattle, skill: 'host' },      // Thu 6h
          { day: 6, hour: 17, duration: 6, location: miami, skill: 'line_cook' }    // Sat 6h (PREMIUM)
        ]; // Total: 28 hours, 1 premium

        // SAM - 44 hours (OVER) with 2 premium
        const samShifts = [
          { day: 1, hour: 13, duration: 8, location: bellevue, skill: 'server' },   // Mon 8h
          { day: 2, hour: 9, duration: 8, location: bellevue, skill: 'bartender' }, // Tue 8h
          { day: 3, hour: 17, duration: 8, location: orlando, skill: 'line_cook' }, // Wed 8h (PREMIUM)
          { day: 4, hour: 9, duration: 8, location: bellevue, skill: 'host' },      // Thu 8h
          { day: 5, hour: 17, duration: 8, location: orlando, skill: 'server' },    // Fri 8h (PREMIUM)
          { day: 6, hour: 10, duration: 4, location: bellevue, skill: 'bartender' } // Sat 4h
        ]; // Total: 44 hours, 2 premium

        await createShifts(alexShifts, alex, weekStart, isPublished, admin, shifts);
        await createShifts(samShifts, sam, weekStart, isPublished, admin, shifts);
        
        weeklyStats.push({
          week: weekIndex + 1,
          alexHours: 28,
          samHours: 44,
          alexPremium: 1,
          samPremium: 2,
          alexStatus: 'UNDER ✅',
          samStatus: 'OVER ⚠️'
        });
      }
      
      // ===== WEEK 3: Alex OVER (46h), Sam UNDER (30h) =====
      else if (weekIndex === 2) {
        // ALEX - 46 hours (OVER) with 2 premium
        const alexShifts = [
          { day: 1, hour: 9, duration: 8, location: seattle, skill: 'bartender' },  // Mon 8h
          { day: 2, hour: 9, duration: 8, location: seattle, skill: 'server' },     // Tue 8h
          { day: 3, hour: 13, duration: 8, location: miami, skill: 'line_cook' },   // Wed 8h
          { day: 4, hour: 9, duration: 8, location: seattle, skill: 'host' },       // Thu 8h
          { day: 5, hour: 17, duration: 8, location: miami, skill: 'bartender' },   // Fri 8h (PREMIUM)
          { day: 6, hour: 17, duration: 6, location: miami, skill: 'server' }       // Sat 6h (PREMIUM)
        ]; // Total: 46 hours, 2 premium

        // SAM - 30 hours (UNDER) with 1 premium
        const samShifts = [
          { day: 1, hour: 13, duration: 8, location: bellevue, skill: 'server' },   // Mon 8h
          { day: 3, hour: 9, duration: 8, location: orlando, skill: 'line_cook' },  // Wed 8h
          { day: 4, hour: 13, duration: 6, location: bellevue, skill: 'host' },     // Thu 6h
          { day: 5, hour: 17, duration: 8, location: orlando, skill: 'bartender' }  // Fri 8h (PREMIUM)
        ]; // Total: 30 hours, 1 premium

        await createShifts(alexShifts, alex, weekStart, isPublished, admin, shifts);
        await createShifts(samShifts, sam, weekStart, isPublished, admin, shifts);
        
        weeklyStats.push({
          week: weekIndex + 1,
          alexHours: 46,
          samHours: 30,
          alexPremium: 2,
          samPremium: 1,
          alexStatus: 'OVER ⚠️',
          samStatus: 'UNDER ✅'
        });
      }
      
      // ===== WEEK 4: Alex UNDER (26h), Sam OVER (40h) =====
      else if (weekIndex === 3) {
        // ALEX - 26 hours (UNDER) with 0 premium
        const alexShifts = [
          { day: 1, hour: 9, duration: 8, location: seattle, skill: 'bartender' },  // Mon 8h
          { day: 3, hour: 9, duration: 8, location: miami, skill: 'server' },       // Wed 8h
          { day: 4, hour: 13, duration: 6, location: seattle, skill: 'host' },      // Thu 6h
          { day: 6, hour: 10, duration: 4, location: miami, skill: 'line_cook' }    // Sat 4h
        ]; // Total: 26 hours, 0 premium

        // SAM - 40 hours EXACT (OVER) with 2 premium
        const samShifts = [
          { day: 1, hour: 13, duration: 8, location: bellevue, skill: 'server' },   // Mon 8h
          { day: 2, hour: 9, duration: 8, location: bellevue, skill: 'bartender' }, // Tue 8h
          { day: 3, hour: 17, duration: 8, location: orlando, skill: 'line_cook' }, // Wed 8h (PREMIUM)
          { day: 4, hour: 9, duration: 8, location: bellevue, skill: 'host' },      // Thu 8h
          { day: 5, hour: 17, duration: 8, location: orlando, skill: 'server' }     // Fri 8h (PREMIUM)
        ]; // Total: 40 hours, 2 premium

        await createShifts(alexShifts, alex, weekStart, isPublished, admin, shifts);
        await createShifts(samShifts, sam, weekStart, isPublished, admin, shifts);
        
        weeklyStats.push({
          week: weekIndex + 1,
          alexHours: 26,
          samHours: 40,
          alexPremium: 0,
          samPremium: 2,
          alexStatus: 'UNDER ✅',
          samStatus: 'OVER ⚠️'
        });
      }
    }

    // Insert all shifts
    console.log(`\n📊 Creating ${shifts.length} total shifts across 4 weeks...`);
    
    for (let i = 0; i < shifts.length; i++) {
      try {
        const shift = new Shift(shifts[i]);
        await shift.save();
        if ((i + 1) % 10 === 0) {
          console.log(`✅ Created ${i + 1}/${shifts.length} shifts`);
        }
      } catch (err) {
        console.log(`❌ Failed to create shift ${i + 1}:`, err.message);
      }
    }

    console.log('\n🎉 SHIFTS CREATED SUCCESSFULLY!');
    console.log('\n📊 Weekly Hours Summary:');
    console.log('═'.repeat(70));
    console.log('Week\tAlex Hours\tSam Hours\tPremium (Alex/Sam)\tStatus');
    console.log('═'.repeat(70));
    
    weeklyStats.forEach(stat => {
      console.log(`${stat.week}\t${stat.alexHours}h\t\t${stat.samHours}h\t\t${stat.alexPremium}/${stat.samPremium}\t\tAlex: ${stat.alexStatus}, Sam: ${stat.samStatus}`);
    });
    console.log('═'.repeat(70));

    // Premium shift totals
    const totalAlexPremium = weeklyStats.reduce((sum, stat) => sum + stat.alexPremium, 0);
    const totalSamPremium = weeklyStats.reduce((sum, stat) => sum + stat.samPremium, 0);
    
    console.log(`\n📊 Premium Shift Totals:`);
    console.log(`   Alex Johnson: ${totalAlexPremium} premium shifts`);
    console.log(`   Sam Carter: ${totalSamPremium} premium shifts`);
    console.log(`   Total: ${totalAlexPremium + totalSamPremium} premium shifts across 4 weeks`);

    // Verify final count
    const finalCount = await Shift.countDocuments();
    console.log(`\n✅ Database verification:`);
    console.log(`   Total shifts created: ${shifts.length}`);
    console.log(`   Total shifts in DB: ${finalCount}`);

  } catch (error) {
    console.error('❌ Error creating shifts:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected');
  }
};

// Helper function to create shifts
async function createShifts(shiftDefinitions, staff, weekStart, isPublished, admin, shiftsArray) {
  for (const shiftData of shiftDefinitions) {
    const shiftDate = new Date(weekStart);
    shiftDate.setDate(weekStart.getDate() + shiftData.day);
    
    const startTime = new Date(shiftDate);
    startTime.setHours(shiftData.hour, 0, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + shiftData.duration);
    
    const editCutoff = new Date(startTime);
    editCutoff.setHours(editCutoff.getHours() - 48);

    // Premium shifts are on Friday (5) or Saturday (6)
    const isPremium = shiftData.day === 5 || shiftData.day === 6;

    const shift = {
      location: shiftData.location._id,
      date: shiftDate,
      startTime: startTime,
      endTime: endTime,
      duration: shiftData.duration * 60,
      isOvernight: endTime.getDate() !== startTime.getDate(),
      requiredSkill: shiftData.skill,
      requiredCount: 2,
      assignedStaff: [staff._id],
      status: isPublished ? 'published' : 'draft',
      editCutoff: editCutoff,
      isPremiumShift: isPremium,
      ...(isPublished && { 
        publishedAt: new Date(),
        publishedBy: admin?._id || staff._id 
      }),
      createdBy: admin?._id || staff._id,
      swapRequests: [],
      complianceWarnings: [],
      history: isPublished ? [{
        action: 'published',
        performedBy: admin?._id || staff._id,
        timestamp: new Date()
      }] : [],
      assignmentHistory: [{
        staff: staff._id,
        assignedAt: new Date(),
        assignedBy: admin?._id || staff._id
      }]
    };

    shiftsArray.push(shift);
  }
}

// Run the seed function
seedFreshShifts();