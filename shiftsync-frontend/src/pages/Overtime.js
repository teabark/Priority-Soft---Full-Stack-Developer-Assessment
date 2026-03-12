import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as GoodIcon
} from '@mui/icons-material';
import Layout from '../components/layout/Layout';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Overtime = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchOvertimeReport();
  }, []);

  const fetchOvertimeReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/overtime/me?weekStart=${weekStart.toISOString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('📊 Overtime report:', res.data);
      setReport(res.data.data);
    } catch (error) {
      console.error('Error fetching overtime:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (hours) => {
    if (hours > 40) return 'error';
    if (hours > 35) return 'warning';
    return 'success';
  };

  const getStatusIcon = (severity) => {
    if (severity === 'critical') return <ErrorIcon color="error" />;
    if (severity === 'warning') return <WarningIcon color="warning" />;
    return <GoodIcon color="success" />;
  };

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Overtime & Compliance
        </Typography>

        {report ? (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Weekly Hours
                    </Typography>
                    <Typography variant="h2">
                      {report.totalHours}
                    </Typography>
                    <Chip 
                      label={report.totalHours > 40 ? 'EXCEEDS LIMIT' : report.totalHours > 35 ? 'NEAR LIMIT' : 'GOOD'}
                      color={getStatusColor(report.totalHours)}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Consecutive Days
                    </Typography>
                    <Typography variant="h2">
                      {report.consecutiveDays}
                    </Typography>
                    <Chip 
                      label={report.consecutiveDays >= 7 ? 'OVERRIDE NEEDED' : report.consecutiveDays >= 6 ? 'WARNING' : 'GOOD'}
                      color={report.consecutiveDays >= 7 ? 'error' : report.consecutiveDays >= 6 ? 'warning' : 'success'}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Shifts This Week
                    </Typography>
                    <Typography variant="h2">
                      {report.shifts}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Warnings */}
            {report.warnings?.length > 0 && (
              <Paper sx={{ p: 2, mb: 3, bgcolor: '#fff3e0' }}>
                <Typography variant="h6" gutterBottom color="warning.main">
                  ⚠️ Warnings
                </Typography>
                {report.warnings.map((warning, idx) => (
                  <Alert key={idx} severity="warning" sx={{ mb: 1 }}>
                    {warning.message}
                  </Alert>
                ))}
              </Paper>
            )}

            {/* Blocks */}
            {report.blocks?.length > 0 && (
              <Paper sx={{ p: 2, mb: 3, bgcolor: '#ffebee' }}>
                <Typography variant="h6" gutterBottom color="error.main">
                  🚫 Compliance Blocks
                </Typography>
                {report.blocks.map((block, idx) => (
                  <Alert key={idx} severity="error" sx={{ mb: 1 }}>
                    {block.message}
                  </Alert>
                ))}
              </Paper>
            )}

            {/* Daily Breakdown */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Daily Hours
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Day</TableCell>
                      <TableCell align="right">Hours</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(report.dailyHours || {}).map(([day, hours]) => (
                      <TableRow key={day}>
                        <TableCell>{day}</TableCell>
                        <TableCell align="right">{hours}</TableCell>
                        <TableCell>
                          {getStatusIcon(hours > 12 ? 'critical' : hours > 8 ? 'warning' : 'good')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        ) : (
          <Alert severity="info">No overtime data available</Alert>
        )}
      </Box>
    </Layout>
  );
};

export default Overtime;