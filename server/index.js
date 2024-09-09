const { Server } = require("socket.io");
const fs = require('node:fs/promises');

const io = new Server(8000, {
  cors: true,
});

const emailToSocketIdMap = new Map();
const socketidToEmailMap = new Map();

io.on("connection", (socket) => {
  console.log(`Socket Connected`, socket.id);

  socket.on("room:join", (data) => {
    const { email, room } = data;
    emailToSocketIdMap.set(email, socket.id);
    socketidToEmailMap.set(socket.id, email);
    socket.join(room);
    io.to(room).emit("user:joined", { email, id: socket.id });
    io.to(socket.id).emit("room:join", data);
    console.log(`Joined room: ${room}`);
  });

  socket.on("user:call", ({ to, offer }) => {
    io.to(to).emit("incomming:call", { from: socket.id, offer });
  });

  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
  });

  socket.on("peer:nego:needed", ({ to, offer }) => {
    console.log("peer:nego:needed", offer);
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, ans }) => {
    console.log("peer:nego:done", ans);
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });

  // Chat message event
  socket.on("chat:message", ({ room, message, email }) => {
    // Debugging statements
    console.log(`Received message - Room: ${room}, Email: ${email}, Message: ${message}`);

    // Check if room, message, and email are defined and not empty
    if (!room || !message || !email) {
      console.error("Missing parameters: room, message, or email");
      return;
    }

    io.to(room).emit("chat:message", { message, email });

    // Append message to file
    message = message + '\n';
    const fileName = `${room}.txt`;

    fs.appendFile(fileName, `${JSON.stringify({ email, message })}\n`)
      .then(() => {
        console.log(`Message appended to file: ${fileName}`);
      })
      .catch((err) => {
        console.error(`Error updating file ${fileName}:`, err);
      });
  });

  socket.on("disconnect", () => {
    const email = socketidToEmailMap.get(socket.id);
    emailToSocketIdMap.delete(email);
    socketidToEmailMap.delete(socket.id);
  });

});
