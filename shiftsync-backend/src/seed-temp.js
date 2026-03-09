require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const moment = require('moment-timezone');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();
    
    console.log('🧹 Clearing existing data...');
    
    // Direct collection access
    const db = mongoose.connection.db;
    
    // Drop collections
    const collections = ['users', 'locations', 'shifts', 'schedules', 'notifications'];
    for (const collection of collections) {
      try {
        await db.collection(collection).drop();
        console.log(`  Dropped ${collection} collection`);
      } catch (err) {
        console.log(`  ${collection} collection doesn't exist, skipping`);
      }
    }
    
    console.log('🌱 Seeding database with realistic test data...\n');

    // ========== CREATE LOCATIONS ==========
    console.log('📍 Creating locations...');
    
    const locations = [
      {
        name: "Downtown Seattle",
        code: "SEA-DT",
        address: {
          street: "123 Pike Street",
          city: "Seattle",
          state: "WA",
          zipCode: "98101",
          coordinates: { latitude: 47.6062, longitude: -122.3321 }
        },
        timezone: "America/Los_Angeles",
        operatingHours: [
          { dayOfWeek: 0, openTime: "10:00", closeTime: "22:00", isClosed: false },
          { dayOfWeek: 1, openTime: "11:00", closeTime: "23:00", isClosed: false },
          { dayOfWeek: 2, openTime: "11:00", closeTime: "23:00", isClosed: false },
          { dayOfWeek: 3, openTime: "11:00", closeTime: "23:00", isClosed: false },
          { dayOfWeek: 4, openTime: "11:00", closeTime: "00:00", isClosed: false },
          { dayOfWeek: 5, openTime: "11:00", closeTime: "02:00", isClosed: false },
          { dayOfWeek: 6, openTime: "10:00", closeTime: "02:00", isClosed: false }
        ],
        features: {
          hasParking: false,
          hasOutdoorSeating: true,
          hasDelivery: true,
          hasTakeout: true,
          capacity: 120,
          kitchenType: ['full']
        },
        requiredSkills: [
          { skill: 'bartender', minimumCount: 2, isEssential: true },
          { skill: 'server', minimumCount: 4, isEssential: true },
          { skill: 'line_cook', minimumCount: 3, isEssential: true },
          { skill: 'host', minimumCount: 1, isEssential: false },
          { skill: 'dishwasher', minimumCount: 1, isEssential: true }
        ],
        scheduleSettings: {
          publishCutoff: 48,
          minHoursBetweenShifts: 10,
          maxWeeklyHours: 40,
          maxDailyHours: 12,
          overtimeThreshold: 35
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Bellevue",
        code: "BEL",
        address: {
          street: "456 Bellevue Way",
          city: "Bellevue",
          state: "WA",
          zipCode: "98004",
          coordinates: { latitude: 47.6101, longitude: -122.2015 }
        },
        timezone: "America/Los_Angeles",
        operatingHours: [
          { dayOfWeek: 0, openTime: "09:00", closeTime: "21:00", isClosed: false },
          { dayOfWeek: 1, openTime: "11:00", closeTime: "22:00", isClosed: false },
          { dayOfWeek: 2, openTime: "11:00", closeTime: "22:00", isClosed: false },
          { dayOfWeek: 3, openTime: "11:00", closeTime: "22:00", isClosed: false },
          { dayOfWeek: 4, openTime: "11:00", closeTime: "23:00", isClosed: false },
          { dayOfWeek: 5, openTime: "11:00", closeTime: "23:00", isClosed: false },
          { dayOfWeek: 6, openTime: "09:00", closeTime: "23:00", isClosed: false }
        ],
        features: {
          hasParking: true,
          hasOutdoorSeating: true,
          hasDelivery: true,
          hasTakeout: true,
          capacity: 80,
          kitchenType: ['full']
        },
        requiredSkills: [
          { skill: 'bartender', minimumCount: 1, isEssential: true },
          { skill: 'server', minimumCount: 3, isEssential: true },
          { skill: 'line_cook', minimumCount: 2, isEssential: true },
          { skill: 'host', minimumCount: 1, isEssential: true },
          { skill: 'dishwasher', minimumCount: 1, isEssential: true }
        ],
        scheduleSettings: {
          publishCutoff: 48,
          minHoursBetweenShifts: 10,
          maxWeeklyHours: 40,
          maxDailyHours: 12,
          overtimeThreshold: 35
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Miami Beach",
        code: "MIA-BCH",
        address: {
          street: "789 Ocean Drive",
          city: "Miami Beach",
          state: "FL",
          zipCode: "33139",
          coordinates: { latitude: 25.7903, longitude: -80.1287 }
        },
        timezone: "America/New_York",
        operatingHours: [
          { dayOfWeek: 0, openTime: "08:00", closeTime: "00:00", isClosed: false },
          { dayOfWeek: 1, openTime: "08:00", closeTime: "00:00", isClosed: false },
          { dayOfWeek: 2, openTime: "08:00", closeTime: "00:00", isClosed: false },
          { dayOfWeek: 3, openTime: "08:00", closeTime: "00:00", isClosed: false },
          { dayOfWeek: 4, openTime: "08:00", closeTime: "02:00", isClosed: false },
          { dayOfWeek: 5, openTime: "08:00", closeTime: "04:00", isClosed: false },
          { dayOfWeek: 6, openTime: "08:00", closeTime: "04:00", isClosed: false }
        ],
        features: {
          hasParking: false,
          hasOutdoorSeating: true,
          hasDelivery: true,
          hasTakeout: true,
          capacity: 200,
          kitchenType: ['full']
        },
        requiredSkills: [
          { skill: 'bartender', minimumCount: 3, isEssential: true },
          { skill: 'server', minimumCount: 6, isEssential: true },
          { skill: 'line_cook', minimumCount: 4, isEssential: true },
          { skill: 'host', minimumCount: 2, isEssential: true },
          { skill: 'dishwasher', minimumCount: 2, isEssential: true },
          { skill: 'busser', minimumCount: 2, isEssential: true }
        ],
        scheduleSettings: {
          publishCutoff: 48,
          minHoursBetweenShifts: 10,
          maxWeeklyHours: 40,
          maxDailyHours: 12,
          overtimeThreshold: 35
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Orlando",
        code: "ORL",
        address: {
          street: "321 International Drive",
          city: "Orlando",
          state: "FL",
          zipCode: "32819",
          coordinates: { latitude: 28.4448, longitude: -81.4685 }
        },
        timezone: "America/New_York",
        timezoneBoundary: {
          crossesBoundary: true,
          alternateTimezone: "America/Chicago",
          boundaryDescription: "Near Florida/Alabama border, some staff commute from CST",
          affectedAreas: ["Pensacola", "Mobile"]
        },
        operatingHours: [
          { dayOfWeek: 0, openTime: "07:00", closeTime: "23:00", isClosed: false },
          { dayOfWeek: 1, openTime: "07:00", closeTime: "23:00", isClosed: false },
          { dayOfWeek: 2, openTime: "07:00", closeTime: "23:00", isClosed: false },
          { dayOfWeek: 3, openTime: "07:00", closeTime: "23:00", isClosed: false },
          { dayOfWeek: 4, openTime: "07:00", closeTime: "00:00", isClosed: false },
          { dayOfWeek: 5, openTime: "07:00", closeTime: "01:00", isClosed: false },
          { dayOfWeek: 6, openTime: "07:00", closeTime: "01:00", isClosed: false }
        ],
        features: {
          hasParking: true,
          hasOutdoorSeating: true,
          hasDelivery: true,
          hasTakeout: true,
          capacity: 150,
          kitchenType: ['full']
        },
        requiredSkills: [
          { skill: 'bartender', minimumCount: 2, isEssential: true },
          { skill: 'server', minimumCount: 4, isEssential: true },
          { skill: 'line_cook', minimumCount: 3, isEssential: true },
          { skill: 'host', minimumCount: 1, isEssential: true },
          { skill: 'dishwasher', minimumCount: 1, isEssential: true }
        ],
        scheduleSettings: {
          publishCutoff: 48,
          minHoursBetweenShifts: 10,
          maxWeeklyHours: 40,
          maxDailyHours: 12,
          overtimeThreshold: 35
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const locationResult = await db.collection('locations').insertMany(locations);
    const locationIds = Object.values(locationResult.insertedIds);
    console.log(`✅ Created ${locationResult.insertedCount} locations`);

    // ========== CREATE USERS WITH HASHED PASSWORDS ==========
    console.log('\n👥 Creating users with hashed passwords...');

    // Hash passwords
    const saltRounds = 10;
    const adminPassword = await bcrypt.hash("Admin123!", saltRounds);
    const managerPassword = await bcrypt.hash("Manager123!", saltRounds);
    const staffPassword = await bcrypt.hash("Staff123!", saltRounds);

    const users = [
      // Admin
      {
        name: "Alex Rivera",
        email: "admin@coastaleats.com",
        password: adminPassword,
        role: "admin",
        employeeId: "ADM001",
        phoneNumber: "+1-206-555-1000",
        skills: ['bartender', 'line_cook', 'server', 'host', 'manager'],
        locations: locationIds,
        certifications: locationIds.map(id => ({
          location: id,
          certifiedAt: new Date(),
          isActive: true
        })),
        availability: [
          { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 6, startTime: "18:00", endTime: "23:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 0, startTime: "10:00", endTime: "16:00", timezone: "America/Los_Angeles", isRecurring: true }
        ],
        desiredHours: { min: 20, max: 50, preferred: 40 },
        notificationPreferences: {
          inApp: true,
          email: true,
          shiftAssigned: true,
          shiftChanged: true,
          shiftPublished: true,
          swapRequestReceived: true,
          swapRequestUpdated: true,
          overtimeWarning: true,
          schedulePublished: true,
          availabilityChange: false
        },
        workStats: {
          totalHoursThisWeek: 0,
          totalHoursThisMonth: 0,
          consecutiveDaysWorked: 0,
          premiumShiftsCount: 0,
          overtimeHours: 0
        },
        pendingRequests: {
          count: 0,
          requestIds: []
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Managers
      {
        name: "Sarah Chen",
        email: "manager.seattle@coastaleats.com",
        password: managerPassword,
        role: "manager",
        employeeId: "MGR001",
        phoneNumber: "+1-206-555-1001",
        skills: ['bartender', 'server', 'manager'],
        locations: [locationIds[0], locationIds[1]],
        certifications: [
          { location: locationIds[0], certifiedAt: new Date(), isActive: true },
          { location: locationIds[1], certifiedAt: new Date(), isActive: true }
        ],
        availability: [
          { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 6, startTime: "18:00", endTime: "23:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 0, startTime: "10:00", endTime: "16:00", timezone: "America/Los_Angeles", isRecurring: true }
        ],
        desiredHours: { min: 30, max: 45, preferred: 40 },
        notificationPreferences: {
          inApp: true,
          email: true,
          shiftAssigned: true,
          shiftChanged: true,
          shiftPublished: true,
          swapRequestReceived: true,
          swapRequestUpdated: true,
          overtimeWarning: true,
          schedulePublished: true,
          availabilityChange: false
        },
        workStats: {
          totalHoursThisWeek: 0,
          totalHoursThisMonth: 0,
          consecutiveDaysWorked: 0,
          premiumShiftsCount: 0,
          overtimeHours: 0
        },
        pendingRequests: {
          count: 0,
          requestIds: []
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Mike Johnson",
        email: "manager.miami@coastaleats.com",
        password: managerPassword,
        role: "manager",
        employeeId: "MGR002",
        phoneNumber: "+1-305-555-1002",
        skills: ['bartender', 'line_cook', 'manager'],
        locations: [locationIds[2], locationIds[3]],
        certifications: [
          { location: locationIds[2], certifiedAt: new Date(), isActive: true },
          { location: locationIds[3], certifiedAt: new Date(), isActive: true }
        ],
        availability: [
          { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 6, startTime: "18:00", endTime: "23:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 0, startTime: "10:00", endTime: "16:00", timezone: "America/New_York", isRecurring: true }
        ],
        desiredHours: { min: 30, max: 45, preferred: 40 },
        notificationPreferences: {
          inApp: true,
          email: true,
          shiftAssigned: true,
          shiftChanged: true,
          shiftPublished: true,
          swapRequestReceived: true,
          swapRequestUpdated: true,
          overtimeWarning: true,
          schedulePublished: true,
          availabilityChange: false
        },
        workStats: {
          totalHoursThisWeek: 0,
          totalHoursThisMonth: 0,
          consecutiveDaysWorked: 0,
          premiumShiftsCount: 0,
          overtimeHours: 0
        },
        pendingRequests: {
          count: 0,
          requestIds: []
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Staff
      {
        name: "Alex Johnson",
        email: "alex.j@coastaleats.com",
        password: staffPassword,
        role: "staff",
        employeeId: "STF001",
        phoneNumber: "+1-206-555-1003",
        skills: ['bartender', 'server'],
        locations: [locationIds[0], locationIds[2]],
        certifications: [
          { location: locationIds[0], certifiedAt: new Date(), isActive: true },
          { location: locationIds[2], certifiedAt: new Date(), isActive: true }
        ],
        availability: [
          { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 3, startTime: "14:00", endTime: "22:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 4, startTime: "14:00", endTime: "22:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 5, startTime: "18:00", endTime: "02:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 6, startTime: "18:00", endTime: "02:00", timezone: "America/Los_Angeles", isRecurring: true }
        ],
        desiredHours: { min: 25, max: 40, preferred: 35 },
        notificationPreferences: {
          inApp: true,
          email: true,
          shiftAssigned: true,
          shiftChanged: true,
          shiftPublished: true,
          swapRequestReceived: true,
          swapRequestUpdated: true,
          overtimeWarning: true,
          schedulePublished: true,
          availabilityChange: false
        },
        workStats: {
          totalHoursThisWeek: 0,
          totalHoursThisMonth: 0,
          consecutiveDaysWorked: 0,
          premiumShiftsCount: 0,
          overtimeHours: 0
        },
        pendingRequests: {
          count: 0,
          requestIds: []
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Sam Carter",
        email: "sam.c@coastaleats.com",
        password: staffPassword,
        role: "staff",
        employeeId: "STF002",
        phoneNumber: "+1-206-555-1004",
        skills: ['server', 'host'],
        locations: [locationIds[0], locationIds[1]],
        certifications: [
          { location: locationIds[0], certifiedAt: new Date(), isActive: true },
          { location: locationIds[1], certifiedAt: new Date(), isActive: true }
        ],
        availability: [
          { dayOfWeek: 1, startTime: "11:00", endTime: "19:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 2, startTime: "11:00", endTime: "19:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 3, startTime: "11:00", endTime: "19:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 4, startTime: "11:00", endTime: "19:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 5, startTime: "16:00", endTime: "23:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 6, startTime: "16:00", endTime: "23:00", timezone: "America/Los_Angeles", isRecurring: true }
        ],
        desiredHours: { min: 20, max: 30, preferred: 25 },
        notificationPreferences: {
          inApp: true,
          email: true,
          shiftAssigned: true,
          shiftChanged: true,
          shiftPublished: true,
          swapRequestReceived: true,
          swapRequestUpdated: true,
          overtimeWarning: true,
          schedulePublished: true,
          availabilityChange: false
        },
        workStats: {
          totalHoursThisWeek: 0,
          totalHoursThisMonth: 0,
          consecutiveDaysWorked: 0,
          premiumShiftsCount: 0,
          overtimeHours: 0
        },
        pendingRequests: {
          count: 0,
          requestIds: []
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const userResult = await db.collection('users').insertMany(users);
    console.log(`✅ Created ${userResult.insertedCount} users with hashed passwords`);

    // ========== CREATE SHIFTS ==========
    console.log('\n⏰ Creating shifts...');
    
    const today = new Date();
    const shifts = [
      {
        location: locationIds[0],
        date: new Date(today.setDate(today.getDate() + 2)),
        startTime: new Date(today.setHours(22, 0, 0, 0)),
        endTime: new Date(today.setHours(2, 0, 0, 0)),
        duration: 240,
        isOvernight: true,
        requiredSkill: 'bartender',
        requiredCount: 2,
        assignedStaff: [userResult.insertedIds[3]], // Alex Johnson
        status: 'published',
        isPremiumShift: true,
        createdBy: userResult.insertedIds[1], // Sarah Chen
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    if (shifts.length > 0) {
      await db.collection('shifts').insertMany(shifts);
      console.log(`✅ Created ${shifts.length} shifts`);
    }

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n🔑 ===== TEST LOGIN CREDENTIALS =====');
    console.log('Admin: admin@coastaleats.com / Admin123!');
    console.log('Manager (Seattle): manager.seattle@coastaleats.com / Manager123!');
    console.log('Manager (Miami): manager.miami@coastaleats.com / Manager123!');
    console.log('Staff (Bi-coastal): alex.j@coastaleats.com / Staff123!');
    console.log('Staff (Seattle): sam.c@coastaleats.com / Staff123!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from database');
  }
};

seedDatabase();