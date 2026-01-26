/**
 * Main App Component
 *
 * Sets up routing, authentication, and toast notifications
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Workout from './pages/Workout';
import History from './pages/History';
import Progress from './pages/Progress';
import Library from './pages/Library';
import Profile from './pages/Profile';
import './App.css';

function App() {
  return (
    <Router>
      <ToastProvider>
        <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route
          path="/workout"
          element={
            <PrivateRoute>
              <Layout>
                <Workout />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/history"
          element={
            <PrivateRoute>
              <Layout>
                <History />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/progress"
          element={
            <PrivateRoute>
              <Layout>
                <Progress />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/library"
          element={
            <PrivateRoute>
              <Layout>
                <Library />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Layout>
                <Profile />
              </Layout>
            </PrivateRoute>
          }
        />

        {/* Default route */}
        <Route path="/" element={<Navigate to="/workout" replace />} />

        {/* 404 catch-all */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">404</h1>
                <p className="text-gray-400">Page not found</p>
              </div>
            </div>
          }
        />
      </Routes>
      </ToastProvider>
    </Router>
  );
}

export default App;
