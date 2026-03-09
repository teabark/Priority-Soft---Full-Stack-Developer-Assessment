import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  Chip,
  FormHelperText,
  Alert,
  Typography,
  CircularProgress
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';

const CreateShiftForm = ({ open, onClose, onShiftCreated, editShift }) => {
  const [locations, setLocations] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [formData, setFormData] = useState({
    location: '',
    startTime: new Date(),
    endTime: new Date(new Date().setHours(new Date().getHours() + 8)),
    requiredSkill: '',
    requiredCount: 1,
    assignedStaff: [],
    managerNotes: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Load locations when form opens
  useEffect(() => {
    if (open) {
      console.log('🔍 Form opened, fetching locations and staff...');
      fetchLocations();
      fetchStaff();
    }
  }, [open]);

  // Load edit shift data if editing
  useEffect(() => {
    if (editShift && open) {
      console.log('📝 Editing shift:', editShift);
      setFormData({
        location: editShift.location?._id || editShift.location || '',
        startTime: new Date(editShift.startTime),
        endTime: new Date(editShift.endTime),
        requiredSkill: editShift.requiredSkill || '',
        requiredCount: editShift.requiredCount || 1,
        assignedStaff: editShift.assignedStaff?.map(s => s._id || s) || [],
        managerNotes: editShift.managerNotes || ''
      });
    }
  }, [editShift, open]);

  const fetchLocations = async () => {
    setLoadingLocations(true);
    setFetchError('');
    try {
      console.log('📡 Fetching locations from:', `${process.env.REACT_APP_API_URL}/locations`);
      const token = localStorage.getItem('token');
      console.log('🔑 Using token:', token ? 'Token exists' : 'No token');
      
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/locations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Locations response:', res.data);
      console.log('📍 Locations count:', res.data.count);
      console.log('📍 Locations data:', res.data.data);
      
      if (res.data.data && res.data.data.length > 0) {
        setLocations(res.data.data);
      } else {
        console.warn('⚠️ No locations found in response');
        setFetchError('No locations found. Please add locations first.');
      }
    } catch (error) {
      console.error('❌ Error fetching locations:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      if (error.response?.status === 401) {
        setFetchError('Authentication failed. Please log in again.');
      } else if (error.response?.status === 404) {
        setFetchError('Locations endpoint not found. Check your API URL.');
      } else {
        setFetchError(`Error loading locations: ${error.message}`);
      }
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      console.log('📡 Fetching staff...');
      const token = localStorage.getItem('token');
      
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Staff response:', res.data);
      
      // Filter to only staff members
      const staffMembers = res.data.data?.filter(u => u.role === 'staff') || [];
      setStaff(staffMembers);
      console.log('👥 Staff count:', staffMembers.length);
    } catch (error) {
      console.error('❌ Error fetching staff:', error);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const handleStaffToggle = (staffId) => {
    setFormData(prev => {
      const current = prev.assignedStaff || [];
      const newAssigned = current.includes(staffId)
        ? current.filter(id => id !== staffId)
        : [...current, staffId];
      
      return { ...prev, assignedStaff: newAssigned };
    });
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.location) newErrors.location = 'Location is required';
    if (!formData.startTime) newErrors.startTime = 'Start time is required';
    if (!formData.endTime) newErrors.endTime = 'End time is required';
    if (!formData.requiredSkill) newErrors.requiredSkill = 'Required skill is required';
    if (formData.requiredCount < 1) newErrors.requiredCount = 'At least 1 staff required';
    
    if (formData.endTime <= formData.startTime) {
      newErrors.endTime = 'End time must be after start time';
    }
    
    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const url = editShift
        ? `${process.env.REACT_APP_API_URL}/shifts/${editShift._id}`
        : `${process.env.REACT_APP_API_URL}/shifts`;
      
      const method = editShift ? 'put' : 'post';
      
      const res = await axios[method](url, formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      onShiftCreated(res.data.data);
      onClose();
      
      setFormData({
        location: '',
        startTime: new Date(),
        endTime: new Date(new Date().setHours(new Date().getHours() + 8)),
        requiredSkill: '',
        requiredCount: 1,
        assignedStaff: [],
        managerNotes: ''
      });
    } catch (error) {
      console.error('Error saving shift:', error);
      setErrors({ submit: error.response?.data?.message || 'Error saving shift' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{editShift ? 'Edit Shift' : 'Create New Shift'}</DialogTitle>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Debug Info - Remove in production */}
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  API URL: {process.env.REACT_APP_API_URL}<br/>
                  Locations loaded: {locations.length}<br/>
                  Loading: {loadingLocations ? 'Yes' : 'No'}<br/>
                  Token: {localStorage.getItem('token') ? 'Present' : 'Missing'}
                </Typography>
              </Alert>
            </Grid>

            {/* Error Display */}
            {fetchError && (
              <Grid item xs={12}>
                <Alert severity="error">{fetchError}</Alert>
              </Grid>
            )}

            {/* Location Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.location}>
                <InputLabel>Location</InputLabel>
                <Select
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  label="Location"
                  disabled={loadingLocations}
                >
                  {loadingLocations ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} /> Loading locations...
                    </MenuItem>
                  ) : locations.length > 0 ? (
                    locations.map(loc => (
                      <MenuItem key={loc._id} value={loc._id}>
                        {loc.name} - {loc.address?.city}, {loc.address?.state}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>No locations available</MenuItem>
                  )}
                </Select>
                {errors.location && <FormHelperText>{errors.location}</FormHelperText>}
              </FormControl>
            </Grid>

            {/* Rest of the form remains the same */}
            <Grid item xs={6}>
              <DateTimePicker
                label="Start Time"
                value={formData.startTime}
                onChange={(newValue) => setFormData({ ...formData, startTime: newValue })}
                renderInput={(params) => (
                  <TextField {...params} fullWidth error={!!errors.startTime} helperText={errors.startTime} />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <DateTimePicker
                label="End Time"
                value={formData.endTime}
                onChange={(newValue) => setFormData({ ...formData, endTime: newValue })}
                renderInput={(params) => (
                  <TextField {...params} fullWidth error={!!errors.endTime} helperText={errors.endTime} />
                )}
              />
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth error={!!errors.requiredSkill}>
                <InputLabel>Required Skill</InputLabel>
                <Select
                  name="requiredSkill"
                  value={formData.requiredSkill}
                  onChange={handleChange}
                  label="Required Skill"
                >
                  <MenuItem value="bartender">Bartender</MenuItem>
                  <MenuItem value="server">Server</MenuItem>
                  <MenuItem value="line_cook">Line Cook</MenuItem>
                  <MenuItem value="host">Host</MenuItem>
                  <MenuItem value="dishwasher">Dishwasher</MenuItem>
                  <MenuItem value="busser">Busser</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                </Select>
                {errors.requiredSkill && <FormHelperText>{errors.requiredSkill}</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                name="requiredCount"
                label="Staff Needed"
                value={formData.requiredCount}
                onChange={handleChange}
                error={!!errors.requiredCount}
                helperText={errors.requiredCount}
                InputProps={{ inputProps: { min: 1, max: 10 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Assign Staff (select qualified staff)
              </Typography>
              <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e0e0e0', p: 1, borderRadius: 1 }}>
                {loadingStaff ? (
                  <Box display="flex" justifyContent="center" p={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : staff.length > 0 ? (
                  staff.map(staffMember => (
                    <Chip
                      key={staffMember._id}
                      label={`${staffMember.name} - ${staffMember.skills?.join(', ') || 'No skills'}`}
                      onClick={() => handleStaffToggle(staffMember._id)}
                      color={formData.assignedStaff?.includes(staffMember._id) ? 'primary' : 'default'}
                      variant={formData.assignedStaff?.includes(staffMember._id) ? 'filled' : 'outlined'}
                      sx={{ m: 0.5 }}
                    />
                  ))
                ) : (
                  <Typography variant="body2" color="textSecondary" align="center">
                    No staff members available
                  </Typography>
                )}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                name="managerNotes"
                label="Manager Notes (optional)"
                value={formData.managerNotes}
                onChange={handleChange}
              />
            </Grid>

            {errors.submit && (
              <Grid item xs={12}>
                <Alert severity="error">{errors.submit}</Alert>
              </Grid>
            )}
          </Grid>
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading || loadingLocations}
        >
          {loading ? 'Saving...' : editShift ? 'Update Shift' : 'Create Shift'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateShiftForm;