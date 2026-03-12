import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar
} from '@mui/material';
import {
  Publish as PublishIcon,
  Unpublished as UnpublishedIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const ScheduleCalendar = () => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [publishDialog, setPublishDialog] = useState(false);
  const [unpublishDialog, setUnpublishDialog] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [cutoffWarning, setCutoffWarning] = useState(false);
  
  // Get user role from token
  const getUserRoleFromToken = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      return payload.role;
    } catch (e) {
      return null;
    }
  };

  const userRole = getUserRoleFromToken();
  const isManager = userRole === 'admin' || userRole === 'manager';

  useEffect(() => {
    fetchLocations();
    fetchStaff();
    fetchShifts();
  }, []);

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/locations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLocations(res.data.data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStaff(res.data.data?.filter(u => u.role === 'staff') || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/shifts/simple-list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShifts(res.data.data || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getWeekStart = () => {
    const date = new Date(selectedDate);
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
  };

  const getShiftsForDay = (date) => {
    const dateStr = date.toDateString();
    let filtered = shifts.filter(shift => {
      const shiftDate = new Date(shift.startTime).toDateString();
      return shiftDate === dateStr;
    });

    // Apply location filter
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(shift => shift.location?._id === selectedLocation);
    }

    // Apply staff filter
    if (selectedStaff !== 'all') {
      filtered = filtered.filter(shift => 
        shift.assignedStaff?.some(s => s._id === selectedStaff)
      );
    }

    return filtered;
  };

  // Check if week can be edited (48-hour cutoff)
  const canEditWeek = () => {
    const weekStart = getWeekStart();
    const now = new Date();
    const cutoffDate = new Date(weekStart);
    cutoffDate.setHours(cutoffDate.getHours() - 48);
    return now < cutoffDate;
  };

  // Get week status
  const getWeekStatus = () => {
    const weekStart = getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const weekShifts = shifts.filter(shift => {
      const shiftDate = new Date(shift.startTime);
      return shiftDate >= weekStart && shiftDate < weekEnd;
    });

    if (weekShifts.length === 0) return 'no-shifts';
    
    const allPublished = weekShifts.every(s => s.status === 'published');
    const anyPublished = weekShifts.some(s => s.status === 'published');
    
    if (allPublished) return 'published';
    if (anyPublished) return 'mixed';
    return 'draft';
  };

  // SINGLE handlePublishWeek function
  const handlePublishWeek = () => {
    console.log('📅 Publish week clicked');
    console.log('📅 canEditWeek:', canEditWeek());
    console.log('📅 weekStatus:', getWeekStatus());
    
    if (!canEditWeek()) {
      console.log('⛔ Cannot publish - within 48-hour cutoff');
      setCutoffWarning(true);
      return;
    }
    setSelectedWeek(getWeekStart());
    setPublishDialog(true);
  };

  // SINGLE handleUnpublishWeek function - KEEP ONLY THIS ONE
  const handleUnpublishWeek = () => {
    console.log('📅 Unpublish week clicked');
    console.log('📅 canEditWeek:', canEditWeek());
    
    if (!canEditWeek()) {
      console.log('⛔ Cannot unpublish - within 48-hour cutoff');
      setCutoffWarning(true);
      return;
    }
    setSelectedWeek(getWeekStart());
    setUnpublishDialog(true);
  };

const confirmPublish = async () => {
  try {
    const weekStart = getWeekStart();
    const token = localStorage.getItem('token');
    
    // Get manager's locations from your user context
    const locations = user?.locations || []; // You'll need to get user from auth
    
    const res = await axios.post(
      `${process.env.REACT_APP_API_URL}/schedules/publish-week`,
      {
        weekStartDate: weekStart,
        locationIds: locations
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setPublishDialog(false);
    fetchShifts();
    setSnackbar({
      open: true,
      message: res.data.message || `Schedule published successfully!`,
      severity: 'success'
    });
  } catch (error) {
    console.error('Error publishing:', error);
    setSnackbar({
      open: true,
      message: error.response?.data?.message || 'Error publishing schedule',
      severity: 'error'
    });
  }
};

const confirmUnpublish = async () => {
  try {
    const weekStart = getWeekStart();
    const token = localStorage.getItem('token');
    
    // Get manager's locations from your user context
    const locations = user?.locations || [];
    
    const res = await axios.post(
      `${process.env.REACT_APP_API_URL}/schedules/unpublish-week`,
      {
        weekStartDate: weekStart,
        locationIds: locations
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setUnpublishDialog(false);
    fetchShifts();
    setSnackbar({
      open: true,
      message: res.data.message || `Schedule unpublished successfully`,
      severity: 'warning'
    });
  } catch (error) {
    console.error('Error unpublishing:', error);
    setSnackbar({
      open: true,
      message: error.response?.data?.message || 'Error unpublishing schedule',
      severity: 'error'
    });
  }
};

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'default';
      case 'in_progress': return 'info';
      case 'completed': return 'secondary';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const weekDays = getWeekDays();
  const weekDaysNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekStatus = getWeekStatus();
  const editable = canEditWeek();

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5">Weekly Schedule</Typography>
            <Typography variant="body2" color="textSecondary">
              Week of {getWeekStart().toLocaleDateString()}
            </Typography>
          </Box>
          
          <Box display="flex" gap={2} flexWrap="wrap">
            {/* Location Filter */}
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Location</InputLabel>
              <Select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                label="Location"
              >
                <MenuItem value="all">All Locations</MenuItem>
                {locations.map(loc => (
                  <MenuItem key={loc._id} value={loc._id}>{loc.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Staff Filter */}
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Staff</InputLabel>
              <Select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                label="Staff"
              >
                <MenuItem value="all">All Staff</MenuItem>
                {staff.map(s => (
                  <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button variant="outlined" onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(selectedDate.getDate() - 7);
              setSelectedDate(newDate);
            }}>Previous Week</Button>
            
            <Button variant="outlined" onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(selectedDate.getDate() + 7);
              setSelectedDate(newDate);
            }}>Next Week</Button>

            {/* Publish/Unpublish Buttons */}
            {isManager && (
              <>
                {weekStatus === 'published' ? (
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<UnpublishedIcon />}
                    onClick={handleUnpublishWeek}
                    disabled={!editable}
                  >
                    Unpublish Week
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<PublishIcon />}
                    onClick={handlePublishWeek}
                    disabled={!editable || weekStatus === 'no-shifts'}
                  >
                    Publish Week
                  </Button>
                )}
              </>
            )}
          </Box>
        </Box>

        {/* Status Badges */}
        <Box display="flex" gap={2} mt={2} flexWrap="wrap">
          <Chip 
            label={`Week: ${weekStatus === 'published' ? 'Published' : weekStatus === 'mixed' ? 'Mixed' : weekStatus === 'draft' ? 'Draft' : 'No Shifts'}`} 
            color={weekStatus === 'published' ? 'success' : weekStatus === 'mixed' ? 'warning' : 'default'} 
          />
          <Chip 
            label={`Editing: ${editable ? 'Allowed' : 'Locked'}`} 
            color={editable ? 'success' : 'error'} 
          />
          {!editable && weekStatus !== 'no-shifts' && (
            <Chip 
              icon={<WarningIcon />} 
              label="48-hour cutoff - cannot publish" 
              color="warning" 
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {/* Cutoff Warning Dialog */}
      <Dialog open={cutoffWarning} onClose={() => setCutoffWarning(false)}>
        <DialogTitle sx={{ bgcolor: '#fff3e0' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            <Typography>Cannot Modify Schedule</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            This schedule is within the 48-hour cutoff period and cannot be published or unpublished.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCutoffWarning(false)}>OK</Button>
        </DialogActions>
      </Dialog>

      {/* Publish Confirmation Dialog */}
      <Dialog open={publishDialog} onClose={() => setPublishDialog(false)}>
        <DialogTitle>Publish Weekly Schedule</DialogTitle>
        <DialogContent>
          <Typography>
            Publish schedule for week of {selectedWeek?.toLocaleDateString()}?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            Staff will be able to see these shifts.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublishDialog(false)}>Cancel</Button>
          <Button onClick={confirmPublish} variant="contained" color="primary">
            Publish
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unpublish Confirmation Dialog */}
      <Dialog open={unpublishDialog} onClose={() => setUnpublishDialog(false)}>
        <DialogTitle>Unpublish Weekly Schedule</DialogTitle>
        <DialogContent>
          <Typography>
            Unpublish schedule for week of {selectedWeek?.toLocaleDateString()}?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            Staff will no longer see these shifts.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnpublishDialog(false)}>Cancel</Button>
          <Button onClick={confirmUnpublish} variant="contained" color="warning">
            Unpublish
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>

      {/* Calendar Grid */}
      <Grid container spacing={2}>
        {weekDays.map((day, index) => {
          const dayShifts = getShiftsForDay(day);
          
          return (
            <Grid item xs={12} md={6} lg={12/7} key={index}>
              <Paper sx={{ p: 2, height: '100%', minHeight: 400, overflow: 'auto' }}>
                <Typography variant="h6">{weekDaysNames[index]}</Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {day.toLocaleDateString()}
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  {dayShifts.length > 0 ? (
                    dayShifts.map(shift => (
                      <Card key={shift._id} sx={{ mb: 2, bgcolor: '#f5f5f5' }}>
                        <CardContent>
                          <Typography variant="subtitle2">
                            {shift.location?.name || 'Unknown'}
                          </Typography>
                          <Typography variant="body2">
                            {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                            {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                          <Typography variant="body2">
                            Skill: {shift.requiredSkill}
                          </Typography>
                          <Typography variant="body2">
                            Staff: {shift.assignedStaff?.length || 0}/{shift.requiredCount}
                          </Typography>
                          <Box mt={1}>
                            <Chip 
                              label={shift.status} 
                              size="small" 
                              color={getStatusColor(shift.status)}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No shifts
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default ScheduleCalendar;