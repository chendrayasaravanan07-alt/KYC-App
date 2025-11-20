import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  KeyIcon,
  HistoryIcon,
} from '@heroicons/react/24/outline';
import { userService } from '../services/api';
import toast from 'react-hot-toast';

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (id) {
      fetchUserDetails();
    }
  }, [id]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await userService.getUser(id);

      if (response.success) {
        setUser(response.data.user);
        setFormData(response.data.user);
      } else {
        toast.error('Failed to load user details');
        navigate('/users');
      }
    } catch (error) {
      toast.error('Error loading user details');
      console.error('User fetch error:', error);
      navigate('/users');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async () => {
    const reason = prompt('Enter suspension reason:');
    if (!reason) return;

    try {
      setActionLoading(true);
      const response = await userService.suspendUser(id, reason);

      if (response.success) {
        toast.success('User suspended successfully');
        fetchUserDetails();
      } else {
        toast.error(response.message || 'Failed to suspend user');
      }
    } catch (error) {
      toast.error('Error suspending user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateUser = async () => {
    try {
      setActionLoading(true);
      const response = await userService.activateUser(id);

      if (response.success) {
        toast.success('User activated successfully');
        fetchUserDetails();
      } else {
        toast.error(response.message || 'Failed to activate user');
      }
    } catch (error) {
      toast.error('Error activating user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    try {
      setActionLoading(true);
      const response = await userService.updateUser(id, formData);

      if (response.success) {
        toast.success('User updated successfully');
        setEditMode(false);
        fetchUserDetails();
      } else {
        toast.error(response.message || 'Failed to update user');
      }
    } catch (error) {
      toast.error('Error updating user');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { class: 'badge-success', icon: CheckCircleIcon, label: 'Active' },
      suspended: { class: 'badge-danger', icon: XCircleIcon, label: 'Suspended' },
      inactive: { class: 'badge-warning', icon: ClockIcon, label: 'Inactive' },
      pending: { class: 'badge-info', icon: ClockIcon, label: 'Pending' },
    };

    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;

    return (
      <span className={`badge ${config.class} flex items-center`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getKYCStatusBadge = (kycStatus) => {
    const statusConfig = {
      verified: { class: 'badge-success', label: 'Verified' },
      pending: { class: 'badge-warning', label: 'Pending' },
      rejected: { class: 'badge-danger', label: 'Rejected' },
      not_started: { class: 'badge-info', label: 'Not Started' },
      in_progress: { class: 'badge-warning', label: 'In Progress' },
    };

    const config = statusConfig[kycStatus] || statusConfig.not_started;
    return <span className={`badge ${config.class}`}>{config.label}</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">User not found</h3>
        <p className="mt-1 text-sm text-gray-500">The requested user could not be found.</p>
        <div className="mt-6">
          <Link to="/users" className="btn btn-primary">
            Back to Users
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/users')}
            className="btn btn-secondary"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user.profile?.firstName || 'N/A'} {user.profile?.lastName || 'N/A'}
            </h1>
            <p className="text-sm text-gray-600">User ID: {user._id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {getStatusBadge(user.status)}
          <button
            onClick={() => setEditMode(!editMode)}
            className="btn btn-secondary"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            {editMode ? 'Cancel' : 'Edit'}
          </button>
          {user.status === 'suspended' ? (
            <button
              onClick={handleActivateUser}
              disabled={actionLoading}
              className="btn btn-success"
            >
              {actionLoading ? 'Processing...' : 'Activate'}
            </button>
          ) : (
            <button
              onClick={handleSuspendUser}
              disabled={actionLoading || user.status === 'suspended'}
              className="btn btn-danger"
            >
              {actionLoading ? 'Processing...' : 'Suspend'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Information */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">User Information</h3>
              <UserIcon className="h-5 w-5 text-gray-400" />
            </div>

            {editMode ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.profile?.firstName || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: { ...formData.profile, firstName: e.target.value }
                      })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.profile?.lastName || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: { ...formData.profile, lastName: e.target.value }
                      })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.profile?.phone || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: { ...formData.profile, phone: e.target.value }
                      })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={formData.role || 'user'}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="input"
                    >
                      <option value="user">User</option>
                      <option value="verifier">Verifier</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.profile?.dateOfBirth ?
                        new Date(formData.profile.dateOfBirth).toISOString().split('T')[0] : ''
                      }
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: { ...formData.profile, dateOfBirth: e.target.value }
                      })}
                      className="input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={formData.profile?.address || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      profile: { ...formData.profile, address: e.target.value }
                    })}
                    rows={3}
                    className="input"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleUpdateUser}
                    disabled={actionLoading}
                    className="btn btn-primary"
                  >
                    {actionLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Full Name</p>
                      <p className="font-medium">
                        {user.profile?.firstName || 'N/A'} {user.profile?.lastName || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{user.profile?.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Role</p>
                      <p className="font-medium capitalize">{user.role || 'user'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="font-medium">
                        {user.profile?.dateOfBirth ? formatDate(user.profile.dateOfBirth) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPinIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium">{user.profile?.address || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* KYC Applications */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">KYC Applications</h3>
              <DocumentTextIcon className="h-5 w-5 text-gray-400" />
            </div>

            {user.kycApplications && user.kycApplications.length > 0 ? (
              <div className="space-y-4">
                {user.kycApplications.map((kyc, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{kyc.applicationId}</p>
                        <p className="text-sm text-gray-500">
                          Submitted: {formatDate(kyc.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getKYCStatusBadge(kyc.status)}
                        {kyc.riskAssessment?.score && (
                          <span className="text-sm text-gray-500">
                            Risk: {kyc.riskAssessment.score}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No KYC Applications</h3>
                <p className="mt-1 text-sm text-gray-500">This user hasn't submitted any KYC applications yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Status */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                {getStatusBadge(user.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">KYC Status</span>
                {getKYCStatusBadge(user.profile?.kycStatus)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Email Verified</span>
                <span className={`badge ${user.isEmailVerified ? 'badge-success' : 'badge-warning'}`}>
                  {user.isEmailVerified ? 'Verified' : 'Not Verified'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Phone Verified</span>
                <span className={`badge ${user.isPhoneVerified ? 'badge-success' : 'badge-warning'}`}>
                  {user.isPhoneVerified ? 'Verified' : 'Not Verified'}
                </span>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total KYC Apps</span>
                <span className="font-medium">{user.statistics?.totalKYCApplications || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Verified</span>
                <span className="font-medium text-success-600">{user.statistics?.verifiedKYC || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pending</span>
                <span className="font-medium text-warning-600">{user.statistics?.pendingKYC || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Rejected</span>
                <span className="font-medium text-danger-600">{user.statistics?.rejectedKYC || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Risk Score</span>
                <span className="font-medium">
                  {user.statistics?.averageRiskScore ? user.statistics.averageRiskScore.toFixed(1) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Joined</p>
                  <p className="text-xs text-gray-500">{formatDate(user.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <HistoryIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Updated</p>
                  <p className="text-xs text-gray-500">{formatDate(user.updatedAt)}</p>
                </div>
              </div>
              {user.lastLoginAt && (
                <div className="flex items-start space-x-3">
                  <KeyIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Last Login</p>
                    <p className="text-xs text-gray-500">{formatDate(user.lastLoginAt)}</p>
                  </div>
                </div>
              )}
              {user.suspendedAt && (
                <div className="flex items-start space-x-3">
                  <XCircleIcon className="h-5 w-5 text-danger-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-danger-900">Suspended</p>
                    <p className="text-xs text-danger-700">{formatDate(user.suspendedAt)}</p>
                    <p className="text-xs text-danger-600">{user.suspensionReason}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetails;