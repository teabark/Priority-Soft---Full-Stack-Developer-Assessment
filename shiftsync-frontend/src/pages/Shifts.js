import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  Fab,
  Alert,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import Layout from "../components/layout/Layout";
import CreateShiftForm from "../components/shifts/CreateShiftForm";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const Shifts = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    inProgress: 0,
  });

  const isManager = user?.role === "admin" || user?.role === "manager";
  const isStaff = user?.role === "staff";

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      console.log("📡 Fetching shifts...");

      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/shifts/simple-list`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log("✅ Shifts response:", res.data);

      if (res.data.data && res.data.data.length > 0) {
        let filteredShifts = res.data.data;

        // For staff, only show shifts assigned to them
        if (isStaff) {
          console.log("🔍 Filtering shifts for staff:", user?.id, user?._id);
          console.log(
            "📊 All shifts:",
            res.data.data.map((s) => ({
              id: s._id,
              assigned: s.assignedStaff?.map((a) => a._id || a),
            })),
          );

          filteredShifts = res.data.data.filter((shift) =>
            shift.assignedStaff?.some((s) => {
              const staffId = s._id || s;
              const match = staffId === user?.id || staffId === user?._id;
              if (match) console.log("✅ Match found for shift:", shift._id);
              return match;
            }),
          );

          console.log("📊 Filtered shifts:", filteredShifts.length);
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

        setStats({
          total: filteredShifts.length,
          published,
          draft,
          inProgress,
        });
      } else {
        setShifts([]);
        setStats({ total: 0, published: 0, draft: 0, inProgress: 0 });
      }
    } catch (error) {
      console.error("❌ Error fetching shifts:", error);
      setShifts([]);
      setStats({ total: 0, published: 0, draft: 0, inProgress: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = () => {
    setEditShift(null);
    setOpenForm(true);
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

  const rows = shifts.map((shift, index) => {
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
      shiftStatus: shift.status || "draft",
    };

    console.log("📊 Created row:", row);
    return row;
  });

  console.log("📊 Total rows:", rows.length);
  console.log("📊 First row:", rows[0]);

  // Columns based on user role
  const getColumns = () => {
    const baseColumns = [
      { field: "locationName", headerName: "Location", width: 150 },
      { field: "shiftDate", headerName: "Date", width: 120 },
      { field: "startTime", headerName: "Start", width: 100 },
      { field: "endTime", headerName: "End", width: 100 },
      { field: "shiftSkill", headerName: "Skill", width: 120 },
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

    // Add actions column only for managers
    if (isManager) {
      return [
        ...baseColumns,
        {
          field: "actions",
          headerName: "Actions",
          width: 120,
          sortable: false,
          renderCell: (params) => (
            <Box>{/* Add action buttons here if needed */}</Box>
          ),
        },
      ];
    }

    return baseColumns;
  };

  return (
    <Layout>
      {/* Stats Cards */}
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <Paper sx={{ p: 2, flex: 1, bgcolor: "#e3f2fd" }}>
          <Typography variant="h6">{stats.total}</Typography>
          <Typography variant="body2">
            {isStaff ? "My Shifts" : "Total Shifts"}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, bgcolor: "#e8f5e8" }}>
          <Typography variant="h6">{stats.published}</Typography>
          <Typography variant="body2">Published</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, bgcolor: "#fff3e0" }}>
          <Typography variant="h6">{stats.draft}</Typography>
          <Typography variant="body2">Draft</Typography>
        </Paper>
      </Box>

      {/* Header with Create Button - Only for managers */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          p: 2,
          bgcolor: "#1976d2",
          color: "white",
          borderRadius: 1,
        }}
      >
        <Typography variant="h4">
          {isStaff ? "My Shifts" : "Shift Management"}
        </Typography>

        {isManager && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateShift}
            sx={{
              bgcolor: "white",
              color: "#1976d2",
              "&:hover": { bgcolor: "#f5f5f5" },
            }}
          >
            Create Shift
          </Button>
        )}
      </Box>

      {/* Shifts Table */}
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

      {/* Create/Edit Shift Form - Only for managers */}
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
