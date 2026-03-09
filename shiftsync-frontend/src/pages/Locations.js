import React from 'react';
import Layout from '../components/layout/Layout';
import { Typography, Paper, Box } from '@mui/material';

const Locations = () => {
  return (
    <Layout>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Locations
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Manage restaurant locations and their settings
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3 }}>
        <Typography>Location management coming soon...</Typography>
      </Paper>
    </Layout>
  );
};

export default Locations;