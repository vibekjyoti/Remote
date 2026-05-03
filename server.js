const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// 1. Strict CORS configuration to allow mobile and web clients to connect seamlessly
const io = new Server(server, {
    cors: {
        origin: "https://host-kappa-one.vercel.app/", 
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling']
    }
});

// Variable to keep track of the Android phone's socket ID
let streamerId = null; 

io.on('connection', (socket) => {
    console.log('⚡ New connection:', socket.id);

    // ==========================================
    // 📱 ANDROID PHONE EVENTS
    // ==========================================

    // The phone registers itself as the host when it connects
    socket.on('register_streamer', () => {
        streamerId = socket.id;
        console.log('📱 Streamer registered:', streamerId);
        
        // Tell any web viewers that might already be waiting that the phone is ready!
        socket.broadcast.emit('streamer_online');
    });


    // ==========================================
    // 💻 WEB VIEWER EVENTS
    // ==========================================

    // The web browser asks for the video stream
    socket.on('request_stream', () => {
        console.log('💻 Viewer requesting stream:', socket.id);
        
        if (streamerId) {
            // Forward the viewer's ID to the Android phone so it knows where to send the video
            io.to(streamerId).emit('viewer_requested', socket.id);
        } else {
            console.log('⚠️ Stream requested, but the phone is not connected yet.');
        }
    });


    // ==========================================
    // 🌉 WEBRTC SIGNALING RELAY (THE BRIDGE)
    // ==========================================

    // 1. Phone sends a WebRTC Offer to the Web Browser
    socket.on('webrtc_offer', (data) => {
        console.log(`Relaying Offer: ${socket.id} -> ${data.to}`);
        io.to(data.to).emit('webrtc_offer', { 
            sdp: data.sdp, 
            from: socket.id // CRITICAL: Tell the browser who sent this offer
        });
    });

    // 2. Web Browser sends a WebRTC Answer back to the Phone
    socket.on('webrtc_answer', (data) => {
        console.log(`Relaying Answer: ${socket.id} -> ${data.to}`);
        io.to(data.to).emit('webrtc_answer', { 
            sdp: data.sdp, 
            from: socket.id // CRITICAL: Tell the phone who sent this answer
        });
    });

    // 3. Both devices send ICE Candidates (network routing info) to each other
    socket.on('ice_candidate', (data) => {
        io.to(data.to).emit('ice_candidate', { 
            candidate: data.candidate, 
            from: socket.id 
        });
    });


    // ==========================================
    // 🧹 CLEANUP
    // ==========================================
    socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
        
        if (socket.id === streamerId) {
            console.log('📱 Streamer went offline.');
            streamerId = null;
            // Tell the web viewers that the stream has ended
            socket.broadcast.emit('streamer_offline');
        }
    });
});

// 2. Listen on 0.0.0.0 to expose the server to the local Wi-Fi network
const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Signaling server running on port ${PORT} across the network (0.0.0.0)`);
});
