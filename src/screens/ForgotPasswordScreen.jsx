import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, Modal, FlatList, TextInput, ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Phone, Lock, Eye, EyeOff, ShieldCheck, ChevronDown } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { AppButton, AppInput } from '../components';
import { LogoIcon } from '../components/CustomIcons';
import { userService } from '../services/api';
import { THEME_COLORS } from '../theme';
import { useNotifications } from '../context/NotificationContext';

const COUNTRIES = [
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'Australia', code: '+61', flag: '🇦🇺' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬' },
  { name: 'Germany', code: '+49', flag: '🇩🇪' },
  { name: 'France', code: '+33', flag: '🇫🇷' },
];

export default function ForgotPasswordScreen({ navigation }) {
  const { isDarkMode, theme } = useTheme();
  const { showToast } = useNotifications();

  // Multi-step States
  const [step, setStep] = useState(1); // 1: Verify Mobile, 2: Setup New Password
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState('dealer'); // 'dealer' or 'retailer'
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [matchedUser, setMatchedUser] = useState(null);

  // OTP Verification States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [sentOtp, setSentOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [otpError, setOtpError] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const timerRef = useRef(null);

  // New Password Setup States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // Handle Countdown Timer for Resend OTP
  useEffect(() => {
    if (showOtpModal && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
    } else if (timer === 0) {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [showOtpModal, timer]);

  const validateStep1 = () => {
    const e = {};
    if (!phone) e.phone = 'Mobile number is required';
    else if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) e.phone = 'Enter a valid 10-digit number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!newPassword) e.newPassword = 'Password is required';
    else if (newPassword.length < 6) e.newPassword = 'Password must be at least 6 characters';
    
    if (newPassword !== confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const generateAndSendOtp = async (cleanPhone) => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const fullPhone = `${selectedCountry.code}${cleanPhone}`;
    
    setSentOtp(code);
    setTimer(60);
    setOtpInput('');
    setOtpError('');
    
    console.log(`[OTP-Recovery] Attempting to send ${code} to ${fullPhone}`);

    try {
      const { authService } = require('../services/api');
      await authService.sendOtp(fullPhone, code);
      console.log('[OTP-Recovery] Backend send successful');
    } catch (err) {
      console.warn('[OTP-Recovery] Backend send failed. Trying Direct Fast2SMS Integration...');
      
      try {
        // --- TEXTBELT DIRECT INTEGRATION (1 Free SMS/Day) ---
        const tbResponse = await fetch('https://textbelt.com/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: fullPhone,
            message: `Your Cromsen Password Reset OTP is: ${code}`,
            key: 'textbelt',
          })
        });

        const tbData = await tbResponse.json();
        if (tbData.success) {
          console.log('[OTP-Recovery] Textbelt free SMS dispatched successfully to', fullPhone);
          return;
        } else {
          console.warn('[OTP-Recovery] Textbelt Limit Reached or Error:', tbData.error);
        }
      } catch (err) {
        console.warn('[OTP-Recovery] Textbelt network error:', err);
      }
      
      console.log('=============================================');
      console.log(`🚀 [SIMULATED SMS SENT TO ${fullPhone}]`);
      console.log(`🔑 DEV OTP CODE: ${code}`);
      console.log(`(Real SMS requires Twilio/MSG91 backend integration)`);
      console.log('=============================================');
    }
  };

  const handleResendOtp = () => {
    if (timer > 0) return;
    const digits = phone.replace(/\D/g, '');
    const cleanPhone = digits.length >= 10 ? digits.slice(-10) : digits;
    generateAndSendOtp(cleanPhone);
  };

  const handleSendOtp = async () => {
    if (!validateStep1()) return;

    try {
      setLoading(true);
      const digits = phone.replace(/\D/g, '');
      const cleanPhone = digits.length >= 10 ? digits.slice(-10) : digits;

      // 1. Verify if phone number exists in users database
      let userObj = null;
      try {
        const response = await fetch('https://api.cromsennest.com/api/users');
        if (response.ok) {
          const listData = await response.json();
          const users = Array.isArray(listData) ? listData : (listData.users || listData.data || []);
          userObj = users.find(u => {
            const dbDigits = (u.phone || '').replace(/\D/g, '');
            const isPhoneMatch = dbDigits.length >= 10 && cleanPhone.length >= 10
              ? dbDigits.slice(-10) === cleanPhone.slice(-10)
              : dbDigits === cleanPhone;
            const dbRole = (u.role || '').toLowerCase();
            return isPhoneMatch && dbRole === selectedRole.toLowerCase();
          });
        }
      } catch (err) {
        console.warn('Backend lookup failed during recovery:', err);
      }

      if (!userObj) {
        Alert.alert(
          'Account Not Found',
          `No registered ${selectedRole === 'dealer' ? 'Dealer' : 'Retailer'} account was found with this mobile number.`
        );
        setLoading(false);
        return;
      }

      setMatchedUser(userObj);
      setLoading(false);
      
      // Open OTP Modal and trigger OTP
      setShowOtpModal(true);
      generateAndSendOtp(cleanPhone);
    } catch (err) {
      const isNetworkErr = err.message?.toLowerCase().includes('network') || err.message?.toLowerCase().includes('fetch');
      const errorMsg = isNetworkErr 
        ? 'Unable to connect to the server. The database server may be warming up (Render free tier) or your device is offline. Please wait 30 seconds and try again.'
        : (err.message || 'Verification initialization failed.');
      Alert.alert('Connection Alert', errorMsg);
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpInput.length !== 6) {
      setOtpError('Please enter a 6-digit code');
      return;
    }

    if (otpInput !== sentOtp) {
      setOtpError('Invalid verification code. Please try again.');
      return;
    }

    setShowOtpModal(false);
    clearInterval(timerRef.current);
    // OTP verified, move to Step 2
    setStep(2);
  };

  const handleUpdatePassword = async () => {
    if (!validateStep2()) return;

    try {
      setLoading(true);
      const userId = matchedUser._id || matchedUser.id;
      if (!userId) throw new Error('Invalid account context');

      const payload = {
        name: matchedUser.name,
        email: matchedUser.email,
        phone: matchedUser.phone,
        password: newPassword,
      };

      await userService.updateProfile(userId, payload);
      
      setLoading(false);
      Alert.alert(
        'Success ✓', 
        'Your password has been successfully reset. Please sign in using your new password.',
        [{ text: 'Great!', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      const isNetworkErr = err.message?.toLowerCase().includes('network') || err.message?.toLowerCase().includes('fetch');
      const errorMsg = isNetworkErr 
        ? 'Unable to connect to the server. The database server may be warming up (Render free tier) or your device is offline. Please wait 30 seconds and try again.'
        : (err.message || 'Failed to update your password. Please try again.');
      Alert.alert('Connection Alert', errorMsg);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={[styles.backBtn, { backgroundColor: isDarkMode ? '#2C3E50' : '#FFF' }]} 
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* Logo Area */}
          <View style={styles.logoArea}>
            <View style={styles.logoRow}>
              <LogoIcon size={56} color={theme.primary} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>
              {step === 1 ? 'Reset Password' : 'Setup New Password'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {step === 1 
                ? 'Enter your registered mobile number to verify with a secure OTP' 
                : 'Create a secure new password for your Cromsen account'
              }
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            {step === 1 ? (
              <>
                {/* Dealer vs Retailer Segment Control */}
                <View style={[styles.roleSelectorContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <TouchableOpacity
                    style={[
                      styles.roleTab,
                      selectedRole === 'dealer' && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => setSelectedRole('dealer')}
                  >
                    <Text
                      style={[
                        styles.roleTabText,
                        { color: selectedRole === 'dealer' ? '#FFF' : theme.textSecondary }
                      ]}
                    >
                      Dealer Reset
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleTab,
                      selectedRole === 'retailer' && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => setSelectedRole('retailer')}
                  >
                    <Text
                      style={[
                        styles.roleTabText,
                        { color: selectedRole === 'retailer' ? '#FFF' : theme.textSecondary }
                      ]}
                    >
                      Retailer Reset
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Country Code Picker & Phone Input */}
                <View style={styles.phoneRow}>
                  <TouchableOpacity 
                    style={[styles.countryPicker, { backgroundColor: theme.surface, borderColor: theme.border }]} 
                    onPress={() => setShowCountryModal(true)}
                  >
                    <Text style={styles.flagTxt}>{selectedCountry.flag}</Text>
                    <Text style={[styles.countryTxt, { color: theme.text }]}>{selectedCountry.code}</Text>
                    <ChevronDown size={14} color={theme.textSecondary} />
                  </TouchableOpacity>
                  
                  <View style={{ flex: 1 }}>
                    <AppInput
                      label="Registered Mobile Number"
                      placeholder="Enter mobile number"
                      value={phone}
                      onChangeText={v => setPhone(v.replace(/[^0-9]/g, ''))}
                      keyboardType="phone-pad"
                      error={errors.phone}
                      leftIcon={<Phone size={18} color={theme.textSecondary} />}
                    />
                  </View>
                </View>

                <AppButton
                  title="Send Verification OTP"
                  onPress={handleSendOtp}
                  loading={loading}
                  size="lg"
                  style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                />
              </>
            ) : (
              <>
                <AppInput
                  label="New Password"
                  placeholder="Enter secure new password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPwd}
                  error={errors.newPassword}
                  leftIcon={<Lock size={18} color={theme.textSecondary} />}
                  rightIcon={showNewPwd ? <EyeOff size={18} color={theme.textSecondary} /> : <Eye size={18} color={theme.textSecondary} />}
                  onRightIconPress={() => setShowNewPwd(!showNewPwd)}
                />

                <AppInput
                  label="Confirm New Password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPwd}
                  error={errors.confirmPassword}
                  leftIcon={<Lock size={18} color={theme.textSecondary} />}
                  rightIcon={showConfirmPwd ? <EyeOff size={18} color={theme.textSecondary} /> : <Eye size={18} color={theme.textSecondary} />}
                  onRightIconPress={() => setShowConfirmPwd(!showConfirmPwd)}
                />

                <AppButton
                  title="Update Password"
                  onPress={handleUpdatePassword}
                  loading={loading}
                  size="lg"
                  style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Modal */}
      <Modal visible={showCountryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCountryModal(false)} />
          <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                <Text style={[styles.closeBtn, { color: theme.primary }]}>Close</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={item => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.countryItem, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    setSelectedCountry(item);
                    setShowCountryModal(false);
                  }}
                >
                  <Text style={styles.countryFlagLarge}>{item.flag}</Text>
                  <Text style={[styles.countryName, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.countryCodeVal, { color: theme.textSecondary }]}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* OTP Modal */}
      <Modal visible={showOtpModal} animationType="fade" transparent onRequestClose={() => setShowOtpModal(false)}>
        <View style={styles.otpModalOverlay}>
          <View style={[styles.otpModalSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.otpIconWrap}>
              <ShieldCheck size={48} color={theme.primary} />
            </View>
            <Text style={[styles.otpTitle, { color: theme.text }]}>Security Verification</Text>
            <Text style={[styles.otpSubtitle, { color: theme.textSecondary }]}>
              Enter the 6-digit verification code sent to {selectedCountry.code} {phone.slice(-4).padStart(phone.length, '•')}
            </Text>

            <View style={styles.otpInputGroup}>
              <TextInput
                style={[styles.otpTextInput, { color: theme.text, borderColor: otpError ? theme.error : theme.border, backgroundColor: theme.background }]}
                value={otpInput}
                onChangeText={v => {
                  setOtpInput(v.replace(/[^0-9]/g, '').slice(0, 6));
                  if (otpError) setOtpError('');
                }}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="0 0 0 0 0 0"
                placeholderTextColor={theme.textSecondary}
                textAlign="center"
                autoFocus={true}
              />
              {otpError ? <Text style={[styles.otpErrorText, { color: theme.error }]}>{otpError}</Text> : null}
            </View>

            <View style={styles.otpTimerRow}>
              {timer > 0 ? (
                <Text style={[styles.otpTimerTxt, { color: theme.textSecondary }]}>
                  Resend code in <Text style={{ color: theme.primary, fontWeight: '700' }}>{timer}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResendOtp}>
                  <Text style={[styles.otpResendBtn, { color: theme.primary }]}>Resend Code via SMS</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.otpActionButtons}>
              <TouchableOpacity 
                style={[styles.otpVerifyBtn, { backgroundColor: theme.primary }]} 
                onPress={handleVerifyOtp}
                disabled={otpVerifying}
              >
                {otpVerifying ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.otpVerifyBtnTxt}>Verify & Reset</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.otpCancelBtn, { borderColor: theme.border }]} 
                onPress={() => {
                  setShowOtpModal(false);
                  clearInterval(timerRef.current);
                }}
              >
                <Text style={[styles.otpCancelBtnTxt, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME_COLORS.background },
  scroll: { flexGrow: 1, padding: 24 },
  header: { paddingVertical: 10, marginBottom: 20 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  logoArea: { marginBottom: 30 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  form: { flex: 1 },
  phoneRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginBottom: 24 },
  roleSelectorContainer: {
    flexDirection: 'row',
    borderRadius: 25,
    borderWidth: 1,
    padding: 4,
    marginBottom: 24,
    height: 50,
  },
  roleTab: {
    flex: 1,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleTabText: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countryPicker: {
    height: 48, paddingHorizontal: 12, borderRadius: 24,
    borderWidth: 1, borderColor: THEME_COLORS.border,
    backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center',
    gap: 4, marginBottom: 16,
  },
  flagTxt: { fontSize: 16 },
  countryTxt: { fontSize: 14, fontWeight: '700', color: THEME_COLORS.text },
  actionBtn: { width: '100%', borderRadius: 14, marginTop: 12 },

  // Modals Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { 
    borderTopLeftRadius: 24, borderTopRightRadius: 24, 
    height: '60%', padding: 20 
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  closeBtn: { fontWeight: '700' },
  
  countryItem: { 
    flexDirection: 'row', alignItems: 'center', paddingVertical: 15, 
    borderBottomWidth: 1, 
  },
  countryFlagLarge: { fontSize: 20, marginRight: 12 },
  countryName: { flex: 1, fontSize: 15, fontWeight: '600' },
  countryCodeVal: { fontSize: 14, fontWeight: '700' },

  // OTP Modal Styles
  otpModalOverlay: { 
    flex: 1, backgroundColor: 'rgba(12, 24, 33, 0.75)', 
    justifyContent: 'center', alignItems: 'center', padding: 24 
  },
  otpModalSheet: {
    width: '100%', maxWidth: 360, borderRadius: 24, 
    padding: 24, alignItems: 'center', borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25, shadowRadius: 15, elevation: 10
  },
  otpIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(0, 70, 148, 0.08)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16
  },
  otpTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  otpSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 10 },
  otpInputGroup: { width: '100%', marginBottom: 16, alignItems: 'center' },
  otpTextInput: {
    width: '100%', height: 56, borderWidth: 1.5, borderRadius: 16,
    fontSize: 24, fontWeight: '800', letterSpacing: 8, textAlign: 'center'
  },
  otpErrorText: { fontSize: 12, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  otpTimerRow: { marginBottom: 24, alignItems: 'center' },
  otpTimerTxt: { fontSize: 14, fontWeight: '500' },
  otpResendBtn: { fontSize: 14, fontWeight: '700' },
  otpActionButtons: { width: '100%', gap: 10 },
  otpVerifyBtn: { 
    height: 50, borderRadius: 12, 
    justifyContent: 'center', alignItems: 'center' 
  },
  otpVerifyBtnTxt: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  otpCancelBtn: { 
    height: 50, borderRadius: 12, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center' 
  },
  otpCancelBtnTxt: { fontSize: 16, fontWeight: '700' }
});
