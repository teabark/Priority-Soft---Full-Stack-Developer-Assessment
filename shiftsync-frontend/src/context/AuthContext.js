import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  console.log("🔥 AuthProvider initializing...");

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const navigate = useNavigate();

  // ✅ Load user from localStorage on mount only
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    
    console.log("📦 Loading from localStorage - user:", storedUser);
    console.log("📦 Loading from localStorage - token:", storedToken);
    
    if (storedUser && storedUser !== "undefined" && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log("✅ Setting user from localStorage:", parsedUser.name);
        setUser(parsedUser);
        setToken(storedToken);
        axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
      } catch (e) {
        console.error("Error parsing user:", e);
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  // 👤 Track user state changes
  useEffect(() => {
    console.log('👤 Current user state:', user);
    console.log('👤 User name:', user?.name);
  }, [user]);

  // Set axios default header when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, [token]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
    navigate("/login");
    toast.info("Logged out successfully");
  }, [navigate]);

  const login = async (email, password) => {
    try {
      console.log("🔍 Login attempt starting...");

      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/login`,
        {
          email,
          password,
        },
      );

      console.log("✅ Login successful");

      const token = res.data.token;
      const user = res.data.user || res.data.data;

      // Save to localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      
      console.log("✅ User saved to localStorage:", user.name);
      console.log("✅ Token saved to localStorage");

      // Set axios default header
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Update state
      setToken(token);
      setUser(user);

      toast.success(`Welcome back, ${user.name}!`);
      navigate("/");

      return { success: true };
    } catch (error) {
      console.error("❌ Login error:", error);
      const message = error.response?.data?.message || "Login failed";
      toast.error(message);
      return { success: false, message };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isManager: user?.role === "manager",
    isStaff: user?.role === "staff",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};