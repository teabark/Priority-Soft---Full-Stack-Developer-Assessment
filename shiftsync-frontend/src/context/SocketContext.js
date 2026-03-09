import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user, token } = useAuth();

  useEffect(() => {
    if (user && token) {
      // Connect to socket
      const newSocket = io(process.env.REACT_APP_SOCKET_URL, {
        auth: { token }
      });

      newSocket.on('connect', () => {
        console.log('🔌 Connected to WebSocket');
      });

      newSocket.on('notification:new', (data) => {
        toast.info(data.notification.message);
      });

      newSocket.on('shift:assigned', (data) => {
        toast.info(`New shift assigned: ${data.message}`);
      });

      newSocket.on('shift:published', (data) => {
        toast.info('New shifts published!');
      });

      newSocket.on('swap:requested', (data) => {
        toast.info('New swap request received');
      });

      newSocket.on('user:status-change', (data) => {
        setOnlineUsers(prev => {
          if (data.isOnline) {
            return [...prev, data.user];
          } else {
            return prev.filter(u => u.id !== data.userId);
          }
        });
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user, token]);

  // Emit events
  const emitShiftCreated = (shiftData) => {
    socket?.emit('shift:create', shiftData);
  };

  const emitShiftAssigned = (data) => {
    socket?.emit('shift:assign', data);
  };

  const emitSwapRequest = (data) => {
    socket?.emit('swap:request', data);
  };

  const value = {
    socket,
    onlineUsers,
    emitShiftCreated,
    emitShiftAssigned,
    emitSwapRequest
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
