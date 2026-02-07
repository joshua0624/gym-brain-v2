/**
 * Main App Component
 *
 * Sets up routing, authentication, and toast notifications
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { OfflineBanner } from './components/OfflineBanner';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import { useTheme } from './hooks/useTheme';
import './App.css';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Home = lazy(() => import('./pages/Home'));
const Plan = lazy(() => import('./pages/Plan'));
const Workout = lazy(() => import('./pages/Workout'));
const History = lazy(() => import('./pages/History'));
const Progress = lazy(() => import('./pages/Progress'));
const Library = lazy(() => import('./pages/Library'));
const Profile = lazy(() => import('./pages/Profile'));

function App() {
  useTheme();

  return (
    <Router>
      <ToastProvider>
        <OfflineBanner />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-text-secondary">Loading...</div></div>}>
        <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes */}
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Layout>
                <Home />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/plan"
          element={
            <PrivateRoute>
              <Layout>
                <Plan />
              </Layout>
            </PrivateRoute>
          }
        />
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
        <Route path="/" element={<Navigate to="/home" replace />} />

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
        </Suspense>
      </ToastProvider>
    </Router>
  );
}

export default App;
