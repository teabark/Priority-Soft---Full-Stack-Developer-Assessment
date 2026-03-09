import React from 'react';
import Layout from '../components/layout/Layout';
import { Typography, Paper, Box } from '@mui/material';

const Staff = () => {
  return (
    <Layout>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Staff Management
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Manage staff, skills, and certifications
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3 }}>
        <Typography>Staff management coming soon...</Typography>
      </Paper>
    </Layout>
  );
};

export default Staff;
