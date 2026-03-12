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

  // Load user from localStorage on mount only
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    
    console.log('📦 Loading from storage - token:', storedToken);
    console.log('📦 Loading from storage - user:', storedUser);
    
    if (storedUser && storedUser !== "undefined" && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        
        const normalizedUser = {
          ...parsedUser,
          _id: parsedUser._id || parsedUser.id
        };
        
        setUser(normalizedUser);
        setToken(storedToken);
        axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
        console.log('✅ User loaded with _id:', normalizedUser._id);
      } catch (e) {
        console.error("Error parsing user:", e);
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  // Track user state changes
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
      console.log("📡 URL:", `${process.env.REACT_APP_API_URL}/auth/login`);

      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/login`,
        {
          email,
          password,
        },
        { 
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      console.log("✅ Login response:", res.data);

      const token = res.data.token;
      const user = res.data.user || res.data.data;

      if (!token || !user) {
        throw new Error("Invalid response from server");
      }

      const normalizedUser = {
        ...user,
        _id: user._id || user.id
      };

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(normalizedUser));
      
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      setToken(token);
      setUser(normalizedUser);

      toast.success(`Welcome back, ${normalizedUser.name}!`);
      navigate("/");

      return { success: true };
    } catch (error) {
      console.error("❌ Login error:", error);
      
      let message = "Login failed";
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }
      
      toast.error(message);
      
      // ALWAYS return an object with success false
      return { 
        success: false, 
        message: message 
      };
    }
  };

  const value = {
    user,
    token,
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