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
  Avatar,
  Divider,
} from "@mui/material";
import {
  SwapHoriz as SwapIcon,
  Check as ApproveIcon,
  Close as RejectIcon,
  EventBusy as DropIcon,
  EventAvailable as PickupIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Note as NoteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Check as CheckIcon, // Add this
  HourglassEmpty as HourglassEmptyIcon, // Add this
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
  const [checkingPickupOvertime, setCheckingPickupOvertime] = useState(false);
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

  // Calculate tabs based on role
  const getTabs = () => {
    const tabs = [];

    // Only staff can see "My Shifts"
    if (isStaff) {
      tabs.push({ label: "My Shifts", index: 0 });
    }

    if (isStaff) {
      tabs.push({ label: "My Requests", index: tabs.length });
      tabs.push({ label: "Available Shifts", index: tabs.length });
    }

    if (isManager) {
      tabs.push({ label: "Pending Approvals", index: 0 });
    }

    return tabs;
  };

  const tabs = getTabs();

  // Determine which tab content to show
  const showMyShifts = isStaff && tabValue === 0;
  const showMyRequests = isStaff && tabValue === (isStaff ? 1 : -1);
  const showAvailableShifts = isStaff && tabValue === (isStaff ? 2 : -1);
  const showPendingApprovals = isManager && tabValue === 0;

  // Reset tab when role changes
  useEffect(() => {
    setTabValue(0);
  }, [isStaff, isManager]);

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

      let requests = res.data.data || [];

      // Sort: pending first, then pending_approval, then others
      requests.sort((a, b) => {
        const statusOrder = {
          pending: 1,
          pending_approval: 2,
          approved: 3,
          rejected: 4,
          cancelled: 5,
        };
        return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      });

      setMyRequests(requests);
    } catch (error) {
      console.error("❌ Error fetching my requests:", error);
    }
  };

  const fetchPendingApprovals = async () => {
    if (!isManager) {
      console.log("⏭️ Skipping pending approvals - not a manager");
      return;
    }
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
      console.log("📡 Fetching available shifts...");
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/swaps/available`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      console.log("✅ Available shifts response:", res.data);

      // The backend should already filter, but just in case:
      const filtered = (res.data.data || []).filter(
        (shift) =>
          !shift.assignedStaff?.includes(user?.id) &&
          !shift.assignedStaff?.includes(user?._id),
      );

      setAvailableShifts(filtered);
    } catch (error) {
      console.error("❌ Error fetching available shifts:", error);
    }
  };

  const showMessage = (severity, message) => {
    setSnackbar({ open: true, severity, message });
  };

  // Staff B accepts a swap request
const handleAcceptSwap = async (requestId) => {
  console.log('✅ Staff B accepting swap:', requestId);
  try {
    await axios.put(
      `${process.env.REACT_APP_API_URL}/swaps/${requestId}/accept`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    showMessage("success", "Swap accepted! Waiting for manager approval.");
    fetchAllData();
  } catch (error) {
    console.error('❌ Error accepting swap:', error);
    showMessage("error", error.response?.data?.message || "Failed to accept swap");
  }
};

// Staff B rejects a swap request
const handleRejectSwap = async (requestId) => {
  console.log('❌ Staff B rejecting swap:', requestId);
  try {
    await axios.put(
      `${process.env.REACT_APP_API_URL}/swaps/${requestId}/reject`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    showMessage("success", "Swap request rejected");
    fetchAllData();
  } catch (error) {
    console.error('❌ Error rejecting swap:', error);
    showMessage("error", error.response?.data?.message || "Failed to reject swap");
  }
};

// Staff A withdraws their request
const handleWithdrawRequest = async (requestId) => {
  if (!window.confirm("Are you sure you want to withdraw this request?")) return;
  
  console.log('🗑️ Withdrawing request:', requestId);
  try {
    await axios.delete(
      `${process.env.REACT_APP_API_URL}/swaps/${requestId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    showMessage("success", "Request withdrawn successfully");
    fetchAllData();
  } catch (error) {
    console.error('❌ Error withdrawing request:', error);
    showMessage("error", error.response?.data?.message || "Failed to withdraw request");
  }
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
      const token = localStorage.getItem("token");

      console.log(
        "📤 Sending request to:",
        `${process.env.REACT_APP_API_URL}/swaps/request`,
      );
      console.log("📤 Payload:", {
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

      console.log("✅ Response:", res.data);
      showMessage("success", "Swap request submitted successfully!");
      setOpenSwapDialog(false);
      fetchAllData();
    } catch (error) {
      console.error("❌ Error:", error);
      console.error("Response:", error.response?.data);
      showMessage("error", error.response?.data?.message || "Request failed");
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

  // Manager approve (works for both pending and pending_approval)
  const handleApproveRequest = async (requestId) => {
    console.log("✅ Approving request:", requestId);
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/swaps/${requestId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      showMessage("success", "Request approved successfully");
      fetchAllData();
    } catch (error) {
      console.error("❌ Error:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to approve",
      );
    }
  };

  const handleCancelRequest = async (requestId) => {
    console.log("🗑️ Attempting to cancel request:", requestId);
    console.log("👤 Current user:", user?._id || user?.id);

    // Find the request in myRequests to check who created it
    const request = myRequests.find((r) => r._id === requestId);
    console.log("📋 Request details:", {
      requestId: request?._id,
      requestingStaff: request?.requestingStaff,
      type: request?.type,
    });

    if (!window.confirm("Are you sure you want to cancel this request?"))
      return;

    try {
      const token = localStorage.getItem("token");

      await axios.delete(
        `${process.env.REACT_APP_API_URL}/swaps/${requestId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showMessage("success", "Request cancelled successfully");
      fetchAllData();
    } catch (error) {
      console.error("❌ Error cancelling request:", error);
      console.error("❌ Response:", error.response?.data);
      const message =
        error.response?.data?.message || "Failed to cancel request";
      showMessage("error", message);
    }
  };

  // Update handlePickupClick to perform the pickup directly
  const handlePickupClick = async (shift) => {
    try {
      console.log("📤 Picking up shift:", shift._id);
      const token = localStorage.getItem("token");
      const staffId = user?.id || user?._id;

      setCheckingPickupOvertime(true);

      const res = await axios.put(
        `${process.env.REACT_APP_API_URL}/shifts/${shift._id}/assign`,
        {
          staffId: staffId,
          reason: "Picked up from available shifts",
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      console.log("✅ Pickup successful:", res.data);
      showMessage("success", "Shift picked up successfully!");
      fetchAllData();
    } catch (error) {
      console.error("❌ Error picking up shift:", error);
      const message =
        error.response?.data?.message || "Failed to pick up shift";
      showMessage("error", message);
    } finally {
      setCheckingPickupOvertime(false);
      // setSelectedPickupShift(null);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      console.log("✅ Accepting request:", requestId);
      const token = localStorage.getItem("token");

      const res = await axios.put(
        `${process.env.REACT_APP_API_URL}/swaps/${requestId}`,
        { status: "accepted" }, // Target staff accepts
        { headers: { Authorization: `Bearer ${token}` } },
      );

      console.log("✅ Accept response:", res.data);
      showMessage(
        "success",
        "Swap request accepted! Waiting for manager approval.",
      );
      fetchAllData();
    } catch (error) {
      console.error("❌ Error accepting request:", error);
      const message =
        error.response?.data?.message || "Failed to accept request";
      showMessage("error", message);
    }
  };


  // Manager reject (works for both pending and pending_approval)
  const handleRejectRequest = async (requestId) => {
    console.log("❌ Rejecting request:", requestId);
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/swaps/${requestId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      showMessage("success", "Request rejected");
      fetchAllData();
    } catch (error) {
      console.error("❌ Error:", error);
      showMessage("error", error.response?.data?.message || "Failed to reject");
    }
  };

  const getStaffName = (staffId) => {
    if (!staffId) return "Unknown";
    const s = staff.find((s) => s._id === staffId);
    return s?.name || "Unknown";
  };

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

        {/* Tabs for different views - FIXED VERSION */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            {tabs.map((tab) => (
              <Tab key={tab.index} label={tab.label} />
            ))}
          </Tabs>
        </Box>

        {/* My Shifts Tab - STYLED LIKE MY REQUESTS */}
        {showMyShifts && (
          <Box sx={{ width: "100%" }}>
            {/* Header Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                My Assigned Shifts
              </Typography>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <Chip
                  label={`${
                    shifts.filter((shift) =>
                      shift.assignedStaff?.some((s) => {
                        const staffId = s._id || s;
                        return staffId === user?._id || staffId === user?.id;
                      }),
                    ).length
                  } Shifts`}
                  color="primary"
                  sx={{ fontWeight: "bold" }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                View and manage your upcoming shifts
              </Typography>
            </Box>

            {/* Cards Grid - 2 columns on desktop */}
            <Grid container spacing={3}>
              {shifts
                .filter((shift) => {
                  return shift.assignedStaff?.some((s) => {
                    const staffId = s._id || s;
                    return staffId === user?._id || staffId === user?.id;
                  });
                })
                .map((shift) => (
                  <Grid item xs={12} md={6} key={shift._id}>
                    <Card
                      sx={{
                        borderRadius: 2,
                        boxShadow: 3,
                        height: "100%",
                        position: "relative",
                        overflow: "visible",
                        "&:hover": {
                          boxShadow: 6,
                          transform: "translateY(-2px)",
                          transition: "all 0.2s",
                        },
                      }}
                    >
                      {/* Status ribbon */}
                      <Box
                        sx={{
                          position: "absolute",
                          top: 12,
                          right: -4,
                          bgcolor:
                            shift.status === "published"
                              ? "#4caf50"
                              : shift.status === "draft"
                                ? "#ff9800"
                                : "#2196f3",
                          color: "white",
                          px: 2,
                          py: 0.5,
                          borderTopLeftRadius: 4,
                          borderBottomLeftRadius: 4,
                          fontWeight: "bold",
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                          boxShadow: 1,
                        }}
                      >
                        {shift.status === "published"
                          ? "PUBLISHED"
                          : shift.status === "draft"
                            ? "DRAFT"
                            : shift.status?.toUpperCase()}
                      </Box>

                      <CardContent>
                        {/* Header with icon and location */}
                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                          <Avatar
                            sx={{
                              bgcolor: "#1976d2",
                              width: 40,
                              height: 40,
                            }}
                          >
                            <SwapIcon />
                          </Avatar>
                          <Box>
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: "bold" }}
                            >
                              {shift.location?.name || "Unknown Location"}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {shift.requiredSkill} •{" "}
                              {shift.assignedStaff?.length}/
                              {shift.requiredCount} assigned
                            </Typography>
                          </Box>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        {/* Shift Details */}
                        <Box
                          sx={{
                            bgcolor: "#f5f5f5",
                            p: 2,
                            borderRadius: 1,
                            mb: 2,
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            gutterBottom
                          >
                            SHIFT DETAILS
                          </Typography>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Date
                              </Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {shift.startTime
                                  ? new Date(
                                      shift.startTime,
                                    ).toLocaleDateString([], {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "Unknown"}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Time
                              </Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {shift.startTime
                                  ? new Date(
                                      shift.startTime,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "??"}{" "}
                                -
                                {shift.endTime
                                  ? new Date(shift.endTime).toLocaleTimeString(
                                      [],
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )
                                  : "??"}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Skill Required
                              </Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {shift.requiredSkill || "Unknown"}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Your Role
                              </Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {shift.requiredSkill}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Box>

                        {/* Action Buttons */}
                        <Box
                          display="flex"
                          gap={1}
                          justifyContent="center"
                          mt={2}
                        >
                          <Button
                            size="medium"
                            variant="outlined"
                            startIcon={<SwapIcon />}
                            onClick={() => handleRequestSwap(shift)}
                            disabled={staff.length < 2}
                            sx={{
                              borderRadius: 2,
                              flex: 1,
                              "&:hover": {
                                bgcolor: "#e3f2fd",
                              },
                            }}
                          >
                            Request Swap
                          </Button>
                          <Button
                            size="medium"
                            variant="outlined"
                            color="warning"
                            startIcon={<DropIcon />}
                            onClick={() => handleRequestDrop(shift)}
                            sx={{
                              borderRadius: 2,
                              flex: 1,
                              "&:hover": {
                                bgcolor: "#fff3e0",
                              },
                            }}
                          >
                            Drop Shift
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}

              {/* Empty state */}
              {shifts.filter((shift) =>
                shift.assignedStaff?.some((s) => {
                  const staffId = s._id || s;
                  return staffId === user?._id || staffId === user?.id;
                }),
              ).length === 0 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 4, textAlign: "center", bgcolor: "#f5f5f5" }}>
                    <SwapIcon sx={{ fontSize: 60, color: "#9e9e9e", mb: 2 }} />
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      gutterBottom
                    >
                      No Shifts Assigned
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      You don't have any upcoming shifts assigned to you.
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      Check back later or contact your manager.
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {/* ========== BEAUTIFUL MY REQUESTS TAB ========== */}
        {showMyRequests && (
          <Box sx={{ width: "100%" }}>
            {/* Header Section - Full width */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                My Swap & Drop Requests
              </Typography>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <Chip
                  label={`${myRequests.length} Requests`}
                  color={myRequests.length > 0 ? "warning" : "default"}
                  sx={{ fontWeight: "bold" }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Track the status of your shift swap and drop requests
              </Typography>
            </Box>

            {/* Cards Grid - 2 columns on desktop */}
            <Grid container spacing={3}>
              {myRequests.length > 0 ? (
                myRequests.map((req) => (
                  <Grid item xs={12} md={6} key={req._id}>
                    <Card
                      sx={{
                        borderRadius: 2,
                        boxShadow: 3,
                        position: "relative",
                      }}
                    >
                      {/* Status Ribbon - SINGLE status indicator */}
                      <Box
                        sx={{
                          position: "absolute",
                          top: 12,
                          right: -4,
                          bgcolor:
                            req.status === "approved"
                              ? "#4caf50"
                              : req.status === "rejected"
                                ? "#f44336"
                                : req.status === "pending"
                                  ? "#ff9800"
                                  : req.status === "pending_approval"
                                    ? "#2196f3"
                                    : "#9e9e9e",
                          color: "white",
                          px: 2,
                          py: 0.5,
                          borderTopLeftRadius: 4,
                          borderBottomLeftRadius: 4,
                          fontWeight: "bold",
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                          boxShadow: 1,
                        }}
                      >
                        {req.status === "approved"
                          ? "APPROVED"
                          : req.status === "rejected"
                            ? "REJECTED"
                            : req.status === "pending"
                              ? "WAITING FOR MANAGER"
                              : req.status === "pending_approval"
                                ? "READY FOR APPROVAL"
                                : req.status}
                      </Box>

                      <CardContent>
                        {/* Header with icon and type */}
                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                          <Avatar
                            sx={{
                              bgcolor:
                                req.type === "swap" ? "#2196f3" : "#ff9800",
                            }}
                          >
                            {req.type === "swap" ? <SwapIcon /> : <DropIcon />}
                          </Avatar>
                          <Box>
                            <Typography variant="h6">
                              {req.type === "swap"
                                ? "Swap Request"
                                : "Drop Request"}
                            </Typography>
                            <Typography variant="caption">
                              {req.userRole === "requester"
                                ? "You requested"
                                : "Requested for you"}{" "}
                              •{new Date(req.requestedAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        {/* Shift Details */}
                        <Box
                          sx={{
                            bgcolor: "#f5f5f5",
                            p: 2,
                            borderRadius: 1,
                            mb: 2,
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            gutterBottom
                          >
                            SHIFT DETAILS
                          </Typography>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Location
                              </Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {req.shiftInfo?.location?.name || "Unknown"}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Date
                              </Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {new Date(
                                  req.shiftInfo?.startTime,
                                ).toLocaleDateString()}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Time
                              </Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {new Date(
                                  req.shiftInfo?.startTime,
                                ).toLocaleTimeString()}{" "}
                                -
                                {new Date(
                                  req.shiftInfo?.endTime,
                                ).toLocaleTimeString()}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Box>

                        {/* Target Staff (for swaps) */}
                        {req.type === "swap" && req.targetStaff && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mb: 2,
                            }}
                          >
                            <PersonIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              <strong>Target Staff:</strong>{" "}
                              {getStaffName(req.targetStaff)}
                            </Typography>
                          </Box>
                        )}

                        {/* Notes */}
                        {req.notes && (
                          <Box
                            sx={{
                              bgcolor: "#fff3e0",
                              p: 1.5,
                              borderRadius: 1,
                              mb: 2,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <NoteIcon fontSize="small" color="warning" /> Note
                            </Typography>
                            <Typography variant="body2" fontStyle="italic">
                              "{req.notes}"
                            </Typography>
                          </Box>
                        )}

                        {/* Action Buttons - Only show for pending requests */}
                        {req.status === "pending" && (
                          <Box
                            display="flex"
                            gap={1}
                            justifyContent="flex-end"
                            mt={2}
                          >
                            {/* If current user is the requester (Staff A) - Show Withdraw */}
                            {req.userRole === "requester" && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<RejectIcon />}
                                onClick={() => handleWithdrawRequest(req._id)}
                              >
                                Withdraw Request
                              </Button>
                            )}

                            {/* If current user is the target (Staff B) - Show Accept/Decline */}
                            {req.userRole === "target" && (
                              <>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<RejectIcon />}
                                  onClick={() => handleRejectSwap(req._id)}
                                >
                                  Decline
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={<CheckIcon />}
                                  onClick={() => handleAcceptSwap(req._id)}
                                >
                                  Accept
                                </Button>
                              </>
                            )}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Paper sx={{ p: 4, textAlign: "center" }}>
                    <Typography>No requests found</Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {/* Available Shifts Tab (Staff) - STYLED LIKE MY REQUESTS */}
        {showAvailableShifts && (
          <Box sx={{ width: "100%" }}>
            {/* Header Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                Shifts Available for Pickup
              </Typography>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <Chip
                  label={`${availableShifts.length} Available`}
                  color={availableShifts.length > 0 ? "success" : "default"}
                  sx={{ fontWeight: "bold" }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Pick up shifts that have been dropped and need coverage
              </Typography>
            </Box>

            {/* Cards Grid - 2 columns on desktop */}
            <Grid container spacing={3}>
              {availableShifts.length > 0 ? (
                availableShifts.map((shift) => (
                  <Grid item xs={12} md={6} key={shift._id}>
                    <Card
                      sx={{
                        borderRadius: 2,
                        boxShadow: 3,
                        height: "100%",
                        position: "relative",
                        overflow: "visible",
                        border: "2px solid #4caf50",
                        bgcolor: "#f8fff8",
                        "&:hover": {
                          boxShadow: 6,
                          transform: "translateY(-2px)",
                          transition: "all 0.2s",
                        },
                      }}
                    >
                      {/* Available ribbon */}
                      <Box
                        sx={{
                          position: "absolute",
                          top: 12,
                          right: -4,
                          bgcolor: "#4caf50",
                          color: "white",
                          px: 2,
                          py: 0.5,
                          borderTopLeftRadius: 4,
                          borderBottomLeftRadius: 4,
                          fontWeight: "bold",
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                          boxShadow: 1,
                        }}
                      >
                        AVAILABLE FOR PICKUP
                      </Box>

                      <CardContent>
                        {/* Header with icon and type */}
                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                          <Avatar
                            sx={{
                              bgcolor: "#4caf50",
                              width: 40,
                              height: 40,
                            }}
                          >
                            <PickupIcon />
                          </Avatar>
                          <Box>
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: "bold", color: "#2e7d32" }}
                            >
                              Shift Available
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {shift.location?.name}
                            </Typography>
                          </Box>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        {/* Shift Details */}
                        <Box
                          sx={{
                            bgcolor: "#f5f5f5",
                            p: 2,
                            borderRadius: 1,
                            mb: 2,
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            gutterBottom
                          >
                            SHIFT DETAILS
                          </Typography>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Date
                              </Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {shift.startTime
                                  ? new Date(
                                      shift.startTime,
                                    ).toLocaleDateString([], {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "Unknown"}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Time
                              </Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {shift.startTime
                                  ? new Date(
                                      shift.startTime,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "??"}{" "}
                                -
                                {shift.endTime
                                  ? new Date(shift.endTime).toLocaleTimeString(
                                      [],
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )
                                  : "??"}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Skill Required
                              </Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {shift.requiredSkill || "Unknown"}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Staff Needed
                              </Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {shift.requiredCount -
                                  (shift.assignedStaff?.length || 0)}{" "}
                                of {shift.requiredCount}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Box>

                        {/* Quick Stats */}
                        <Box
                          sx={{
                            display: "flex",
                            gap: 2,
                            mb: 2,
                            justifyContent: "space-around",
                          }}
                        >
                          <Box textAlign="center">
                            <Typography
                              variant="h6"
                              color="primary"
                              sx={{ fontWeight: "bold" }}
                            >
                              {shift.requiredSkill}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Skill
                            </Typography>
                          </Box>
                          <Box textAlign="center">
                            <Typography
                              variant="h6"
                              color="success.main"
                              sx={{ fontWeight: "bold" }}
                            >
                              {shift.location?.name?.split(" ")[0] || "N/A"}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Location
                            </Typography>
                          </Box>
                        </Box>

                        {/* In the Available Shifts card, replace the button section */}
                        <Box display="flex" flexDirection="column" gap={1}>
                          <Button
                            variant="contained"
                            color="success"
                            startIcon={<PickupIcon />}
                            onClick={() => handlePickupClick(shift)}
                            fullWidth
                            disabled={checkingPickupOvertime}
                          >
                            {checkingPickupOvertime
                              ? "Picking up..."
                              : "Pick Up Shift"}
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Paper sx={{ p: 4, textAlign: "center", bgcolor: "#f5f5f5" }}>
                    <PickupIcon
                      sx={{ fontSize: 60, color: "#9e9e9e", mb: 2 }}
                    />
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      gutterBottom
                    >
                      No Shifts Available
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      There are no shifts available for pickup right now.
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      Check back later or request to swap your own shifts.
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {/* Pending Approvals Tab */}
        {showPendingApprovals && (
          <Box>
            <Typography variant="h5" gutterBottom>
              Pending Approvals
              <Chip
                label={`${pendingRequests.length} pending`}
                color="warning"
                sx={{ ml: 2 }}
              />
            </Typography>

            <Grid container spacing={3}>
              {pendingRequests.length > 0 ? (
                pendingRequests.map((req) => (
                  <Grid item xs={12} key={req._id}>
                    <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
                      <CardContent>
                        {/* Request header */}
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography variant="h6">
                            {req.type === "swap"
                              ? "Swap Request"
                              : "Drop Request"}
                          </Typography>
                          <Chip
                            label={req.status}
                            color={
                              req.status === "pending" ? "warning" : "info"
                            }
                          />
                        </Box>

                        {/* Request details */}
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                          <Grid item xs={12} sm={6}>
                            <Typography>
                              <strong>Requester:</strong>{" "}
                              {req.requestingStaffName}
                            </Typography>
                            <Typography>
                              <strong>Location:</strong>{" "}
                              {req.shiftInfo?.location?.name}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography>
                              <strong>Date:</strong>{" "}
                              {new Date(
                                req.shiftInfo?.startTime,
                              ).toLocaleDateString()}
                            </Typography>
                            <Typography>
                              <strong>Time:</strong>{" "}
                              {new Date(
                                req.shiftInfo?.startTime,
                              ).toLocaleTimeString()}
                            </Typography>
                          </Grid>
                          {req.type === "swap" && (
                            <Grid item xs={12}>
                              <Typography>
                                <strong>Target Staff:</strong>{" "}
                                {req.targetStaffName}
                              </Typography>
                            </Grid>
                          )}
                        </Grid>

                        {/* Notes */}
                        {req.notes && (
                          <Box
                            sx={{
                              bgcolor: "#fff3e0",
                              p: 1.5,
                              borderRadius: 1,
                              mt: 2,
                            }}
                          >
                            <Typography variant="caption">
                              Note: "{req.notes}"
                            </Typography>
                          </Box>
                        )}

                        {/* Action Buttons - Always show for managers */}
                        <Box
                          display="flex"
                          gap={1}
                          justifyContent="flex-end"
                          mt={2}
                        >
                          <Button
                            variant="outlined"
                            color="error"
                            startIcon={<RejectIcon />}
                            onClick={() => handleRejectRequest(req._id)}
                          >
                            Reject
                          </Button>
                          <Button
                            variant="contained"
                            color="success"
                            startIcon={<ApproveIcon />}
                            onClick={() => handleApproveRequest(req._id)}
                          >
                            Approve
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Paper sx={{ p: 4, textAlign: "center" }}>
                    <Typography>No pending approvals</Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
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
