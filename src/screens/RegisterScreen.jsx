import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert, Modal, FlatList, TextInput, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Phone, Lock, Eye, EyeOff, ArrowLeft, ChevronDown, Mail, ShieldCheck } from 'lucide-react-native';
import { THEME_COLORS } from '../theme';
import { AppButton, AppInput } from '../components';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogoIcon } from '../components/CustomIcons';

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

export default function RegisterScreen({ navigation }) {
  const { login: authLogin } = useAuth();
  const { isDarkMode, theme } = useTheme();
  
  // Multi-Step Registration States
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', phone: '', email: '', alternatePhone: '', password: '', confirmPassword: '' });
  const [selectedRole, setSelectedRole] = useState('dealer'); // 'dealer' or 'retailer'
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP Verification States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [sentOtp, setSentOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [otpError, setOtpError] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const timerRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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
    if (!form.phone) e.phone = 'Mobile number is required';
    else if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ''))) e.phone = 'Enter a valid 10-digit number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address';
    if (form.alternatePhone && !/^\d{10}$/.test(form.alternatePhone.replace(/\D/g, ''))) {
      e.alternatePhone = 'Enter a valid 10-digit alternate number';
    }
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    
    if (form.password !== form.confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const generateAndSendOtp = (cleanPhone) => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSentOtp(code);
    setTimer(60);
    setOtpInput('');
    setOtpError('');
    
    // Simulate SMS delivery
    setTimeout(() => {
      Alert.alert(
        '💬 Cromsen Secure OTP',
        `Your registration verification code is: ${code}\n\nDo not share this code with anyone.`,
        [{ text: 'Copy Code', onPress: () => {} }]
      );
    }, 800);
  };

  const handleResendOtp = () => {
    if (timer > 0) return;
    const digits = form.phone.replace(/\D/g, '');
    const cleanPhone = digits.length >= 10 ? digits.slice(-10) : digits;
    generateAndSendOtp(cleanPhone);
  };

  const handleSendOtp = async () => {
    if (!validateStep1()) return;
    try {
      setLoading(true);
      const digits = form.phone.replace(/\D/g, '');
      const cleanPhone = digits.length >= 10 ? digits.slice(-10) : digits;

      // 1. Verify if phone number already exists before sending OTP
      try {
        const response = await fetch('https://cromsen-backend.onrender.com/api/users');
        if (response.ok) {
          const listData = await response.json();
          const users = Array.isArray(listData) ? listData : (listData.users || listData.data || []);
          const matchedUser = users.find(u => {
            const dbDigits = (u.phone || '').replace(/\D/g, '');
            const isPhoneMatch = dbDigits.length >= 10 && cleanPhone.length >= 10
              ? dbDigits.slice(-10) === cleanPhone.slice(-10)
              : dbDigits === cleanPhone;
            const dbRole = (u.role || '').toLowerCase();
            return isPhoneMatch && dbRole === selectedRole.toLowerCase();
          });
          if (matchedUser) {
            Alert.alert(
              'Registration Failed',
              `An account with this mobile number already exists as a ${selectedRole === 'dealer' ? 'Dealer' : 'Retailer'}.`
            );
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Backend user check failed, proceeding with OTP registration:', err);
      }

      setLoading(false);
      // Trigger the OTP Modal and send the code!
      setShowOtpModal(true);
      generateAndSendOtp(cleanPhone);
    } catch (err) {
      Alert.alert('Registration Failed', err.message || 'Could not verify mobile number');
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
    // OTP Verified! Advance to details step
    setStep(2);
  };

  const handleCompleteRegistration = async () => {
    if (!validateStep2()) return;
    try {
      setLoading(true);
      const digits = form.phone.replace(/\D/g, '');
      const cleanPhone = digits.length >= 10 ? digits.slice(-10) : digits;

      const regData = { 
        name: form.name.trim(), 
        phone: cleanPhone, 
        countryCode: selectedCountry.code, 
        password: form.password,
        email: form.email.trim() || `${cleanPhone}@cromsen.com`,
        role: selectedRole,
        alternateNumber: form.alternatePhone ? form.alternatePhone.replace(/\D/g, '') : '',
      };

      const response = await authService.register(regData);
      
      // Auto-login after successful registration
      const userData = response.user || response.data || response;
      const mergedUserData = {
        ...regData,
        ...(userData || {})
      };
      await authLogin(mergedUserData, form.password);
      
      Alert.alert('Success', 'Account created and logged in successfully!', [
        { text: 'Great!', onPress: () => navigation.replace('Main') }
      ]);
    } catch (err) {
      const isNetworkErr = err.message?.toLowerCase().includes('network') || err.message?.toLowerCase().includes('fetch');
      const errorMsg = isNetworkErr 
        ? 'Unable to connect to the server. The database server may be warming up (Render free tier) or your device is offline. Please wait 30 seconds and try again.'
        : (err.message || 'Registration failed.');
      Alert.alert('Connection Alert', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <LogoIcon size={50} color={theme.primary} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>
              {step === 1 ? 'Verify Phone' : 'Create Account'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {step === 1 
                ? 'Verify your mobile number with a secure OTP to start registration' 
                : 'Set up your details to finish signing up'
              }
            </Text>
          </View>

          {/* Step Progress Indicator */}
          <View style={styles.stepIndicatorRow}>
            <View style={[styles.stepDot, { backgroundColor: theme.primary }]} />
            <View style={[styles.stepLine, { backgroundColor: step >= 2 ? theme.primary : theme.border }]} />
            <View style={[styles.stepDot, { backgroundColor: step >= 2 ? theme.primary : theme.border }]} />
          </View>
          <Text style={[styles.stepIndicatorText, { color: theme.textSecondary }]}>
            {step === 1 ? 'Step 1: Mobile Verification' : 'Step 2: Account Details'}
          </Text>

          {/* Form Content */}
          <View style={styles.form}>
            {step === 1 ? (
              <>
                {/* Dealer vs Retailer Role Selector */}
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
                      Dealer Register
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
                      Retailer Register
                    </Text>
                  </TouchableOpacity>
                </View>

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
                      label="Mobile Number (Mandatory)"
                      placeholder="Enter your mobile number"
                      value={form.phone}
                      onChangeText={v => set('phone', v.replace(/[^0-9]/g, ''))}
                      keyboardType="phone-pad"
                      error={errors.phone}
                      leftIcon={<Phone size={18} color={theme.textSecondary} />}
                    />
                  </View>
                </View>

                <Text style={[styles.terms, { color: theme.textSecondary, textAlign: 'left', marginBottom: 28 }]}>
                   We will send a secure 6-digit OTP code to verify ownership of this number.
                </Text>

                <AppButton
                  title="Send Verification OTP"
                  onPress={handleSendOtp}
                  loading={loading}
                  size="lg"
                  style={[styles.submitBtn, { backgroundColor: theme.primary }]}
                />
              </>
            ) : (
              <>
                <AppInput
                  label="Full Name"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChangeText={v => set('name', v)}
                  error={errors.name}
                  leftIcon={<User size={18} color={theme.textSecondary} />}
                  autoCapitalize="words"
                />

                <AppInput
                  label="Email Address"
                  placeholder="name@example.com"
                  value={form.email}
                  onChangeText={v => set('email', v)}
                  error={errors.email}
                  leftIcon={<Mail size={18} color={theme.textSecondary} />}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <AppInput
                  label="Alternate Number (Optional)"
                  placeholder="Enter alternate mobile number"
                  value={form.alternatePhone}
                  onChangeText={v => set('alternatePhone', v.replace(/[^0-9]/g, ''))}
                  keyboardType="phone-pad"
                  error={errors.alternatePhone}
                  leftIcon={<Phone size={18} color={theme.textSecondary} />}
                />

                <AppInput
                  label="Password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChangeText={v => set('password', v)}
                  secureTextEntry={!showPassword}
                  error={errors.password}
                  leftIcon={<Lock size={18} color={theme.textSecondary} />}
                  rightIcon={showPassword ? <EyeOff size={18} color={theme.textSecondary} /> : <Eye size={18} color={theme.textSecondary} />}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                />

                <AppInput
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  value={form.confirmPassword}
                  onChangeText={v => set('confirmPassword', v)}
                  secureTextEntry={!showConfirmPassword}
                  error={errors.confirmPassword}
                  leftIcon={<Lock size={18} color={theme.textSecondary} />}
                  rightIcon={showConfirmPassword ? <EyeOff size={18} color={theme.textSecondary} /> : <Eye size={18} color={theme.textSecondary} />}
                  onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />

                <Text style={[styles.terms, { color: theme.textSecondary }]}>
                  By creating an account, you agree to our{' '}
                  <Text style={[styles.link, { color: theme.primary }]}>Terms of Service</Text> and{' '}
                  <Text style={[styles.link, { color: theme.primary }]}>Privacy Policy</Text>
                </Text>

                <View style={styles.step2ActionButtons}>
                  <AppButton
                    title="Complete Registration"
                    onPress={handleCompleteRegistration}
                    loading={loading}
                    size="lg"
                    style={[styles.submitBtn, { backgroundColor: theme.primary }]}
                  />
                  
                  <TouchableOpacity 
                    style={[styles.backToStep1Btn, { borderColor: theme.border }]} 
                    onPress={() => setStep(1)}
                  >
                    <Text style={[styles.backToStep1Txt, { color: theme.textSecondary }]}>Change Mobile Number</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Footer */}
          {step === 1 && (
            <View style={styles.footer}>
              <Text style={[styles.footerTxt, { color: theme.textSecondary }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[styles.linkTxt, { color: theme.primary }]}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Selection Modal */}
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

      {/* Premium OTP Verification Overlay Modal */}
      <Modal visible={showOtpModal} animationType="fade" transparent onRequestClose={() => setShowOtpModal(false)}>
        <View style={styles.otpModalOverlay}>
          <View style={[styles.otpModalSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.otpIconWrap}>
              <ShieldCheck size={48} color={theme.primary} />
            </View>
            <Text style={[styles.otpTitle, { color: theme.text }]}>Security Verification</Text>
            <Text style={[styles.otpSubtitle, { color: theme.textSecondary }]}>
              Enter the 6-digit verification code sent to {selectedCountry.code} {form.phone.slice(-4).padStart(form.phone.length, '•')}
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
                  <Text style={styles.otpVerifyBtnTxt}>Verify & Continue</Text>
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

  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: THEME_COLORS.primary, justifyContent: 'center', alignItems: 'center',
    marginTop: 4, marginBottom: 20,
  },

  header: { marginBottom: 20 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: THEME_COLORS.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: THEME_COLORS.textSecondary, marginTop: 6, fontWeight: '500', lineHeight: 20 },
  
  // Step Progress Indicator
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 8,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLine: {
    width: 60,
    height: 2,
  },
  stepIndicatorText: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 24,
  },

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
    height: 48, paddingHorizontal: 10, borderRadius: 24,
    borderWidth: 1, borderColor: THEME_COLORS.border,
    backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center',
    gap: 4, marginBottom: 16,
  },
  flagTxt: { fontSize: 16 },
  countryTxt: { fontSize: 14, fontWeight: '700', color: THEME_COLORS.text },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { 
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, 
    height: '60%', padding: 20 
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: THEME_COLORS.text },
  closeBtn: { color: THEME_COLORS.primary, fontWeight: '700' },
  
  countryItem: { 
    flexDirection: 'row', alignItems: 'center', paddingVertical: 15, 
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9' 
  },
  countryFlagLarge: { fontSize: 20, marginRight: 12 },
  countryName: { flex: 1, fontSize: 15, fontWeight: '600', color: THEME_COLORS.text },
  countryCodeVal: { fontSize: 14, color: THEME_COLORS.textSecondary, fontWeight: '700' },

  form: {},
  terms: {
    fontSize: 12, color: THEME_COLORS.textSecondary,
    textAlign: 'center', lineHeight: 18, marginBottom: 24, marginTop: 4,
  },
  link: { color: THEME_COLORS.primary, fontWeight: '700' },
  submitBtn: { width: '100%', borderRadius: 14 },
  
  step2ActionButtons: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 8,
  },
  backToStep1Btn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backToStep1Txt: {
    fontSize: 14,
    fontWeight: '700',
  },

  footer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 28 },
  footerTxt: { color: THEME_COLORS.textSecondary, fontSize: 14 },
  linkTxt: { color: THEME_COLORS.primary, fontSize: 14, fontWeight: '800' },

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
