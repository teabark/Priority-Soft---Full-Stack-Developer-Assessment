📋 ShiftSync - Multi-Location Staff Scheduling
https://via.placeholder.com/800x200/1976d2/ffffff?text=ShiftSync

🚀 Live Demo
Frontend: https://shiftsync.vercel.app

Backend API: https://shiftsync-backend.onrender.com

API Health Check: https://shiftsync-backend.onrender.com/health

📖 Table of Contents
🌟 Overview

✨ Features

🔧 Tech Stack

👥 Demo Accounts

📦 Installation

Backend Setup

Frontend Setup

🚀 Deployment

Backend (Render)

Frontend (Vercel)

Keeping Backend Alive (Free Tier)

📚 API Documentation

🎯 Evaluation Scenarios

📊 Database Schema

⚠️ Known Limitations

👨‍💻 Development

🤝 Contributing

📄 License

🌟 Overview
ShiftSync is a comprehensive shift scheduling platform built for the fictional restaurant group "Coastal Eats", which operates 4 locations across 2 time zones. The platform addresses real-world workforce scheduling challenges:

🚑 Staff callouts with no coverage

💰 Overtime costs spiraling out of control

⚖️ Unfair shift distribution among staff

🏢 Manager location hoarding of good employees

👁️ No central view of who's working where and when

✨ Features
👥 User Management & Roles
Role	Description
Admin	Corporate oversight across all locations
Manager	Runs one or more specific locations
Staff	Works shifts at one or more locations
📅 Shift Scheduling
✅ Create shifts with location, date/time, required skill, and headcount

✅ Assign specific staff to shifts manually

✅ Publish/unpublish weekly schedules (48-hour cutoff)

✅ Constraint enforcement (no double-booking, 10-hour gaps, skills/certifications)

🔄 Shift Swapping & Coverage
🔁 Request swaps with qualified staff

📤 Drop shifts for others to pick up

📥 Pick up available shifts

👔 Manager approval workflow

🔔 Real-time notifications at every step

⏰ Overtime & Compliance (Informational Only)
📊 Weekly hours tracking (warning at 35+, critical at 40+)

📈 Daily hours tracking (warning at 8+, critical at 12+)

📅 Consecutive days monitoring

💰 Projected overtime cost dashboard

⚖️ Schedule Fairness Analytics
📊 Distribution report of hours per staff

⭐ Premium shift tracking (Fri/Sat evenings)

🎯 Fairness score (0-100)

📉 Under/over-scheduled staff identification

🔔 Real-Time Features
⚡ Live updates when schedules change

🔔 In-app notifications with read/unread status

👥 Online staff indicator

🗺️ Multi-Location & Timezone Support
🌍 Locations in multiple timezones

🕐 Shifts displayed in location's local time

🌙 Overnight shift handling

🔧 Tech Stack
Frontend 🎨
React 18

Material-UI (MUI) v5

Socket.IO Client

Axios

React Router v6

Date-fns

React-Toastify

Backend ⚙️
Node.js

Express

MongoDB with Mongoose

Socket.IO

JWT Authentication

Bcrypt

Express-validator

DevOps 🚢
Frontend Hosting: Vercel

Backend Hosting: Render

Database: MongoDB Atlas

Version Control: Git/GitHub

👥 Demo Accounts
Use these credentials to test different user roles:

👑 Admin (Full System Access)
text
📧 Email: admin@coastaleats.com
🔑 Password: Admin123!
👤 Name: Alex Rivera
📍 Locations: All
👔 Managers (Location-Specific Access)
Name	Email	Password	Locations
Sarah Chen	manager.seattle@coastaleats.com	Manager123!	Seattle Downtown, Seattle North
Mike Johnson	manager.bellevue@coastaleats.com	Manager123!	Bellevue
🧑‍🍳 Staff (Individual Shift Views)
Name	Email	Password	Locations
Alex Johnson	alex.j@coastaleats.com	Staff123!	Seattle Downtown, Miami Beach
Sam Carter	sam.c@coastaleats.com	Staff123!	Seattle Downtown, Bellevue
Maria Gonzalez	maria.g@coastaleats.com	Staff123!	All Locations
📦 Installation
Prerequisites
Node.js v16+

