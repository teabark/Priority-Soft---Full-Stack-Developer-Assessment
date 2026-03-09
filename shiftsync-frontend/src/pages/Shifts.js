import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  IconButton,
  Fab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import Layout from '../components/layout/Layout';
import CreateShiftForm from '../components/shifts/CreateShiftForm';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Shifts = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/shifts`);
      setShifts(res.data.data);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = () => {
    setEditShift(null);
    setOpenForm(true);
  };

  const handleEditShift = (shift) => {
    setEditShift(shift);
    setOpenForm(true);
  };

  const handleDeleteShift = async (shiftId) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_URL}/shifts/${shiftId}`);
        fetchShifts();
      } catch (error) {
        console.error('Error deleting shift:', error);
      }
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
      case 'published': return 'success';
      case 'draft': return 'default';
      case 'in_progress': return 'info';
      case 'completed': return 'secondary';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { 
      field: 'location', 
      headerName: 'Location', 
      width: 150,
      valueGetter: (params) => params.row.location?.name || 'N/A'
    },
    { 
      field: 'date', 
      headerName: 'Date', 
      width: 120,
      valueGetter: (params) => new Date(params.row.startTime).toLocaleDateString()
    },
    { 
      field: 'startTime', 
      headerName: 'Start', 
      width: 100,
      valueGetter: (params) => new Date(params.row.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    { 
      field: 'endTime', 
      headerName: 'End', 
      width: 100,
      valueGetter: (params) => new Date(params.row.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    { field: 'requiredSkill', headerName: 'Skill', width: 120 },
    { field: 'requiredCount', headerName: 'Needed', width: 80 },
    { 
      field: 'assigned', 
      headerName: 'Assigned', 
      width: 100,
      valueGetter: (params) => `${params.row.assignedStaff?.length || 0}/${params.row.requiredCount}`
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getStatusColor(params.value)}
          size="small"
        />
      )
    },
    {
      field: 'warnings',
      headerName: 'Warnings',
      width: 100,
      renderCell: (params) => (
        params.row.complianceWarnings?.length > 0 ? (
          <IconButton size="small" color="warning" title={params.row.complianceWarnings[0]?.message}>
            <WarningIcon />
          </IconButton>
        ) : null
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton 
            size="small" 
            color="primary"
            onClick={() => handleEditShift(params.row)}
          >
            <EditIcon />
          </IconButton>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <IconButton 
              size="small" 
              color="error"
              onClick={() => handleDeleteShift(params.row.id)}
            >
              <DeleteIcon />
            </IconButton>
          )}
        </Box>
      )
    }
  ];

  const rows = shifts.map(shift => ({
    ...shift,
    id: shift._id
  }));

  return (
    <Layout>
      {/* Simple header with visible button */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3,
          p: 2,
          bgcolor: '#1976d2',
          color: 'white',
          borderRadius: 1
        }}
      >
        <Typography variant="h4">Shift Management</Typography>
        
        {/* Button is always visible for testing */}
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateShift}
          sx={{
            bgcolor: 'white',
            color: '#1976d2',
            '&:hover': {
              bgcolor: '#f5f5f5',
            }
          }}
        >
          Create Shift
        </Button>
      </Box>

      {/* Shifts Table */}
      <Paper sx={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10]}
          loading={loading}
          disableSelectionOnClick
        />
      </Paper>

      {/* Create/Edit Shift Form */}
      <CreateShiftForm
        open={openForm}
        onClose={handleFormClose}
        onShiftCreated={handleShiftSaved}
        editShift={editShift}
      />
    </Layout>
  );
};

export default Shifts;