import React from 'react';
import Layout from '../components/layout/Layout';
import { Typography, Paper, Box } from '@mui/material';

const Shifts = () => {
  return (
    <Layout>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Shift Management
        </Typography>
        <Typography variant="body1" color="textSecondary">
          View and manage all shifts across locations
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3 }}>
        <Typography>Shift management coming soon...</Typography>
      </Paper>
    </Layout>
  );
};

export default Shifts;