MongoDB (local or Atlas)

Git

Backend Setup
bash
# Clone the repository
git clone https://github.com/yourusername/shiftsync-backend.git
cd shiftsync-backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
.env configuration:

env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/shiftsync

# JWT
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRE=7d

# Bcrypt
BCRYPT_ROUNDS=10
bash
# Start development server
npm run dev

# Server runs at http://localhost:5000
# Health check: http://localhost:5000/health
Frontend Setup
bash
# Clone the repository
git clone https://github.com/yourusername/shiftsync-frontend.git
cd shiftsync-frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
.env configuration:

env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
bash
# Start development server
npm start

# Frontend runs at http://localhost:3000
🚀 Deployment
Backend (Render)
Push your code to GitHub

Create a Render account at render.com

Create a new Web Service

Connect your GitHub repository

Select the backend branch

Name: shiftsync-backend

Environment: Node

Build Command: npm install

Start Command: npm start

Add Environment Variables

text
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/shiftsync
JWT_SECRET=your_secure_random_string
JWT_EXPIRE=7d
BCRYPT_ROUNDS=10
NODE_ENV=production
Deploy! 🚀

Frontend (Vercel)
Push your frontend code to GitHub

Create a Vercel account at vercel.com

Import your repository

Click "Add New Project"

Import shiftsync-frontend

Configure Environment Variables

text
REACT_APP_API_URL=https://your-backend.onrender.com/api
REACT_APP_SOCKET_URL=https://your-backend.onrender.com
Deploy! 🎉

Keeping Backend Alive (Free Tier)
Render's free tier spins down after 15 minutes of inactivity. To keep it alive:

Add a health endpoint (already included):

javascript
app.get('/health', (req, res) => res.status(200).send('OK'));
Set up a cron job at cron-job.org:

URL: https://your-backend.onrender.com/health

Schedule: Every 10 minutes

Save ✅

Your backend will now stay awake 24/7!

📚 API Documentation
Authentication Endpoints
Method	Endpoint	Description
POST	/api/auth/login	User login
POST	/api/auth/logout	User logout
Shift Endpoints
Method	Endpoint	Description
GET	/api/shifts	Get all shifts
GET	/api/shifts/simple-list	Get formatted shift list
POST	/api/shifts	Create shift (admin/manager)
PUT	/api/shifts/:id	Update shift
DELETE	/api/shifts/:id	Delete shift (draft only)
PUT	/api/shifts/:shiftId/assign	Assign/pickup shift
Swap Request Endpoints
Method	Endpoint	Description
GET	/api/swaps/my-requests	Get user's swap requests
GET	/api/swaps/pending-approvals	Get pending approvals (manager)
GET	/api/swaps/available	Get available shifts
POST	/api/swaps/request	Create swap/drop request
PUT	/api/swaps/:requestId	Approve/reject request
DELETE	/api/swaps/:requestId	Cancel request
User Endpoints
Method	Endpoint	Description
GET	/api/users	Get all users
POST	/api/users	Create user (admin)
PUT	/api/users/:id	Update user
DELETE	/api/users/:id	Delete user (admin)
Location Endpoints
Method	Endpoint	Description
GET	/api/locations	Get all locations
POST	/api/locations	Create location (admin)
PUT	/api/locations/:id	Update location (admin)
DELETE	/api/locations/:id	Delete location (admin)
Notification Endpoints
Method	Endpoint	Description
GET	/api/notifications	Get user notifications
PUT	/api/notifications/:id/read	Mark as read
PUT	/api/notifications/read-all	Mark all as read
🎯 Evaluation Scenarios
1️⃣ The Sunday Night Chaos
"A staff member calls out at 6pm Sunday for a 7pm shift. Walk through the fastest path to finding coverage."

Solution Path:

Staff member goes to Swap Requests → My Shifts

Clicks "Drop Shift" on the 7pm shift

Manager receives notification and approves the drop

Shift appears in "Available Shifts" for all qualified staff

Another staff member picks up the shift instantly

✅ Coverage found in minutes!

