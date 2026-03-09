import React, { useEffect, useState } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button 
} from '@mui/material';
import {
  Event as EventIcon,
  People as PeopleIcon,
  LocationOn as LocationIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Layout from '../components/layout/Layout';
import axios from 'axios';

const Dashboard = () => {
  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const [stats, setStats] = useState({
    shifts: 0,
    locations: 0,
    staff: 0,
    pendingSwaps: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [shiftsRes, locationsRes, usersRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/shifts`),
        axios.get(`${process.env.REACT_APP_API_URL}/locations`),
        axios.get(`${process.env.REACT_APP_API_URL}/users`)
      ]);

      setStats({
        shifts: shiftsRes.data.count,
        locations: locationsRes.data.count,
        staff: usersRes.data.count,
        pendingSwaps: 3 // This would come from a real endpoint
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const StatCard = ({ title, value, icon, color }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="h2">
              {value}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.name}!
        </Typography>
        <Typography variant="body1" color="textSecondary">
          {user?.role === 'admin' && 'You have full system access'}
          {user?.role === 'manager' && 'Manage your locations and staff schedules'}
          {user?.role === 'staff' && 'View your shifts and manage swap requests'}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Shifts"
            value={stats.shifts}
            icon={<EventIcon />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Locations"
            value={stats.locations}
            icon={<LocationIcon />}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Staff Members"
            value={stats.staff}
            icon={<PeopleIcon />}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Swaps"
            value={stats.pendingSwaps}
            icon={<WarningIcon />}
            color="#d32f2f"
          />
        </Grid>

        {/* Online Users */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Online Staff
            </Typography>
            {onlineUsers.length > 0 ? (
              <Box display="flex" flexWrap="wrap" gap={1}>
                {onlineUsers.map((u) => (
                  <Chip
                    key={u.id}
                    label={u.name}
                    avatar={<Avatar>{u.name[0]}</Avatar>}
                    color="success"
                    variant="outlined"
                  />
                ))}
              </Box>
            ) : (
              <Typography color="textSecondary">No staff online</Typography>
            )}
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Button variant="outlined" fullWidth>
                  View Schedule
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button variant="outlined" fullWidth>
                  Request Swap
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button variant="outlined" fullWidth>
                  View Shifts
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button variant="outlined" fullWidth>
                  Contact Manager
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Layout>
  );
};

export default Dashboard;