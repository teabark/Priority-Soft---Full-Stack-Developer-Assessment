import React, { useState, useEffect } from "react";
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
  CircularProgress,
} from "@mui/material";
import axios from "axios";
import { useOvertime } from "../../context/OvertimeContext";
import OvertimeWarning from "../overtime/OvertimeWarning";

const CreateShiftForm = ({ open, onClose, onShiftCreated, editShift }) => {
  const [locations, setLocations] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const { checkAssignment, overrideConsecutiveDays } = useOvertime();
  const [overtimeCheck, setOvertimeCheck] = useState(null);
  const [checkingOvertime, setCheckingOvertime] = useState(false);
  const [selectedStaffForCheck, setSelectedStaffForCheck] = useState(null);

  // Simple date inputs
  const today = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    location: "",
    date: today,
    startHour: "09",
    startMinute: "00",
    endHour: "17",
    endMinute: "00",
    requiredSkill: "",
    requiredCount: 1,
    assignedStaff: [],
    managerNotes: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Load locations when form opens
  useEffect(() => {
    if (open) {
      console.log("🔍 Form opened");
      fetchLocations();
      fetchStaff();

      // Reset form for new shift
      if (!editShift) {
        setFormData({
          location: "",
          date: today,
          startHour: "09",
          startMinute: "00",
          endHour: "17",
          endMinute: "00",
          requiredSkill: "",
          requiredCount: 1,
          assignedStaff: [],
          managerNotes: "",
        });
      }
    }
  }, [open]);

// In CreateShiftForm.js, check that the useEffect for editing is working:
useEffect(() => {
  if (editShift && open) {
    console.log("📝 Editing shift:", editShift);
    
    // Parse the existing shift times
    const startDate = new Date(editShift.startTime);
    const endDate = new Date(editShift.endTime);

    setFormData({
      location: editShift.location?._id || editShift.location || "",
      date: startDate.toISOString().split("T")[0],
      startHour: String(startDate.getHours()).padStart(2, "0"),
      startMinute: String(startDate.getMinutes()).padStart(2, "0"),
      endHour: String(endDate.getHours()).padStart(2, "0"),
      endMinute: String(endDate.getMinutes()).padStart(2, "0"),
      requiredSkill: editShift.requiredSkill || "",
      requiredCount: editShift.requiredCount || 1,
      assignedStaff: editShift.assignedStaff?.map((s) => s._id || s) || [],
      managerNotes: editShift.managerNotes || "",
    });
  }
}, [editShift, open]);

  const fetchLocations = async () => {
    setLoadingLocations(true);
    setFetchError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/locations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.data.data && res.data.data.length > 0) {
        setLocations(res.data.data);
      } else {
        setFetchError("No locations found. Please add locations first.");
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
      setFetchError("Error loading locations");
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const staffMembers =
        res.data.data?.filter((u) => u.role === "staff") || [];
      setStaff(staffMembers);
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

const handleStaffSelect = async (staffId) => {
  // Toggle staff selection
  handleStaffToggle(staffId);
  
  // If selecting and we have a shift, check overtime
  if (!formData.assignedStaff.includes(staffId) && formData.location) {
    setSelectedStaffForCheck(staffId);
    setCheckingOvertime(true);
    
    const tempShift = {
      _id: editShift?._id || 'temp',
      startTime: new Date(`${formData.date}T${formData.startHour}:${formData.startMinute}:00`),
      endTime: new Date(`${formData.date}T${formData.endHour}:${formData.endMinute}:00`),
      duration: calculateDuration(formData),
      location: formData.location,
      requiredSkill: formData.requiredSkill
    };
    
    // const result = await checkAssignment(tempShift, staffId);
    // setOvertimeCheck(result);
    // setCheckingOvertime(false);
  }
};

// Helper to calculate duration
const calculateDuration = (data) => {
  const start = new Date(`${data.date}T${data.startHour}:${data.startMinute}:00`);
  const end = new Date(`${data.date}T${data.endHour}:${data.endMinute}:00`);
  return Math.round((end - start) / (1000 * 60));
};

// Handle override
const handleOverride = async (reason) => {
  if (editShift?._id && selectedStaffForCheck) {
    await overrideConsecutiveDays(selectedStaffForCheck, editShift._id, reason);
    // Recheck after override
    handleStaffSelect(selectedStaffForCheck);
  }
};

  const handleStaffToggle = (staffId) => {
    setFormData((prev) => {
      const current = prev.assignedStaff || [];
      const newAssigned = current.includes(staffId)
        ? current.filter((id) => id !== staffId)
        : [...current, staffId];

      return { ...prev, assignedStaff: newAssigned };
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.location) newErrors.location = "Location is required";
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.requiredSkill)
      newErrors.requiredSkill = "Required skill is required";
    if (formData.requiredCount < 1)
      newErrors.requiredCount = "At least 1 staff required";

    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

  //     // Check if there are overtime errors (hard blocks)
  // if (overtimeCheck && overtimeCheck.errors.length > 0) {
  //   setErrors({ 
  //     submit: 'Cannot assign due to overtime violations. Please review warnings.' 
  //   });
  //   return;
  // }

    setLoading(true);
    try {
      // Get user ID from token
      let userId = null;
      const token = localStorage.getItem("token");
      if (token) {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(window.atob(base64));
        userId = payload.id;
      }

      if (!userId) {
        setErrors({ submit: "User not authenticated. Please log in again." });
        setLoading(false);
        return;
      }

      // Create date objects from the simplified form fields
      const startDateTime = new Date(
        `${formData.date}T${formData.startHour}:${formData.startMinute}:00`,
      );
      const endDateTime = new Date(
        `${formData.date}T${formData.endHour}:${formData.endMinute}:00`,
      );

      // Format the date as YYYY-MM-DD for the database
      const dateStr = formData.date; // This is already in YYYY-MM-DD format

      // Calculate editCutoff (48 hours before shift start)
      const editCutoffDate = new Date(startDateTime);
      editCutoffDate.setHours(editCutoffDate.getHours() - 48);

      const submitData = {
        location: formData.location,
        date: dateStr, // Use the date string from form
        startTime: startDateTime.toISOString(), // Use the constructed date
        endTime: endDateTime.toISOString(), // Use the constructed date
        requiredSkill: formData.requiredSkill,
        requiredCount: parseInt(formData.requiredCount),
        assignedStaff: formData.assignedStaff || [],
        managerNotes: formData.managerNotes || "",
        status: "draft",
        createdBy: userId,
        editCutoff: editCutoffDate.toISOString(),
      };

      console.log("📤 Submitting shift data:", submitData);
      console.log("📤 Assigned staff IDs:", formData.assignedStaff);

      const url = editShift
        ? `${process.env.REACT_APP_API_URL}/shifts/${editShift._id}`
        : `${process.env.REACT_APP_API_URL}/shifts`;

      const method = editShift ? "put" : "post";

      const res = await axios[method](url, submitData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("✅ Shift saved successfully:", res.data);
      onShiftCreated(res.data.data);
      onClose();
    } catch (error) {
      console.error("❌ Error saving shift:", error);
      setErrors({
        submit: error.response?.data?.message || "Error saving shift",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{editShift ? "Edit Shift" : "Create New Shift"}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Location */}
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
                <MenuItem value="">Select a location</MenuItem>
                {locations.map((loc) => (
                  <MenuItem key={loc._id} value={loc._id}>
                    {loc.name}
                  </MenuItem>
                ))}
              </Select>
              {errors.location && (
                <FormHelperText>{errors.location}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          {/* Date */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              type="date"
              name="date"
              label="Date"
              value={formData.date}
              onChange={handleChange}
              error={!!errors.date}
              helperText={errors.date}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Start Time */}
          <Grid item xs={6}>
            <Box display="flex" gap={1}>
              <TextField
                select
                fullWidth
                name="startHour"
                label="Start Hour"
                value={formData.startHour}
                onChange={handleChange}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <MenuItem key={i} value={String(i).padStart(2, "0")}>
                    {String(i).padStart(2, "0")}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                name="startMinute"
                label="Min"
                value={formData.startMinute}
                onChange={handleChange}
              >
                <MenuItem value="00">00</MenuItem>
                <MenuItem value="15">15</MenuItem>
                <MenuItem value="30">30</MenuItem>
                <MenuItem value="45">45</MenuItem>
              </TextField>
            </Box>
          </Grid>

          {/* End Time */}
          <Grid item xs={6}>
            <Box display="flex" gap={1}>
              <TextField
                select
                fullWidth
                name="endHour"
                label="End Hour"
                value={formData.endHour}
                onChange={handleChange}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <MenuItem key={i} value={String(i).padStart(2, "0")}>
                    {String(i).padStart(2, "0")}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                name="endMinute"
                label="Min"
                value={formData.endMinute}
                onChange={handleChange}
              >
                <MenuItem value="00">00</MenuItem>
                <MenuItem value="15">15</MenuItem>
                <MenuItem value="30">30</MenuItem>
                <MenuItem value="45">45</MenuItem>
              </TextField>
            </Box>
          </Grid>

          {/* Skill */}
          <Grid item xs={6}>
            <FormControl fullWidth error={!!errors.requiredSkill}>
              <InputLabel>Required Skill</InputLabel>
              <Select
                name="requiredSkill"
                value={formData.requiredSkill}
                onChange={handleChange}
                label="Required Skill"
              >
                <MenuItem value="">Select skill</MenuItem>
                <MenuItem value="bartender">Bartender</MenuItem>
                <MenuItem value="server">Server</MenuItem>
                <MenuItem value="line_cook">Line Cook</MenuItem>
                <MenuItem value="host">Host</MenuItem>
                <MenuItem value="dishwasher">Dishwasher</MenuItem>
                <MenuItem value="busser">Busser</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
              </Select>
              {errors.requiredSkill && (
                <FormHelperText>{errors.requiredSkill}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          {/* Count */}
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

          {/* Staff Assignment */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Assign Staff
            </Typography>
            <Box
              sx={{
                maxHeight: 200,
                overflowY: "auto",
                border: "1px solid #e0e0e0",
                p: 1,
                borderRadius: 1,
              }}
            >
              {loadingStaff ? (
                <CircularProgress size={24} />
              ) : staff.length > 0 ? (
                staff.map((staffMember) => (
                  <Chip
                    key={staffMember._id}
                    label={staffMember.name}
                    onClick={() => handleStaffSelect(staffMember._id)} 
                    color={
                      formData.assignedStaff?.includes(staffMember._id)
                        ? "primary"
                        : "default"
                    }
                    variant={
                      formData.assignedStaff?.includes(staffMember._id)
                        ? "filled"
                        : "outlined"
                    }
                    sx={{ m: 0.5 }}
                  />
                ))
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No staff available
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Notes */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              name="managerNotes"
              label="Notes"
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? "Saving..." : editShift ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
    
  );
};

export default CreateShiftForm;
