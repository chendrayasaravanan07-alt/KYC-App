import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HomeIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ChartBarIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, current: location.pathname === '/dashboard' },
    { name: 'KYC Applications', href: '/kyc', icon: DocumentTextIcon, current: location.pathname.startsWith('/kyc') },
    { name: 'Users', href: '/users', icon: UserGroupIcon, current: location.pathname.startsWith('/users') },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, current: location.pathname.startsWith('/analytics') },
    { name: 'Settings', href: '/settings', icon: CogIcon, current: location.pathname.startsWith('/settings') },
  ];

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform lg:translate-x-0 lg:static lg:inset-0
    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
    transition-transform duration-300 ease-in-out
  `;

  const overlayClasses = `
    fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden
    ${sidebarOpen ? 'block' : 'hidden'}
  `;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className={overlayClasses}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={sidebarClasses}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">KYC Admin</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* User info */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center">
                  <span className="text-white font-medium">
                    {user?.name?.charAt(0) || user?.email?.charAt(0) || 'A'}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'Admin User'}</p>
                <p className="text-xs text-gray-500">{user?.email || 'admin@kyc.com'}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const isActive = item.current;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive
                      ? 'bg-primary-50 text-primary-600 border-r-2 border-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon
                    className={`
                      mr-3 h-5 w-5 flex-shrink-0
                      ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'}
                    `}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            {/* Header */}
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                {navigation.find(item => item.current)?.name || 'Dashboard'}
              </h1>
            </div>

            {/* Quick stats */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-6 text-sm">
                <div className="flex items-center text-green-600">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  <span className="font-medium">Verified</span>
                </div>
                <div className="flex items-center text-yellow-600">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  <span className="font-medium">Pending</span>
                </div>
                <div className="flex items-center text-red-600">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  <span className="font-medium">Flagged</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;