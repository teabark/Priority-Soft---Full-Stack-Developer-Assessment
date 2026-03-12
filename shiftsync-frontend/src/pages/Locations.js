import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccessTime as TimezoneIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import Layout from "../components/layout/Layout";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const Locations = () => {
  const [locations, setLocations] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "USA",
    },
    phone: "",
    timezone: "America/Los_Angeles",
    managers: [],
    operatingHours: [], // Add this
  });

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const timezones = [
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Phoenix", label: "Arizona (MST no DST)" },
    { value: "America/Anchorage", label: "Alaska (AKT)" },
    { value: "Pacific/Honolulu", label: "Hawaii (HT)" },
  ];

  useEffect(() => {
    if (isAdmin) {
      fetchLocations();
      fetchManagers();
    }
  }, [isAdmin]);

const fetchLocations = async () => {
  try {
    const token = localStorage.getItem('token');
    const res = await axios.get(`${process.env.REACT_APP_API_URL}/locations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📍 Locations data:', res.data.data);
    // Check the first location's managers field
    if (res.data.data.length > 0) {
      console.log('👥 First location managers:', res.data.data[0].managers);
    }
    
    setLocations(res.data.data || []);
  } catch (error) {
    console.error('Error fetching locations:', error);
    showMessage('error', 'Failed to fetch locations');
  } finally {
    setLoading(false);
  }
};

  const fetchManagers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const managerList =
        res.data.data?.filter((u) => u.role === "manager") || [];
      setManagers(managerList);
    } catch (error) {
      console.error("Error fetching managers:", error);
    }
  };

  const handleOpenDialog = (location = null) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name || "",
        code: location.code || "",
        address: location.address || {
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "USA",
        },
        phone: location.phone || "",
        timezone: location.timezone || "America/Los_Angeles",
        managers: location.managers?.map((m) => m._id || m) || [],
      });
    } else {
      setEditingLocation(null);
      setFormData({
        name: "",
        code: "",
        address: {
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "USA",
        },
        phone: "",
        timezone: "America/Los_Angeles",
        managers: [],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLocation(null);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddressChange = (field, value) => {
    setFormData({
      ...formData,
      address: {
        ...formData.address,
        [field]: value,
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token");

      // Create COMPLETE operating hours for all 7 days
      const operatingHours = [
        {
          dayOfWeek: 0,
          openTime: "09:00",
          closeTime: "22:00",
          isClosed: false,
        }, // Sunday
        {
          dayOfWeek: 1,
          openTime: "09:00",
          closeTime: "22:00",
          isClosed: false,
        }, // Monday
        {
          dayOfWeek: 2,
          openTime: "09:00",
          closeTime: "22:00",
          isClosed: false,
        }, // Tuesday
        {
          dayOfWeek: 3,
          openTime: "09:00",
          closeTime: "22:00",
          isClosed: false,
        }, // Wednesday
        {
          dayOfWeek: 4,
          openTime: "09:00",
          closeTime: "22:00",
          isClosed: false,
        }, // Thursday
        {
          dayOfWeek: 5,
          openTime: "09:00",
          closeTime: "23:00",
          isClosed: false,
        }, // Friday
        {
          dayOfWeek: 6,
          openTime: "09:00",
          closeTime: "23:00",
          isClosed: false,
        }, // Saturday
      ];

      const submitData = {
        name: formData.name,
        code: formData.code,
        address: {
          street: formData.address?.street || "123 Main St",
          city: formData.address?.city || "Nairobi",
          state: (formData.address?.state || "KE").toUpperCase().slice(0, 2),
          zipCode: formData.address?.zipCode || "00100",
          country: formData.address?.country || "Kenya",
        },
        phone: formData.phone || "000-000-0000",
        timezone: formData.timezone || "America/Los_Angeles",
        managers: formData.managers || [],
        operatingHours: operatingHours, // ← THIS MUST BE THE COMPLETE ARRAY
      };

      console.log("📤 Submitting location data:", submitData);

      const url = editingLocation
        ? `${process.env.REACT_APP_API_URL}/locations/${editingLocation._id}`
        : `${process.env.REACT_APP_API_URL}/locations`;

      const method = editingLocation ? "put" : "post";

      const res = await axios[method](url, submitData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("✅ Location saved:", res.data);
      showMessage(
        "success",
        editingLocation
          ? "Location updated successfully"
          : "Location created successfully",
      );
      handleCloseDialog();
      fetchLocations();
    } catch (error) {
      console.error("❌ Error saving location:", error);
      console.error("❌ Error response:", error.response?.data);
      showMessage(
        "error",
        error.response?.data?.message || "Error saving location",
      );
    }
  };

  const handleDelete = async (locationId) => {
    if (!window.confirm("Are you sure you want to delete this location?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/locations/${locationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      showMessage("success", "Location deleted successfully");
      fetchLocations();
    } catch (error) {
      console.error("Error deleting location:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Error deleting location",
      );
    }
  };

  const showMessage = (severity, message) => {
    setSnackbar({ open: true, severity, message });
  };

  const getTimezoneLabel = (tzValue) => {
    const tz = timezones.find((t) => t.value === tzValue);
    return tz ? tz.label : tzValue;
  };

  const getManagerNames = (managerIds) => {
    if (!managerIds || managerIds.length === 0) return "None";
    return managerIds
      .map((id) => {
        const manager = managers.find((m) => m._id === id);
        return manager ? manager.name : "Unknown";
      })
      .join(", ");
  };

  if (!isAdmin) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            You don't have permission to access this page.
          </Alert>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h4">Locations</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Location
          </Button>
        </Box>

        {/* Locations Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                <TableCell>Name</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Timezone</TableCell>
                <TableCell>Managers</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {locations.length > 0 ? (
                locations.map((location) => (
                  <TableRow key={location._id} hover>
                    <TableCell>
                      <Typography variant="body1" fontWeight="medium">
                        {location.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {location.phone || "No phone"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={location.code} size="small" />
                    </TableCell>
                    <TableCell>
                      {location.address ? (
                        <>
                          {location.address.street}
                          <br />
                          <Typography variant="caption" color="textSecondary">
                            {location.address.city}, {location.address.state}{" "}
                            {location.address.zipCode}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="caption" color="textSecondary">
                          No address provided
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <TimezoneIcon fontSize="small" color="action" />
                        {getTimezoneLabel(location.timezone)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PersonIcon fontSize="small" color="action" />
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {location.managers && location.managers.length > 0 ? (
                            location.managers.map((manager) => {
                              // Handle both populated manager objects and raw IDs
                              const managerName =
                                manager.name ||
                                managers.find((m) => m._id === manager)?.name ||
                                "Unknown";
                              const managerId = manager._id || manager;

                              return (
                                <Chip
                                  key={managerId}
                                  label={managerName}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{ m: 0.25 }}
                                />
                              );
                            })
                          ) : (
                            <Typography variant="caption" color="textSecondary">
                              No managers assigned
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenDialog(location)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(location._id)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">
                      No locations found. Click "Add Location" to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Add/Edit Location Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingLocation ? "Edit Location" : "Add New Location"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Location Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Location Code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  required
                  helperText="Short code (e.g., SEA-DT)"
                />
              </Grid>

              {/* Address Fields */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
                  value={formData.address?.street || ""}
                  onChange={(e) =>
                    handleAddressChange("street", e.target.value)
                  }
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="City"
                  value={formData.address?.city || ""}
                  onChange={(e) => handleAddressChange("city", e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="State"
                  value={formData.address?.state || ""}
                  onChange={(e) =>
                    handleAddressChange(
                      "state",
                      e.target.value.toUpperCase().slice(0, 2),
                    )
                  }
                  helperText="2-letter state code (e.g., WA, NY, CA)"
                  inputProps={{ maxLength: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Zip Code"
                  value={formData.address?.zipCode || ""}
                  onChange={(e) =>
                    handleAddressChange("zipCode", e.target.value)
                  }
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Timezone</InputLabel>
                  <Select
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleChange}
                    label="Timezone"
                  >
                    {timezones.map((tz) => (
                      <MenuItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Managers</InputLabel>
                  <Select
                    multiple
                    value={formData.managers}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        managers: e.target.value,
                      })
                    }
                    label="Managers"
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((id) => {
                          const manager = managers.find((m) => m._id === id);
                          return (
                            <Chip
                              key={id}
                              label={manager?.name || id}
                              size="small"
                              color="primary"
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {managers.map((manager) => (
                      <MenuItem key={manager._id} value={manager._id}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <PersonIcon fontSize="small" />
                          <Box>
                            <Typography variant="body2">
                              {manager.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {manager.email}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              {editingLocation ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Layout>
  );
};

export default Locations;
