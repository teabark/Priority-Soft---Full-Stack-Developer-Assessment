import React from 'react';
import { Box, Typography, Tab, Tabs } from '@mui/material';
import OvertimeDashboard from './OvertimeDashboard';

const OvertimeManagerTab = () => {
  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" gutterBottom>
        Overtime & Compliance Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Monitor overtime costs and compliance warnings across all locations
      </Typography>
      
      <OvertimeDashboard />
    </Box>
  );
};

export default OvertimeManagerTab;