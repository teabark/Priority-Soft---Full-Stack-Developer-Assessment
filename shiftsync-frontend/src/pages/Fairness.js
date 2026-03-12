import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Event as EventIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";
import Layout from "../components/layout/Layout";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const Fairness = () => {
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const isManager = user?.role === "admin" || user?.role === "manager";

  // Get current week start (Sunday)
  function getCurrentWeek() {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return start;
  }

  // Get week range string
  const getWeekRange = (weekStart) => {
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };
  // Navigate weeks
  const prevWeek = () => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedWeek(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedWeek(newDate);
  };

  useEffect(() => {
    if (isManager) {
      fetchData();
    }
  }, [selectedWeek, selectedLocation]);

  useEffect(() => {
    if (shifts.length > 0) {
      const publishedShifts = shifts.filter((s) => s.status === "published");
      const premiumShifts = publishedShifts.filter((s) => {
        const date = new Date(s.startTime);
        return (
          (date.getDay() === 5 || date.getDay() === 6) && date.getHours() >= 17
        );
      });

      console.log("📊 Data loaded:", {
        totalShifts: shifts.length,
        published: publishedShifts.length,
        premium: premiumShifts.length,
      });
    }
  }, [shifts]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      // Fetch staff, shifts, locations
      const [staffRes, shiftsRes, locationsRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${process.env.REACT_APP_API_URL}/shifts/simple-list`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${process.env.REACT_APP_API_URL}/locations`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setStaff(staffRes.data.data?.filter((u) => u.role === "staff") || []);
      setShifts(shiftsRes.data.data || []);
      setLocations(locationsRes.data.data || []);
    } catch (error) {
      console.error("Error fetching fairness data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate fairness metrics for the SELECTED WEEK only
  const calculateFairness = () => {
    // Define week range based on selectedWeek
    const weekStart = new Date(selectedWeek);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);

    console.log("📅 Selected week:", {
      start: weekStart.toLocaleDateString(),
      end: weekEnd.toLocaleDateString(),
    });

    // Filter shifts for selected week and location
    let weekShifts = shifts.filter((shift) => {
      const shiftDate = new Date(shift.startTime);
      return shiftDate >= weekStart && shiftDate < weekEnd;
    });

    if (selectedLocation !== "all") {
      weekShifts = weekShifts.filter(
        (shift) => shift.location?._id === selectedLocation,
      );
    }

    // Only count published shifts
    const publishedShifts = weekShifts.filter(
      (shift) => shift.status === "published",
    );

    console.log(
      "🔍 Premium shifts in this week:",
      publishedShifts
        .filter((s) => s.isPremiumShift)
        .map((s) => ({
          date: new Date(s.startTime).toLocaleDateString(),
          isPremium: s.isPremiumShift,
        })),
    );

    console.log("📊 Week published shifts:", publishedShifts.length);

    // Initialize staff hours for this week
    const staffHours = {};

    staff.forEach((s) => {
      staffHours[s._id] = {
        name: s.name,
        totalHours: 0,
        premiumCount: 0,
        desiredHours: 35, // Default desired hours per week
        shifts: [],
      };
    });

    // Process each shift in this week
    publishedShifts.forEach((shift) => {
      // Check if shift is premium (Friday or Saturday after 5pm)
      const shiftDate = new Date(shift.startTime);
      const dayOfWeek = shiftDate.getDay(); // 5 = Friday, 6 = Saturday
      const hour = shiftDate.getHours();
      // Premium shift detection should be simple:
      const isPremium = shift.isPremiumShift === true; // Use the model field directly!

      shift.assignedStaff?.forEach((staffId) => {
        const id = staffId._id || staffId;
        if (staffHours[id]) {
          const hours = (shift.duration || 480) / 60; // Convert minutes to hours
          staffHours[id].totalHours += hours;
          staffHours[id].shifts.push(shift);

          if (isPremium) {
            staffHours[id].premiumCount++;
          }
        }
      });
    });

    // Convert to array and filter out staff with zero hours this week
    const staffList = Object.values(staffHours).filter((s) => s.totalHours > 0);

    // If no staff have hours this week, show message
    if (staffList.length === 0) {
      return {
        staffHours: [],
        totalShifts: publishedShifts.length,
        totalPremiumShifts: 0,
        fairnessScore: 100,
        underScheduled: [],
        overScheduled: [],
        avgPremiumShifts: 0,
      };
    }

    // Calculate average premium shifts for THIS WEEK only
    const avgPremium =
      staffList.reduce((sum, s) => sum + s.premiumCount, 0) / staffList.length;

    // Calculate fairness score based SOLELY on premium shift distribution
    let fairnessScore = 100;
    const premiumCounts = staffList.map((s) => s.premiumCount);

    if (premiumCounts.length === 2) {
      const [p1, p2] = premiumCounts;
      const total = p1 + p2;
      const difference = Math.abs(p1 - p2);

      // If no premium shifts, it's perfectly fair
      if (total === 0) {
        fairnessScore = 100;
      }
      // If equal premium shifts, perfectly fair
      else if (p1 === p2) {
        fairnessScore = 100;
      }
      // If difference of 1 (2 vs 1 or 1 vs 0)
      else if (difference === 1) {
        fairnessScore = 75;
      }
      // If difference of 2 (2 vs 0)
      else if (difference === 2) {
        fairnessScore = 50;
      }
      // If larger difference (shouldn't happen with max 2 per week)
      else {
        fairnessScore = 25;
      }

      console.log("🎯 Fairness Calculation:", {
        alex: p1,
        sam: p2,
        difference,
        score: fairnessScore,
      });
    } else {
      // Fallback for more than 2 staff
      const avgPremium =
        premiumCounts.reduce((a, b) => a + b, 0) / premiumCounts.length;
      const variance =
        premiumCounts.reduce((sum, count) => {
          return sum + Math.pow(count - avgPremium, 2);
        }, 0) / premiumCounts.length;

      const maxVariance = 2; // (2-0)^2/2 = 2
      fairnessScore = maxVariance
        ? Math.max(0, 100 - (variance / maxVariance) * 100)
        : 100;
    }

    // Find under/over scheduled (comparing to desired 35 hours per week)
    const underScheduled = staffList.filter((s) => s.totalHours < 28); // More than 20% under
    const overScheduled = staffList.filter((s) => s.totalHours > 42); // More than 20% over

    console.log("📊 Week stats:", {
      totalHours: staffList.map((s) => `${s.name}: ${s.totalHours}h`),
      premiumCounts: staffList.map((s) => `${s.name}: ${s.premiumCount}`),
      avgPremium,
      fairnessScore,
    });

    return {
      staffHours: staffList,
      totalShifts: publishedShifts.length,
      totalPremiumShifts: staffList.reduce((sum, s) => sum + s.premiumCount, 0),
      fairnessScore: Math.round(fairnessScore),
      underScheduled,
      overScheduled,
      avgPremiumShifts: avgPremium.toFixed(1),
    };
  };

  if (!isManager) {
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

  const fairness = calculateFairness();

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
          <Typography variant="h4">Schedule Fairness Analytics</Typography>
          <Box display="flex" gap={2}>
            <Button variant="outlined" onClick={prevWeek}>
              ← Previous Week
            </Button>
            <Button variant="outlined" onClick={nextWeek}>
              Next Week →
            </Button>
          </Box>
        </Box>

        {/* Week and Filter */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Typography variant="h6">
                Week of {getWeekRange(selectedWeek)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Location</InputLabel>
                <Select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  label="Location"
                >
                  <MenuItem value="all">All Locations</MenuItem>
                  {locations.map((loc) => (
                    <MenuItem key={loc._id} value={loc._id}>
                      {loc.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: "#e3f2fd" }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <AssessmentIcon color="primary" fontSize="large" />
                  <Box>
                    <Typography variant="h4">
                      {fairness.fairnessScore}
                    </Typography>
                    <Typography variant="body2">Fairness Score</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={fairness.fairnessScore}
                      sx={{ mt: 1, height: 8, borderRadius: 4 }}
                      color={
                        fairness.fairnessScore > 70 ? "success" : "warning"
                      }
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: "#fff3e0" }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <EventIcon color="warning" fontSize="large" />
                  <Box>
                    <Typography variant="h4">
                      {fairness.totalPremiumShifts}
                    </Typography>
                    <Typography variant="body2">
                      Premium Shifts This Week
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Avg {fairness.avgPremiumShifts} per staff
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: "#e8f5e8" }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <PeopleIcon color="success" fontSize="large" />
                  <Box>
                    <Typography variant="h4">{staff.length}</Typography>
                    <Typography variant="body2">Total Staff</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {fairness.totalShifts} shifts this week
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Under/Over Scheduled Alerts */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {fairness.underScheduled.length > 0 && (
            <Grid item xs={12} md={6}>
              <Alert severity="info" icon={<TrendingDownIcon />}>
                <Typography variant="subtitle2">
                  Under-Scheduled Staff
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
                  {fairness.underScheduled.map((s) => (
                    <Chip
                      key={s.name}
                      label={`${s.name} (${s.totalHours.toFixed(1)}/${s.desiredHours}h)`}
                      size="small"
                      color="info"
                    />
                  ))}
                </Box>
              </Alert>
            </Grid>
          )}

          {fairness.overScheduled.length > 0 && (
            <Grid item xs={12} md={6}>
              <Alert severity="warning" icon={<TrendingUpIcon />}>
                <Typography variant="subtitle2">
                  Over-Scheduled Staff
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
                  {fairness.overScheduled.map((s) => (
                    <Chip
                      key={s.name}
                      label={`${s.name} (${s.totalHours.toFixed(1)}/${s.desiredHours}h)`}
                      size="small"
                      color="warning"
                    />
                  ))}
                </Box>
              </Alert>
            </Grid>
          )}
        </Grid>

        {/* Detailed Staff Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                <TableCell>Staff Member</TableCell>
                <TableCell align="center">Total Hours</TableCell>
                <TableCell align="center">Desired Hours</TableCell>
                <TableCell align="center">Difference</TableCell>
                <TableCell align="center">Premium Shifts</TableCell>
                <TableCell align="center">Fairness Indicator</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fairness.staffHours.map((staff) => {
                const diff = staff.totalHours - staff.desiredHours;
                const isUnder = diff < -5;
                const isOver = diff > 5;

                return (
                  <TableRow key={staff.name} hover>
                    <TableCell>
                      <Typography fontWeight="medium">{staff.name}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography fontWeight="bold">
                        {staff.totalHours.toFixed(1)}h
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{staff.desiredHours}h</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={
                          diff > 0
                            ? `+${diff.toFixed(1)}`
                            : `${diff.toFixed(1)}`
                        }
                        size="small"
                        color={
                          isUnder ? "info" : isOver ? "warning" : "default"
                        }
                        variant={isUnder || isOver ? "filled" : "outlined"}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={staff.premiumCount}
                        size="large"
                        sx={{
                          fontWeight: "bold",
                          fontSize: "1.2rem",
                          minWidth: 50,
                          bgcolor:
                            staff.premiumCount === 0
                              ? "#f5f5f5"
                              : staff.premiumCount > fairness.avgPremiumShifts
                                ? "#4caf50"
                                : "#ff9800",
                          color: staff.premiumCount === 0 ? "#9e9e9e" : "white",
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                        }}
                      >
                        {/* Premium count chip */}
                        <Chip
                          label={staff.premiumCount}
                          size="small"
                          color={
                            staff.premiumCount > fairness.avgPremiumShifts
                              ? "success"
                              : staff.premiumCount > 0
                                ? "warning"
                                : "default"
                          }
                          sx={{ mb: 1, fontWeight: "bold", minWidth: 40 }}
                        />

                        {/* 5-dot fairness indicator */}
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            gap: "4px",
                          }}
                        >
                          {[1, 2, 3, 4, 5].map((dot) => {
                            // Each dot represents 20% of premium shifts
                            // If staff has 5 premium shifts, all dots are filled
                            // If staff has 3 premium shifts, first 3 dots are filled
                            const isFilled = dot <= staff.premiumCount;

                            // Color based on comparison to average
                            let bgColor = "#e0e0e0"; // Default gray
                            if (isFilled) {
                              if (
                                staff.premiumCount > fairness.avgPremiumShifts
                              ) {
                                bgColor = "#4caf50"; // Green if above average
                              } else if (
                                staff.premiumCount ===
                                Math.round(fairness.avgPremiumShifts)
                              ) {
                                bgColor = "#2196f3"; // Blue if exactly average
                              } else {
                                bgColor = "#ff9800"; // Orange if below average
                              }
                            }

                            return (
                              <Box
                                key={dot}
                                sx={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: "50%",
                                  bgcolor: bgColor,
                                  transition: "all 0.2s",
                                  border: isFilled
                                    ? "none"
                                    : "1px solid #bdbdbd",
                                  "&:hover": {
                                    transform: "scale(1.2)",
                                    boxShadow: 1,
                                  },
                                }}
                                title={`${staff.premiumCount} premium shifts ${isFilled ? "(filled)" : "(empty)"}`}
                              />
                            );
                          })}
                        </Box>

                        {/* Show comparison to average */}
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          sx={{ mt: 0.5 }}
                        >
                          {staff.premiumCount > fairness.avgPremiumShifts
                            ? "Above avg"
                            : staff.premiumCount < fairness.avgPremiumShifts
                              ? "Below avg"
                              : "Average"}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Layout>
  );
};

export default Fairness;
