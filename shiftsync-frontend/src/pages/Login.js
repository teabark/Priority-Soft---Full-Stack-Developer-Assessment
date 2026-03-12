import React, { useState } from "react";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  Alert,
  Divider,
  Chip,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const result = await login(email, password);
    if (!result.success) {
      setError(result.message);
    }
  };

  const demoAccounts = [
    {
      email: "admin@coastaleats.com",
      password: "Admin123!",
      role: "admin",
      name: "Admin User",
    },
    {
      email: "manager.miami@coastaleats.com",
      password: "Manager123!",
      role: "manager",
      name: "Mike Johnson",
    },
    {
      email: "manager.seattle@coastaleats.com",
      password: "Manager123!",
      role: "manager",
      name: "Sarah Chen",
    },
    {
      email: "alex.j@coastaleats.com",
      password: "Staff123!",
      role: "staff",
      name: "Alex Johnson",
    },
    {
      email: "sam.c@coastaleats.com",
      password: "Staff123!",
      role: "staff",
      name: "Sam Carter",
    },
  ];

  const fillDemoAccount = (account) => {
    setEmail(account.email);
    setPassword(account.password);
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: "100%" }}>
          <Box display="flex" flexDirection="column" alignItems="center">
            <Avatar sx={{ m: 1, bgcolor: "primary.main" }}>
              <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h5">
              ShiftSync Login
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Coastal Eats Staff Scheduling
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign In
            </Button>

            <Divider sx={{ my: 2 }}>
              <Chip label="Demo Accounts" size="small" />
            </Divider>

            <Box sx={{ mt: 2, maxHeight: 300, overflow: "auto" }}>
              {demoAccounts.map((account, index) => (
                <Paper
                  key={index}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    mb: 1,
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "#f5f5f5",
                      borderColor: "primary.main",
                    },
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                  onClick={() => fillDemoAccount(account)}
                >
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {account.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {account.email}
                    </Typography>
                  </Box>
                  <Chip
                    label={account.role}
                    size="small"
                    color={
                      account.role === "admin"
                        ? "error"
                        : account.role === "manager"
                          ? "primary"
                          : "success"
                    }
                    sx={{ ml: 1 }}
                  />
                </Paper>
              ))}
            </Box>

            <Typography
              variant="caption"
              color="textSecondary"
              align="center"
              display="block"
              sx={{ mt: 2 }}
            >
              Click any demo account to auto-fill credentials
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
