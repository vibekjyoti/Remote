const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
// Allow connections from your future Vercel domain or local testing
const io = new Server(server, { cors: { origin: "*" } });

let streamerId = null;

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Identify the Android phone
    socket.on('register_streamer', () => {
        streamerId = socket.id;
        console.log('Streamer registered:', streamerId);
    });

    // The web viewer asks for the stream
    socket.on('request_stream', () => {
        if (streamerId) {
            // Tell the phone someone wants to watch
            io.to(streamerId).emit('viewer_requested', socket.id);
        }
    });

    // Relay WebRTC signaling messages between phone and viewer
    socket.on('webrtc_offer', (data) => {
        io.to(data.to).emit('webrtc_offer', { from: socket.id, sdp: data.sdp });
    });

    socket.on('webrtc_answer', (data) => {
        io.to(data.to).emit('webrtc_answer', { from: socket.id, sdp: data.sdp });
    });

    socket.on('ice_candidate', (data) => {
        io.to(data.to).emit('ice_candidate', { from: socket.id, candidate: data.candidate });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (socket.id === streamerId) streamerId = null;
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Signaling server running on port ${PORT} across the network`));