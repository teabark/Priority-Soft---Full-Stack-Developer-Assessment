import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  const token = localStorage.getItem('token');
  const hasToken = !!token;

  if (loading) {
    if (hasToken && !isAuthenticated) {
      return children;
    }
    
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (isAuthenticated || hasToken) ? children : <Navigate to="/login" />;
};

export default PrivateRoute;