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
  Warning as WarningIcon,
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
import { useOvertime } from "../context/OvertimeContext";
import OvertimeWarning from "../components/overtime/OvertimeWarning";

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
  const { checkAssignment, overrideConsecutiveDays } = useOvertime();
  // const [pickupOvertimeCheck, setPickupOvertimeCheck] = useState(null);
  const [checkingPickupOvertime, setCheckingPickupOvertime] = useState(false);
  // const [selectedPickupShift, setSelectedPickupShift] = useState(null);

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

  // New function to actually perform pickup after checks
  // const confirmPickup = async (shift) => {
  //   const confirm = window.confirm(
  //     `Are you sure you want to pick up this shift?\n\n` +
  //       `Location: ${shift.location?.name}\n` +
  //       `Date: ${new Date(shift.startTime).toLocaleDateString()}\n` +
  //       `Time: ${new Date(shift.startTime).toLocaleTimeString()} - ${new Date(shift.endTime).toLocaleTimeString()}`,
  //   );

  //   if (!confirm) return;

  //   try {
  //     const token = localStorage.getItem("token");
  //     const staffId = user?.id || user?._id;

  //     const res = await axios.put(
  //       `${process.env.REACT_APP_API_URL}/shifts/${shift._id}/assign`,
  //       {
  //         staffId: staffId,
  //         reason: "Picked up from available shifts",
  //       },
  //       { headers: { Authorization: `Bearer ${token}` } },
  //     );

  //     showMessage("success", "Shift picked up successfully!");
  //     // setPickupOvertimeCheck(null);
  //     // setSelectedPickupShift(null);
  //     fetchAllData();
  //   } catch (error) {
  //     const message =
  //       error.response?.data?.message || "Failed to pick up shift";
  //     showMessage("error", message);
  //   }
  // };

  // // Handle override for pickup
  // const handlePickupOverride = async (reason) => {
  //   if (selectedPickupShift) {
  //     await overrideConsecutiveDays(
  //       user?._id || user?.id,
  //       selectedPickupShift._id,
  //       reason,
  //     );
  //     // Recheck after override
  // handlePickupClick(selectedPickupShift);
  //   }
  // };

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

  const handleRejectRequest = async (requestId) => {
    try {
      console.log("❌ Rejecting request:", requestId);
      const token = localStorage.getItem("token");

      const res = await axios.put(
        `${process.env.REACT_APP_API_URL}/swaps/${requestId}`,
        { status: "rejected" },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      console.log("✅ Reject response:", res.data);
      showMessage("success", "Swap request rejected");
      fetchAllData();
    } catch (error) {
      console.error("❌ Error rejecting request:", error);
      const message =
        error.response?.data?.message || "Failed to reject request";
      showMessage("error", message);
    }
  };

  const handlePickupShift = async (shift) => {
    try {
      console.log("📤 Picking up shift:", shift._id);
      const token = localStorage.getItem("token");
      const staffId = user?.id || user?._id;

      console.log("📤 Staff ID:", staffId);
      console.log(
        "📤 API URL:",
        `${process.env.REACT_APP_API_URL}/shifts/${shift._id}/assign`,
      );

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
      console.error("❌ Error response:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);
      const message =
        error.response?.data?.message || "Failed to pick up shift";
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
                            req.status === "pending"
                              ? "#ff9800"
                              : req.status === "approved"
                                ? "#4caf50"
                                : req.status === "rejected"
                                  ? "#f44336"
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
                        {req.status}
                      </Box>

                      <CardContent>
                        {/* Header with icon and type */}
                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                          <Avatar
                            sx={{
                              bgcolor:
                                req.type === "swap" ? "#2196f3" : "#ff9800",
                              width: 40,
                              height: 40,
                            }}
                          >
                            {req.type === "swap" ? <SwapIcon /> : <DropIcon />}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: "bold" }}
                            >
                              {req.type === "swap"
                                ? "Shift Swap Request"
                                : "Shift Drop Request"}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Requested on{" "}
                              {new Date(req.requestedAt).toLocaleDateString()}
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
                                {req.shiftInfo?.startTime
                                  ? new Date(
                                      req.shiftInfo.startTime,
                                    ).toLocaleDateString()
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
                                {req.shiftInfo?.startTime
                                  ? new Date(
                                      req.shiftInfo.startTime,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "??"}{" "}
                                -
                                {req.shiftInfo?.endTime
                                  ? new Date(
                                      req.shiftInfo.endTime,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "??"}
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
                            <Avatar
                              sx={{ width: 24, height: 24, bgcolor: "#2196f3" }}
                            >
                              <PersonIcon fontSize="small" />
                            </Avatar>
                            <Typography variant="body2">
                              <strong>Swapping with:</strong>{" "}
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
                              borderLeft: "4px solid #ff9800",
                              mb: 2,
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <NoteIcon fontSize="small" color="warning" /> Note
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ fontStyle: "italic" }}
                            >
                              "{req.notes}"
                            </Typography>
                          </Box>
                        )}

                        {/* If current user is the target staff and request is pending */}
                        {req.targetStaff === user?._id &&
                          req.status === "pending" && (
                            <Box
                              display="flex"
                              gap={1}
                              justifyContent="flex-end"
                              mt={2}
                            >
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                onClick={() => handleAcceptRequest(req._id)}
                              >
                                Accept Swap
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => handleRejectRequest(req._id)}
                              >
                                Decline
                              </Button>
                            </Box>
                          )}

                        {/* Action Buttons */}
                        {req.status === "pending" && (
                          <Box
                            display="flex"
                            gap={1}
                            justifyContent="flex-end"
                            mt={2}
                          >
                            {/* If current user is the target staff (Staff B) - Show Accept/Reject */}
                            {(req.targetStaff === user?._id ||
                              req.targetStaff === user?.id) && (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={<CheckIcon />}
                                  onClick={() => handleAcceptRequest(req._id)}
                                  sx={{ borderRadius: 2 }}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<RejectIcon />}
                                  onClick={() => handleRejectRequest(req._id)}
                                  sx={{ borderRadius: 2 }}
                                >
                                  Decline
                                </Button>
                              </>
                            )}

                            {/* If current user is the requester (Staff A) - Show Cancel */}
                            {(req.requestingStaff === user?._id ||
                              req.requestingStaff === user?.id) && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<RejectIcon />}
                                onClick={() => handleCancelRequest(req._id)}
                                sx={{ borderRadius: 2 }}
                              >
                                Cancel Request
                              </Button>
                            )}
                          </Box>
                        )}

                        {req.status === "pending_approval" && (
                          <Box display="flex" justifyContent="flex-end" mt={2}>
                            <Chip
                              icon={<HourglassEmptyIcon />}
                              label="Awaiting Manager Approval"
                              color="warning"
                              sx={{ fontWeight: "bold" }}
                            />
                          </Box>
                        )}

                        {req.status === "approved" && (
                          <Box display="flex" justifyContent="flex-end" mt={2}>
                            <Chip
                              icon={<CheckCircleIcon />}
                              label="Approved"
                              color="success"
                              sx={{ fontWeight: "bold" }}
                            />
                          </Box>
                        )}

                        {req.status === "rejected" && (
                          <Box display="flex" justifyContent="flex-end" mt={2}>
                            <Chip
                              icon={<ErrorIcon />}
                              label="Rejected"
                              color="error"
                              sx={{ fontWeight: "bold" }}
                            />
                          </Box>
                        )}

                        {req.status === "approved" && (
                          <Box display="flex" justifyContent="flex-end" mt={2}>
                            <Chip
                              icon={<CheckCircleIcon />}
                              label="Approved"
                              color="success"
                              sx={{ fontWeight: "bold" }}
                            />
                          </Box>
                        )}

                        {req.status === "rejected" && (
                          <Box display="flex" justifyContent="flex-end" mt={2}>
                            <Chip
                              icon={<ErrorIcon />}
                              label="Rejected"
                              color="error"
                              sx={{ fontWeight: "bold" }}
                            />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Paper sx={{ p: 4, textAlign: "center", bgcolor: "#f5f5f5" }}>
                    <DropIcon sx={{ fontSize: 60, color: "#9e9e9e", mb: 2 }} />
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      gutterBottom
                    >
                      No Pending Requests
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      You don't have any swap or drop requests at the moment.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<SwapIcon />}
                      sx={{ mt: 2 }}
                      onClick={() => setTabValue(2)}
                    >
                      Request a Swap
                    </Button>
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

        {/* Pending Approvals Tab (Manager) - ENHANCED VERSION */}
        {showPendingApprovals && (
          <Box sx={{ width: "100%" }}>
            {/* Header Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                Pending Approvals
                {pendingRequests.length > 0 && (
                  <Chip
                    label={`${pendingRequests.length} pending`}
                    color="warning"
                    size="small"
                    sx={{ ml: 2, fontWeight: "bold" }}
                  />
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review and approve/reject swap and drop requests from staff
              </Typography>
            </Box>

            {/* Requests Grid */}
            {pendingRequests.length > 0 ? (
              <Grid container spacing={3}>
                {pendingRequests.map((req) => (
                  <Grid item xs={12} key={req._id}>
                    <Card
                      sx={{
                        borderLeft:
                          req.type === "drop"
                            ? "4px solid #ff9800"
                            : "4px solid #2196f3",
                        borderRadius: 2,
                        boxShadow: 2,
                        "&:hover": {
                          boxShadow: 4,
                        },
                      }}
                    >
                      <CardContent>
                        {/* Header with type and requester */}
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          mb={2}
                        >
                          <Box display="flex" alignItems="center" gap={1}>
                            {req.type === "drop" ? (
                              <DropIcon sx={{ color: "#ff9800" }} />
                            ) : (
                              <SwapIcon sx={{ color: "#2196f3" }} />
                            )}
                            <Typography variant="h6">
                              {req.type === "swap"
                                ? "Swap Request"
                                : "Drop Request"}
                            </Typography>
                          </Box>
                          <Chip
                            label={req.type === "drop" ? "DROP" : "SWAP"}
                            size="small"
                            color={req.type === "drop" ? "warning" : "info"}
                            sx={{ fontWeight: "bold" }}
                          />
                        </Box>

                        {/* Requester info */}
                        <Box
                          sx={{
                            bgcolor: "#f5f5f5",
                            p: 1.5,
                            borderRadius: 1,
                            mb: 2,
                          }}
                        >
                          <Typography variant="body2">
                            <strong>Requested by:</strong>{" "}
                            {getStaffName(req.requestingStaff)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(req.requestedAt).toLocaleString()}
                          </Typography>
                        </Box>

                        {/* Shift Details */}
                        <Box sx={{ mb: 2 }}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            gutterBottom
                          >
                            SHIFT DETAILS
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
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
                            <Grid item xs={12} sm={6}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Date
                              </Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {req.shiftInfo?.startTime
                                  ? new Date(
                                      req.shiftInfo.startTime,
                                    ).toLocaleDateString()
                                  : "Unknown"}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Time
                              </Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {req.shiftInfo?.startTime
                                  ? new Date(
                                      req.shiftInfo.startTime,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "??"}{" "}
                                -{" "}
                                {req.shiftInfo?.endTime
                                  ? new Date(
                                      req.shiftInfo.endTime,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "??"}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Skill Required
                              </Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {req.shiftInfo?.requiredSkill || "Unknown"}
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
                              p: 1.5,
                              bgcolor: "#e3f2fd",
                              borderRadius: 1,
                            }}
                          >
                            <PersonIcon sx={{ color: "#1976d2" }} />
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
                              borderLeft: "4px solid #ff9800",
                              mb: 2,
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <NoteIcon fontSize="small" color="warning" />{" "}
                              Notes
                            </Typography>
                            <Typography variant="body2">
                              "{req.notes}"
                            </Typography>
                          </Box>
                        )}

                        {/* Action Buttons */}
                        <Box
                          display="flex"
                          gap={1}
                          justifyContent="flex-end"
                          mt={2}
                        >
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<RejectIcon />}
                            onClick={() =>
                              handleRejectRequest(req, req.shiftInfo)
                            }
                            sx={{ borderRadius: 2 }}
                          >
                            Reject
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<ApproveIcon />}
                            onClick={() =>
                              handleApproveRequest(req, req.shiftInfo)
                            }
                            sx={{ borderRadius: 2 }}
                          >
                            Approve
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Paper sx={{ p: 4, textAlign: "center", bgcolor: "#f5f5f5" }}>
                <CheckCircleIcon
                  sx={{ fontSize: 60, color: "#4caf50", mb: 2 }}
                />
                <Typography variant="h6" gutterBottom>
                  All Caught Up!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No pending approvals at the moment. Check back later.
                </Typography>
              </Paper>
            )}
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
