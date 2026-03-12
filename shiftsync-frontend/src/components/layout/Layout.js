import React, { useState } from "react";
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Popover,
  List as NotificationList,
  ListItem as NotificationListItem,
  ListItemText as NotificationListItemText,
  Button,
  Chip,
} from "@mui/material";
import axios from "axios";
import { useEffect } from "react";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Event as EventIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  Notifications as NotificationsIcon,
  Timeline as TimelineIcon,
  ExitToApp as LogoutIcon,
  SwapHoriz as SwapHorizIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { formatDistanceToNow } from "date-fns";

const drawerWidth = 240;

const Layout = ({ children }) => {
  // Add this with your other state
  const [overtimeData, setOvertimeData] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === "manager" || user?.role === "admin") {
      fetchOvertimeSummary();
    }
  }, [user]);

  const fetchOvertimeSummary = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/overtime/dashboard`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setOvertimeData(res.data.data);
    } catch (error) {
      console.error("Error fetching overtime summary:", error);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleNotificationItemClick = (notification) => {
    markAsRead(notification._id);
    if (notification.data?.swapRequestId) {
      navigate("/swaps");
    } else if (notification.data?.shiftId) {
      navigate("/shifts");
    }
    handleNotificationClose();
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  // Role-based menu items
  // Manager/Admin menu
  const getMenuItems = () => {
    if (user?.role === "staff") {
      return [
        { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
        { text: "My Shifts", icon: <EventIcon />, path: "/shifts" },
        { text: "Schedule", icon: <CalendarIcon />, path: "/schedule" },
        { text: "Swap Requests", icon: <SwapHorizIcon />, path: "/swaps" },
      ];
    }

    // Manager/Admin menu - start with common items
    const items = [
      { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
      { text: "Shifts", icon: <EventIcon />, path: "/shifts" },
      { text: "Schedule", icon: <CalendarIcon />, path: "/schedule" },
      { text: "Swap Requests", icon: <SwapHorizIcon />, path: "/swaps" },
    ];

    // Add Fairness page here - for both managers and admins
    items.push({
      text: "Fairness",
      icon: <AssessmentIcon />, // Make sure AssessmentIcon is imported
      path: "/fairness",
    });

    // ONLY ADMINS can see Locations
    if (user?.role === "admin") {
      items.push({
        text: "Locations",
        icon: <LocationIcon />,
        path: "/locations",
      });
    }

    // Both admins and managers can see Staff
    items.push({ text: "Staff", icon: <PeopleIcon />, path: "/staff" });

    // Both admins and managers can see Overtime (with badge)
    items.push({
      text: "Overtime",
      icon: (
        <Badge
          badgeContent={overtimeData?.warnings?.length || 0}
          color="error"
          variant="dot"
        >
          <TimelineIcon />
        </Badge>
      ),
      path: "/overtime",
    });

    return items;
  };
  const menuItems = getMenuItems();

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap>
          ShiftSync
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              navigate(item.path);
              setMobileOpen(false);
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </div>
  );

  const notificationOpen = Boolean(notificationAnchor);

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find((item) => item.path === window.location.pathname)
              ?.text || "ShiftSync"}
          </Typography>

          <IconButton
            color="inherit"
            sx={{ mr: 2 }}
            onClick={handleNotificationClick}
          >
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton onClick={handleMenuOpen} color="inherit">
            <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main" }}>
              {user?.name?.charAt(0) || "U"}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 200,
                borderRadius: 2,
                boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                "& .MuiMenuItem-root": {
                  px: 2,
                  py: 1.5,
                },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5, bgcolor: "#f5f5f5" }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: "bold", color: "primary.main" }}
              >
                {user?.name}
              </Typography>
              <Chip
                label={user?.role}
                size="small"
                color={
                  user?.role === "admin"
                    ? "error"
                    : user?.role === "manager"
                      ? "primary"
                      : "success"
                }
                sx={{ mt: 0.5, textTransform: "capitalize" }}
              />
            </Box>
            <Divider />
            <MenuItem
              onClick={handleLogout}
              sx={{ color: "error.main", "&:hover": { bgcolor: "#ffebee" } }}
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" color="error" />
              </ListItemIcon>
              <Typography variant="body2">Logout</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Notifications Popover */}
      <Popover
        open={notificationOpen}
        anchorEl={notificationAnchor}
        onClose={handleNotificationClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: { width: 360, maxHeight: 480 },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">Notifications</Typography>
          {notifications.length > 0 && (
            <Button size="small" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </Box>
        <Divider />
        <NotificationList sx={{ py: 0 }}>
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <NotificationListItem
                key={notification._id}
                button
                onClick={() => handleNotificationItemClick(notification)}
                sx={{
                  bgcolor: notification.read ? "transparent" : "action.hover",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {notification.type?.includes("swap") ? (
                    <SwapHorizIcon color="primary" fontSize="small" />
                  ) : (
                    <NotificationsIcon fontSize="small" />
                  )}
                </ListItemIcon>
                <NotificationListItemText
                  primary={notification.title}
                  secondary={
                    <>
                      <Typography variant="body2" component="span">
                        {notification.message}
                      </Typography>
                      <br />
                      <Typography variant="caption" color="textSecondary">
                        {formatDistanceToNow(
                          new Date(notification.createdAt || Date.now()),
                          { addSuffix: true },
                        )}
                      </Typography>
                    </>
                  }
                />
              </NotificationListItem>
            ))
          ) : (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography color="textSecondary">No notifications</Typography>
            </Box>
          )}
        </NotificationList>
      </Popover>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
