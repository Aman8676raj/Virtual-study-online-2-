# Cohort - Virtual Study Room Platform

Cohort is a comprehensive MERN stack application designed to revolutionize collaborative learning. It provides virtual study rooms equipped with real-time video, audio, whiteboards, and chat, allowing students to study together effectively from anywhere. Beyond study sessions, it features a vibrant community forum for sharing knowledge and resources.



## 🚀 Features

### 🎥 Real-Time Collaboration
*   **Video & Audio Calls:** Seamless peer-to-peer communication using WebRTC (`simple-peer`).
*   **Interactive Whiteboard:** Real-time shared drawing canvas for explaining concepts.
*   **Live Chat:** Instant messaging within rooms.
*   **Screen Sharing:** Share your screen with peers for presentations.

### 🛡️ Room Security & Management
*   **Private Rooms:** Secure your study sessions with password protection.
*   **Session Timers:** Set focus timers for productive study blocks.
*   **Easy Sharing:** Generate and copy invite links instantly.

### 🌐 Community & Social
*   **Discussion Forums:** Create posts, share images, and engage with the community.
*   **Nested Comments:** Reddit-style threaded conversations.
*   **User Profiles:** Customizable profiles with dynamic avatars and stats tracking.
*   **Progress Tracking:** Visualize your study hours and streaks.

### 🎨 UI/UX
*   **Modern Design:** Glassmorphism and responsive layouts using Tailwind CSS.
*   **Dark Mode:** Fully supported "Deep Indigo" dark theme for late-night study sessions.

## 🛠️ Tech Stack

### Client (Frontend)
*   **Framework:** React (Vite)
*   **Styling:** Tailwind CSS, Framer Motion
*   **Real-time:** Socket.io Client, Simple Peer (WebRTC)
*   **Icons:** Lucide React
*   **Deployment:** Vercel

### Server (Backend)
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** MongoDB (Mongoose)
*   **Authentication:** JWT, Passport.js (Google OAuth)
*   **Real-time:** Socket.io
*   **Deployment:** Render

## ⚙️ Installation & Setup

### Prerequisites
*   Node.js (v14+)
*   MongoDB (Local or Atlas)

### 1. Clone the Repository
```bash
git clone https://github.com/Raj200X/Cohort.git
cd Cohort
```

### 2. server Setup
```bash
cd server
npm install
```
Create a `.env` file in the `server` directory:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```
Start the server:
```bash
npm run dev
```

### 3. Client Setup
```bash
cd client
npm install
```
Create a `.env` file in the `client` directory (optional if using defaults):
```env
VITE_API_URL=http://localhost:5000
```
Start the client:
```bash
npm run dev
```

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is open-source and available under the MIT License.