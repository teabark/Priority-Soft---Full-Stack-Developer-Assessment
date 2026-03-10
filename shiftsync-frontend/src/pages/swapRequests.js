import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  Card,
  CardContent,
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Tab,
  Tabs,
  CircularProgress,
  Snackbar,
} from "@mui/material";
import {
  SwapHoriz as SwapIcon,
  Check as ApproveIcon,
  Close as RejectIcon,
  Warning as WarningIcon,
  EventBusy as DropIcon,
  EventAvailable as PickupIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import Layout from "../components/layout/Layout";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const SwapRequests = () => {
  console.log("🔥🔥🔥 SWAP REQUESTS PAGE LOADED 🔥🔥🔥");
  console.log("Current time:", new Date().toLocaleTimeString());

  const [shifts, setShifts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [availableShifts, setAvailableShifts] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [openSwapDialog, setOpenSwapDialog] = useState(false);
  const [openDropDialog, setOpenDropDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedTargetStaff, setSelectedTargetStaff] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const { user, token, loading: authLoading } = useAuth();
  const isManager = user?.role === "admin" || user?.role === "manager";
  const isStaff = user?.role === "staff";

  // Debug logs
  console.log("🔥 SwapRequests mounted");
  console.log("📊 User object:", user);
  console.log("📊 User id:", user?.id);
  console.log("📊 User role:", user?.role);
  console.log("📊 Auth loading:", authLoading);
  console.log("📊 Token exists:", !!token);

  // Fetch data only when auth is ready
  useEffect(() => {
    console.log("🚀🚀🚀 FETCH EFFECT RUNNING 🚀🚀🚀");
    console.log("   authLoading:", authLoading);
    console.log("   user:", user?._id);
    console.log("   token:", !!token);

    if (!authLoading && user && token) {
      console.log("✅ CONDITIONS MET - calling fetchAllData");
      fetchAllData();
    } else {
      console.log("⏳ Conditions not met:", {
        authLoadingDone: !authLoading,
        hasUser: !!user,
        hasToken: !!token,
      });
    }
  }, [authLoading, user, token]);

  const fetchAllData = async () => {
    console.log("🟢🟢🟢🟢🟢 FETCH ALL DATA STARTED 🟢🟢🟢🟢🟢");
    setLoading(true);
    try {
      await Promise.all([
        fetchShifts(),
        fetchStaff(),
        fetchMyRequests(),
        fetchPendingApprovals(),
        fetchAvailableShifts(),
      ]);
      console.log("✅ Promise.all completed");
    } catch (error) {
      console.error("❌ Error in fetchAllData:", error);
      showMessage("error", "Error loading data");
    } finally {
      console.log("🏁 fetchAllData finished");
      setLoading(false);
    }
  };

  const fetchShifts = async () => {
    console.log("🔵🔵🔵 FETCH SHIFTS FUNCTION CALLED 🔵🔵🔵");
    console.log("🔵 Token in fetchShifts:", token ? "yes" : "no");

    try {
      console.log("📡 Fetching shifts from API...");
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/shifts/simple-list`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      console.log("✅ Shifts API response:", res.status);
      console.log("📊 Shifts data:", res.data);

      // 🔍 DEBUG: Check assigned staff for each shift
      res.data.data?.forEach((shift, index) => {
        console.log(`Shift ${index + 1}:`, {
          id: shift._id,
          location: shift.location?.name,
          requiredSkill: shift.requiredSkill,
          assignedStaff: shift.assignedStaff,
          assignedCount: shift.assignedStaff?.length || 0,
        });
      });

      setShifts(res.data.data || []);
    } catch (error) {
      console.error("❌ Error in fetchShifts:", error.message);
      if (error.response) {
        console.error("❌ Response data:", error.response.data);
        console.error("❌ Response status:", error.response.status);
      }
    }
  };

  const fetchStaff = async () => {
    console.log("🟣🟣🟣 FETCH STAFF FUNCTION CALLED 🟣🟣🟣");
    try {
      console.log("🔍 Fetching staff...");
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const staffMembers =
        res.data.data?.filter((u) => u.role === "staff") || [];
      console.log("👥 Staff members:", staffMembers.length);
      setStaff(staffMembers);
    } catch (error) {
      console.error("❌ Error fetching staff:", error);
    }
  };

  const fetchMyRequests = async () => {
    try {
      console.log("📡 Fetching my requests...");
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/swaps/my-requests`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      console.log("✅ My requests response:", res.data);
      console.log("📊 My requests count:", res.data.data?.length);
      console.log(
        "📊 My requests data:",
        JSON.stringify(res.data.data, null, 2),
      );

      // Check if the data matches the current user
      if (res.data.data && res.data.data.length > 0) {
        console.log("First request:", res.data.data[0]);
        console.log("Current user ID:", user?.id);
        console.log("Requesting staff ID:", res.data.data[0].requestingStaff);
        console.log("Target staff ID:", res.data.data[0].targetStaff);
      }

      setMyRequests(res.data.data || []);
    } catch (error) {
      console.error("❌ Error fetching my requests:", error);
      console.error("Error response:", error.response?.data);
    }
  };

  const fetchPendingApprovals = async () => {
    if (!isManager) return;
    try {
      console.log("📡 Fetching pending approvals for manager...");
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/swaps/pending-approvals`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      console.log("✅ Pending approvals response:", res.data);
      console.log("📊 Pending approvals count:", res.data.data?.length);
      setPendingRequests(res.data.data || []);
    } catch (error) {
      console.error("❌ Error fetching pending approvals:", error);
      console.error("Error response:", error.response?.data);
    }
  };

const fetchAvailableShifts = async () => {
  if (!isStaff) return;
  try {
    console.log('📡 Fetching available shifts...');
    const token = localStorage.getItem('token');
    const res = await axios.get(
      `${process.env.REACT_APP_API_URL}/swaps/available`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Available shifts response:', res.data);
    
    // The backend should already filter, but just in case:
    const filtered = (res.data.data || []).filter(shift => 
      !shift.assignedStaff?.includes(user?.id) && 
      !shift.assignedStaff?.includes(user?._id)
    );
    
    setAvailableShifts(filtered);
  } catch (error) {
    console.error("❌ Error fetching available shifts:", error);
  }
};

  const showMessage = (severity, message) => {
    setSnackbar({ open: true, severity, message });
  };

  const handleRequestSwap = (shift) => {
    console.log("🔘 Request Swap clicked for shift:", shift?._id);
    setSelectedShift(shift);
    setSelectedTargetStaff("");
    setRequestNote("");
    setOpenSwapDialog(true);
  };

  const handleRequestDrop = (shift) => {
    console.log("🔘 Drop Shift clicked for shift:", shift?._id);
    setSelectedShift(shift);
    setRequestNote("");
    setOpenDropDialog(true);
  };

  const submitSwapRequest = async () => {
    if (!selectedTargetStaff) {
      showMessage("error", "Please select a staff member");
      return;
    }

    setSubmitting(true);
    try {
      console.log("📤 Submitting swap request:", {
        shiftId: selectedShift._id,
        targetStaffId: selectedTargetStaff,
        type: "swap",
        notes: requestNote,
      });

      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/swaps/request`,
        {
          shiftId: selectedShift._id,
          targetStaffId: selectedTargetStaff,
          type: "swap",
          notes: requestNote,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      console.log("✅ Swap request response:", res.data);
      showMessage("success", "Swap request submitted successfully!");
      setOpenSwapDialog(false);
      fetchAllData();
    } catch (error) {
      console.error("❌ Error submitting swap:", error);
      console.error("Error response:", error.response?.data);
      const message =
        error.response?.data?.message || "Failed to submit swap request";
      showMessage("error", message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitDropRequest = async () => {
    setSubmitting(true);
    try {
      console.log("📤 Submitting drop request for shift:", selectedShift._id);
      const token = localStorage.getItem("token");

      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/swaps/request`,
        {
          shiftId: selectedShift._id,
          type: "drop",
          notes: requestNote,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      console.log("✅ Drop request response:", res.data);
      showMessage(
        "success",
        "Drop request submitted! Waiting for manager approval.",
      );
      setOpenDropDialog(false);
      fetchAllData();
    } catch (error) {
      console.error("❌ Error submitting drop request:", error);
      const message =
        error.response?.data?.message || "Failed to submit drop request";
      showMessage("error", message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveRequest = async (request, shift) => {
    try {
      console.log("🔘 Approving request:", request._id);
      const token = localStorage.getItem("token");

      const res = await axios.put(
        `${process.env.REACT_APP_API_URL}/swaps/${request._id}`,
        { status: "approved" },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      console.log("✅ Approve response:", res.data);
      showMessage("success", "Request approved successfully!");

      // Refresh all data to remove approved request from list
      fetchAllData();
    } catch (error) {
      console.error("❌ Error approving request:", error);
      console.error("Error response:", error.response?.data);
      const message =
        error.response?.data?.message || "Failed to approve request";
      showMessage("error", message);
    }
  };

  const handleRejectRequest = async (request, shift) => {
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/swaps/${request._id}`,
        { status: "rejected" },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showMessage("success", "Request rejected");
      fetchAllData();
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to reject request";
      showMessage("error", message);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm("Are you sure you want to cancel this request?"))
      return;

    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/swaps/${requestId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showMessage("success", "Request cancelled");
      fetchAllData();
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to cancel request";
      showMessage("error", message);
    }
  };

const handlePickupShift = async (shift) => {
  try {
    console.log('📤 Picking up shift:', shift._id);
    const token = localStorage.getItem('token');
    
    // Instead of creating a swap request, directly assign the shift
    const res = await axios.put(
      `${process.env.REACT_APP_API_URL}/shifts/${shift._id}/assign`,
      { 
        staffId: user?.id || user?._id,
        reason: 'Picked up from available shifts'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('✅ Pickup successful:', res.data);
    showMessage("success", "Shift picked up successfully!");
    fetchAllData();
  } catch (error) {
    console.error("❌ Error picking up shift:", error);
    const message = error.response?.data?.message || "Failed to pick up shift";
    showMessage("error", message);
  }
};

  const getStaffName = (staffId) => {
    if (!staffId) return "Unknown";
    const s = staff.find((s) => s._id === staffId);
    return s?.name || "Unknown";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "warning";
      case "approved":
        return "success";
      case "rejected":
        return "error";
      case "cancelled":
        return "default";
      case "expired":
        return "default";
      default:
        return "default";
    }
  };

  // Define tab display conditions
  const showMyShifts =
    (isStaff && tabValue === 2) || (isManager && tabValue === 1);
  const showMyRequests = isStaff && tabValue === 0;
  const showAvailableShifts = isStaff && tabValue === 1;
  const showPendingApprovals = isManager && tabValue === 0;

  if (loading || authLoading) {
    return (
      <Layout>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* TEMPORARY TEST BUTTON - Highly visible */}
      <Box
        sx={{
          position: "fixed",
          top: 10,
          left: 10,
          zIndex: 99999,
          backgroundColor: "red",
          p: 2,
          borderRadius: 1,
        }}
      >
        <Button
          variant="contained"
          color="warning"
          size="large"
          onClick={() => {
            console.log("🧪 TEST BUTTON CLICKED");
            alert("Test button clicked!");
            setOpenSwapDialog(true);
          }}
        >
          🧪 TEST DIALOG
        </Button>
      </Box>

      <Box sx={{ p: 3 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h4">Shift Swapping & Coverage</Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchAllData}
          >
            Refresh
          </Button>
        </Box>

        {/* Tabs for different views */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            {isStaff && <Tab label="My Requests" />}
            {isStaff && <Tab label="Available Shifts" />}
            {isManager && <Tab label="Pending Approvals" />}
            <Tab label="My Shifts" />
          </Tabs>
        </Box>

        {/* My Shifts Tab */}
        {showMyShifts && (
          <Grid container spacing={3}>
            {shifts
              .filter((shift) => {
                return shift.assignedStaff?.some((s) => {
                  const staffId = s._id || s;
                  return staffId === user?._id || staffId === user?.id;
                });
              })
              .map((shift) => (
                <Grid size={{ xs: 12, md: 6 }} key={shift._id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">
                        {shift.location?.name}
                      </Typography>
                      <Typography color="textSecondary">
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
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Skill: {shift.requiredSkill} • Staff:{" "}
                        {shift.assignedStaff?.length}/{shift.requiredCount}
                      </Typography>
                      <Box mt={2} display="flex" gap={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<SwapIcon />}
                          onClick={() => handleRequestSwap(shift)}
                          disabled={staff.length < 2}
                        >
                          Request Swap
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          startIcon={<DropIcon />}
                          onClick={() => handleRequestDrop(shift)}
                        >
                          Drop Shift
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            {shifts.filter((shift) =>
              shift.assignedStaff?.some((s) => {
                const staffId = s._id || s;
                return staffId === user?._id || staffId === user?.id;
              }),
            ).length === 0 && (
              <Grid size={12}>
                <Alert severity="info">
                  You don't have any assigned shifts
                </Alert>
              </Grid>
            )}
          </Grid>
        )}

        {/* My Requests Tab (Staff) */}
        {showMyRequests && (
          <Grid container spacing={3}>
            {myRequests.length > 0 ? (
              myRequests.map((req) => (
                <Grid size={12} key={req._id}>
                  <Card>
                    <CardContent>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography variant="subtitle1">
                          {req.type === "swap"
                            ? "Swap Request"
                            : "Drop Request"}
                        </Typography>
                        <Chip
                          label={req.status}
                          size="small"
                          color={getStatusColor(req.status)}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>Shift:</strong> {req.shiftInfo?.location?.name}{" "}
                        • {new Date(req.shiftInfo?.startTime).toLocaleString()}
                      </Typography>
                      {req.targetStaff && (
                        <Typography variant="body2">
                          <strong>With:</strong> {getStaffName(req.targetStaff)}
                        </Typography>
                      )}
                      {req.notes && (
                        <Typography
                          variant="body2"
                          sx={{ mt: 1, fontStyle: "italic" }}
                        >
                          "{req.notes}"
                        </Typography>
                      )}
                      {req.status === "pending" && (
                        <Box mt={2}>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleCancelRequest(req._id)}
                          >
                            Cancel Request
                          </Button>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : (
              <Grid size={12}>
                <Alert severity="info">You have no pending requests</Alert>
              </Grid>
            )}
          </Grid>
        )}

        {/* Available Shifts Tab (Staff) */}
        {showAvailableShifts && (
          <Grid container spacing={3}>
            {availableShifts.length > 0 ? (
              availableShifts.map((shift) => (
                <Grid size={{ xs: 12, md: 6 }} key={shift._id}>
                  <Card sx={{ border: "2px solid #4caf50" }}>
                    <CardContent>
                      <Typography variant="h6">
                        {shift.location?.name}
                      </Typography>
                      <Typography>
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
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Skill: {shift.requiredSkill} • Staff Needed:{" "}
                        {shift.requiredCount -
                          (shift.assignedStaff?.length || 0)}
                      </Typography>
                      <Box mt={2}>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<PickupIcon />}
                          onClick={() => handlePickupShift(shift)}
                        >
                          Pick Up Shift
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : (
              <Grid size={12}>
                <Alert severity="info">No shifts available for pickup</Alert>
              </Grid>
            )}
          </Grid>
        )}

        {/* Pending Approvals Tab (Manager) */}
        {/* Pending Approvals Tab (Manager) */}
        {showPendingApprovals && (
          <Grid container spacing={3}>
            {pendingRequests.length > 0 ? (
              pendingRequests.map((req) => (
                <Grid size={12} key={req._id}>
                  <Card
                    sx={{
                      borderLeft:
                        req.type === "drop"
                          ? "4px solid #ff9800"
                          : "4px solid #2196f3",
                    }}
                  >
                    <CardContent>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Box display="flex" alignItems="center" gap={1}>
                          {req.type === "drop" ? (
                            <DropIcon color="warning" />
                          ) : (
                            <SwapIcon color="primary" />
                          )}
                          <Typography variant="subtitle1">
                            {req.type === "swap"
                              ? "Swap Request"
                              : "Drop Request"}
                          </Typography>
                        </Box>
                        <Chip
                          label={req.type === "drop" ? "DROP" : "SWAP"}
                          size="small"
                          color={req.type === "drop" ? "warning" : "info"}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>From:</strong>{" "}
                        {getStaffName(req.requestingStaff)}
                      </Typography>
                      {req.type === "drop" && (
                        <Typography variant="body2" color="warning.main">
                          <strong>⚠️ Staff wants to drop this shift</strong>
                        </Typography>
                      )}
                      <Typography variant="body2">
                        <strong>Shift:</strong> {req.shiftInfo?.location?.name}{" "}
                        • {new Date(req.shiftInfo?.startTime).toLocaleString()}
                      </Typography>
                      {req.notes && (
                        <Typography
                          variant="body2"
                          sx={{ mt: 1, fontStyle: "italic" }}
                        >
                          "{req.notes}"
                        </Typography>
                      )}
                      <Box mt={2} display="flex" gap={1}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<ApproveIcon />}
                          onClick={() =>
                            handleApproveRequest(req, req.shiftInfo)
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          startIcon={<RejectIcon />}
                          onClick={() =>
                            handleRejectRequest(req, req.shiftInfo)
                          }
                        >
                          Reject
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : (
              <Grid size={12}>
                <Alert severity="info">No pending approvals</Alert>
              </Grid>
            )}
          </Grid>
        )}

        {/* Swap Request Dialog */}
        <Dialog
          open={openSwapDialog}
          onClose={() => setOpenSwapDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Request Shift Swap</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Shift:</strong> {selectedShift?.location?.name} •{" "}
                {selectedShift &&
                  new Date(selectedShift.startTime).toLocaleString()}
              </Typography>

              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Swap With</InputLabel>
                <Select
                  value={selectedTargetStaff}
                  onChange={(e) => setSelectedTargetStaff(e.target.value)}
                  label="Swap With"
                >
                  {staff
                    .filter((s) => s._id !== user?._id && s._id !== user?.id)
                    .map((s) => (
                      <MenuItem key={s._id} value={s._id}>
                        {s.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason/Notes (optional)"
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                sx={{ mt: 2 }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setOpenSwapDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={submitSwapRequest}
              variant="contained"
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={24} /> : "Submit Request"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Drop Request Dialog */}
        <Dialog
          open={openDropDialog}
          onClose={() => setOpenDropDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Drop Shift</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Shift:</strong> {selectedShift?.location?.name} •{" "}
                {selectedShift &&
                  new Date(selectedShift.startTime).toLocaleString()}
              </Typography>

              <Alert severity="info" sx={{ mt: 2 }}>
                This shift will be available for other staff to pick up. It will
                expire 24 hours before the shift start time.
              </Alert>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason/Notes (optional)"
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                sx={{ mt: 2 }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setOpenDropDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={submitDropRequest}
              variant="contained"
              color="warning"
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={24} /> : "Drop Shift"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for messages */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Layout>
  );
};

export default SwapRequests;
