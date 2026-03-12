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
  Avatar,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  ManageAccounts as ManagerIcon,
  Badge as StaffIcon,
} from "@mui/icons-material";
import Layout from "../components/layout/Layout";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const Staff = () => {
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
    locations: [],
    skills: [],
  });

  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const isManager = currentUser?.role === "manager";

  const skillOptions = [
    "bartender",
    "line_cook",
    "server",
    "host",
    "dishwasher",
    "busser",
    "manager",
  ];

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
      fetchLocations();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let filteredUsers = res.data.data || [];

      // Managers see only staff at their locations
      if (isManager) {
        filteredUsers = filteredUsers.filter((user) => {
          // Show staff members
          if (user.role === "staff") {
            // Check if staff works at manager's locations
            return user.locations?.some((loc) =>
              currentUser.locations?.includes(loc._id || loc),
            );
          }
          return false; // Don't show other managers or admins
        });
      }

      setUsers(filteredUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      showMessage("error", "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/locations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      let filteredLocations = res.data.data || [];

      // Managers see only their locations
      if (isManager) {
        filteredLocations = filteredLocations.filter((loc) =>
          currentUser.locations?.includes(loc._id),
        );
      }

      setLocations(filteredLocations);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  // Calculate premium shifts for a user (Friday/Saturday evenings)
  const calculatePremiumShifts = (user) => {
    // This is a simplified version - in reality, you'd fetch from shifts
    // For now, we'll generate random numbers for demo
    if (user.role !== "staff") return "-";

    // In production, this would be an API call to get actual counts
    // For demo purposes, we'll generate consistent numbers based on user ID
    const hash = user._id.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    return (hash % 5) + 1; // Returns 1-5 premium shifts
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name || "",
        email: user.email || "",
        password: "", // Don't populate password for security
        role: user.role || "staff",
        locations: user.locations?.map((l) => l._id || l) || [],
        skills: user.skills || [],
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "staff",
        locations: [],
        skills: [],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token");

      // Only admins can change roles
      if (!isAdmin && formData.role !== editingUser?.role) {
        showMessage("error", "Only admins can change user roles");
        return;
      }

      // Only admins can create new users
      if (!isAdmin && !editingUser) {
        showMessage("error", "Only admins can create new users");
        return;
      }

      const submitData = { ...formData };

      // Don't send password if empty (for edits)
      if (editingUser && !submitData.password) {
        delete submitData.password;
      }

      const url = editingUser
        ? `${process.env.REACT_APP_API_URL}/users/${editingUser._id}`
        : `${process.env.REACT_APP_API_URL}/users`;

      const method = editingUser ? "put" : "post";

      const res = await axios[method](url, submitData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("✅ User saved:", res.data);
      showMessage(
        "success",
        editingUser ? "User updated successfully" : "User created successfully",
      );
      handleCloseDialog();
      fetchUsers();
    } catch (error) {
      console.error("❌ Error saving user:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Error saving user",
      );
    }
  };

  const handleDelete = async (userId) => {
    if (!isAdmin) {
      showMessage("error", "Only admins can delete users");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${process.env.REACT_APP_API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showMessage("success", "User deleted successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Error deleting user",
      );
    }
  };

  const showMessage = (severity, message) => {
    setSnackbar({ open: true, severity, message });
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin":
        return <AdminIcon color="error" />;
      case "manager":
        return <ManagerIcon color="primary" />;
      default:
        return <StaffIcon color="success" />;
    }
  };

  const getLocationNames = (locationIds) => {
    if (!locationIds || locationIds.length === 0) return "None";
    return locationIds
      .map((id) => {
        // Check if it's an object with _id or just a string
        const locId = id._id || id;
        const loc = locations.find((l) => l._id === locId);
        return loc ? loc.name : "Unknown";
      })
      .join(", ");
  };

  // Redirect staff users
  if (currentUser?.role === "staff") {
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
          <Typography variant="h4">Staff Management</Typography>
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add User
            </Button>
          )}
        </Box>

        {/* Users Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Locations</TableCell>
                <TableCell>Skills</TableCell>
                <TableCell align="center">Premium Shifts</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user._id} hover>
                    {/* User cell */}
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar
                          sx={{
                            bgcolor:
                              user.role === "admin"
                                ? "#f44336"
                                : user.role === "manager"
                                  ? "#1976d2"
                                  : "#2e7d32",
                          }}
                        >
                          {user.name?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {user.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            ID: {user._id.slice(-6)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Email cell */}
                    <TableCell>{user.email}</TableCell>

                    {/* Role cell */}
                    <TableCell>
                      <Chip
                        icon={getRoleIcon(user.role)}
                        label={user.role}
                        color={
                          user.role === "admin"
                            ? "error"
                            : user.role === "manager"
                              ? "primary"
                              : "success"
                        }
                        size="small"
                      />
                    </TableCell>

                    <TableCell>
                      <Box sx={{ maxWidth: 200 }}>
                        {user.locations?.length > 0 ? (
                          user.locations.map((loc) => {
                            // Handle both populated location objects and raw IDs
                            const locationId = loc._id || loc;
                            const location = locations.find(
                              (l) => l._id === locationId,
                            );

                            return (
                              <Chip
                                key={locationId}
                                label={location?.name || locationId.slice(-6)}
                                size="small"
                                sx={{ m: 0.25, bgcolor: "#e3f2fd" }}
                              />
                            );
                          })
                        ) : (
                          <Typography variant="caption" color="textSecondary">
                            No locations
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    {/* Skills cell */}
                    <TableCell>
                      <Box sx={{ maxWidth: 150 }}>
                        {user.role === "admin" ? (
                          <Chip label="Oversight" size="small" color="error" />
                        ) : user.role === "manager" ? (
                          <Chip label="Manage" size="small" color="primary" />
                        ) : user.skills?.length > 0 ? (
                          user.skills.map((skill) => (
                            <Chip
                              key={skill}
                              label={skill.replace("_", " ")}
                              size="small"
                              variant="outlined"
                              sx={{ m: 0.25 }}
                            />
                          ))
                        ) : (
                          <Typography variant="caption" color="textSecondary">
                            No skills
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    {/* PREMIUM SHIFTS CELL - This should be BEFORE Actions */}
                    <TableCell align="center">
                      {user.role === "staff" ? (
                        <Chip
                          label={calculatePremiumShifts(user)}
                          color={
                            calculatePremiumShifts(user) > 3
                              ? "success"
                              : "warning"
                          }
                          size="small"
                          sx={{ fontWeight: "bold", minWidth: 40 }}
                        />
                      ) : (
                        <Typography variant="caption" color="textSecondary">
                          -
                        </Typography>
                      )}
                    </TableCell>

                    {/* Actions cell */}
                    <TableCell align="center">
                      <Tooltip title="Edit">
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenDialog(user)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {isAdmin && user._id !== currentUser?._id && (
                        <Tooltip title="Delete">
                          <IconButton
                            color="error"
                            onClick={() => handleDelete(user._id)}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">
                      No users found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Add/Edit User Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingUser ? "Edit User" : "Add New User"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </Grid>

              {/* Password - required for new users, optional for edits */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={
                    editingUser
                      ? "New Password (leave blank to keep current)"
                      : "Password"
                  }
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={!editingUser}
                />
              </Grid>

              {/* Role - only admins can change */}
              {isAdmin && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Role</InputLabel>
                    <Select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      label="Role"
                    >
                      <MenuItem value="admin">Admin</MenuItem>
                      <MenuItem value="manager">Manager</MenuItem>
                      <MenuItem value="staff">Staff</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Locations - show based on role */}
              {(formData.role === "manager" || formData.role === "staff") && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Locations</InputLabel>
                    <Select
                      multiple
                      name="locations"
                      value={formData.locations}
                      onChange={handleChange}
                      label="Locations"
                      renderValue={(selected) => (
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {selected.map((id) => {
                            const loc = locations.find((l) => l._id === id);
                            return (
                              <Chip
                                key={id}
                                label={loc?.name || id}
                                size="small"
                              />
                            );
                          })}
                        </Box>
                      )}
                    >
                      {locations.map((loc) => (
                        <MenuItem key={loc._id} value={loc._id}>
                          {loc.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Skills - for staff only */}
              {formData.role === "staff" && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Skills</InputLabel>
                    <Select
                      multiple
                      name="skills"
                      value={formData.skills}
                      onChange={handleChange}
                      label="Skills"
                      renderValue={(selected) => (
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {selected.map((skill) => (
                            <Chip key={skill} label={skill} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {skillOptions.map((skill) => (
                        <MenuItem key={skill} value={skill}>
                          {skill.replace("_", " ")}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              {editingUser ? "Update" : "Create"}
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

export default Staff;
