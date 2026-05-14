import { io } from "socket.io-client";

const resolveSocketUrl = () => {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (explicit) {
    return explicit;
  }

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  return apiUrl.endsWith("/api") ? apiUrl.replace(/\/api$/, "") : apiUrl;
};

export const createSocketClient = (token) =>
  io(resolveSocketUrl(), {
    autoConnect: true,
    transports: ["websocket"],
    auth: {
      token,
    },
  });
