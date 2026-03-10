import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  Fab,
  Alert
} from "@mui/material";
import {
  Add as AddIcon,
} from "@mui/icons-material";
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

  useEffect(() => {
    fetchShifts();
  }, []);

  useEffect(() => {
    console.log('🔄 shifts state updated:', shifts);
    console.log('📊 Number of shifts in state:', shifts.length);
  }, [shifts]);

  const fetchShifts = async () => {
    try {
      console.log('📡 Fetching shifts...');
      
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/shifts/simple-list`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Shifts response:', res.data);

      if (res.data.data && res.data.data.length > 0) {
        console.log('📊 First shift raw data:', res.data.data[0]);
        setShifts(res.data.data);
        
        // Calculate stats
        const published = res.data.data.filter(s => s.status === 'published').length;
        const draft = res.data.data.filter(s => s.status === 'draft').length;
        const inProgress = res.data.data.filter(s => s.status === 'in_progress').length;
        
        setStats({
          total: res.data.data.length,
          published,
          draft,
          inProgress
        });
      } else {
        console.log('⚠️ No shifts found');
        setShifts([]);
        setStats({ total: 0, published: 0, draft: 0, inProgress: 0 });
      }
    } catch (error) {
      console.error('❌ Error fetching shifts:', error);
      setShifts([]);
      setStats({ total: 0, published: 0, draft: 0, inProgress: 0 });
    } finally {
      setLoading(false);
    }
  };

const handleCreateShift = () => {
  console.log('🔴 Create Shift button clicked!');
  console.log('📊 Current openForm state:', openForm);
  console.log('📝 Setting editShift to null');
  setEditShift(null);
  console.log('🔵 Setting openForm to true');
  setOpenForm(true);
  console.log('✅ New openForm state should be:', true);
};

// Add this useEffect to track openForm changes
useEffect(() => {
  console.log('🔄 openForm state changed to:', openForm);
}, [openForm]);

  const handleFormClose = () => {
    setOpenForm(false);
    setEditShift(null);
  };

  const handleShiftSaved = () => {
    fetchShifts();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "published": return "success";
      case "draft": return "default";
      case "in_progress": return "info";
      case "completed": return "secondary";
      case "cancelled": return "error";
      default: return "default";
    }
  };

  // Ultra-simple rows transformation
  const rows = shifts.map((shift, index) => ({
    id: shift._id || `row-${index}`,
    locationName: shift.location?.name || 'N/A',
    shiftDate: shift.startTime ? new Date(shift.startTime).toLocaleDateString() : 'N/A',
    startTime: shift.startTime ? new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
    endTime: shift.endTime ? new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
    shiftSkill: shift.requiredSkill || 'N/A',
    requiredCount: shift.requiredCount || 0,
    assignedCount: shift.assignedStaff?.length || 0,
    shiftStatus: shift.status || 'draft'
  }));

// Ultra-simple columns
const columns = [
  { field: 'locationName', headerName: 'Location', width: 150 },
  { field: 'shiftDate', headerName: 'Date', width: 120 },
  { field: 'startTime', headerName: 'Start', width: 100 },
  { field: 'endTime', headerName: 'End', width: 100 },
  { field: 'shiftSkill', headerName: 'Skill', width: 120 },
  { field: 'requiredCount', headerName: 'Needed', width: 80 },
  { 
    field: 'assignedCount', 
    headerName: 'Assigned', 
    width: 100,
    valueGetter: (params) => {
      if (!params || !params.row) return '0/0';
      const assigned = params.row.assignedCount || 0;
      const required = params.row.requiredCount || 0;
      return `${assigned}/${required}`;
    }
  },
  { 
    field: 'shiftStatus', 
    headerName: 'Status', 
    width: 120,
    renderCell: (params) => {
      if (!params || !params.row) return null;
      return (
        <Chip
          label={params.value}
          color={getStatusColor(params.value)}
          size="small"
        />
      );
    }
  }
];

  return (
    <Layout>
      {/* Stats Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Paper sx={{ p: 2, flex: 1, bgcolor: '#e3f2fd' }}>
          <Typography variant="h6">{stats.total}</Typography>
          <Typography variant="body2">Total Shifts</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, bgcolor: '#e8f5e8' }}>
          <Typography variant="h6">{stats.published}</Typography>
          <Typography variant="body2">Published</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, bgcolor: '#fff3e0' }}>
          <Typography variant="h6">{stats.draft}</Typography>
          <Typography variant="body2">Draft</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, bgcolor: '#ffebee' }}>
          <Typography variant="h6">{stats.inProgress}</Typography>
          <Typography variant="body2">In Progress</Typography>
        </Paper>
      </Box>

      {/* Header with Create Button */}
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
        <Typography variant="h4">Shift Management</Typography>
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
      </Box>

      {/* Debug info */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Shifts loaded: {shifts.length}<br />
          Rows prepared: {rows.length}<br />
          Loading: {loading ? "Yes" : "No"}
        </Typography>
      </Alert>

      {/* Ultra Simple DataGrid */}
      <Paper sx={{ height: 500, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10]}
          loading={loading}
          disableSelectionOnClick
          autoHeight
        />
      </Paper>

      {/* Create/Edit Shift Form */}
      <CreateShiftForm
        open={openForm}
        onClose={handleFormClose}
        onShiftCreated={handleShiftSaved}
        editShift={editShift}
      />

      {/* Floating Action Button */}
      {(user?.role === 'admin' || user?.role === 'manager') && (
        <Fab
          color="primary"
          aria-label="add"
          onClick={handleCreateShift}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
            display: { xs: 'flex', md: 'none' }
          }}
        >
          <AddIcon />
        </Fab>
      )}
    </Layout>
  );
};

export default Shifts;