require('dotenv').config();
const mongoose = require('mongoose');

const seedFixedShifts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    const db = mongoose.connection.db;

    // Get users and locations
    const users = await db.collection('users').find().toArray();
    const locations = await db.collection('locations').find().toArray();

    // Clear ALL existing shifts
    await db.collection('shifts').deleteMany({});
    console.log('🧹 Cleared all old shifts');

    // Find staff members
    const alex = users.find(u => u.email === 'alex.j@coastaleats.com');
    const sam = users.find(u => u.email === 'sam.c@coastaleats.com');
    
    // Find locations
    const seattle = locations.find(l => l.code === 'SEA-DT');
    const bellevue = locations.find(l => l.code === 'BEL');
    const miami = locations.find(l => l.code === 'MIA-BCH');
    const orlando = locations.find(l => l.code === 'ORL');

    if (!alex || !sam) {
      console.log('❌ Staff not found');
      return;
    }

    const shifts = [];
    const today = new Date();

    // Helper to create date
    const createDate = (daysFromNow, hours, minutes = 0) => {
      const date = new Date(today);
      date.setDate(today.getDate() + daysFromNow);
      date.setHours(hours, minutes, 0, 0);
      return date;
    };

    // ----- SHIFTS FOR ALEX (Seattle) -----
    // Alex gets 5 shifts in Seattle
    for (let i = 1; i <= 5; i++) {
      shifts.push({
        location: seattle._id,
        date: createDate(i, 9, 0),
        startTime: createDate(i, 9, 0),
        endTime: createDate(i, 17, 0),
        requiredSkill: i % 2 === 0 ? 'bartender' : 'server',
        requiredCount: 2,
        assignedStaff: [alex._id], // ONLY Alex assigned
        status: i < 4 ? 'published' : 'draft',
        isPremiumShift: i === 5 || i === 6,
        createdBy: alex._id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // ----- SHIFTS FOR SAM (Bellevue) -----
    // Sam gets 4 shifts in Bellevue
    for (let i = 1; i <= 4; i++) {
      shifts.push({
        location: bellevue._id,
        date: createDate(i + 2, 10, 0),
        startTime: createDate(i + 2, 10, 0),
        endTime: createDate(i + 2, 18, 0),
        requiredSkill: i === 1 ? 'host' : 'server',
        requiredCount: 2,
        assignedStaff: [sam._id], // ONLY Sam assigned
        status: 'published',
        isPremiumShift: false,
        createdBy: sam._id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // ----- SHIFTS FOR BOTH (different days) -----
    // Wednesday shift - Alex
    shifts.push({
      location: seattle._id,
      date: createDate(3, 14, 0),
      startTime: createDate(3, 14, 0),
      endTime: createDate(3, 22, 0),
      requiredSkill: 'bartender',
      requiredCount: 3,
      assignedStaff: [alex._id], // Alex only
      status: 'published',
      isPremiumShift: false,
      createdBy: alex._id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Thursday shift - Sam
    shifts.push({
      location: bellevue._id,
      date: createDate(4, 12, 0),
      startTime: createDate(4, 12, 0),
      endTime: createDate(4, 20, 0),
      requiredSkill: 'server',
      requiredCount: 2,
      assignedStaff: [sam._id], // Sam only
      status: 'draft',
      isPremiumShift: false,
      createdBy: sam._id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // ----- UNSASSIGNED SHIFTS (for pickup) -----
    shifts.push({
      location: miami._id,
      date: createDate(5, 20, 0),
      startTime: createDate(5, 20, 0),
      endTime: createDate(6, 4, 0),
      requiredSkill: 'bartender',
      requiredCount: 2,
      assignedStaff: [], // No one assigned
      status: 'published',
      isPremiumShift: true,
      createdBy: alex._id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    shifts.push({
      location: orlando._id,
      date: createDate(6, 8, 0),
      startTime: createDate(6, 8, 0),
      endTime: createDate(6, 16, 0),
      requiredSkill: 'line_cook',
      requiredCount: 2,
      assignedStaff: [], // No one assigned
      status: 'draft',
      isPremiumShift: false,
      createdBy: sam._id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Insert all shifts
    const result = await db.collection('shifts').insertMany(shifts);
    console.log(`✅ Created ${result.insertedCount} shifts`);

    // Summary
    console.log('\n📊 Shift Summary:');
    console.log(`Alex: ${shifts.filter(s => s.assignedStaff?.[0]?.toString() === alex._id.toString()).length} shifts`);
    console.log(`Sam: ${shifts.filter(s => s.assignedStaff?.[0]?.toString() === sam._id.toString()).length} shifts`);
    console.log(`Unassigned: ${shifts.filter(s => s.assignedStaff?.length === 0).length} shifts`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected');
  }
};

seedFixedShifts();