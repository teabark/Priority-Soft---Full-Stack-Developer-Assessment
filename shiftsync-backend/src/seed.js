require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const moment = require('moment-timezone');

const User = require('./models/User');
const Location = require('./models/Location');
const Shift = require('./models/Shift');
const Schedule = require('./models/Schedule');
const Notification = require('./models/Notification');

const connectDB = require('./config/database');

const seedDatabase = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Location.deleteMany({});
    await Shift.deleteMany({});
    await Schedule.deleteMany({});
    await Notification.deleteMany({});
    
    console.log('🌱 Seeding database with realistic test data...\n');

    // ========== CREATE LOCATIONS ==========
    console.log('📍 Creating locations...');
    
    const locations = await Location.create([
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
          { dayOfWeek: 0, openTime: "10:00", closeTime: "22:00", isClosed: false }, // Sunday
          { dayOfWeek: 1, openTime: "11:00", closeTime: "23:00", isClosed: false }, // Monday
          { dayOfWeek: 2, openTime: "11:00", closeTime: "23:00", isClosed: false }, // Tuesday
          { dayOfWeek: 3, openTime: "11:00", closeTime: "23:00", isClosed: false }, // Wednesday
          { dayOfWeek: 4, openTime: "11:00", closeTime: "00:00", isClosed: false }, // Thursday (late night)
          { dayOfWeek: 5, openTime: "11:00", closeTime: "02:00", isClosed: false }, // Friday (very late)
          { dayOfWeek: 6, openTime: "10:00", closeTime: "02:00", isClosed: false }  // Saturday
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
        status: 'active'
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
        status: 'active'
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
        status: 'active'
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
        status: 'active'
      }
    ]);

    console.log(`✅ Created ${locations.length} locations`);

    // ========== CREATE USERS ==========
    console.log('\n👥 Creating users...');

    // Helper to create availability
    const createAvailability = (timezone = "America/New_York") => [
      // Monday - Friday 9am-5pm availability
      { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", timezone, isRecurring: true },
      { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", timezone, isRecurring: true },
      { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", timezone, isRecurring: true },
      { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", timezone, isRecurring: true },
      { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", timezone, isRecurring: true },
      // Weekend availability (limited)
      { dayOfWeek: 6, startTime: "18:00", endTime: "23:00", timezone, isRecurring: true },
      { dayOfWeek: 0, startTime: "10:00", endTime: "16:00", timezone, isRecurring: true }
    ];

    // Admin user
    const [admin] = await User.create([{
      name: "Alex Rivera",
      email: "admin@coastaleats.com",
      password: "Admin123!",
      role: "admin",
      employeeId: "ADM001",
      phoneNumber: "+1-206-555-1000",
      skills: ['bartender', 'line_cook', 'server', 'host', 'manager'],
      locations: locations.map(l => l._id),
      certifications: locations.map(l => ({
        location: l._id,
        certifiedAt: new Date(),
        isActive: true
      })),
      availability: createAvailability("America/Los_Angeles"),
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
        schedulePublished: true
      },
      isActive: true
    }]);

    // Managers
    const [mgrSeattle, mgrMiami] = await User.create([
      {
        name: "Sarah Chen",
        email: "manager.seattle@coastaleats.com",
        password: "Manager123!",
        role: "manager",
        employeeId: "MGR001",
        phoneNumber: "+1-206-555-1001",
        skills: ['bartender', 'server', 'manager'],
        locations: [locations[0]._id, locations[1]._id], // Seattle and Bellevue
        certifications: [
          { location: locations[0]._id, certifiedAt: new Date(), isActive: true },
          { location: locations[1]._id, certifiedAt: new Date(), isActive: true }
        ],
        availability: createAvailability("America/Los_Angeles"),
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
          schedulePublished: true
        },
        isActive: true
      },
      {
        name: "Mike Johnson",
        email: "manager.miami@coastaleats.com",
        password: "Manager123!",
        role: "manager",
        employeeId: "MGR002",
        phoneNumber: "+1-305-555-1002",
        skills: ['bartender', 'line_cook', 'manager'],
        locations: [locations[2]._id, locations[3]._id], // Miami and Orlando
        certifications: [
          { location: locations[2]._id, certifiedAt: new Date(), isActive: true },
          { location: locations[3]._id, certifiedAt: new Date(), isActive: true }
        ],
        availability: createAvailability("America/New_York"),
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
          schedulePublished: true
        },
        isActive: true
      }
    ]);

    // Staff members with various skills and certifications
    const staffMembers = await User.create([
      // Seattle Staff
      {
        name: "Alex Johnson",
        email: "alex.j@coastaleats.com",
        password: "Staff123!",
        role: "staff",
        employeeId: "STF001",
        phoneNumber: "+1-206-555-1003",
        skills: ['bartender', 'server'],
        locations: [locations[0]._id, locations[2]._id], // Certified in Seattle AND Miami (bi-coastal!)
        certifications: [
          { location: locations[0]._id, certifiedAt: new Date(), isActive: true },
          { location: locations[2]._id, certifiedAt: new Date(), isActive: true }
        ],
        availability: [
          { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 3, startTime: "14:00", endTime: "22:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 4, startTime: "14:00", endTime: "22:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 5, startTime: "18:00", endTime: "02:00", timezone: "America/Los_Angeles", isRecurring: true }, // Friday night premium
          { dayOfWeek: 6, startTime: "18:00", endTime: "02:00", timezone: "America/Los_Angeles", isRecurring: true }, // Saturday night premium
          // Add one-off exception for next Friday (unavailable)
          {
            dayOfWeek: 5,
            startTime: "18:00",
            endTime: "02:00",
            timezone: "America/Los_Angeles",
            isRecurring: false,
            validFrom: new Date(),
            validUntil: moment().add(7, 'days').toDate(),
            exceptions: [{
              date: moment().add(5, 'days').toDate(),
              isAvailable: false,
              reason: "Doctor's appointment"
            }]
          }
        ],
        desiredHours: { min: 25, max: 40, preferred: 35 },
        isActive: true
      },
      {
        name: "Sam Carter",
        email: "sam.c@coastaleats.com",
        password: "Staff123!",
        role: "staff",
        employeeId: "STF002",
        phoneNumber: "+1-206-555-1004",
        skills: ['server', 'host'],
        locations: [locations[0]._id, locations[1]._id],
        certifications: [
          { location: locations[0]._id, certifiedAt: new Date(), isActive: true },
          { location: locations[1]._id, certifiedAt: new Date(), isActive: true }
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
        isActive: true
      },
      {
        name: "Maria Garcia",
        email: "maria.g@coastaleats.com",
        password: "Staff123!",
        role: "staff",
        employeeId: "STF003",
        phoneNumber: "+1-206-555-1005",
        skills: ['line_cook', 'dishwasher'],
        locations: [locations[0]._id],
        certifications: [
          { location: locations[0]._id, certifiedAt: new Date(), isActive: true }
        ],
        availability: [
          { dayOfWeek: 1, startTime: "06:00", endTime: "14:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 2, startTime: "06:00", endTime: "14:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 3, startTime: "06:00", endTime: "14:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 4, startTime: "06:00", endTime: "14:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 5, startTime: "06:00", endTime: "14:00", timezone: "America/Los_Angeles", isRecurring: true }
        ],
        desiredHours: { min: 30, max: 40, preferred: 35 },
        isActive: true
      },
      {
        name: "David Kim",
        email: "david.k@coastaleats.com",
        password: "Staff123!",
        role: "staff",
        employeeId: "STF004",
        phoneNumber: "+1-206-555-1006",
        skills: ['bartender', 'server'],
        locations: [locations[1]._id],
        certifications: [
          { location: locations[1]._id, certifiedAt: new Date(), isActive: true }
        ],
        availability: [
          { dayOfWeek: 3, startTime: "16:00", endTime: "00:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 4, startTime: "16:00", endTime: "00:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 5, startTime: "18:00", endTime: "02:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 6, startTime: "18:00", endTime: "02:00", timezone: "America/Los_Angeles", isRecurring: true },
          { dayOfWeek: 0, startTime: "10:00", endTime: "18:00", timezone: "America/Los_Angeles", isRecurring: true }
        ],
        desiredHours: { min: 20, max: 35, preferred: 30 },
        isActive: true
      },

      // Miami Staff
      {
        name: "Sofia Rodriguez",
        email: "sofia.r@coastaleats.com",
        password: "Staff123!",
        role: "staff",
        employeeId: "STF005",
        phoneNumber: "+1-305-555-1007",
        skills: ['bartender', 'server', 'host'],
        locations: [locations[2]._id],
        certifications: [
          { location: locations[2]._id, certifiedAt: new Date(), isActive: true }
        ],
        availability: [
          { dayOfWeek: 1, startTime: "14:00", endTime: "22:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 2, startTime: "14:00", endTime: "22:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 3, startTime: "14:00", endTime: "22:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 4, startTime: "14:00", endTime: "22:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 5, startTime: "18:00", endTime: "02:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 6, startTime: "18:00", endTime: "02:00", timezone: "America/New_York", isRecurring: true }
        ],
        desiredHours: { min: 25, max: 40, preferred: 32 },
        isActive: true
      },
      {
        name: "Carlos Mendez",
        email: "carlos.m@coastaleats.com",
        password: "Staff123!",
        role: "staff",
        employeeId: "STF006",
        phoneNumber: "+1-305-555-1008",
        skills: ['line_cook'],
        locations: [locations[2]._id, locations[3]._id],
        certifications: [
          { location: locations[2]._id, certifiedAt: new Date(), isActive: true },
          { location: locations[3]._id, certifiedAt: new Date(), isActive: true }
        ],
        availability: [
          { dayOfWeek: 1, startTime: "06:00", endTime: "14:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 2, startTime: "06:00", endTime: "14:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 3, startTime: "06:00", endTime: "14:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 4, startTime: "06:00", endTime: "14:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 5, startTime: "06:00", endTime: "14:00", timezone: "America/New_York", isRecurring: true }
        ],
        desiredHours: { min: 35, max: 45, preferred: 40 },
        isActive: true
      },
      {
        name: "Jenny Lee",
        email: "jenny.l@coastaleats.com",
        password: "Staff123!",
        role: "staff",
        employeeId: "STF007",
        phoneNumber: "+1-305-555-1009",
        skills: ['server', 'busser'],
        locations: [locations[2]._id],
        certifications: [
          { location: locations[2]._id, certifiedAt: new Date(), isActive: true }
        ],
        availability: [
          { dayOfWeek: 1, startTime: "16:00", endTime: "23:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 2, startTime: "16:00", endTime: "23:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 3, startTime: "16:00", endTime: "23:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 4, startTime: "16:00", endTime: "23:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 5, startTime: "17:00", endTime: "01:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 6, startTime: "17:00", endTime: "01:00", timezone: "America/New_York", isRecurring: true }
        ],
        desiredHours: { min: 20, max: 30, preferred: 25 },
        isActive: true
      },

      // Orlando Staff
      {
        name: "Tom Wilson",
        email: "tom.w@coastaleats.com",
        password: "Staff123!",
        role: "staff",
        employeeId: "STF008",
        phoneNumber: "+1-407-555-1010",
        skills: ['server', 'host'],
        locations: [locations[3]._id],
        certifications: [
          { location: locations[3]._id, certifiedAt: new Date(), isActive: true }
        ],
        availability: [
          { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", timezone: "America/New_York", isRecurring: true }
        ],
        desiredHours: { min: 30, max: 40, preferred: 35 },
        isActive: true
      },
      {
        name: "Patricia Brown",
        email: "patricia.b@coastaleats.com",
        password: "Staff123!",
        role: "staff",
        employeeId: "STF009",
        phoneNumber: "+1-407-555-1011",
        skills: ['line_cook', 'dishwasher'],
        locations: [locations[3]._id],
        certifications: [
          { location: locations[3]._id, certifiedAt: new Date(), isActive: true }
        ],
        availability: [
          { dayOfWeek: 1, startTime: "14:00", endTime: "22:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 2, startTime: "14:00", endTime: "22:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 3, startTime: "14:00", endTime: "22:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 4, startTime: "14:00", endTime: "22:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 5, startTime: "14:00", endTime: "22:00", timezone: "America/New_York", isRecurring: true },
          { dayOfWeek: 6, startTime: "10:00", endTime: "18:00", timezone: "America/New_York", isRecurring: true }
        ],
        desiredHours: { min: 25, max: 35, preferred: 30 },
        isActive: true
      }
    ]);

    console.log(`✅ Created ${staffMembers.length + 3} users (1 admin, 2 managers, ${staffMembers.length} staff)`);

    // ========== CREATE SHIFTS ==========
    console.log('\n⏰ Creating shifts with edge cases...');

    const shifts = [];
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    
    // Helper to create shift times
    const createShiftTime = (daysFromNow, hour, minute, timezone) => {
      return moment.tz(today, timezone)
        .add(daysFromNow, 'days')
        .hour(hour)
        .minute(minute)
        .second(0)
        .toDate();
    };

    // Helper to check if shift is premium (Friday/Saturday evenings)
    const isPremiumShift = (date, timezone) => {
      const m = moment.tz(date, timezone);
      const day = m.day(); // 5 = Friday, 6 = Saturday
      const hour = m.hour();
      return (day === 5 || day === 6) && hour >= 18;
    };

    // Seattle Shifts (Edge Cases)
    const seattleStaff = staffMembers.filter(s => 
      s.locations.some(l => l.toString() === locations[0]._id.toString())
    );

    // 1. Overnight shift (10pm - 2am)
    shifts.push({
      location: locations[0]._id,
      date: createShiftTime(2, 0, 0, "America/Los_Angeles"),
      startTime: createShiftTime(2, 22, 0, "America/Los_Angeles"),
      endTime: createShiftTime(3, 2, 0, "America/Los_Angeles"),
      requiredSkill: 'bartender',
      requiredCount: 2,
      assignedStaff: [seattleStaff[0]._id], // Only 1 assigned (needs 1 more)
      status: 'published',
      isPremiumShift: true,
      createdBy: mgrSeattle._id,
      history: [{
        action: 'created',
        performedBy: mgrSeattle._id,
        timestamp: new Date()
      }]
    });

    // 2. Shift that causes overtime warning (staff already at 35 hours)
    shifts.push({
      location: locations[0]._id,
      date: createShiftTime(3, 0, 0, "America/Los_Angeles"),
      startTime: createShiftTime(3, 9, 0, "America/Los_Angeles"),
      endTime: createShiftTime(3, 17, 0, "America/Los_Angeles"),
      requiredSkill: 'server',
      requiredCount: 3,
      assignedStaff: [seattleStaff[1]._id, seattleStaff[2]._id],
      status: 'draft',
      isPremiumShift: false,
      createdBy: mgrSeattle._id,
      complianceWarnings: [{
        type: 'overtime_weekly',
        severity: 'warning',
        message: 'Staff member approaching 40 hours',
        createdAt: new Date()
      }],
      overtimeImpact: {
        causesOvertime: false,
        projectedWeeklyHours: 38,
        affectedStaff: [{
          staff: seattleStaff[1]._id,
          weeklyHours: 38,
          exceedsWeekly: false
        }]
      }
    });

    // 3. Shift with skill mismatch (staff lacks required skill)
    shifts.push({
      location: locations[0]._id,
      date: createShiftTime(4, 0, 0, "America/Los_Angeles"),
      startTime: createShiftTime(4, 18, 0, "America/Los_Angeles"),
      endTime: createShiftTime(4, 23, 0, "America/Los_Angeles"),
      requiredSkill: 'line_cook',
      requiredCount: 2,
      assignedStaff: [seattleStaff[0]._id], // Alex is bartender, not line cook (mismatch)
      status: 'published',
      isPremiumShift: false,
      createdBy: mgrSeattle._id,
      complianceWarnings: [{
        type: 'skill_mismatch',
        severity: 'critical',
        message: 'Staff lacks required skill: line_cook',
        createdAt: new Date()
      }]
    });

    // 4. Shift with double-booking conflict
    shifts.push({
      location: locations[0]._id,
      date: createShiftTime(2, 0, 0, "America/Los_Angeles"),
      startTime: createShiftTime(2, 14, 0, "America/Los_Angeles"),
      endTime: createShiftTime(2, 22, 0, "America/Los_Angeles"),
      requiredSkill: 'server',
      requiredCount: 2,
      assignedStaff: [seattleStaff[1]._id], // Sam is already working overnight shift? (conflict)
      status: 'draft',
      isPremiumShift: false,
      createdBy: mgrSeattle._id
    });

    // 5. Unfilled shift (needs coverage)
    shifts.push({
      location: locations[0]._id,
      date: createShiftTime(5, 0, 0, "America/Los_Angeles"),
      startTime: createShiftTime(5, 11, 0, "America/Los_Angeles"),
      endTime: createShiftTime(5, 19, 0, "America/Los_Angeles"),
      requiredSkill: 'host',
      requiredCount: 1,
      assignedStaff: [], // Unfilled
      status: 'published',
      isPremiumShift: false,
      createdBy: mgrSeattle._id
    });

    // Miami Shifts (Edge Cases)
    const miamiStaff = staffMembers.filter(s => 
      s.locations.some(l => l.toString() === locations[2]._id.toString())
    );

    // 6. Saturday night premium shift (fully staffed)
    shifts.push({
      location: locations[2]._id,
      date: createShiftTime(6, 0, 0, "America/New_York"),
      startTime: createShiftTime(6, 18, 0, "America/New_York"),
      endTime: createShiftTime(7, 2, 0, "America/New_York"), // Overnight into Sunday
      requiredSkill: 'bartender',
      requiredCount: 3,
      assignedStaff: [miamiStaff[0]._id, miamiStaff[1]._id, miamiStaff[2]._id],
      status: 'published',
      isPremiumShift: true,
      createdBy: mgrMiami._id,
      history: [{
        action: 'created',
        performedBy: mgrMiami._id,
        timestamp: new Date()
      }]
    });

    // 7. Shift with 10-hour gap violation (ends at 11pm, next starts at 8am next day - only 9 hours gap)
    const gapViolationShift = {
      location: locations[2]._id,
      date: createShiftTime(3, 0, 0, "America/New_York"),
      startTime: createShiftTime(3, 23, 0, "America/New_York"),
      endTime: createShiftTime(4, 7, 0, "America/New_York"),
      requiredSkill: 'server',
      requiredCount: 2,
      assignedStaff: [miamiStaff[2]._id], // Jenny works this
      status: 'draft',
      isPremiumShift: false,
      createdBy: mgrMiami._id
    };
    
    // Add previous shift for Jenny to cause gap violation
    shifts.push({
      location: locations[2]._id,
      date: createShiftTime(3, 0, 0, "America/New_York"),
      startTime: createShiftTime(3, 14, 0, "America/New_York"),
      endTime: createShiftTime(3, 22, 0, "America/New_York"),
      requiredSkill: 'server',
      requiredCount: 2,
      assignedStaff: [miamiStaff[2]._id],
      status: 'published',
      isPremiumShift: false,
      createdBy: mgrMiami._id
    });
    
    shifts.push(gapViolationShift);

    // 8. Shift with bi-coastal staff (Alex certified in both Seattle and Miami)
    shifts.push({
      location: locations[2]._id,
      date: createShiftTime(4, 0, 0, "America/New_York"),
      startTime: createShiftTime(4, 10, 0, "America/New_York"),
      endTime: createShiftTime(4, 18, 0, "America/New_York"),
      requiredSkill: 'bartender',
      requiredCount: 2,
      assignedStaff: [staffMembers[0]._id, miamiStaff[0]._id], // Alex (from Seattle) and Sofia
      status: 'published',
      isPremiumShift: false,
      createdBy: mgrMiami._id
    });

    // 9. Shift with decertified staff (simulate decertification later)
    shifts.push({
      location: locations[2]._id,
      date: createShiftTime(7, 0, 0, "America/New_York"),
      startTime: createShiftTime(7, 16, 0, "America/New_York"),
      endTime: createShiftTime(7, 23, 0, "America/New_York"),
      requiredSkill: 'line_cook',
      requiredCount: 2,
      assignedStaff: [miamiStaff[1]._id], // Carlos (will be decertified later)
      status: 'draft',
      isPremiumShift: false,
      createdBy: mgrMiami._id
    });

    // 10. Emergency callout scenario (shift starting in 2 hours, unfilled)
    const emergencyTime = new Date();
    emergencyTime.setHours(emergencyTime.getHours() + 2);
    
    shifts.push({
      location: locations[2]._id,
      date: emergencyTime,
      startTime: emergencyTime,
      endTime: new Date(emergencyTime.getTime() + 5 * 60 * 60 * 1000),
      requiredSkill: 'server',
      requiredCount: 1,
      assignedStaff: [], // Unfilled emergency
      status: 'published',
      isPremiumShift: false,
      createdBy: mgrMiami._id
    });

    // Orlando Shifts
    const orlandoStaff = staffMembers.filter(s => 
      s.locations.some(l => l.toString() === locations[3]._id.toString())
    );

    // 11. Shift with availability exception (staff marked unavailable)
    shifts.push({
      location: locations[3]._id,
      date: createShiftTime(5, 0, 0, "America/New_York"),
      startTime: createShiftTime(5, 9, 0, "America/New_York"),
      endTime: createShiftTime(5, 17, 0, "America/New_York"),
      requiredSkill: 'server',
      requiredCount: 2,
      assignedStaff: [orlandoStaff[0]._id], // Tom works, but needs another
      status: 'draft',
      isPremiumShift: false,
      createdBy: mgrMiami._id // Miami manager also oversees Orlando
    });

    // 12. Shift with 6th consecutive day (warning)
    for (let i = 1; i <= 6; i++) {
      shifts.push({
        location: locations[3]._id,
        date: createShiftTime(i, 0, 0, "America/New_York"),
        startTime: createShiftTime(i, 8, 0, "America/New_York"),
        endTime: createShiftTime(i, 16, 0, "America/New_York"),
        requiredSkill: 'line_cook',
        requiredCount: 1,
        assignedStaff: [orlandoStaff[1]._id], // Patricia works 6 days straight
        status: 'published',
        isPremiumShift: false,
        createdBy: mgrMiami._id
      });
    }

    const createdShifts = await Shift.insertMany(shifts);
    console.log(`✅ Created ${createdShifts.length} shifts with edge cases`);

    // ========== CREATE SWAP REQUESTS ==========
    console.log('\n🔄 Creating swap requests...');

    // Find a shift to create swap request for
    const swapTargetShift = createdShifts.find(s => 
      s.assignedStaff.length > 0 && 
      s.location.toString() === locations[0]._id.toString()
    );

    if (swapTargetShift) {
      const requestingStaff = seattleStaff[1]; // Sam
      const targetStaff = seattleStaff[2]; // Maria

      // Create swap request directly in the shift
      swapTargetShift.swapRequests.push({
        requestingStaff: requestingStaff._id,
        targetStaff: targetStaff._id,
        type: 'swap',
        status: 'pending',
        requestedAt: new Date(),
        expiresAt: moment().add(2, 'days').toDate(),
        notes: "Need to swap due to family commitment",
        history: [{
          action: 'created',
          timestamp: new Date(),
          performedBy: requestingStaff._id
        }]
      });

      swapTargetShift.hasPendingSwap = true;
      await swapTargetShift.save();

      // Update pending requests count for staff
      requestingStaff.pendingRequests.count = 1;
      requestingStaff.pendingRequests.requestIds = [swapTargetShift.swapRequests[0]._id];
      await requestingStaff.save();

      console.log('✅ Created pending swap request');
    }

    // ========== CREATE SCHEDULES ==========
    console.log('\n📅 Creating weekly schedules...');

    // Calculate week start dates
    const currentWeekStart = moment().startOf('week').toDate();
    const nextWeekStart = moment().add(1, 'week').startOf('week').toDate();

    // Group shifts by location and week
    const shiftsByLocationAndWeek = {};

    createdShifts.forEach(shift => {
      const shiftDate = new Date(shift.startTime);
      const weekStart = moment(shiftDate).startOf('week').toDate();
      const locId = shift.location.toString();

      const key = `${locId}_${weekStart.getTime()}`;
      if (!shiftsByLocationAndWeek[key]) {
        shiftsByLocationAndWeek[key] = {
          location: shift.location,
          weekStart,
          shifts: []
        };
      }
      shiftsByLocationAndWeek[key].shifts.push(shift._id);
    });

    // Create schedule for each group
    const schedules = [];
    for (const key in shiftsByLocationAndWeek) {
      const group = shiftsByLocationAndWeek[key];
      
      const schedule = new Schedule({
        weekStartDate: group.weekStart,
        locations: [group.location],
        shifts: group.shifts,
        status: group.weekStart.getTime() === currentWeekStart.getTime() ? 'published' : 'draft',
        createdBy: locations.find(l => l._id.toString() === group.location.toString())?.timezone === "America/Los_Angeles" 
          ? mgrSeattle._id 
          : mgrMiami._id,
        cutoffOverrides: {
          editCutoff: 48,
          swapDeadline: 24,
          publishDeadline: 72
        }
      });

      // Calculate stats
      await schedule.calculateStats();
      await schedule.checkCompliance();
      await schedule.calculateFairnessMetrics();

      // If published, set publishing info
      if (schedule.status === 'published') {
        schedule.publishedAt = new Date();
        schedule.publishedBy = locations.find(l => l._id.toString() === group.location.toString())?.timezone === "America/Los_Angeles" 
          ? mgrSeattle._id 
          : mgrMiami._id;
        schedule.version = 1;
        schedule.versionHistory.push({
          version: 1,
          publishedAt: new Date(),
          publishedBy: schedule.publishedBy,
          shifts: group.shifts,
          summary: schedule.stats
        });
      }

      await schedule.save();
      schedules.push(schedule);
    }

    console.log(`✅ Created ${schedules.length} weekly schedules`);

    // ========== CREATE NOTIFICATIONS ==========
    console.log('\n🔔 Creating sample notifications...');

    const notifications = [];

    // Notification for new shift assignment
    notifications.push({
      recipient: seattleStaff[0]._id, // Alex
      sender: mgrSeattle._id,
      type: 'shift_assigned',
      priority: 'high',
      title: 'New Shift Assigned',
      message: 'You have been assigned to a bartender shift on Friday night at Downtown Seattle',
      shortMessage: 'New shift: Downtown Seattle - Friday 10pm',
      relatedTo: {
        model: 'Shift',
        id: createdShifts[0]._id,
        summary: 'Bartender shift at Downtown Seattle'
      },
      actions: [{
        type: 'view_shift',
        label: 'View Shift',
        data: { shiftId: createdShifts[0]._id }
      }],
      channels: ['in_app', 'email'],
      status: 'delivered',
      createdAt: new Date()
    });

    // Overtime warning notification
    notifications.push({
      recipient: seattleStaff[1]._id, // Sam
      type: 'overtime_warning',
      priority: 'urgent',
      title: 'Overtime Warning',
      message: 'You are approaching 40 hours this week (currently at 38 hours)',
      shortMessage: 'Overtime warning: 38 hours scheduled',
      relatedTo: {
        model: 'Schedule',
        summary: `Week of ${currentWeekStart.toLocaleDateString()}`
      },
      data: {
        weekStartDate: currentWeekStart,
        scheduledHours: 38
      },
      actions: [{
        type: 'view_schedule',
        label: 'View Schedule',
        data: { weekStart: currentWeekStart }
      }],
      channels: ['in_app', 'email'],
      status: 'delivered',
      createdAt: new Date()
    });

    // Swap request notification
    if (swapTargetShift) {
      notifications.push({
        recipient: seattleStaff[2]._id, // Maria
        sender: seattleStaff[1]._id, // Sam
        type: 'swap_received',
        priority: 'high',
        title: 'Shift Swap Request',
        message: 'Sam Carter has requested to swap shifts with you on Friday at Downtown Seattle',
        shortMessage: 'Swap request: Downtown Seattle - Friday',
        relatedTo: {
          model: 'SwapRequest',
          id: swapTargetShift.swapRequests[0]._id,
          summary: 'Swap request for shift at Downtown Seattle'
        },
        data: {
          swapRequestId: swapTargetShift.swapRequests[0]._id,
          shiftId: swapTargetShift._id
        },
        actions: [
          {
            type: 'approve_swap',
            label: 'Approve Swap',
            data: { swapRequestId: swapTargetShift.swapRequests[0]._id }
          },
          {
            type: 'reject_swap',
            label: 'Reject',
            data: { swapRequestId: swapTargetShift.swapRequests[0]._id }
          }
        ],
        channels: ['in_app', 'email'],
        status: 'delivered',
        createdAt: new Date()
      });
    }

    // Schedule published notification
    notifications.push({
      recipient: seattleStaff[0]._id, // Alex
      sender: mgrSeattle._id,
      type: 'schedule_published',
      priority: 'high',
      title: 'Schedule Published',
      message: `The schedule for week of ${currentWeekStart.toLocaleDateString()} at Downtown Seattle has been published`,
      shortMessage: 'Schedule published',
      relatedTo: {
        model: 'Schedule',
        id: schedules[0]._id,
        summary: `Schedule for week of ${currentWeekStart.toLocaleDateString()}`
      },
      data: {
        scheduleId: schedules[0]._id,
        weekStartDate: currentWeekStart
      },
      actions: [{
        type: 'view_schedule',
        label: 'View Schedule',
        data: { scheduleId: schedules[0]._id }
      }],
      channels: ['in_app', 'email'],
      status: 'delivered',
      createdAt: new Date()
    });

    await Notification.insertMany(notifications);
    console.log(`✅ Created ${notifications.length} sample notifications`);

    // ========== UPDATE STAFF WITH DECERTIFICATION ==========
    console.log('\n📝 Adding historical decertification...');

    // Decertify Carlos from Orlando location (for historical data)
    const carlos = staffMembers.find(s => s.email === "carlos.m@coastaleats.com");
    const orlando = locations.find(l => l.code === "ORL");

    if (carlos && orlando) {
      await carlos.decertifyFromLocation(
        orlando._id,
        "Performance issues",
        mgrMiami._id
      );
      console.log('✅ Decertified Carlos Mendez from Orlando location (historical data)');
    }

    // ========== SUMMARY ==========
    console.log('\n📊 ===== SEED DATA SUMMARY =====');
    console.log(`📍 Locations: ${locations.length}`);
    console.log(`👥 Users: ${await User.countDocuments()} total`);
    console.log(`   - Admin: 1`);
    console.log(`   - Managers: 2`);
    console.log(`   - Staff: ${staffMembers.length}`);
    console.log(`⏰ Shifts: ${await Shift.countDocuments()} total`);
    console.log(`   - With pending swaps: ${await Shift.countDocuments({ hasPendingSwap: true })}`);
    console.log(`   - With compliance warnings: ${await Shift.countDocuments({ 'complianceWarnings.0': { $exists: true } })}`);
    console.log(`📅 Schedules: ${await Schedule.countDocuments()} total`);
    console.log(`   - Published: ${await Schedule.countDocuments({ status: 'published' })}`);
    console.log(`   - Draft: ${await Schedule.countDocuments({ status: 'draft' })}`);
    console.log(`🔔 Notifications: ${await Notification.countDocuments()} total`);

    console.log('\n🔑 ===== TEST LOGIN CREDENTIALS =====');
    console.log('Admin: admin@coastaleats.com / Admin123!');
    console.log('Manager (Seattle): manager.seattle@coastaleats.com / Manager123!');
    console.log('Manager (Miami): manager.miami@coastaleats.com / Manager123!');
    console.log('Staff (Bi-coastal): alex.j@coastaleats.com / Staff123!');
    console.log('Staff (Seattle): sam.c@coastaleats.com / Staff123!');
    console.log('Staff (Miami): sofia.r@coastaleats.com / Staff123!');

    console.log('\n✅ Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    // Disconnect from database
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from database');
    process.exit(0);
  }
};

// Run seed function
seedDatabase();