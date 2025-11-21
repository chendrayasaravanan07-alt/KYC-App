import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { kycService } from '../services/api';

const KYCDocumentsScreen = ({ route }) => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);

  const documentTypes = [
    {
      id: 'aadhaar_front',
      name: 'Aadhaar Card - Front',
      description: 'Upload front side of your Aadhaar card',
      icon: 'document-text',
      color: '#007AFF',
      required: true,
      maxSize: 5, // MB
      formats: ['jpg', 'jpeg', 'png', 'pdf'],
    },
    {
      id: 'aadhaar_back',
      name: 'Aadhaar Card - Back',
      description: 'Upload back side of your Aadhaar card',
      icon: 'document-text',
      color: '#007AFF',
      required: true,
      maxSize: 5,
      formats: ['jpg', 'jpeg', 'png', 'pdf'],
    },
    {
      id: 'pan_card',
      name: 'PAN Card',
      description: 'Upload your PAN card',
      icon: 'document-text',
      color: '#34C759',
      required: true,
      maxSize: 5,
      formats: ['jpg', 'jpeg', 'png', 'pdf'],
    },
    {
      id: 'photo',
      name: 'Passport Size Photo',
      description: 'Recent color photograph with white background',
      icon: 'person',
      color: '#FF9500',
      required: true,
      maxSize: 2,
      formats: ['jpg', 'jpeg', 'png'],
    },
    {
      id: 'signature',
      name: 'Signature',
      description: 'Clear signature on white paper',
      icon: 'create',
      color: '#FF3B30',
      required: false,
      maxSize: 2,
      formats: ['jpg', 'jpeg', 'png'],
    },
    {
      id: 'passport',
      name: 'Passport (Optional)',
      description: 'Upload passport if available',
      icon: 'document-text',
      color: '#8E8E93',
      required: false,
      maxSize: 5,
      formats: ['jpg', 'jpeg', 'png', 'pdf'],
    },
    {
      id: 'voter_id',
      name: 'Voter ID (Optional)',
      description: 'Upload voter ID if available',
      icon: 'document-text',
      color: '#8E8E93',
      required: false,
      maxSize: 5,
      formats: ['jpg', 'jpeg', 'png', 'pdf'],
    },
  ];

  const handleDocumentUpload = (documentType) => {
    Alert.alert(
      'Upload Document',
      `How would you like to upload your ${documentType.name}?`,
      [
        {
          text: 'Camera',
          onPress: () => navigation.navigate('Camera', {
            documentType: documentType.id,
            onCapture: (imageUri) => handleDocumentCapture(documentType, imageUri),
          }),
        },
        {
          text: 'Gallery',
          onPress: () => handleGalleryUpload(documentType),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleDocumentCapture = async (documentType, imageUri) => {
    try {
      setUploading(true);

      // Simulate file upload
      const uploadResult = await kycService.uploadDocument({
        type: documentType.id,
        file: imageUri,
        fileName: `${documentType.id}_${Date.now()}.jpg`,
      });

      if (uploadResult.success) {
        const newDocument = {
          id: Date.now().toString(),
          type: documentType.id,
          name: documentType.name,
          uri: imageUri,
          uploadedAt: new Date().toISOString(),
          status: 'uploaded',
          verified: false,
        };

        setDocuments(prev => [...prev, newDocument]);

        Alert.alert(
          'Success',
          `${documentType.name} uploaded successfully!`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload document.');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      Alert.alert('Error', 'Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = (documentType) => {
    // This would integrate with image picker
    Alert.alert('Coming Soon', 'Gallery upload feature coming soon');
  };

  const handleDocumentView = (document) => {
    navigation.navigate('DocumentViewer', { document });
  };

  const handleDocumentDelete = (documentId) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setDocuments(prev => prev.filter(doc => doc.id !== documentId));
            Alert.alert('Success', 'Document deleted successfully.');
          },
        },
      ]
    );
  };

  const handleProceedToLiveness = () => {
    const requiredDocuments = documentTypes.filter(doc => doc.required);
    const uploadedRequiredDocuments = documents.filter(doc =>
      requiredDocuments.some(req => req.id === doc.type)
    );

    if (uploadedRequiredDocuments.length < requiredDocuments.length) {
      Alert.alert(
        'Documents Required',
        'Please upload all required documents before proceeding.',
        [{ text: 'OK' }]
      );
      return;
    }

    navigation.navigate('LivenessDetection');
  };

  const renderDocumentCard = (documentType) => {
    const uploadedDocument = documents.find(doc => doc.type === documentType.id);
    const isUploaded = !!uploadedDocument;
    const isVerified = uploadedDocument?.verified;

    return (
      <View key={documentType.id} style={styles.documentCard}>
        <View style={styles.documentHeader}>
          <View style={[styles.documentIcon, { backgroundColor: documentType.color + '15' }]}>
            <Ionicons name={documentType.icon} size={24} color={documentType.color} />
          </View>
          <View style={styles.documentInfo}>
            <View style={styles.documentTitleRow}>
              <Text style={styles.documentTitle}>{documentType.name}</Text>
              {documentType.required && (
                <Text style={styles.requiredBadge}>Required</Text>
              )}
            </View>
            <Text style={styles.documentDescription}>{documentType.description}</Text>
            <View style={styles.documentSpecs}>
              <Text style={styles.specText}>
                Max: {documentType.maxSize}MB
              </Text>
              <Text style={styles.specText}>
                {documentType.formats.join(', ')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.documentActions}>
          {isUploaded ? (
            <View style={styles.uploadedActions}>
              <View style={styles.statusContainer}>
                <Ionicons
                  name={isVerified ? 'checkmark-circle' : 'time'}
                  size={20}
                  color={isVerified ? '#34C759' : '#FF9500'}
                />
                <Text style={[
                  styles.statusText,
                  { color: isVerified ? '#34C759' : '#FF9500' }
                ]}>
                  {isVerified ? 'Verified' : 'Pending Verification'}
                </Text>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDocumentView(uploadedDocument)}
                >
                  <Ionicons name="eye" size={20} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDocumentDelete(uploadedDocument.id)}
                >
                  <Ionicons name="trash" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.uploadButton,
                { backgroundColor: documentType.color }
              ]}
              onPress={() => handleDocumentUpload(documentType)}
              disabled={uploading}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>Upload Document</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderUploadProgress = () => {
    const requiredDocuments = documentTypes.filter(doc => doc.required);
    const uploadedRequiredDocuments = documents.filter(doc =>
      requiredDocuments.some(req => req.id === doc.type)
    );

    const progress = (uploadedRequiredDocuments.length / requiredDocuments.length) * 100;

    return (
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Upload Progress</Text>
          <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {uploadedRequiredDocuments.length} of {requiredDocuments.length} required documents uploaded
        </Text>
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>Upload Documents</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Progress Card */}
        {renderUploadProgress()}

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Upload Instructions</Text>
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <Text style={styles.instructionText}>
              Ensure all documents are clear and readable
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <Text style={styles.instructionText}>
              Use good lighting for photo captures
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <Text style={styles.instructionText}>
              Make sure all four corners are visible
            </Text>
          </View>
        </View>

        {/* Documents List */}
        <View style={styles.documentsSection}>
          <Text style={styles.sectionTitle}>
            Documents ({documents.filter(doc => doc.type !== 'photo').length}/{documentTypes.length})
          </Text>
          {documentTypes.map(renderDocumentCard)}
        </View>

        {/* Action Button */}
        {documents.filter(doc => doc.type !== 'photo').length > 0 && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[
                styles.proceedButton,
                uploading && styles.disabledButton
              ]}
              onPress={handleProceedToLiveness}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="large" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
                  <Text style={styles.proceedButtonText}>Proceed to Face Verification</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Progress Card
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },

  // Instructions
  instructionsCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#1C1C1E',
    marginLeft: 8,
    flex: 1,
  },

  // Documents Section
  documentsSection: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },

  // Document Card
  documentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  documentHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  requiredBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF3B30',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  documentDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  documentSpecs: {
    flexDirection: 'row',
    gap: 16,
  },
  specText: {
    fontSize: 12,
    color: '#8E8E93',
  },

  // Document Actions
  documentActions: {},
  uploadedActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },

  // Action Container
  actionContainer: {
    paddingVertical: 20,
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 16,
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#E5E5EA',
  },
});

export default KYCDocumentsScreen;