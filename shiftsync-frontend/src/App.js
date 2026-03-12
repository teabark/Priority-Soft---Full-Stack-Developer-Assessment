import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { NotificationProvider } from "./context/NotificationContext";
import { OvertimeProvider } from "./context/OvertimeContext";
import PrivateRoute from "./components/auth/PrivateRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Shifts from "./pages/Shifts";
import Schedule from "./pages/Schedule";
import Fairness from "./pages/Fairness";
import Locations from "./pages/Locations";
import OvertimeDashboard from "./components/overtime/OvertimeDashboard";
import Staff from "./pages/Staff";
import SwapRequests from "./pages/swapRequests";
import { Box, Typography } from "@mui/material";
import Layout from "./components/layout/Layout";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
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
            <OvertimeProvider>
              <SocketProvider>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/"
                    element={
                      <PrivateRoute>
                        <Dashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/staff"
                    element={
                      <PrivateRoute>
                        <Staff />
                      </PrivateRoute>
                    }
                  />
                  // Add this route inside your Routes
                  <Route
                    path="/fairness"
                    element={
                      <PrivateRoute>
                        <Fairness />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/overtime"
                    element={
                      <PrivateRoute>
                        <Layout>
                          <Box sx={{ p: 3 }}>
                            <Typography variant="h4" gutterBottom>
                              Overtime & Compliance
                            </Typography>
                            <OvertimeDashboard />
                          </Box>
                        </Layout>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/shifts"
                    element={
                      <PrivateRoute>
                        <Shifts />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/schedule"
                    element={
                      <PrivateRoute>
                        <Schedule />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/locations"
                    element={
                      <PrivateRoute>
                        <Locations />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/staff"
                    element={
                      <PrivateRoute>
                        <Staff />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/swaps"
                    element={
                      <PrivateRoute>
                        <SwapRequests />
                      </PrivateRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </SocketProvider>
            </OvertimeProvider>
          </NotificationProvider>
        </AuthProvider>
      </Router>
      <ToastContainer position="top-right" autoClose={3000} />
    </ThemeProvider>
  );
}

export default App;
