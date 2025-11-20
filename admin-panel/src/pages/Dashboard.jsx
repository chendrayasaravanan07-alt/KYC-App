import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UsersIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { dashboardService } from '../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, analyticsResponse] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getAnalytics(),
      ]);

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      if (analyticsResponse.success) {
        setAnalytics(analyticsResponse.data);
      }
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock data for charts (replace with real API data)
  const mockTrendData = [
    { name: 'Mon', applications: 45, completed: 42 },
    { name: 'Tue', applications: 52, completed: 48 },
    { name: 'Wed', applications: 38, completed: 35 },
    { name: 'Thu', applications: 65, completed: 61 },
    { name: 'Fri', applications: 58, completed: 54 },
    { name: 'Sat', applications: 72, completed: 68 },
    { name: 'Sun', applications: 48, completed: 45 },
  ];

  const mockStatusData = [
    { name: 'Verified', value: 245, color: '#10b981' },
    { name: 'Pending', value: 89, color: '#f59e0b' },
    { name: 'Manual Review', value: 34, color: '#3b82f6' },
    { name: 'Rejected', value: 12, color: '#ef4444' },
  ];

  const mockRiskData = [
    { range: '0-20', count: 180, applications: 180 },
    { range: '21-40', count: 95, applications: 95 },
    { range: '41-60', count: 67, applications: 67 },
    { range: '61-80', count: 28, applications: 28 },
    { range: '81-100', count: 10, applications: 10 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Overview of KYC verification system performance and statistics
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Applications"
          value={stats?.totalApplications || 380}
          change={stats?.applicationsChange || 12}
          changeType="increase"
          icon={DocumentTextIcon}
          color="blue"
        />
        <StatCard
          title="Verified Users"
          value={stats?.verifiedUsers || 245}
          change={stats?.verifiedChange || 8}
          changeType="increase"
          icon={CheckCircleIcon}
          color="green"
        />
        <StatCard
          title="Pending Review"
          value={stats?.pendingReview || 89}
          change={stats?.pendingChange || -5}
          changeType="decrease"
          icon={ClockIcon}
          color="yellow"
        />
        <StatCard
          title="Flagged Cases"
          value={stats?.flaggedCases || 12}
          change={stats?.flaggedChange || 2}
          changeType="increase"
          icon={ExclamationTriangleIcon}
          color="red"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application trends chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Application Trends</h3>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="applications"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                name="Applications"
              />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
                name="Completed"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status distribution chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Application Status</h3>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={mockStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {mockStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk distribution chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Risk Score Distribution</h3>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockRiskData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent activity */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <Link
              to="/kyc"
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {[
              { user: 'Rahul Kumar', action: 'KYC Verified', time: '2 min ago', status: 'success' },
              { user: 'Priya Sharma', action: 'Document Uploaded', time: '5 min ago', status: 'pending' },
              { user: 'Amit Patel', action: 'Manual Review Required', time: '12 min ago', status: 'warning' },
              { user: 'Sneha Reddy', action: 'KYC Approved', time: '18 min ago', status: 'success' },
              { user: 'Vikram Singh', action: 'High Risk Flagged', time: '25 min ago', status: 'danger' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`h-2 w-2 rounded-full ${
                    activity.status === 'success' ? 'bg-success-500' :
                    activity.status === 'warning' ? 'bg-warning-500' :
                    activity.status === 'danger' ? 'bg-danger-500' : 'bg-gray-400'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.user}</p>
                    <p className="text-xs text-gray-500">{activity.action}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/kyc?status=pending"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ClockIcon className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Review Pending</p>
              <p className="text-sm text-gray-500">Process pending applications</p>
            </div>
          </Link>
          <Link
            to="/kyc?status=manual_review"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ExclamationTriangleIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Manual Review</p>
              <p className="text-sm text-gray-500">Handle flagged cases</p>
            </div>
          </Link>
          <Link
            to="/analytics"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChartBarIcon className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">View Analytics</p>
              <p className="text-sm text-gray-500">Detailed reports and insights</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

// Stat card component
const StatCard = ({ title, value, change, changeType, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
          </div>
        </div>
        <div className={`flex items-center text-sm font-medium ${
          changeType === 'increase' ? 'text-green-600' : 'text-red-600'
        }`}>
          {changeType === 'increase' ? (
            <TrendingUpIcon className="h-4 w-4 mr-1" />
          ) : (
            <TrendingDownIcon className="h-4 w-4 mr-1" />
          )}
          {Math.abs(change)}%
        </div>
      </div>
    </div>
  );
};

export default Dashboard;