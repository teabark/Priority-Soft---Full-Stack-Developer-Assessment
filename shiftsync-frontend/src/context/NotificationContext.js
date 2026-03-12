import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { toast } from "react-toastify";
import axios from "axios";

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const { user, token } = useAuth();

const fetchNotifications = useCallback(async () => {
  if (!user) return;

  try {
    console.log('📡 Fetching notifications for user:', user.id);
    const res = await axios.get(
      `${process.env.REACT_APP_API_URL}/notifications`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    
    console.log('📡 Notifications response:', res.data);
    setNotifications(res.data.data || []);
    
    // Make sure unreadCount is coming from the response
    // Your backend should return unreadCount
    setUnreadCount(res.data.unreadCount || 0);
    
  } catch (error) {
    console.error("Error fetching notifications:", error);
  } finally {
    setLoading(false);
  }
}, [user, token]); // Add token here

useEffect(() => {
  if (user && token) {
    fetchNotifications();
    connectSocket();
  } else {
    setNotifications([]);
    setUnreadCount(0);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  }

  return () => {
    if (socket) {
      socket.disconnect();
    }
  };
}, [user, token, fetchNotifications]);

useEffect(() => {
  const initializeNotifications = async () => {
    if (user && token) {
      console.log('🔔 Initializing notifications for user:', user.id);
      await fetchNotifications();
      connectSocket();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  };

  initializeNotifications();

  return () => {
    if (socket) {
      socket.disconnect();
    }
  };
}, [user, token]); 

  const connectSocket = () => {
    try {
      const newSocket = io(
        process.env.REACT_APP_SOCKET_URL || "http://localhost:5000",
        {
          auth: { token },
          transports: ["websocket"],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        },
      );

      newSocket.on("connect", () => {
        console.log("🔌 Connected to notification server");
        setConnected(true);
      });

      newSocket.on("disconnect", () => {
        console.log("🔌 Disconnected from notification server");
        setConnected(false);
      });

      newSocket.on("connect_error", (error) => {
        console.error("❌ Socket connection error:", error);
      });

      newSocket.on("notification:new", (data) => {
        console.log("📢 New notification:", data);

        if (!data || !data.message) {
          console.warn("⚠️ Received invalid notification:", data);
          return;
        }

        setNotifications((prev) => [data, ...prev]);
        setUnreadCount((prev) => prev + 1);

        toast.info(
          <div>
            <strong>{data.title || "Notification"}</strong>
            <p>{data.message}</p>
          </div>,
          { position: "top-right", autoClose: 5000 },
        );
      });

      setSocket(newSocket);
    } catch (error) {
      console.error("❌ Error creating socket connection:", error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const value = {
    socket,
    connected,
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
