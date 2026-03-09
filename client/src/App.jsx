import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import axios from 'axios';
import API_URL from './config';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import AnimatedRoutes from './components/AnimatedRoutes';

import { DarkModeProvider } from './context/DarkModeContext';

function AppContent() {
  const location = useLocation();
  const isRoomPage = location.pathname.startsWith('/room/');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {!isRoomPage && <Navbar />}
      <AnimatedRoutes />
    </div>
  );
}

function App() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      console.log('Token found in URL:', token);
      localStorage.setItem('token', token);

      // Fetch user details
      console.log('Fetching user details...');
      axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => {
          console.log('User fetch success:', res.data);
          localStorage.setItem('user', JSON.stringify(res.data.result));
          // Remove token from URL
          console.log('Cleaning URL...');
          window.history.replaceState({}, document.title, "/");
          // Force reload to update Navbar state
          window.location.href = '/';
        })
        .catch(err => {
          console.error('Failed to fetch user', err);
          // Optional: clear invalid token
          localStorage.removeItem('token');
        });
    }
  }, []);

  return (
    <DarkModeProvider>
      <SocketProvider>
        <Router>
          <AppContent />
        </Router>
      </SocketProvider>
    </DarkModeProvider>
  );
}

export default App;
