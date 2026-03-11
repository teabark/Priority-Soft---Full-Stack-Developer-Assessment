require('dotenv').config();
const mongoose = require('mongoose');
const Shift = require('../models/Shift');

async function checkPremiums() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    const count = await Shift.countDocuments({ isPremiumShift: true });
    console.log('📊 Total premium shifts:', count);

    const shifts = await Shift.find({ isPremiumShift: true });
    console.log('\n📅 All premium shifts:');
    
    shifts.forEach((s, i) => {
      const date = new Date(s.startTime);
      console.log(`${i+1}. ${date.toLocaleDateString()} at ${date.getHours()}:00 - ${s.requiredSkill}`);
    });

    // Group by week
    const weeks = {};
    shifts.forEach(s => {
      const date = new Date(s.startTime);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toLocaleDateString();
      weeks[weekKey] = (weeks[weekKey] || 0) + 1;
    });

    console.log('\n📊 By week:');
    Object.entries(weeks).forEach(([week, count]) => {
      console.log(`Week of ${week}: ${count} premium shifts`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected');
  }
}

checkPremiums();