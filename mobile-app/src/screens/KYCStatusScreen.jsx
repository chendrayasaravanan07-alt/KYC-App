import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { kycService, authService } from '../services/api';

const { width, height } = Dimensions();

const KYCStatusScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kycData, setKycData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [animatedValue] = useState(new Animated.Value(0));

  const statusConfig = {
    pending: {
      color: '#FF9500',
      backgroundColor: '#FFF8F0',
      icon: 'time',
      title: 'KYC Pending',
      description: 'Your KYC application is being processed',
    },
    in_review: {
      color: '#007AFF',
      backgroundColor: '#F0F8FF',
      icon: 'search',
      title: 'KYC Under Review',
      description: 'Your documents are being reviewed',
    },
    verified: {
      color: '#34C759',
      backgroundColor: '#F0FFF4',
      icon: 'checkmark-circle',
      title: 'KYC Verified',
      description: 'Your KYC verification is complete',
    },
    rejected: {
      color: '#FF3B30',
      backgroundColor: '#FFF5F5',
      icon: 'close-circle',
      title: 'KYC Rejected',
      description: 'Your KYC application was rejected',
    },
    additional_info_required: {
      color: '#FF9500',
      backgroundColor: '#FFF8F0',
      icon: 'alert-circle',
      title: 'Additional Info Required',
      description: 'Please provide additional information',
    },
  };

  useEffect(() => {
    loadKYCStatus();

    // Set up animation
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Refresh every 30 seconds
    const interval = setInterval(loadKYCStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadKYCStatus = async () => {
    try {
      const result = await kycService.getStatus();
      if (result.success) {
        setKycData(result.data);
        generateTimeline(result.data);
      } else {
        console.error('Failed to load KYC status:', result.error);
      }
    } catch (error) {
      console.error('Error loading KYC status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateTimeline = (data) => {
    const timelineData = [
      {
        id: 1,
        status: 'completed',
        title: 'Application Submitted',
        timestamp: data.createdAt,
        description: 'Your KYC application has been submitted successfully',
      },
    ];

    if (data.documents && data.documents.length > 0) {
      timelineData.push({
        id: 2,
        status: 'completed',
        title: 'Documents Uploaded',
        timestamp: data.documents[0].uploadedAt,
        description: `Uploaded ${data.documents.length} document(s)`,
      });
    }

    if (data.audits && data.audits.length > 0) {
      data.audits.forEach((audit, index) => {
        timelineData.push({
          id: timelineData.length + 1,
          status: getStatusFromAction(audit.action),
          title: formatAuditTitle(audit.action),
          timestamp: audit.timestamp,
          description: audit.details || audit.action,
          meta: audit.assignedTo ? `By: ${audit.assignedTo}` : null,
        });
      });
    }

    // Add current status if different
    const currentStatus = timelineData[timelineData.length - 1];
    if (currentStatus && currentStatus.title !== formatStatusTitle(data.status)) {
      timelineData.push({
        id: timelineData.length + 1,
        status: 'current',
        title: formatStatusTitle(data.status),
        timestamp: data.updatedAt,
        description: statusConfig[data.status]?.description || 'Status updated',
      });
    }

    setTimeline(timelineData);
  };

  const getStatusFromAction = (action) => {
    if (action.includes('approved') || action.includes('verified')) return 'completed';
    if (action.includes('rejected')) return 'failed';
    return 'pending';
  };

  const formatAuditTitle = (action) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatStatusTitle = (status) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadKYCStatus();
  };

  const handleDocumentUpload = () => {
    navigation.navigate('KYCDocuments');
  };

  const handleResubmit = () => {
    navigation.navigate('KYCForm');
  };

  const renderStatusCard = () => {
    if (!kycData) return null;

    const statusInfo = statusConfig[kycData.status] || statusConfig.pending;

    return (
      <Animated.View
        style={[
          styles.statusCard,
          {
            backgroundColor: statusInfo.backgroundColor,
            opacity: animatedValue,
            transform: [
              {
                translateY: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.statusHeader}>
          <View style={[styles.statusIconContainer, { backgroundColor: statusInfo.color }]}>
            <Ionicons name={statusInfo.icon} size={32} color="#FFFFFF" />
          </View>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.title}
            </Text>
            <Text style={styles.statusDescription}>
              {statusInfo.description}
            </Text>
          </View>
        </View>

        {kycData.status === 'verified' && (
          <View style={styles.verificationBadge}>
            <Ionicons name="shield-checkmark" size={20} color="#34C759" />
            <Text style={styles.verificationText}>
              Your identity has been verified successfully
            </Text>
          </View>
        )}

        {kycData.rejectionReason && (
          <View style={styles.rejectionContainer}>
            <Ionicons name="alert-circle" size={20} color="#FF3B30" />
            <Text style={styles.rejectionText}>{kycData.rejectionReason}</Text>
          </View>
        )}

        <View style={styles.statusMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Application ID</Text>
            <Text style={styles.metaValue}>{kycData._id.slice(-8).toUpperCase()}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Updated</Text>
            <Text style={styles.metaValue}>
              {new Date(kycData.updatedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderTimeline = () => {
    if (timeline.length === 0) return null;

    return (
      <View style={styles.timelineContainer}>
        <Text style={styles.sectionTitle}>Application Timeline</Text>
        <View style={styles.timeline}>
          {timeline.map((item, index) => (
            <View key={item.id} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[
                  styles.timelineDot,
                  {
                    backgroundColor: getTimelineItemColor(item.status),
                  }
                ]}>
                  {item.status === 'completed' && (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  )}
                  {item.status === 'current' && (
                    <ActivityIndicator size={12} color="#FFFFFF" />
                  )}
                </View>
                {index < timeline.length - 1 && (
                  <View style={[
                    styles.timelineLine,
                    {
                      backgroundColor: getTimelineItemColor(item.status),
                    }
                  ]} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{item.title}</Text>
                <Text style={styles.timelineDescription}>{item.description}</Text>
                {item.meta && <Text style={styles.timelineMeta}>{item.meta}</Text>}
                <Text style={styles.timelineTime}>
                  {new Date(item.timestamp).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const getTimelineItemColor = (status) => {
    switch (status) {
      case 'completed':
        return '#34C759';
      case 'current':
        return '#007AFF';
      case 'failed':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const renderDocuments = () => {
    if (!kycData?.documents || kycData.documents.length === 0) return null;

    return (
      <View style={styles.documentsContainer}>
        <Text style={styles.sectionTitle}>Uploaded Documents</Text>
        {kycData.documents.map((doc, index) => (
          <View key={index} style={styles.documentItem}>
            <View style={styles.documentLeft}>
              <View style={styles.documentIconContainer}>
                <Ionicons name="document-text" size={20} color="#007AFF" />
              </View>
              <View style={styles.documentInfo}>
                <Text style={styles.documentType}>
                  {doc.type.charAt(0).toUpperCase() + doc.type.slice(1).replace('_', ' ')}
                </Text>
                <Text style={styles.documentName}>{doc.name}</Text>
              </View>
            </View>
            <View style={styles.documentRight}>
              <View style={[
                styles.verificationBadge,
                doc.verified ? styles.verifiedBadge : styles.pendingBadge
              ]}>
                <Text style={[
                  styles.verificationBadgeText,
                  doc.verified ? styles.verifiedText : styles.pendingText
                ]}>
                  {doc.verified ? 'Verified' : 'Pending'}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderActions = () => {
    if (!kycData) return null;

    const actions = [];

    if (kycData.status === 'additional_info_required') {
      actions.push({
        id: 'upload_docs',
        title: 'Upload Documents',
        icon: 'cloud-upload',
        onPress: handleDocumentUpload,
        style: 'primary',
      });
    }

    if (kycData.status === 'rejected') {
      actions.push({
        id: 'resubmit',
        title: 'Resubmit Application',
        icon: 'refresh',
        onPress: handleResubmit,
        style: 'primary',
      });
    }

    if (actions.length === 0) return null;

    return (
      <View style={styles.actionsContainer}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[
              styles.actionButton,
              action.style === 'primary' ? styles.primaryAction : styles.secondaryAction
            ]}
            onPress={action.onPress}
          >
            <Ionicons
              name={action.icon}
              size={20}
              color={action.style === 'primary' ? '#FFFFFF' : '#007AFF'}
            />
            <Text style={[
              styles.actionButtonText,
              action.style === 'primary' ? styles.primaryActionText : styles.secondaryActionText
            ]}>
              {action.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading KYC Status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Status</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleRefresh}
        >
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderStatusCard()}
        {renderTimeline()}
        {renderDocuments()}
        {renderActions()}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            For any queries, please contact our support team
          </Text>
          <TouchableOpacity style={styles.supportButton}>
            <Ionicons name="mail" size={16} color="#007AFF" />
            <Text style={styles.supportButtonText}>support@kycapp.com</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Status Card
  statusCard: {
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 24,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 16,
    color: '#8E8E93',
  },

  // Badges
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FFF4',
    borderRadius: 8,
    padding: 8,
    marginTop: 16,
  },
  verificationText: {
    fontSize: 14,
    color: '#34C759',
    marginLeft: 8,
    flex: 1,
  },
  rejectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  rejectionText: {
    fontSize: 14,
    color: '#FF3B30',
    marginLeft: 8,
    flex: 1,
  },

  // Meta Info
  statusMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },

  // Timeline
  timelineContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  timelineMeta: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 12,
    color: '#8E8E93',
  },

  // Documents
  documentsContainer: {
    marginBottom: 24,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  documentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  documentName: {
    fontSize: 14,
    color: '#8E8E93',
  },
  documentRight: {},
  verifiedBadge: {
    backgroundColor: '#F0FFF4',
  },
  pendingBadge: {
    backgroundColor: '#FFF8F0',
  },
  verifiedText: {
    color: '#34C759',
  },
  pendingText: {
    color: '#FF9500',
  },
  verificationBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  // Actions
  actionsContainer: {
    marginBottom: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryAction: {
    backgroundColor: '#007AFF',
  },
  secondaryAction: {
    backgroundColor: '#F2F2F7',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  primaryActionText: {
    color: '#FFFFFF',
  },
  secondaryActionText: {
    color: '#007AFF',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
    textAlign: 'center',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  supportButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default KYCStatusScreen;