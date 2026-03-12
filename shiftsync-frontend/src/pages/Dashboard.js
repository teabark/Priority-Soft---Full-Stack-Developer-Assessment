import React, { useEffect, useState } from "react";
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tab,
  Tabs,
} from "@mui/material";
import {
  Event as EventIcon,
  People as PeopleIcon,
  LocationOn as LocationIcon,
  Warning as WarningIcon,
  SwapHoriz as SwapIcon,
  Timeline as TimelineIcon,
  NotificationsActive as NotificationsActiveIcon,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useNotifications } from "../context/NotificationContext";
import Layout from "../components/layout/Layout";
import axios from "axios";
import OvertimeDashboard from "../components/overtime/OvertimeDashboard";

const Dashboard = () => {
  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState({
    shifts: 0,
    locations: 0,
    staff: 0,
    pendingSwaps: 0,
  });
  const [myShifts, setMyShifts] = useState([]);
  const [myRequests, setMyRequests] = useState([]);

  const isManager = user?.role === "admin" || user?.role === "manager";
  const isStaff = user?.role === "staff";

  useEffect(() => {
    if (isStaff) {
      fetchMyShifts();
      fetchMyRequests();
    } else {
      fetchAllStats();
    }
  }, [isStaff]);

  const testNotification = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${process.env.REACT_APP_API_URL}/notifications/test`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchMyShifts = async () => {
    try {
      console.log(process.env.REACT_APP_API_URL);
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/shifts/simple-list`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // Filter shifts assigned to current user
      const myAssignedShifts =
        res.data.data?.filter((shift) =>
          shift.assignedStaff?.some((s) => s._id === user?.id),
        ) || [];

      setMyShifts(myAssignedShifts.slice(0, 5));
    } catch (error) {
      console.error("Error fetching my shifts:", error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const fetchMyRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/swaps/my-requests`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setMyRequests(res.data.data?.filter((r) => r.status === "pending") || []);
    } catch (error) {
      console.error("Error fetching my requests:", error);
    }
  };

  const fetchAllStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const [shiftsRes, locationsRes, usersRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/shifts/simple-list`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${process.env.REACT_APP_API_URL}/locations`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${process.env.REACT_APP_API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setStats({
        shifts: shiftsRes.data.count || 0,
        locations: locationsRes.data.count || 0,
        staff: usersRes.data.count || 0,
        pendingSwaps: 3,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // STAFF DASHBOARD
  if (isStaff) {
    return (
      <Layout>
        <Box mb={4}>
          <Typography variant="h4" gutterBottom>
            Welcome back, {user?.name}!
          </Typography>
          <Typography variant="body1" color="textSecondary">
            View your upcoming shifts and manage swap requests
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Upcoming Shifts */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                My Upcoming Shifts
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {myShifts.length > 0 ? (
                <List>
                  {myShifts.map((shift) => (
                    <ListItem key={shift._id} divider>
                      <ListItemText
                        primary={`${shift.location?.name} - ${shift.requiredSkill}`}
                        secondary={
                          <>
                            {new Date(shift.startTime).toLocaleDateString()} •{" "}
                            {new Date(shift.startTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            -{" "}
                            {new Date(shift.endTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </>
                        }
                      />
                      <Chip
                        label={shift.status}
                        size="small"
                        color={
                          shift.status === "published" ? "success" : "default"
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="textSecondary">
                  No upcoming shifts
                </Typography>
              )}
              <Box mt={2}>
                <Button variant="outlined" href="/shifts">
                  View All My Shifts
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Pending Requests */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Pending Swap Requests
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {myRequests.length > 0 ? (
                <List>
                  {myRequests.map((req) => (
                    <ListItem key={req._id}>
                      <ListItemText
                        primary={
                          req.type === "swap" ? "Swap Request" : "Drop Request"
                        }
                        secondary={`Status: ${req.status}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="textSecondary">
                  No pending requests
                </Typography>
              )}
              <Box mt={2}>
                <Button variant="outlined" href="/swaps">
                  Manage Swaps
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Available Drops */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Shifts Available for Pickup
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography color="textSecondary">
                Check the Swap Requests page for available shifts
              </Typography>
              <Box mt={2}>
                <Button
                  variant="contained"
                  href="/swaps"
                  startIcon={<SwapIcon />}
                >
                  Go to Swap Requests
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Layout>
    );
  }

  // MANAGER/ADMIN DASHBOARD
  return (
    <Layout>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.name}!
        </Typography>
        <Typography variant="body1" color="textSecondary">
          {user?.role === "admin"
            ? "You have full system access"
            : "Manage your locations and staff schedules"}
        </Typography>
      </Box>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Overview" icon={<EventIcon />} iconPosition="start" />
          <Tab
            label="Overtime & Compliance"
            icon={<TimelineIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Overview Tab */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Stats Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography
                      color="textSecondary"
                      gutterBottom
                      variant="body2"
                    >
                      Total Shifts
                    </Typography>
                    <Typography variant="h4">{stats.shifts}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: "#1976d2", width: 56, height: 56 }}>
                    <EventIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography
                      color="textSecondary"
                      gutterBottom
                      variant="body2"
                    >
                      Locations
                    </Typography>
                    <Typography variant="h4">{stats.locations}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: "#2e7d32", width: 56, height: 56 }}>
                    <LocationIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography
                      color="textSecondary"
                      gutterBottom
                      variant="body2"
                    >
                      Staff Members
                    </Typography>
                    <Typography variant="h4">{stats.staff}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: "#ed6c02", width: 56, height: 56 }}>
                    <PeopleIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography
                      color="textSecondary"
                      gutterBottom
                      variant="body2"
                    >
                      Pending Swaps
                    </Typography>
                    <Typography variant="h4">{stats.pendingSwaps}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: "#d32f2f", width: 56, height: 56 }}>
                    <WarningIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button variant="outlined" fullWidth href="/shifts">
                    Manage Shifts
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button variant="outlined" fullWidth href="/schedule">
                    View Schedule
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button variant="outlined" fullWidth href="/locations">
                    Manage Locations
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button variant="outlined" fullWidth href="/staff">
                    Manage Staff
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button variant="outlined" fullWidth href="/swaps">
                    Pending Approvals
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Overtime Tab */}
      {tabValue === 1 && (
        <Box>
          <OvertimeDashboard />
        </Box>
      )}
    </Layout>
  );
};

export default Dashboard;
