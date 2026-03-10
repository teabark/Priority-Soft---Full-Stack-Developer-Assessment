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

  const { user } = useAuth();
  const isManager = user?.role === "admin" || user?.role === "manager";
  const isStaff = user?.role === "staff";

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchShifts(),
        fetchStaff(),
        fetchMyRequests(),
        fetchPendingApprovals(),
        fetchAvailableShifts(),
      ]);
    } catch (error) {
      showMessage("error", "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const fetchShifts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/shifts/simple-list`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setShifts(res.data.data || []);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      throw error;
    }
  };

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStaff(res.data.data?.filter((u) => u.role === "staff") || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
      throw error;
    }
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
      setMyRequests(res.data.data || []);
    } catch (error) {
      console.error("Error fetching my requests:", error);
    }
  };

  const fetchPendingApprovals = async () => {
    if (!isManager) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/swaps/pending-approvals`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setPendingRequests(res.data.data || []);
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
    }
  };

  const fetchAvailableShifts = async () => {
    if (!isStaff) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/swaps/available`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setAvailableShifts(res.data.data || []);
    } catch (error) {
      console.error("Error fetching available shifts:", error);
    }
  };

  const showMessage = (severity, message) => {
    setSnackbar({ open: true, severity, message });
  };

  const handleRequestSwap = (shift) => {
    console.log('🔘 Request Swap clicked for shift:', shift?._id);
    setSelectedShift(shift);
    setSelectedTargetStaff("");
    setRequestNote("");
    setOpenSwapDialog(true);
  };

  const handleRequestDrop = (shift) => {
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
      const token = localStorage.getItem("token");

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
      const token = localStorage.getItem("token");

      await axios.post(
        `${process.env.REACT_APP_API_URL}/swaps/request`,
        {
          shiftId: selectedShift._id,
          type: "drop",
          notes: requestNote,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showMessage("success", "Drop request submitted successfully!");
      setOpenDropDialog(false);
      fetchAllData();
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to submit drop request";
      showMessage("error", message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveRequest = async (request, shift) => {
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `${process.env.REACT_APP_API_URL}/swaps/${request._id}`,
        { status: "approved" },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showMessage("success", "Request approved successfully!");
      fetchAllData();
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to approve request";
      showMessage("error", message);
    }
  };

  const handleRejectRequest = async (request, shift) => {
    try {
      const token = localStorage.getItem("token");

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
      const token = localStorage.getItem("token");

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
      const token = localStorage.getItem("token");

      await axios.post(
        `${process.env.REACT_APP_API_URL}/swaps/request`,
        {
          shiftId: shift._id,
          type: "pickup",
          notes: "Interested in picking up this shift",
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showMessage(
        "success",
        "Pickup request submitted! A manager will review it.",
      );
      fetchAllData();
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to request pickup";
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

  if (loading) {
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

        {/* My Shifts Tab (Common for all) */}
        {tabValue === (isStaff ? 2 : 0) && (
          <Grid container spacing={3}>
            {shifts
              .filter((shift) =>
                shift.assignedStaff?.some((s) => s._id === user?.id),
              )
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
              shift.assignedStaff?.some((s) => s._id === user?.id),
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
        {isStaff && tabValue === 0 && (
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
        {isStaff && tabValue === 1 && (
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
        {isManager && tabValue === 0 && (
          <Grid container spacing={3}>
            {pendingRequests.length > 0 ? (
              pendingRequests.map((req) => (
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
                        <Chip label={req.status} size="small" color="warning" />
                      </Box>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>From:</strong>{" "}
                        {getStaffName(req.requestingStaff)}
                      </Typography>
                      {req.targetStaff && (
                        <Typography variant="body2">
                          <strong>With:</strong> {getStaffName(req.targetStaff)}
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
                    .filter((s) => s._id !== user?.id)
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