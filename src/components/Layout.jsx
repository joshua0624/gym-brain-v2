/**
 * Layout Component
 *
 * Responsive app layout with:
 * - Desktop: Sticky sidebar navigation (left) + main content (right)
 * - Mobile: Header + content + bottom navigation
 */

import { Link, useLocation } from 'react-router-dom';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import {
  HomeIcon,
  DumbbellIcon,
  HistoryIcon,
  TrendingUpIcon,
  UserIcon,
  WifiIcon,
  WifiOffIcon,
} from '../icons';

const Layout = ({ children }) => {
  const location = useLocation();
  const { isOnline, isOffline } = useNetworkStatus();

  const navItems = [
    { path: '/home', label: 'Home', Icon: HomeIcon },
    { path: '/plan', label: 'Plan', Icon: DumbbellIcon },
    { path: '/history', label: 'History', Icon: HistoryIcon },
    { path: '/progress', label: 'Progress', Icon: TrendingUpIcon },
    { path: '/profile', label: 'Profile', Icon: UserIcon },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar Navigation */}
      <nav className="hidden lg:flex flex-col w-60 h-screen bg-surface border-r border-border-light p-6 sticky top-0 shrink-0" aria-label="Main navigation">
        {/* Logo */}
        <div className="mb-8">
          <Link to="/home" className="text-2xl font-bold">
            <span className="text-accent font-display">Gym</span>
            <span className="text-text">BrAI</span>
            <span className="text-text">n</span>
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.Icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3
                  px-4 py-3
                  rounded-xl
                  text-[15px] font-medium
                  transition-all duration-200
                  ${active
                    ? 'bg-accent-light text-accent'
                    : 'text-text-muted hover:bg-surface-hover hover:text-text'
                  }
                `}
              >
                <Icon size={20} className={active ? 'text-accent' : ''} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Network Status */}
        <div className="pt-4 border-t border-border-light">
          {isOffline && (
            <div className="flex items-center gap-2 text-warning text-sm px-4 py-2">
              <WifiOffIcon size={16} />
              <span>Offline Mode</span>
            </div>
          )}
          {isOnline && (
            <div className="flex items-center gap-2 text-success text-sm px-4 py-2">
              <WifiIcon size={16} />
              <span>Connected</span>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header - Hidden on Desktop */}
        <header className="lg:hidden bg-surface border-b border-border-light sticky top-0 z-40">
          <div className="px-4 h-14 flex items-center justify-between">
            <Link to="/home" className="text-xl font-bold">
              <span className="text-accent font-display">Gym</span>
              <span className="text-text">BrAI</span>
              <span className="text-text">n</span>
            </Link>

            {/* Network Status Indicator */}
            <div className="flex items-center gap-2">
              {isOffline && (
                <div className="flex items-center gap-1.5 text-warning text-sm">
                  <WifiOffIcon size={16} />
                  <span className="hidden sm:inline">Offline</span>
                </div>
              )}
              {isOnline && (
                <div className="flex items-center gap-1.5 text-success text-sm">
                  <WifiIcon size={16} />
                  <span className="hidden sm:inline">Online</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main id="main-content" className="flex-1 pb-24 lg:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 pt-3 pb-5 px-5 bg-bg border-t border-border-light z-40" aria-label="Mobile navigation">
          <div className="flex justify-around items-center">
            {navItems.map((item) => {
              const Icon = item.Icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex flex-col items-center gap-1
                    transition-opacity duration-200
                    ${active ? 'opacity-100' : 'opacity-50'}
                  `}
                >
                  <Icon
                    size={22}
                    className={active ? 'text-accent' : 'text-text-muted'}
                  />
                  <span
                    className={`
                      text-[10px]
                      ${active
                        ? 'text-accent font-semibold'
                        : 'text-text-muted font-normal'
                      }
                    `}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Layout;
