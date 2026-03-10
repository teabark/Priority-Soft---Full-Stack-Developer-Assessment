import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import PrivateRoute from './components/auth/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Shifts from './pages/Shifts';
import Schedule from './pages/Schedule';
import Locations from './pages/Locations';
import Staff from './pages/Staff';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <NotificationProvider>
          <SocketProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } />
              <Route path="/shifts" element={
                <PrivateRoute>
                  <Shifts />
                </PrivateRoute>
              } />
              <Route path="/schedule" element={
                <PrivateRoute>
                  <Schedule />
                </PrivateRoute>
              } />
              <Route path="/locations" element={
                <PrivateRoute>
                  <Locations />
                </PrivateRoute>
              } />
              <Route path="/staff" element={
                <PrivateRoute>
                  <Staff />
                </PrivateRoute>
              } />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </SocketProvider>
          </NotificationProvider>
        </AuthProvider>
      </Router>
      <ToastContainer position="top-right" autoClose={3000} />
    </ThemeProvider>
  );
}

export default App;