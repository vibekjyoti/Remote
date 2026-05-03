const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// 1. Strict CORS configuration
const io = new Server(server, {
    cors: {
        origin: "https://host-kappa-one.vercel.app/", // Or explicitly specify your Vercel domain: "https://your-project.vercel.app"
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling']
    }
});

let streamerId = null; 

io.on('connection', (socket) => {
    console.log('⚡ New connection:', socket.id);

    // ==========================================
    // 📱 ANDROID PHONE EVENTS
    // ==========================================
    socket.on('register_streamer', () => {
        streamerId = socket.id;
        console.log('📱 Streamer registered:', streamerId);
        socket.broadcast.emit('streamer_online');
    });

    // ==========================================
    // 💻 WEB VIEWER EVENTS
    // ==========================================
    socket.on('request_stream', () => {
        console.log('💻 Viewer requesting stream:', socket.id);
        if (streamerId) {
            io.to(streamerId).emit('viewer_requested', socket.id);
        } else {
            console.log('⚠️ Stream requested, but the phone is not connected yet.');
        }
    });

    // ==========================================
    // 🌉 WEBRTC SIGNALING RELAY (THE BRIDGE)
    // ==========================================
    socket.on('webrtc_offer', (data) => {
        console.log(`Relaying Offer: ${socket.id} -> ${data.to}`);
        io.to(data.to).emit('webrtc_offer', { 
            sdp: data.sdp, 
            from: socket.id 
        });
    });

    socket.on('webrtc_answer', (data) => {
        console.log(`Relaying Answer: ${socket.id} -> ${data.to}`);
        io.to(data.to).emit('webrtc_answer', { 
            sdp: data.sdp, 
            from: socket.id 
        });
    });

    socket.on('ice_candidate', (data) => {
        io.to(data.to).emit('ice_candidate', { 
            candidate: data.candidate, 
            from: socket.id 
        });
    });

    // ==========================================
    // 🖱️ REMOTE MOUSE CONTROL RELAY
    // ==========================================
    socket.on('remote_input', (data) => {
        console.log(`Relaying Click: X:${data.x}, Y:${data.y} to ${data.to}`);
        io.to(data.to).emit('remote_input', {
            x: data.x,
            y: data.y
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
            socket.broadcast.emit('streamer_offline');
        }
    });
});

// 2. Port binding for Render/Cloud hosting
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT} across the network (0.0.0.0)`);
});
