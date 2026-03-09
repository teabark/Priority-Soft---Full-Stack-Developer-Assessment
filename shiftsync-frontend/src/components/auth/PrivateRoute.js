import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // Check localStorage as fallback
  const token = localStorage.getItem('token');
  const hasToken = !!token;
  
  console.log('🔒 PrivateRoute - isAuthenticated:', isAuthenticated, 'loading:', loading, 'hasToken:', hasToken);

  if (loading) {
    // If we're loading but have a token, maybe we should still show the page
    if (hasToken && !isAuthenticated) {
      console.log('⚠️ Has token but not authenticated, showing page anyway');
      return children;
    }
    
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Allow access if authenticated OR has token
  return (isAuthenticated || hasToken) ? children : <Navigate to="/login" />;
};

export default PrivateRoute;