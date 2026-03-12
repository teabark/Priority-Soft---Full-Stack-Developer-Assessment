import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const OvertimeContext = createContext();

export const useOvertime = () => useContext(OvertimeContext);

export const OvertimeProvider = ({ children }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [staffOvertime, setStaffOvertime] = useState({});
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const { token, user } = useAuth();

  // Check overtime impact before assignment
  const checkAssignment = useCallback(async (shiftId, staffId) => {
    try {
      console.log('🔍 Checking overtime impact:', { shiftId, staffId });
      
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/overtime/check-assignment`,
        { shiftId, staffId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('✅ Overtime check result:', res.data.data);
      return res.data.data;
    } catch (error) {
      console.error('❌ Error checking overtime:', error);
      return {
        allowed: false,
        errors: [{ message: 'Failed to check overtime' }],
        warnings: []
      };
    }
  }, [token]);

  // Get weekly hours for a staff member
  const getWeeklyHours = useCallback(async (staffId, date = null) => {
    try {
      const url = date 
        ? `${process.env.REACT_APP_API_URL}/overtime/staff/${staffId}/weekly?date=${date}`
        : `${process.env.REACT_APP_API_URL}/overtime/staff/${staffId}/weekly`;
      
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return res.data.data;
    } catch (error) {
      console.error('❌ Error getting weekly hours:', error);
      return null;
    }
  }, [token]);

  // Get daily hours for a staff member
  const getDailyHours = useCallback(async (staffId, date = null) => {
    try {
      const url = date 
        ? `${process.env.REACT_APP_API_URL}/overtime/staff/${staffId}/daily?date=${date}`
        : `${process.env.REACT_APP_API_URL}/overtime/staff/${staffId}/daily`;
      
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return res.data.data;
    } catch (error) {
      console.error('❌ Error getting daily hours:', error);
      return null;
    }
  }, [token]);

  // Check consecutive days
  const checkConsecutiveDays = useCallback(async (staffId, date = null) => {
    try {
      const url = date 
        ? `${process.env.REACT_APP_API_URL}/overtime/staff/${staffId}/consecutive-days?date=${date}`
        : `${process.env.REACT_APP_API_URL}/overtime/staff/${staffId}/consecutive-days`;
      
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return res.data.data;
    } catch (error) {
      console.error('❌ Error checking consecutive days:', error);
      return null;
    }
  }, [token]);

  // Load dashboard data (managers only)
const loadDashboard = useCallback(async () => {
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return;
  }

  setLoading(true);
  try {
    console.log('📊 Loading dashboard for user:', user.id);
    console.log('📊 API URL:', API_URL);
    
    const res = await axios.get(`${API_URL}/overtime/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Dashboard response:', res.data);
    setDashboardData(res.data.data);
  } catch (error) {
    console.error('❌ Error loading dashboard:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    
    // Show the error in UI
    toast.error(error.response?.data?.message || 'Failed to load overtime dashboard');
  } finally {
    setLoading(false);
  }
}, [token, user]);
  // Override consecutive days block
  const overrideConsecutiveDays = useCallback(async (staffId, shiftId, reason) => {
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/overtime/override-consecutive`,
        { staffId, shiftId, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Override recorded successfully');
      return res.data.data;
    } catch (error) {
      console.error('❌ Error overriding:', error);
      toast.error(error.response?.data?.message || 'Failed to override');
      return null;
    }
  }, [token]);

  const value = {
    dashboardData,
    loading,
    checkAssignment,
    getWeeklyHours,
    getDailyHours,
    checkConsecutiveDays,
    loadDashboard,
    overrideConsecutiveDays
  };

  return (
    <OvertimeContext.Provider value={value}>
      {children}
    </OvertimeContext.Provider>
  );
};