2️⃣ The Overtime Trap (Informational Only)
"A manager tries to build a schedule where one employee would hit 52 hours."

How the system helps:

The Overtime Dashboard shows projected weekly hours

Staff members approaching 35+ hours appear in "At Risk" list

Overtime costs are calculated and displayed

⚠️ Note: Overtime warnings are informational only, not hard blocks

3️⃣ The Timezone Tangle
*"A staff member certified in Pacific and Eastern time zones sets availability as '9am-5pm'."*

What happens:

Times are stored in UTC but displayed in the location's timezone

The staff member's availability is interpreted in their local time

A shift in Eastern time at 9am ET = 6am PT, which may be outside availability

System prevents assignment if outside availability windows

4️⃣ The Simultaneous Assignment
"Two managers try to assign the same bartender to different locations at the same time."

What happens:

First manager's assignment succeeds

Second manager sees a real-time conflict notification

The system prevents double-booking automatically

5️⃣ The Fairness Complaint
"An employee claims they never get Saturday night shifts."

How a manager verifies:

Navigate to Fairness Analytics page

View the Premium Shifts column for each staff member

Compare the distribution:

🟢 Green = Above average premium shifts

🟠 Orange = Below average

⚪ Gray = Zero premium shifts

Check the Fairness Score (0-100)

View Under/Over Scheduled alerts

6️⃣ The Regret Swap
"Staff A and B request a swap. Manager hasn't approved yet. Staff A changes their mind."

What happens:

Staff A goes to My Requests tab

Clicks "Cancel Request" on the pending swap

Request is immediately cancelled

Manager never sees it in approvals

✅ All parties notified

📊 Database Schema
User Model
javascript
{
  name: String,
  email: String,
  password: String (hashed),
  role: ['admin', 'manager', 'staff'],
  skills: [String],
  locations: [ObjectId],
  certifications: [CertificationSchema],
  availability: [AvailabilitySchema]
}
Shift Model
javascript
{
  location: ObjectId,
  date: Date,
  startTime: Date,
  endTime: Date,
  duration: Number,
  requiredSkill: String,
  requiredCount: Number,
  assignedStaff: [ObjectId],
  status: ['draft', 'published', 'in_progress', 'completed', 'cancelled'],
  isPremiumShift: Boolean,
  swapRequests: [SwapRequestSchema]
}
Location Model
javascript
{
  name: String,
  code: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  timezone: String,
  managers: [ObjectId]
}
⚠️ Known Limitations
Limitation	Description
Overtime Enforcement	Overtime warnings are informational only; no hard blocks
Timezone DST	Daylight Saving Time transitions not fully tested
Audit Trail	Shift history not fully implemented
Email Notifications	Currently in-app only (email simulation ready but not active)
Concurrent Editing	No lock mechanism for simultaneous edits
👨‍💻 Development
Running Tests
bash
# Backend tests
cd shiftsync-backend
npm test

# Frontend tests
cd shiftsync-frontend
npm test
Seeding Database
bash
# Seed all data
cd shiftsync-backend
npm run seed

# Add specific data
npm run seed:shifts
npm run seed:premium
Code Style
bash
# Backend
cd shiftsync-backend
npm run lint
npm run format

# Frontend
cd shiftsync-frontend
npm run lint
npm run format
🤝 Contributing
Fork the repository

Create your feature branch (git checkout -b feature/amazing-feature)

Commit your changes (git commit -m 'Add some amazing feature')

Push to the branch (git push origin feature/amazing-feature)

Open a Pull Request

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Acknowledgments
MongoDB Atlas for free database hosting

Render for free backend hosting

Vercel for free frontend hosting

Material-UI for beautiful components

All the shift workers who inspired this project

📞 Support
For issues or questions:

📧 Email: support@shiftsync.app

🐛 GitHub Issues: https://github.com/yourusername/shiftsync/issues

🎉 Thank You!
Thank you for checking out ShiftSync! We hope this platform demonstrates a comprehensive solution to real-world workforce scheduling challenges.

Happy scheduling! 📅✨

Built with ❤️ for Coastal Eats Restaurant Gr