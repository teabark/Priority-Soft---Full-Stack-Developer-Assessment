import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  Fab,
  Alert,
  Grid,
  Card,
  CardContent,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  AvatarGroup,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  List as ListIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import Layout from "../components/layout/Layout";
import CreateShiftForm from "../components/shifts/CreateShiftForm";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
// import {
//   formatShiftTime,
//   getShiftDate,
//   isOvernightShift,
// } from "../utils/timezone";

const Shifts = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'calendar'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState("all");
  const [staffList, setStaffList] = useState([]);
  const { user } = useAuth();

  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    inProgress: 0,
    myShifts: 0,
  });

  const isManager = user?.role === "admin" || user?.role === "manager";
  const isStaff = user?.role === "staff";

  useEffect(() => {
    if (user) {
      fetchShifts();
      fetchStaff();
    }
  }, [user]);

  const fetchShifts = async () => {
    try {
      console.log("📡 Fetching shifts...");
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/shifts/simple-list`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      console.log("✅ Shifts response:", res.data);

      if (res.data.data && res.data.data.length > 0) {
        let filteredShifts = res.data.data;

        // For staff, ONLY show PUBLISHED shifts assigned to them
        // In Shifts.js, temporary debug version
        if (isStaff) {
          filteredShifts = res.data.data.filter((shift) => {
            const isAssigned = shift.assignedStaff?.some((s) => {
              const staffId = s._id || s.id || s;
              return staffId === user?.id || staffId === user?._id;
            });

            // TEMP: Show all assigned shifts for debugging
            if (isAssigned) {
              console.log(
                `👤 Found shift: ${new Date(shift.startTime).toLocaleDateString()} (${shift.status})`,
              );
            }

            return isAssigned; // No status filter
          });
        } else {
          // For managers, show all shifts but log status
          console.log("👔 Manager view - showing all shifts");
          const publishedCount = res.data.data.filter(
            (s) => s.status === "published",
          ).length;
          const draftCount = res.data.data.filter(
            (s) => s.status === "draft",
          ).length;
          console.log(
            `📊 Manager sees: ${publishedCount} published, ${draftCount} draft`,
          );
        }

        setShifts(filteredShifts);

        // Calculate stats
        const published = filteredShifts.filter(
          (s) => s.status === "published",
        ).length;
        const draft = filteredShifts.filter((s) => s.status === "draft").length;
        const inProgress = filteredShifts.filter(
          (s) => s.status === "in_progress",
        ).length;
        const myShifts = filteredShifts.length;

        setStats({
          total: filteredShifts.length,
          published,
          draft,
          inProgress,
          myShifts,
        });
      }
    } catch (error) {
      console.error("❌ Error fetching shifts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const staffMembers =
        res.data.data?.filter((u) => u.role === "staff") || [];
      setStaffList(staffMembers);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const handleCreateShift = () => {
    setEditShift(null);
    setOpenForm(true);
  };

  const handleEditShift = (shiftId) => {
    const shift = shifts.find((s) => s._id === shiftId);
    if (shift) {
      setEditShift(shift);
      setOpenForm(true);
    }
  };

  const handleDeleteShift = async (shiftId) => {
    const shift = shifts.find((s) => s._id === shiftId);
    if (
      !window.confirm(
        `Delete shift at ${shift?.location?.name} on ${new Date(
          shift?.startTime,
        ).toLocaleDateString()}?`,
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${process.env.REACT_APP_API_URL}/shifts/${shiftId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Shift deleted successfully");
      fetchShifts();
    } catch (error) {
      console.error("Error deleting shift:", error);
      alert(error.response?.data?.message || "Failed to delete shift");
    }
  };

  const handleFormClose = () => {
    setOpenForm(false);
    setEditShift(null);
  };

  const handleShiftSaved = () => {
    fetchShifts();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "published":
        return "success";
      case "draft":
        return "default";
      case "in_progress":
        return "info";
      case "completed":
        return "secondary";
      case "cancelled":
        return "error";
      default:
        return "default";
    }
  };

  // Calendar Functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  const getShiftsForDay = (day) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    let dayShifts = shifts.filter((shift) => {
      const shiftDate = new Date(shift.startTime);
      return shiftDate >= date && shiftDate < nextDay;
    });

    // Filter by selected staff
    if (selectedStaff !== "all") {
      dayShifts = dayShifts.filter((shift) =>
        shift.assignedStaff?.some((s) => s._id === selectedStaff),
      );
    }

    // 🔥 ADD THIS: Filter out draft shifts for staff
    if (user?.role === "staff") {
      dayShifts = dayShifts.filter((shift) => shift.status === "published");
    }

    return dayShifts;
  };

  const getStaffName = (staffId) => {
    const staff = staffList.find((s) => s._id === staffId);
    return staff?.name || "Unknown";
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  // Table columns
  const getColumns = () => {
    const baseColumns = [
      { field: "locationName", headerName: "Location", width: 150 },
      { field: "shiftDate", headerName: "Date", width: 120 },
      { field: "startTime", headerName: "Start", width: 100 },
      { field: "endTime", headerName: "End", width: 100 },
      { field: "shiftSkill", headerName: "Skill", width: 120 },
      // {
      //   field: "isOvernight",
      //   headerName: "🌙",
      //   width: 60,
      //   renderCell: (params) =>
      //     params.value ? (
      //       <Chip
      //         label="🌙"
      //         size="small"
      //         color="info"
      //         title="Overnight shift"
      //       />
      //     ) : null,
      // },
      { field: "requiredCount", headerName: "Needed", width: 80 },
      {
        field: "assignedCount",
        headerName: "Assigned",
        width: 120,
        renderCell: (params) => {
          const assigned = params.row.assignedCount || 0;
          const required = params.row.requiredCount || 0;
          return `${assigned}/${required}`;
        },
      },
      {
        field: "assignedStaff",
        headerName: "Staff",
        width: 150,
        renderCell: (params) => {
          const staff = params.row.assignedStaff || [];
          return (
            <AvatarGroup max={3} sx={{ justifyContent: "flex-start" }}>
              {staff.map((s) => (
                <Tooltip key={s._id} title={s.name}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: "0.75rem" }}>
                    {s.name?.charAt(0)}
                  </Avatar>
                </Tooltip>
              ))}
            </AvatarGroup>
          );
        },
      },
      {
        field: "shiftStatus",
        headerName: "Status",
        width: 120,
        renderCell: (params) => (
          <Chip
            label={params.value}
            color={getStatusColor(params.value)}
            size="small"
          />
        ),
      },
    ];

    if (isManager) {
      return [
        ...baseColumns,
        {
          field: "actions",
          headerName: "Actions",
          width: 150,
          sortable: false,
          renderCell: (params) => (
            <Box display="flex" gap={1}>
              <Button
                size="small"
                variant="outlined"
                color="primary"
                onClick={() => handleEditShift(params.row.id)}
              >
                Edit
              </Button>
              {params.row.shiftStatus === "draft" && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => handleDeleteShift(params.row.id)}
                >
                  Delete
                </Button>
              )}
            </Box>
          ),
        },
      ];
    }

    return baseColumns;
  };

  // Import the timezone utilities at the to

const rows = shifts.map((shift, index) => {
  // Use simple local time instead of timezone formatting
  const row = {
    id: shift._id || `row-${index}`,
    locationName: shift.location?.name || "N/A",
    shiftDate: shift.startTime
      ? new Date(shift.startTime).toLocaleDateString()
      : "N/A",
    startTime: shift.startTime
      ? new Date(shift.startTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A",
    endTime: shift.endTime
      ? new Date(shift.endTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A",
    shiftSkill: shift.requiredSkill || "N/A",
    requiredCount: shift.requiredCount || 0,
    assignedCount: shift.assignedStaff?.length || 0,
    assignedStaff: shift.assignedStaff || [],
    shiftStatus: shift.status || "draft",
    // Remove isOvernight
  };

  return row;
});
  return (
    <Layout>
      {/* Quick Stats Bar */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: "#1976d2", color: "white" }}>
            <Typography variant="h4">{stats.total}</Typography>
            <Typography variant="body2">Total Shifts</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: "#2e7d32", color: "white" }}>
            <Typography variant="h4">{stats.published}</Typography>
            <Typography variant="body2">Published</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: "#ed6c02", color: "white" }}>
            <Typography variant="h4">{stats.draft}</Typography>
            <Typography variant="body2">Draft</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: "#9c27b0", color: "white" }}>
            <Typography variant="h4">{stats.myShifts}</Typography>
            <Typography variant="body2">My Shifts</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Header with View Toggle and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h5">Shifts</Typography>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, val) => val && setViewMode(val)}
              size="small"
            >
              <ToggleButton value="list">
                <ListIcon />
              </ToggleButton>
              <ToggleButton value="calendar">
                <CalendarIcon />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box display="flex" gap={2} alignItems="center">
            {isManager && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateShift}
              >
                Create Shift
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <Paper sx={{ p: 3 }}>
          {/* Month Navigation */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={3}
          >
            <Button
              variant="outlined"
              startIcon={<ChevronLeftIcon />}
              onClick={prevMonth}
            >
              Previous
            </Button>
            <Typography variant="h4" sx={{ fontWeight: 300 }}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Typography>
            <Button
              variant="outlined"
              endIcon={<ChevronRightIcon />}
              onClick={nextMonth}
            >
              Next
            </Button>
          </Box>

          {/* Calendar Grid */}
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            {/* Weekday Headers */}
            <Box sx={{ display: "flex", mb: 1 }}>
              {[
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ].map((day) => (
                <Box
                  key={day}
                  sx={{
                    flex: 1,
                    textAlign: "center",
                    py: 1,
                    fontWeight: "bold",
                    color: "text.secondary",
                    borderBottom: "2px solid #e0e0e0",
                  }}
                >
                  {day}
                </Box>
              ))}
            </Box>

            {/* Calendar Days Grid */}
            <Box sx={{ display: "flex", flexWrap: "wrap" }}>
              {/* Blank Days */}
              {blanks.map((blank) => (
                <Box
                  key={`blank-${blank}`}
                  sx={{
                    width: "14.28%",
                    p: 1,
                    minHeight: 150,
                    backgroundColor: "#f9f9f9",
                    borderRight: "1px solid #e0e0e0",
                    borderBottom: "1px solid #e0e0e0",
                  }}
                />
              ))}

              {/* Actual Days */}
              {days.map((day) => {
                const dayShifts = getShiftsForDay(day);
                const isToday =
                  new Date().getDate() === day &&
                  new Date().getMonth() === currentMonth.getMonth() &&
                  new Date().getFullYear() === currentMonth.getFullYear();

                return (
                  <Box
                    key={day}
                    sx={{
                      width: "14.28%",
                      p: 1,
                      minHeight: 150,
                      backgroundColor: isToday ? "#e8f5e8" : "white",
                      borderRight: "1px solid #e0e0e0",
                      borderBottom: "1px solid #e0e0e0",
                      position: "relative",
                      transition: "all 0.2s",
                      "&:hover": {
                        backgroundColor: "#f5f5f5",
                        boxShadow: "inset 0 0 0 1px #1976d2",
                      },
                    }}
                  >
                    {/* Day Number */}
                    <Typography
                      sx={{
                        position: "absolute",
                        top: 4,
                        right: 8,
                        fontWeight: isToday ? "bold" : "normal",
                        color: isToday ? "#2e7d32" : "text.secondary",
                        backgroundColor: isToday ? "#e8f5e8" : "transparent",
                        width: 24,
                        height: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                      }}
                    >
                      {day}
                    </Typography>

                    {/* Shifts */}
                    <Box sx={{ mt: 4, maxHeight: 110, overflowY: "auto" }}>
                      {dayShifts.map((shift) => (
                        <Box
                          key={shift._id}
                          sx={{
                            mb: 1,
                            p: 1,
                            bgcolor:
                              shift.status === "published"
                                ? "#e8f5e8"
                                : "#fff3e0",
                            borderRadius: 1,
                            borderLeft: "4px solid",
                            borderLeftColor:
                              shift.status === "published"
                                ? "#4caf50"
                                : "#ff9800",
                            opacity: shift.status === "published" ? 1 : 0.7, // Fade draft shifts slightly
                            fontSize: "0.8rem",
                          }}
                        >
                          {/* Shift details */}
                          <Typography
                            variant="caption"
                            fontWeight="bold"
                            display="block"
                          >
                            {new Date(shift.startTime).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}{" "}
                            • {shift.location?.name}
                          </Typography>

                          {/* Status badge for managers */}
                          {isManager && (
                            <Chip
                              label={shift.status}
                              size="small"
                              color={
                                shift.status === "published"
                                  ? "success"
                                  : "default"
                              }
                              sx={{ height: 16, fontSize: "0.6rem", mt: 0.5 }}
                            />
                          )}

                          {/* Staff chips */}
                          {shift.assignedStaff &&
                          shift.assignedStaff.length > 0 ? (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                mt: 0.5,
                                flexWrap: "wrap",
                              }}
                            >
                              {shift.assignedStaff.map((staff) => (
                                <Chip
                                  key={staff._id}
                                  label={staff.name}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 20 }}
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.disabled"
                              sx={{ fontStyle: "italic" }}
                            >
                              No staff assigned
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Paper>
      )}

      {/* List View (DataGrid) */}
      {viewMode === "list" && (
        <Paper sx={{ height: 500, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={getColumns()}
            pageSize={10}
            rowsPerPageOptions={[10]}
            loading={loading}
            disableSelectionOnClick
            autoHeight
          />
        </Paper>
      )}

      {/* Create/Edit Shift Form */}
      {isManager && (
        <CreateShiftForm
          open={openForm}
          onClose={handleFormClose}
          onShiftCreated={handleShiftSaved}
          editShift={editShift}
        />
      )}
    </Layout>
  );
};

export default Shifts;
