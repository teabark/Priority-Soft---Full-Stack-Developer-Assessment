import React, { useEffect, useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Avatar,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  WarningAmber as WarningAmberIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useOvertime } from '../../context/OvertimeContext';
import axios from 'axios';

const OvertimeDashboard = () => {
  const { dashboardData, loading, loadDashboard } = useOvertime();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weeklyStaffHours, setWeeklyStaffHours] = useState([]);
  const [loadingWeek, setLoadingWeek] = useState(false);

  // Get week range
  const getWeekRange = (date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return {
      start: start,
      end: end,
      formatted: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
    };
  };

  const weekRange = getWeekRange(selectedDate);

  // Fetch weekly data
  useEffect(() => {
    fetchWeeklyStaffHours();
  }, [selectedDate]);

  const fetchWeeklyStaffHours = async () => {
    setLoadingWeek(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch all shifts
      const shiftsRes = await axios.get(
        `${process.env.REACT_APP_API_URL}/shifts/simple-list`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const allShifts = shiftsRes.data.data || [];
      
      // Filter shifts for selected week and published status
      const weekShifts = allShifts.filter(shift => {
        const shiftDate = new Date(shift.startTime);
        return shiftDate >= weekRange.start && 
               shiftDate <= weekRange.end && 
               shift.status === 'published';
      });

      // Calculate hours per staff
      const staffHoursMap = {};
      
      weekShifts.forEach(shift => {
        shift.assignedStaff?.forEach(staff => {
          const staffId = staff._id || staff;
          const staffName = staff.name || 'Unknown';
          const hours = (shift.duration || 480) / 60; // Convert minutes to hours
          
          if (!staffHoursMap[staffId]) {
            staffHoursMap[staffId] = {
              id: staffId,
              name: staffName,
              totalHours: 0,
              shifts: []
            };
          }
          
          staffHoursMap[staffId].totalHours += hours;
          staffHoursMap[staffId].shifts.push({
            date: shift.startTime,
            hours: hours,
            location: shift.location?.name || 'Unknown',
            skill: shift.requiredSkill
          });
        });
      });

      // Convert to array and sort by total hours (highest first)
      const staffHoursArray = Object.values(staffHoursMap).sort(
        (a, b) => b.totalHours - a.totalHours
      );
      
      setWeeklyStaffHours(staffHoursArray);
      
    } catch (error) {
      console.error('Error fetching weekly staff hours:', error);
    } finally {
      setLoadingWeek(false);
    }
  };

  const prevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const getOvertimeStatus = (hours) => {
    if (hours > 40) return { color: '#f44336', label: 'Critical', icon: <ErrorIcon /> };
    if (hours > 35) return { color: '#ff9800', label: 'Warning', icon: <WarningAmberIcon /> };
    if (hours > 30) return { color: '#2196f3', label: 'Normal', icon: <InfoIcon /> };
    return { color: '#4caf50', label: 'Good', icon: <TrendingDownIcon /> };
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Week Navigation */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 3, 
          background: 'linear-gradient(135deg, #1976d2 0%, #64b5f6 100%)',
          color: 'white',
          borderRadius: 2
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4" gutterBottom fontWeight="300">
              Overtime & Compliance
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Monitor staff hours and overtime costs
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={prevWeek} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}>
              <ChevronLeftIcon />
            </IconButton>
            <Box textAlign="center">
              <Typography variant="h6">{weekRange.formatted}</Typography>
            </Box>
            <IconButton onClick={nextWeek} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}>
              <ChevronRightIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {loadingWeek ? (
        <Box sx={{ width: '100%', mt: 2 }}>
          <LinearProgress />
        </Box>
      ) : (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: '#e3f2fd', width: 56, height: 56 }}>
                      <TrendingUpIcon color="primary" />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        ${weeklyStaffHours
                          .filter(s => s.totalHours > 40)
                          .reduce((sum, s) => sum + ((s.totalHours - 40) * 1.5 * 20), 0)
                          .toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Projected Overtime Cost
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: '#fff3e0', width: 56, height: 56 }}>
                      <WarningAmberIcon color="warning" />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {weeklyStaffHours.filter(s => s.totalHours > 35 && s.totalHours <= 40).length}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Staff at Risk (35-40h)
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: '#ffebee', width: 56, height: 56 }}>
                      <ErrorIcon color="error" />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {weeklyStaffHours.filter(s => s.totalHours > 40).length}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Critical Violations (40h+)
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Staff Hours Table */}
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" fontWeight="bold">
                Staff Weekly Hours
              </Typography>
              <Chip
                icon={<InfoIcon />}
                label="Hours shown for published shifts only"
                variant="outlined"
                size="small"
              />
            </Box>

            {weeklyStaffHours.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell>Staff Member</TableCell>
                      <TableCell align="center">Total Hours</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center">Overtime Risk</TableCell>
                      <TableCell>Shift Breakdown</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {weeklyStaffHours.map((staff) => {
                      const status = getOvertimeStatus(staff.totalHours);
                      return (
                        <TableRow key={staff.id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Avatar sx={{ bgcolor: status.color, width: 32, height: 32 }}>
                                <PersonIcon fontSize="small" />
                              </Avatar>
                              <Typography fontWeight="medium">{staff.name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                fontWeight: 'bold',
                                color: status.color
                              }}
                            >
                              {staff.totalHours.toFixed(1)}h
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              icon={status.icon}
                              label={status.label}
                              size="small"
                              sx={{ 
                                bgcolor: status.color,
                                color: 'white',
                                fontWeight: 'bold'
                              }}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ minWidth: 150 }}>
                            <Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={Math.min(100, (staff.totalHours / 40) * 100)}
                                sx={{ 
                                  height: 8, 
                                  borderRadius: 4,
                                  bgcolor: '#e0e0e0',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: staff.totalHours > 40 ? '#f44336' : 
                                            staff.totalHours > 35 ? '#ff9800' : '#4caf50'
                                  }
                                }}
                              />
                              <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                                {Math.min(100, Math.round((staff.totalHours / 40) * 100))}% of 40h
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={0.5} flexWrap="wrap">
                              {staff.shifts.slice(0, 4).map((shift, idx) => (
                                <Tooltip key={idx} title={`${new Date(shift.date).toLocaleDateString()} - ${shift.location} (${shift.skill})`}>
                                  <Chip
                                    label={`${shift.hours.toFixed(1)}h`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem' }}
                                  />
                                </Tooltip>
                              ))}
                              {staff.shifts.length > 4 && (
                                <Tooltip title={`${staff.shifts.length - 4} more shifts`}>
                                  <Chip
                                    label={`+${staff.shifts.length - 4}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">
                No published shifts found for this week.
              </Alert>
            )}
          </Paper>

          {/* Overtime Cost Breakdown */}
          {weeklyStaffHours.filter(s => s.totalHours > 35).length > 0 && (
            <Paper sx={{ p: 3, mt: 3, borderRadius: 2, boxShadow: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Overtime Cost Breakdown
              </Typography>
              <Grid container spacing={2}>
                {weeklyStaffHours
                  .filter(s => s.totalHours > 35)
                  .map((staff) => {
                    const overtimeHours = Math.max(0, staff.totalHours - 40);
                    const overtimeCost = overtimeHours * 1.5 * 20;
                    
                    return (
                      <Grid item xs={12} md={6} key={staff.id}>
                        <Card variant="outlined" sx={{ p: 2, bgcolor: staff.totalHours > 40 ? '#ffebee' : '#fff3e0' }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {staff.name}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {staff.totalHours.toFixed(1)} total hours
                              </Typography>
                            </Box>
                            <Chip
                              label={`$${overtimeCost.toFixed(2)}`}
                              color={staff.totalHours > 40 ? 'error' : 'warning'}
                              sx={{ fontWeight: 'bold' }}
                            />
                          </Box>
                          {overtimeHours > 0 && (
                            <>
                              <LinearProgress 
                                variant="determinate" 
                                value={Math.min(100, (overtimeHours / 10) * 100)}
                                sx={{ mt: 1, height: 4, borderRadius: 2 }}
                                color={staff.totalHours > 40 ? 'error' : 'warning'}
                              />
                              <Typography variant="caption" color="textSecondary">
                                {overtimeHours.toFixed(1)} overtime hours
                              </Typography>
                            </>
                          )}
                        </Card>
                      </Grid>
                    );
                  })}
              </Grid>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

export default OvertimeDashboard;