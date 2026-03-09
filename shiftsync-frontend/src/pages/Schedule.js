import React from 'react';
import Layout from '../components/layout/Layout';
import { Typography, Paper, Box } from '@mui/material';

const Schedule = () => {
  return (
    <Layout>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Weekly Schedule
        </Typography>
        <Typography variant="body1" color="textSecondary">
          View and manage weekly schedules
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3 }}>
        <Typography>Schedule view coming soon...</Typography>
      </Paper>
    </Layout>
  );
};

export default Schedule;