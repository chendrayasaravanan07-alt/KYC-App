import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearProgress } from 'react-native-linear-gradient';
import { kycService, authService } from '../services/api';

const { width, height } = Dimensions();

const KYCFormScreen = ({ navigation, route }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    phoneNumber: '',
    nationality: 'India',

    // Address Information
    permanentAddress: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    currentAddress: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    sameAsPermanent: false,

    // Document Information
    aadhaarNumber: '',
    panNumber: '',
    voterId: '',
    passportNumber: '',

    // Employment Information
    employmentType: '',
    companyName: '',
    designation: '',
    workExperience: '',
    monthlyIncome: '',

    // Financial Information
    occupation: '',
    sourceOfIncome: '',
    annualIncome: '',
    taxStatus: '',

    // Additional Information
    maritalStatus: '',
    education: '',
    motherMaidenName: '',
  });

  const [errors, setErrors] = useState({});
  const totalSteps = 6;

  const kycSteps = [
    { id: 1, title: 'Personal Info', icon: 'person' },
    { id: 2, title: 'Address', icon: 'location' },
    { id: 3, title: 'Documents', icon: 'document-text' },
    { id: 4, title: 'Employment', icon: 'briefcase' },
    { id: 5, title: 'Financial', icon: 'wallet' },
    { id: 6, title: 'Review', icon: 'checkmark-circle' },
  ];

  useEffect(() => {
    // Load user profile data if available
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profileResult = await authService.getProfile();
      if (profileResult.success && profileResult.user) {
        const user = profileResult.user;
        setFormData(prev => ({
          ...prev,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
        }));
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const updateFormData = (field, value, nestedField = null) => {
    if (nestedField) {
      setFormData(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [nestedField]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }

    // Clear error when user starts typing
    if (errors[field] || errors[nestedField]) {
      setErrors(prev => ({
        ...prev,
        [field]: null,
        [nestedField]: null,
      }));
    }
  };

  const validateCurrentStep = () => {
    const newErrors = {};

    switch (currentStep) {
      case 1: // Personal Information
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
        if (!formData.nationality) newErrors.nationality = 'Nationality is required';
        break;

      case 2: // Address Information
        if (!formData.permanentAddress.street.trim()) {
          newErrors.street = 'Street address is required';
        }
        if (!formData.permanentAddress.city.trim()) newErrors.city = 'City is required';
        if (!formData.permanentAddress.state.trim()) newErrors.state = 'State is required';
        if (!formData.permanentAddress.pincode.trim()) {
          newErrors.pincode = 'Pincode is required';
        }
        break;

      case 3: // Document Information
        if (!formData.aadhaarNumber.trim()) {
          newErrors.aadhaarNumber = 'Aadhaar number is required';
        } else if (!/^\d{12}$/.test(formData.aadhaarNumber.replace(/\s/g, ''))) {
          newErrors.aadhaarNumber = 'Invalid Aadhaar number';
        }
        if (!formData.panNumber.trim()) {
          newErrors.panNumber = 'Pan number is required';
        } else if (!/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(formData.panNumber.toUpperCase())) {
          newErrors.panNumber = 'Invalid PAN number';
        }
        break;

      case 4: // Employment Information
        if (!formData.employmentType) newErrors.employmentType = 'Employment type is required';
        if (!formData.monthlyIncome.trim()) {
          newErrors.monthlyIncome = 'Monthly income is required';
        }
        break;

      case 5: // Financial Information
        if (!formData.occupation) newErrors.occupation = 'Occupation is required';
        if (!formData.sourceOfIncome) {
          newErrors.sourceOfIncome = 'Source of income is required';
        }
        if (!formData.annualIncome.trim()) {
          newErrors.annualIncome = 'Annual income is required';
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    setLoading(true);
    try {
      const result = await kycService.submitApplication(formData);

      if (result.success) {
        Alert.alert(
          'KYC Application Submitted',
          'Your KYC application has been submitted successfully. You will be notified once it\'s reviewed.',
          [
            { text: 'OK', onPress: () => navigation.navigate('KYCDocuments') }
          ]
        );
      } else {
        Alert.alert('Submission Failed', result.error);
      }
    } catch (error) {
      console.error('Error submitting KYC application:', error);
      Alert.alert('Error', 'Failed to submit KYC application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.stepsContainer}>
        {kycSteps.map((step) => (
          <TouchableOpacity
            key={step.id}
            style={[
              styles.step,
              currentStep === step.id && styles.activeStep,
              currentStep > step.id && styles.completedStep
            ]}
            onPress={() => setCurrentStep(step.id)}
          >
            <Ionicons
              name={currentStep > step.id ? 'checkmark' : step.icon}
              size={20}
              color={
                currentStep > step.id ? '#FFFFFF' :
                currentStep === step.id ? '#007AFF' : '#8E8E93'
              }
            />
          </TouchableOpacity>
        ))}
      </View>
      <LinearProgress
        progress={currentStep / totalSteps}
        style={styles.progressBar}
        color="#007AFF"
        trackColor="#E5E5EA"
      />
    </View>
  );

  const renderPersonalInfo = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Personal Information</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>First Name *</Text>
        <TextInput
          style={[styles.input, errors.firstName && styles.errorInput]}
          value={formData.firstName}
          onChangeText={(value) => updateFormData('firstName', value)}
          placeholder="Enter your first name"
          autoCapitalize="words"
        />
        {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Last Name *</Text>
        <TextInput
          style={[styles.input, errors.lastName && styles.errorInput]}
          value={formData.lastName}
          onChangeText={(value) => updateFormData('lastName', value)}
          placeholder="Enter your last name"
          autoCapitalize="words"
        />
        {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Date of Birth *</Text>
        <TextInput
          style={[styles.input, errors.dateOfBirth && styles.errorInput]}
          value={formData.dateOfBirth}
          onChangeText={(value) => updateFormData('dateOfBirth', value)}
          placeholder="DD/MM/YYYY"
          keyboardType="number-pad"
          maxLength={10}
        />
        {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Gender *</Text>
        <View style={styles.genderContainer}>
          {['Male', 'Female', 'Other'].map((gender) => (
            <TouchableOpacity
              key={gender}
              style={[
                styles.genderOption,
                formData.gender === gender && styles.selectedGender
              ]}
              onPress={() => updateFormData('gender', gender)}
            >
              <Text style={[
                styles.genderText,
                formData.gender === gender && styles.selectedGenderText
              ]}>{gender}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email Address *</Text>
        <TextInput
          style={[styles.input, errors.email && styles.errorInput]}
          value={formData.email}
          onChangeText={(value) => updateFormData('email', value)}
          placeholder="Enter your email address"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={false} // Email from profile
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={[styles.input, errors.phoneNumber && styles.errorInput]}
          value={formData.phoneNumber}
          onChangeText={(value) => updateFormData('phoneNumber', value)}
          placeholder="Enter your phone number"
          keyboardType="phone-pad"
          maxLength={10}
        />
        {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nationality *</Text>
        <TextInput
          style={[styles.input, errors.nationality && styles.errorInput]}
          value={formData.nationality}
          onChangeText={(value) => updateFormData('nationality', value)}
          placeholder="Enter your nationality"
          autoCapitalize="words"
        />
        {errors.nationality && <Text style={styles.errorText}>{errors.nationality}</Text>}
      </View>
    </ScrollView>
  );

  const renderAddressInfo = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Address Information</Text>

      <Text style={styles.sectionTitle}>Permanent Address *</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Street Address</Text>
        <TextInput
          style={[styles.input, errors.street && styles.errorInput]}
          value={formData.permanentAddress.street}
          onChangeText={(value) => updateFormData('permanentAddress', value, 'street')}
          placeholder="Enter street address"
          multiline
        />
        {errors.street && <Text style={styles.errorText}>{errors.street}</Text>}
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.flex1]}>
          <Text style={styles.label}>City</Text>
          <TextInput
            style={[styles.input, errors.city && styles.errorInput]}
            value={formData.permanentAddress.city}
            onChangeText={(value) => updateFormData('permanentAddress', value, 'city')}
            placeholder="City"
            autoCapitalize="words"
          />
          {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
        </View>

        <View style={[styles.inputGroup, styles.flex1]}>
          <Text style={styles.label}>State</Text>
          <TextInput
            style={[styles.input, errors.state && styles.errorInput]}
            value={formData.permanentAddress.state}
            onChangeText={(value) => updateFormData('permanentAddress', value, 'state')}
            placeholder="State"
            autoCapitalize="words"
          />
          {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Pincode</Text>
        <TextInput
          style={[styles.input, errors.pincode && styles.errorInput]}
          value={formData.permanentAddress.pincode}
          onChangeText={(value) => updateFormData('permanentAddress', value, 'pincode')}
          placeholder="Pincode"
          keyboardType="number-pad"
          maxLength={6}
        />
        {errors.pincode && <Text style={styles.errorText}>{errors.pincode}</Text>}
      </View>

      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => updateFormData('sameAsPermanent', !formData.sameAsPermanent)}
      >
        <Ionicons
          name={formData.sameAsPermanent ? 'checkbox' : 'square-outline'}
          size={24}
          color="#007AFF"
        />
        <Text style={styles.checkboxText}>Current address is same as permanent</Text>
      </TouchableOpacity>

      {!formData.sameAsPermanent && (
        <>
          <Text style={styles.sectionTitle}>Current Address</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street Address</Text>
            <TextInput
              style={styles.input}
              value={formData.currentAddress.street}
              onChangeText={(value) => updateFormData('currentAddress', value, 'street')}
              placeholder="Enter street address"
              multiline
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={formData.currentAddress.city}
                onChangeText={(value) => updateFormData('currentAddress', value, 'city')}
                placeholder="City"
                autoCapitalize="words"
              />
            </View>

            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={formData.currentAddress.state}
                onChangeText={(value) => updateFormData('currentAddress', value, 'state')}
                placeholder="State"
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pincode</Text>
            <TextInput
              style={styles.input}
              value={formData.currentAddress.pincode}
              onChangeText={(value) => updateFormData('currentAddress', value, 'pincode')}
              placeholder="Pincode"
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
        </>
      )}
    </ScrollView>
  );

  const renderDocumentInfo = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Document Information</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Aadhaar Number *</Text>
        <TextInput
          style={[styles.input, errors.aadhaarNumber && styles.errorInput]}
          value={formData.aadhaarNumber}
          onChangeText={(value) => updateFormData('aadhaarNumber', value)}
          placeholder="Enter 12-digit Aadhaar number"
          keyboardType="number-pad"
          maxLength={14} // For spaces: XXXX XXXX XXXX
        />
        {errors.aadhaarNumber && <Text style={styles.errorText}>{errors.aadhaarNumber}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>PAN Number *</Text>
        <TextInput
          style={[styles.input, errors.panNumber && styles.errorInput]}
          value={formData.panNumber}
          onChangeText={(value) => updateFormData('panNumber', value.toUpperCase())}
          placeholder="Enter PAN number"
          autoCapitalize="characters"
          maxLength={10}
        />
        {errors.panNumber && <Text style={styles.errorText}>{errors.panNumber}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Voter ID (Optional)</Text>
        <TextInput
          style={styles.input}
          value={formData.voterId}
          onChangeText={(value) => updateFormData('voterId', value.toUpperCase())}
          placeholder="Enter Voter ID"
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Passport Number (Optional)</Text>
        <TextInput
          style={styles.input}
          value={formData.passportNumber}
          onChangeText={(value) => updateFormData('passportNumber', value.toUpperCase())}
          placeholder="Enter Passport Number"
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.noteContainer}>
        <Ionicons name="information-circle" size={20} color="#007AFF" />
        <Text style={styles.noteText}>
          You will need to upload clear photos/scans of these documents in the next step.
        </Text>
      </View>
    </ScrollView>
  );

  const renderEmploymentInfo = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Employment Information</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Employment Type *</Text>
        <View style={styles.optionsContainer}>
          {['Salaried', 'Self-employed', 'Business', 'Student', 'Retired', 'Homemaker'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.option,
                formData.employmentType === type && styles.selectedOption
              ]}
              onPress={() => updateFormData('employmentType', type)}
            >
              <Text style={[
                styles.optionText,
                formData.employmentType === type && styles.selectedOptionText
              ]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.employmentType && <Text style={styles.errorText}>{errors.employmentType}</Text>}
      </View>

      {formData.employmentType === 'Salaried' && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Company Name</Text>
            <TextInput
              style={styles.input}
              value={formData.companyName}
              onChangeText={(value) => updateFormData('companyName', value)}
              placeholder="Enter company name"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Designation</Text>
            <TextInput
              style={styles.input}
              value={formData.designation}
              onChangeText={(value) => updateFormData('designation', value)}
              placeholder="Enter your designation"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Work Experience (Years)</Text>
            <TextInput
              style={styles.input}
              value={formData.workExperience}
              onChangeText={(value) => updateFormData('workExperience', value)}
              placeholder="Total years of experience"
              keyboardType="number-pad"
            />
          </View>
        </>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Monthly Income (₹) *</Text>
        <TextInput
          style={[styles.input, errors.monthlyIncome && styles.errorInput]}
          value={formData.monthlyIncome}
          onChangeText={(value) => updateFormData('monthlyIncome', value)}
          placeholder="Enter monthly income"
          keyboardType="number-pad"
        />
        {errors.monthlyIncome && <Text style={styles.errorText}>{errors.monthlyIncome}</Text>}
      </View>
    </ScrollView>
  );

  const renderFinancialInfo = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Financial Information</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Occupation *</Text>
        <TextInput
          style={[styles.input, errors.occupation && styles.errorInput]}
          value={formData.occupation}
          onChangeText={(value) => updateFormData('occupation', value)}
          placeholder="Enter your occupation"
          autoCapitalize="words"
        />
        {errors.occupation && <Text style={styles.errorText}>{errors.occupation}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Source of Income *</Text>
        <View style={styles.optionsContainer}>
          {['Salary', 'Business', 'Investment', 'Rental', 'Others'].map((source) => (
            <TouchableOpacity
              key={source}
              style={[
                styles.option,
                formData.sourceOfIncome === source && styles.selectedOption
              ]}
              onPress={() => updateFormData('sourceOfIncome', source)}
            >
              <Text style={[
                styles.optionText,
                formData.sourceOfIncome === source && styles.selectedOptionText
              ]}>{source}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.sourceOfIncome && <Text style={styles.errorText}>{errors.sourceOfIncome}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Annual Income (₹) *</Text>
        <TextInput
          style={[styles.input, errors.annualIncome && styles.errorInput]}
          value={formData.annualIncome}
          onChangeText={(value) => updateFormData('annualIncome', value)}
          placeholder="Enter annual income"
          keyboardType="number-pad"
        />
        {errors.annualIncome && <Text style={styles.errorText}>{errors.annualIncome}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Tax Status</Text>
        <View style={styles.optionsContainer}>
          {['Below Tax Limit', '10%', '20%', '30%'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.option,
                formData.taxStatus === status && styles.selectedOption
              ]}
              onPress={() => updateFormData('taxStatus', status)}
            >
              <Text style={[
                styles.optionText,
                formData.taxStatus === status && styles.selectedOptionText
              ]}>{status}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Marital Status</Text>
        <View style={styles.optionsContainer}>
          {['Single', 'Married', 'Divorced', 'Widowed'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.option,
                formData.maritalStatus === status && styles.selectedOption
              ]}
              onPress={() => updateFormData('maritalStatus', status)}
            >
              <Text style={[
                styles.optionText,
                formData.maritalStatus === status && styles.selectedOptionText
              ]}>{status}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Education Qualification</Text>
        <View style={styles.optionsContainer}>
          {['High School', 'Graduate', 'Post Graduate', 'Professional', 'PhD'].map((edu) => (
            <TouchableOpacity
              key={edu}
              style={[
                styles.option,
                formData.education === edu && styles.selectedOption
              ]}
              onPress={() => updateFormData('education', edu)}
            >
              <Text style={[
                styles.optionText,
                formData.education === edu && styles.selectedOptionText
              ]}>{edu}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderReview = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Review Your Information</Text>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Personal Information</Text>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Name:</Text>
          <Text style={styles.reviewValue}>{`${formData.firstName} ${formData.lastName}`}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Date of Birth:</Text>
          <Text style={styles.reviewValue}>{formData.dateOfBirth}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Email:</Text>
          <Text style={styles.reviewValue}>{formData.email}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Phone:</Text>
          <Text style={styles.reviewValue}>{formData.phoneNumber}</Text>
        </View>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Address</Text>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Permanent:</Text>
          <Text style={styles.reviewValue} numberOfLines={2}>
            {`${formData.permanentAddress.street}, ${formData.permanentAddress.city}, ${formData.permanentAddress.state} - ${formData.permanentAddress.pincode}`}
          </Text>
        </View>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Documents</Text>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Aadhaar:</Text>
          <Text style={styles.reviewValue}>{formData.aadhaarNumber}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>PAN:</Text>
          <Text style={styles.reviewValue}>{formData.panNumber}</Text>
        </View>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Financial</Text>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Employment:</Text>
          <Text style={styles.reviewValue}>{formData.employmentType}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Annual Income:</Text>
          <Text style={styles.reviewValue}>₹{formData.annualIncome}</Text>
        </View>
      </View>

      <View style={styles.disclaimerContainer}>
        <Ionicons name="information-circle" size={20} color="#FF9500" />
        <Text style={styles.disclaimerText}>
          By submitting this application, you confirm that all information provided is accurate and complete.
        </Text>
      </View>
    </ScrollView>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderPersonalInfo();
      case 2:
        return renderAddressInfo();
      case 3:
        return renderDocumentInfo();
      case 4:
        return renderEmploymentInfo();
      case 5:
        return renderFinancialInfo();
      case 6:
        return renderReview();
      default:
        return renderPersonalInfo();
    }
  };

  const renderStepActions = () => (
    <View style={styles.actionsContainer}>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handlePrevious}
          disabled={currentStep === 1}
        >
          <Text style={styles.secondaryButtonText}>Previous</Text>
        </TouchableOpacity>

        {currentStep === totalSteps ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Submit Application</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleNext}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>KYC Application</Text>
          <View style={styles.headerButton} />
        </View>

        {renderProgressBar()}
        {renderCurrentStep()}
        {renderStepActions()}
      </KeyboardAvoidingView>
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

  // Progress
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  step: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F2F2F7',
  },
  activeStep: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  completedStep: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  progressBar: {
    height: 3,
    borderRadius: 1.5,
  },

  // Form
  stepContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 20,
    marginBottom: 16,
  },

  // Input
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1C1C1E',
    backgroundColor: '#FFFFFF',
  },
  errorInput: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },

  // Row
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },

  // Gender
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  selectedGender: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  genderText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  selectedGenderText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },

  // Checkbox
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  checkboxText: {
    fontSize: 16,
    color: '#1C1C1E',
    marginLeft: 12,
    flex: 1,
  },

  // Options
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  selectedOption: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    color: '#1C1C1E',
  },
  selectedOptionText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },

  // Review
  reviewSection: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
    flex: 1,
  },
  reviewValue: {
    fontSize: 16,
    color: '#1C1C1E',
    flex: 2,
    textAlign: 'right',
  },

  // Notes & Disclaimers
  noteContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  noteText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
    flex: 1,
  },
  disclaimerContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  disclaimerText: {
    fontSize: 14,
    color: '#FF9500',
    marginLeft: 8,
    flex: 1,
  },

  // Actions
  actionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#F2F2F7',
  },
  disabledButton: {
    backgroundColor: '#E5E5EA',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});

export default KYCFormScreen;