import React from 'react';
import { Box } from '@mui/material';
import Layout from '../components/layout/Layout';
import ScheduleCalendar from '../components/schedule/ScheduleCalendar';

const Schedule = () => {
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <ScheduleCalendar />
      </Box>
    </Layout>
  );
};

export default Schedule;