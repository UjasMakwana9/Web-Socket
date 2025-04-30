import http from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import { networkInterfaces } from "os";
const PORT = 3000;

// ---------------------- This Part is used to get the IP address of the system ----------------------
// const ip = networkInterfaces()
// // This is used to remove all the objects and make it a collection of the array
// const ipAddress = Object.values(ip)
// const ipAddress1 = ipAddress.flatMap((item) => {
//     return Object.values(item).filter((item) => {
//         return item.family === 'IPv4' && !item.internal
//     })
// })
const hostName = "localhost"; /*ipAddress1[0].address*/
// ------------------------------------------------------------------------------------------------------

const val = path.resolve("./public");
// This prints the path of the given directory
console.log("Public path file:", val);

// This store the room data and no of active users
const roomDataStructure = {};

// This is the main server
const mainServer = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Hello World\n");
    console.log("HEllo");
    return;
  } else if (req.url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html" });
    fs.readFile(path.join(val, "index.html"), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end("Error loading index.html");
        return;
      }
      // this send the data to the client as buffer
      // console.log(data);
      res.end(data);
    });
    return;
  } else if (req.url === "/room") {
    const roomCode = Math.floor(Math.random() * 1000000);
    roomDataStructure[roomCode] = [];

    res.writeHead(200, { "Content-Type": "application/json" });
    console.log(JSON.stringify({ roomCode }));
    res.end(JSON.stringify({ roomCode }));

    return;
  } else if (req.url.startsWith("/chat-room.html/")) {
    const roomCode = req.url.split("/")[2];

    if (!roomDataStructure[roomCode]) {
      res.writeHead(404, { "Content-Type": "text/html" });
      fs.readFile(path.join(val, "404.html"), (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end("Error loading 404.html");
          return;
        }
        res.end(data);
      });
      return;
    }
    res.writeHead(200, { "Content-Type": "chat-room.html" });
    fs.readFile(path.join(val, "chat-room.html"), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end("Error loading chat-room.html");
        return;
      }
      // this send the data to the client as buffer
      res.end(data);
    });
    return;
  }
});

// No need to do this will give error because mainServer is instance and not a function
// const server = http.createServer(mainServer)

const io = new Server(mainServer);

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  socket.on("join-room", (roomCode, callback) => {
    if (!roomDataStructure[roomCode]) {
      callback({ status: "error", error: "Room not found" });
      return;
    }
    socket.join(roomCode);
    roomDataStructure[roomCode].push(socket.id);
    console.log("Room data:", roomDataStructure);
    callback({ status: "ok" });
  });

  socket.on("disconnect", () => {
    console.log("user disconnected", socket.id);
    // Clean up rooms when user disconnects
    for (const [roomCode, users] of Object.entries(roomDataStructure)) {
      const index = users.indexOf(socket.id);
      if (index > -1) {
        users.splice(index, 1);
        if (users.length === 0) {
          delete roomDataStructure[roomCode];
        }
      }
    }
  });

  socket.on("leave-room", (roomCode) => {
    socket.leave(roomCode);
    if (roomDataStructure[roomCode]) {
      const index = roomDataStructure[roomCode].indexOf(socket.id);
      if (index > -1) {
        roomDataStructure[roomCode].splice(index, 1);
        if (roomDataStructure[roomCode].length === 0) {
          delete roomDataStructure[roomCode];
        }
      }
    }
  });

  socket.on("user-message", ({ message, roomCode }, callback) => {
    if (
      !roomDataStructure[roomCode] ||
      !roomDataStructure[roomCode].includes(socket.id)
    ) {
      callback({ status: "error", message: "Not in room" });
      return;
    }
    io.to(roomCode).emit("server-message", message);
    callback({ status: "ok" });
  });

  socket.on("real-time-message", ({ message, roomCode }, callback) => {
    if (
      !roomDataStructure[roomCode] ||
      !roomDataStructure[roomCode].includes(socket.id)
    ) {
      callback({ status: "error", message: "Not in room" });
      return;
    }
    socket.to(roomCode).emit("real-message", message);
    callback({ status: "ok" });
  });
});

mainServer.listen(PORT, () => {
  console.log(`Server running at http://${hostName}:${PORT}/`);
});
