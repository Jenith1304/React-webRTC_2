import React, { createContext, useMemo, useState, useContext } from "react";
import { io } from "socket.io-client";

// Create a context for both socket and interviewer state
const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  // State for socket connection
  const socket = useMemo(() => io("localhost:8000"), []);

  // State for interviewer
  const [interviewer, setInterviewer] = useState(false);

  // Memoize the context value to include both socket and interviewer state
  const value = useMemo(
    () => ({
      socket,
      interviewer,
      setInterviewer,
    }),
    [socket, interviewer]
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
