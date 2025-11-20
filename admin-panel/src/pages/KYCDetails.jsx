import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  UserIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  EyeIcon,
  DownloadIcon,
  CalendarIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  CameraIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { kycService } from '../services/api';
import toast from 'react-hot-toast';

const KYCDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionNotes, setActionNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (id) {
      fetchApplicationDetails();
    }
  }, [id]);

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true);
      const response = await kycService.getApplication(id);

      if (response.success) {
        setApplication(response.data);
      } else {
        toast.error('Failed to load application details');
        navigate('/kyc');
      }
    } catch (error) {
      toast.error('Error loading application details');
      console.error('Application fetch error:', error);
      navigate('/kyc');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      const response = await kycService.approveApplication(id, actionNotes);

      if (response.success) {
        toast.success('Application approved successfully');
        fetchApplicationDetails(); // Refresh data
      } else {
        toast.error(response.message || 'Failed to approve application');
      }
    } catch (error) {
      toast.error('Error approving application');
    } finally {
      setActionLoading(false);
      setActionNotes('');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setActionLoading(true);
      const response = await kycService.rejectApplication(id, rejectReason, actionNotes);

      if (response.success) {
        toast.success('Application rejected successfully');
        fetchApplicationDetails(); // Refresh data
      } else {
        toast.error(response.message || 'Failed to reject application');
      }
    } catch (error) {
      toast.error('Error rejecting application');
    } finally {
      setActionLoading(false);
      setRejectReason('');
      setActionNotes('');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'badge-warning', icon: ClockIcon, label: 'Pending Review' },
      processing: { class: 'badge-info', icon: DocumentTextIcon, label: 'Processing' },
      manual_review: { class: 'badge-info', icon: ExclamationTriangleIcon, label: 'Manual Review' },
      verified: { class: 'badge-success', icon: CheckCircleIcon, label: 'Verified' },
      rejected: { class: 'badge-danger', icon: XCircleIcon, label: 'Rejected' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`badge ${config.class} flex items-center text-sm`}>
        <Icon className="h-4 w-4 mr-1" />
        {config.label}
      </span>
    );
  };

  const getRiskBadge = (riskScore) => {
    if (riskScore <= 20) return { class: 'badge-success', label: 'Low Risk' };
    if (riskScore <= 40) return { class: 'badge-warning', label: 'Medium Risk' };
    if (riskScore <= 60) return { class: 'badge-warning', label: 'Medium-High Risk' };
    if (riskScore <= 80) return { class: 'badge-danger', label: 'High Risk' };
    return { class: 'badge-danger', label: 'Critical Risk' };
  };

  const formatDate = (dateString) => {
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

  if (!application) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Application not found</h3>
        <p className="mt-1 text-sm text-gray-500">The requested KYC application could not be found.</p>
        <div className="mt-6">
          <Link to="/kyc" className="btn btn-primary">
            Back to Applications
          </Link>
        </div>
      </div>
    );
  }

  const riskBadge = getRiskBadge(application.riskAssessment?.score || 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/kyc')}
            className="btn btn-secondary"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Application {application.applicationId}
            </h1>
            <p className="text-sm text-gray-600">
              Submitted on {formatDate(application.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {getStatusBadge(application.status)}
          <span className={`badge ${riskBadge.class}`}>
            {riskBadge.label}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      {application.status === 'manual_review' && (
        <div className="card p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start space-x-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-yellow-800">Manual Review Required</h3>
              <p className="text-yellow-700 mt-1">
                This application requires manual review due to risk factors or system flags.
              </p>
              <div className="mt-4 flex space-x-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approval Notes (Optional)
                  </label>
                  <textarea
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    rows={3}
                    className="input"
                    placeholder="Add any notes for this approval..."
                  />
                </div>
              </div>
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="btn btn-success"
                >
                  {actionLoading ? 'Processing...' : 'Approve Application'}
                </button>
                <button
                  onClick={() => document.getElementById('reject-modal').classList.remove('hidden')}
                  className="btn btn-danger"
                >
                  Reject Application
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview', icon: UserIcon },
            { key: 'documents', label: 'Documents', icon: DocumentTextIcon },
            { key: 'verification', label: 'Verification', icon: ShieldCheckIcon },
            { key: 'risk', label: 'Risk Analysis', icon: ChartBarIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm flex items-center
                  ${activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Overview tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* User Information */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">User Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Full Name</p>
                        <p className="font-medium">
                          {application.userId?.profile?.firstName || 'N/A'} {application.userId?.profile?.lastName || ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{application.userId?.email || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <PhoneIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{application.userId?.profile?.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <MapPinIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-medium">
                          {application.userId?.profile?.address || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CalendarIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Date of Birth</p>
                        <p className="font-medium">
                          {application.userId?.profile?.dateOfBirth
                            ? formatDate(application.userId.profile.dateOfBirth)
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">KYC Status</p>
                        <div>{getStatusBadge(application.userId?.profile?.kycStatus)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Processing Timeline */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Timeline</h3>
                <div className="space-y-4">
                  {application.processingSteps?.map((step, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className={`h-3 w-3 rounded-full mt-1 ${
                        step.status === 'completed' ? 'bg-success-500' :
                        step.status === 'processing' ? 'bg-warning-500' :
                        step.status === 'failed' ? 'bg-danger-500' : 'bg-gray-300'
                      }`} />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{step.step}</p>
                        <p className="text-sm text-gray-500">
                          {step.status === 'completed' ? 'Completed' :
                           step.status === 'processing' ? 'Processing' :
                           step.status === 'failed' ? 'Failed' : 'Pending'}
                          {step.completedAt && ` on ${formatDate(step.completedAt)}`}
                        </p>
                        {step.error && (
                          <p className="text-sm text-danger-600 mt-1">{step.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Documents tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Documents</h3>
                <div className="space-y-6">
                  {application.documents?.map((doc, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-medium text-gray-900 capitalize">
                            {doc.type.replace('_', ' ')}
                          </h4>
                          <div className="mt-1 flex items-center space-x-2">
                            {getStatusBadge(doc.verificationStatus)}
                            <span className="text-sm text-gray-500">
                              OCR: {doc.ocrData?.confidence || 0}% confidence
                            </span>
                          </div>
                        </div>
                        <button className="btn btn-secondary">
                          <DownloadIcon className="h-4 w-4 mr-2" />
                          Download
                        </button>
                      </div>

                      {/* Extracted data */}
                      {doc.ocrData?.fields && Object.keys(doc.ocrData.fields).length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h5 className="font-medium text-gray-900 mb-3">Extracted Information</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(doc.ocrData.fields).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-sm text-gray-600 capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                                </span>
                                <span className="text-sm font-medium">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quality metrics */}
                      {doc.qualityMetrics && (
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <p className="text-sm text-gray-500">Resolution</p>
                            <p className="font-medium">
                              {doc.qualityMetrics.resolution?.width || 'N/A'}×{doc.qualityMetrics.resolution?.height || 'N/A'}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-500">Brightness</p>
                            <p className="font-medium">{doc.qualityMetrics.brightness || 'N/A'}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-500">Sharpness</p>
                            <p className="font-medium">{doc.qualityMetrics.sharpness || 'N/A'}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-500">Overall</p>
                            <p className="font-medium">{doc.qualityMetrics.overallScore || 'N/A'}%</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Other tabs content would go here */}
          {activeTab === 'verification' && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Face Verification Results</h3>
              <p>Face verification details and liveness check results would be displayed here.</p>
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Assessment Analysis</h3>
              <p>Comprehensive risk assessment details and fraud detection flags would be displayed here.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full btn btn-secondary">
                <EyeIcon className="h-4 w-4 mr-2" />
                View Raw Data
              </button>
              <button className="w-full btn btn-secondary">
                <DownloadIcon className="h-4 w-4 mr-2" />
                Export Application
              </button>
              <button className="w-full btn btn-secondary">
                <UserIcon className="h-4 w-4 mr-2" />
                View User Profile
              </button>
            </div>
          </div>

          {/* Risk Score */}
          {application.riskAssessment && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Assessment</h3>
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${riskBadge.class.replace('badge-', 'bg-').replace('-100', '-200')} ${riskBadge.class.replace('badge-', 'text-')}`}>
                    <span className="text-2xl font-bold">{application.riskAssessment.score || 0}</span>
                  </div>
                  <p className="mt-2 font-medium">{riskBadge.label}</p>
                </div>
                {application.riskAssessment.flags && application.riskAssessment.flags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Risk Flags:</p>
                    <ul className="space-y-1">
                      {application.riskAssessment.flags.map((flag, index) => (
                        <li key={index} className="text-sm text-danger-600">• {flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      <div id="reject-modal" className="hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-lg bg-white">
          <div className="mt-3">
            <h3 className="text-lg font-medium text-gray-900">Reject Application</h3>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="input"
                placeholder="Please provide a reason for rejection..."
                required
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
                className="input"
                placeholder="Add any additional notes..."
              />
            </div>
            <div className="mt-6 flex space-x-3">
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="btn btn-danger"
              >
                {actionLoading ? 'Processing...' : 'Reject Application'}
              </button>
              <button
                onClick={() => {
                  document.getElementById('reject-modal').classList.add('hidden');
                  setRejectReason('');
                  setActionNotes('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KYCDetails;