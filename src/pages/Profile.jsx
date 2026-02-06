/**
 * Profile Page - Settings and data export
 *
 * Features: User info, settings, data export (JSON), logout
 */

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { userAPI } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../lib/formatters';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { UserIcon, LogoutIcon } from '../icons';

const Profile = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [exporting, setExporting] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const { success, error: showError } = useToast();

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await userAPI.exportData();

      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gymbrain-export-${formatDate(new Date())}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      success('Data exported successfully');
    } catch (err) {
      console.error('Failed to export data:', err);
      showError('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-20 md:pb-8">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-[24px] md:text-[28px] font-display font-semibold text-text mb-8">Profile & Settings</h1>

        <div className="space-y-5">
          {/* Account Info */}
          <Card>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-accent-light rounded-xl">
                <UserIcon size={24} className="text-accent" />
              </div>
              <h2 className="text-lg font-display font-semibold text-text">Account Information</h2>
            </div>
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-border-light">
                  <span className="text-text-muted text-sm">Username</span>
                  <span className="text-text font-medium">{user.username}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border-light">
                  <span className="text-text-muted text-sm">Email</span>
                  <span className="text-text font-medium">{user.email}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-text-muted text-sm">Member Since</span>
                  <span className="text-text font-medium">
                    {user.created_at ? formatDate(user.created_at) : 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-text-muted">Loading user information...</p>
            )}
          </Card>

          {/* App Info */}
          <Card>
            <h2 className="text-lg font-display font-semibold text-text mb-4">About Gym<span className="text-accent">BrAIn</span></h2>
            <div className="space-y-3 text-sm">
              <p className="text-text">
                <strong className="font-semibold">Version:</strong> 1.0.0 (Phase 9)
              </p>
              <p className="text-text">
                <strong className="font-semibold">Features:</strong> Workout tracking, progress charts,
                PR tracking, AI assistance, offline support
              </p>
              <p className="text-text-muted mt-4 leading-relaxed">
                GymBrAIn is a progressive web app designed for serious lifters who want data-driven
                insights without the bloat.
              </p>
            </div>
          </Card>

          {/* Data Export */}
          <Card>
            <h2 className="text-lg font-display font-semibold text-text mb-4">Data Export</h2>
            <p className="text-text-muted text-sm mb-5 leading-relaxed">
              Export all your workout data, templates, custom exercises, and PRs as a JSON file.
              This includes your complete workout history and can be used for backup or analysis.
            </p>
            <Button
              onClick={handleExportData}
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Export My Data (JSON)'}
            </Button>
          </Card>

          {/* Settings (Future) */}
          <Card>
            <h2 className="text-lg font-display font-semibold text-text mb-5">Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border-light">
                <div>
                  <div className="font-medium text-text text-sm">Units</div>
                  <div className="text-xs text-text-muted">Weight measurement system</div>
                </div>
                <div className="text-text-muted text-sm">Imperial (lbs)</div>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border-light">
                <div>
                  <div className="font-medium text-text text-sm">Theme</div>
                  <div className="text-xs text-text-muted">App appearance</div>
                </div>
                <button
                  onClick={toggleTheme}
                  className="px-3 py-1.5 rounded-lg border border-border hover:border-accent hover:bg-accent-light transition-colors text-sm font-medium text-text"
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </button>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium text-text text-sm">Offline Mode</div>
                  <div className="text-xs text-text-muted">Work without internet connection</div>
                </div>
                <div className="text-success text-sm font-medium">Enabled</div>
              </div>
            </div>
            <p className="text-xs text-text-light mt-5">
              Additional settings coming in future updates
            </p>
          </Card>

          {/* Install App */}
          <Card>
            <h2 className="text-lg font-display font-semibold text-text mb-3">Install App</h2>
            <p className="text-text-muted text-sm mb-4 leading-relaxed">
              Add GymBrAIn to your home screen for quick access, offline support, and a native app experience.
            </p>
            <Button variant="secondary" onClick={() => setShowInstallModal(true)}>
              How to Install
            </Button>
          </Card>

          {/* Danger Zone */}
          <Card className="border-2 border-error/30">
            <h2 className="text-lg font-display font-semibold text-error mb-5">Danger Zone</h2>
            <div className="space-y-5">
              <div>
                <h3 className="font-medium text-text mb-2 text-sm">Log Out</h3>
                <p className="text-xs text-text-muted mb-3 leading-relaxed">
                  Sign out of your account on this device
                </p>
                <Button
                  onClick={handleLogout}
                  variant="secondary"
                  className="border-error text-error hover:bg-error/10"
                >
                  <LogoutIcon size={16} />
                  Log Out
                </Button>
              </div>

              <div className="pt-5 border-t border-border-light">
                <h3 className="font-medium text-text mb-2 text-sm">Delete Account</h3>
                <p className="text-xs text-text-muted mb-3 leading-relaxed">
                  Permanently delete your account and all data (coming soon)
                </p>
                <Button
                  disabled
                  variant="ghost"
                  className="opacity-50 cursor-not-allowed"
                >
                  Delete Account (Not Available)
                </Button>
              </div>
            </div>
          </Card>

          {/* Legal */}
          <Card>
            <h2 className="text-lg font-display font-semibold text-text mb-4">Legal & Privacy</h2>
            <div className="space-y-2 text-sm text-text-muted">
              <p>• Your workout data is stored securely and never shared</p>
              <p>• AI assistant conversations are not stored on servers</p>
              <p>• Offline data is encrypted in your browser</p>
              <p>• No third-party analytics or tracking</p>
            </div>
            <div className="mt-5 pt-5 border-t border-border-light">
              <p className="text-xs text-text-light">
                GymBrAIn v1.0.0 • Built with React + Vercel
                <br />© 2026 Joshua Ricks • Portfolio Project
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Modal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} title="Install GymBrAIn" size="md">
        <div className="space-y-5">
          <div>
            <h3 className="font-semibold text-text text-sm mb-2">iPhone / iPad (Safari)</h3>
            <ol className="text-sm text-text-muted space-y-1.5 list-decimal list-inside">
              <li>Tap the <span className="font-medium text-text">Share</span> button (square with arrow)</li>
              <li>Scroll down and tap <span className="font-medium text-text">Add to Home Screen</span></li>
              <li>Tap <span className="font-medium text-text">Add</span> in the top right</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold text-text text-sm mb-2">Android (Chrome)</h3>
            <ol className="text-sm text-text-muted space-y-1.5 list-decimal list-inside">
              <li>Tap the <span className="font-medium text-text">three-dot menu</span> in the top right</li>
              <li>Tap <span className="font-medium text-text">Add to Home screen</span> or <span className="font-medium text-text">Install app</span></li>
              <li>Tap <span className="font-medium text-text">Install</span> to confirm</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold text-text text-sm mb-2">Desktop (Chrome / Edge)</h3>
            <ol className="text-sm text-text-muted space-y-1.5 list-decimal list-inside">
              <li>Click the <span className="font-medium text-text">install icon</span> in the address bar (or three-dot menu)</li>
              <li>Click <span className="font-medium text-text">Install</span></li>
            </ol>
          </div>

          <p className="text-xs text-text-light pt-2 border-t border-border-light">
            Once installed, GymBrAIn works offline and launches like a native app.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Profile;
