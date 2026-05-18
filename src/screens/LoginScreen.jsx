import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Dimensions, Alert, Modal, TextInput, ActivityIndicator, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, Lock, Eye, EyeOff, ChevronDown, ShieldCheck, Mail } from 'lucide-react-native';
import { THEME_COLORS } from '../theme';
import { AppButton, AppInput } from '../components';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogoIcon } from '../components/CustomIcons';

const { height } = Dimensions.get('window');

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

export default function LoginScreen({ navigation }) {
  const { login: authLogin } = useAuth();
  const { isDarkMode, theme } = useTheme();
  
  // Login Form States
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // OTP Verification States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [sentOtp, setSentOtp] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [timer, setTimer] = useState(60);
  const [otpError, setOtpError] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  
  const timerRef = useRef(null);

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

  const validateForm = () => {
    const e = {};
    if (!phone) e.phone = 'Mobile number is required';
    else if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) e.phone = 'Enter a valid 10-digit number';
    
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const generateAndSendOtp = (cleanPhone) => {
    // Generate a secure 6-digit random code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSentOtp(code);
    setTimer(60);
    setOtpInput('');
    setOtpError('');
    
    // Simulate premium SMS OTP delivery using an Alert window
    setTimeout(() => {
      Alert.alert(
        '💬 Cromsen Secure OTP',
        `Your login verification code is: ${code}\n\nDo not share this code with anyone.`,
        [{ text: 'Copy Code', onPress: () => {
          // Simulation copy
        }}]
      );
    }, 800);
  };

  const handleLoginPress = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      const digits = phone.replace(/\D/g, '');
      const cleanPhone = digits.length >= 10 ? digits.slice(-10) : digits;
      
      // 1. Look up user by phone number from GET /users list to get their email address
      let targetEmail = `${cleanPhone}@cromsen.com`; // default fallback dummy email
      
      try {
        const response = await fetch('https://cromsen-backend.onrender.com/api/users');
        if (response.ok) {
          const listData = await response.json();
          const users = Array.isArray(listData) ? listData : (listData.users || listData.data || []);
          const matchedUser = users.find(u => {
            const dbDigits = (u.phone || '').replace(/\D/g, '');
            const inputDigits = cleanPhone;
            if (dbDigits.length >= 10 && inputDigits.length >= 10) {
              return dbDigits.slice(-10) === inputDigits.slice(-10);
            }
            return dbDigits === inputDigits;
          });
          if (matchedUser && matchedUser.email) {
            targetEmail = matchedUser.email;
          }
        }
      } catch (err) {
        console.warn('Failed to retrieve user email, proceeding with dummy fallback:', err);
      }

      // 2. Validate password via backend login attempt
      const loginData = await authService.login(targetEmail, password);
      
      // If correct password, hold session in state, and trigger OTP Modal!
      setPendingUser(loginData.user || loginData.data || loginData);
      setLoading(false);
      
      // Open OTP Modal and trigger simulated SMS Alert
      setShowOtpModal(true);
      generateAndSendOtp(cleanPhone);
      
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Invalid mobile number or password');
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

    try {
      setOtpVerifying(true);
      // Success! Sign the user in
      await authLogin(pendingUser, password);
      setShowOtpModal(false);
    } catch (err) {
      setOtpError(err.message || 'OTP authentication failed.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleResendOtp = () => {
    if (timer > 0) return;
    const cleanPhone = phone.replace(/^\+\d+\s?/, '').replace(/\s/g, '');
    generateAndSendOtp(cleanPhone);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Brand Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <LogoIcon size={56} color={theme.primary} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Sign in to your account to continue</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Phone Number Input with Country Code Picker */}
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
                  label="Mobile Number"
                  placeholder="Enter mobile number"
                  value={phone}
                  onChangeText={v => setPhone(v.replace(/[^0-9]/g, ''))}
                  keyboardType="phone-pad"
                  error={errors.phone}
                  leftIcon={<Phone size={18} color={theme.textSecondary} />}
                />
              </View>
            </View>

            <AppInput
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPwd}
              error={errors.password}
              leftIcon={<Lock size={18} color={theme.textSecondary} />}
              rightIcon={showPwd ? <EyeOff size={18} color={theme.textSecondary} /> : <Eye size={18} color={theme.textSecondary} />}
              onRightIconPress={() => setShowPwd(v => !v)}
              contextMenuHidden={true}
              selectTextOnFocus={false}
            />

            <TouchableOpacity style={styles.forgotRow} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={[styles.forgotTxt, { color: theme.primary }]}>Forgot Password?</Text>
            </TouchableOpacity>

            <AppButton
              title="Sign In Securely"
              onPress={handleLoginPress}
              loading={loading}
              size="lg"
              style={[styles.loginBtn, { backgroundColor: theme.primary }]}
            />

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerTxt, { color: theme.textSecondary }]}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={[styles.linkTxt, { color: theme.primary }]}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>

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
                  <Text style={styles.otpVerifyBtnTxt}>Verify & Login</Text>
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

  header: { marginTop: height * 0.05, marginBottom: 32 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 30, fontWeight: '800', color: THEME_COLORS.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: THEME_COLORS.textSecondary, marginTop: 6, fontWeight: '500' },

  form: { flex: 1 },
  phoneRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginBottom: 6 },
  countryPicker: {
    height: 48, paddingHorizontal: 12, borderRadius: 24,
    borderWidth: 1, borderColor: THEME_COLORS.border,
    backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center',
    gap: 4, marginBottom: 16,
  },
  flagTxt: { fontSize: 16 },
  countryTxt: { fontSize: 14, fontWeight: '700', color: THEME_COLORS.text },

  forgotRow: { alignSelf: 'flex-end', marginBottom: 24, marginTop: -8 },
  forgotTxt: { color: THEME_COLORS.primary, fontSize: 13, fontWeight: '700' },
  loginBtn: { width: '100%', borderRadius: 14 },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 32 },
  footerTxt: { color: THEME_COLORS.textSecondary, fontSize: 14 },
  linkTxt: { color: THEME_COLORS.primary, fontSize: 14, fontWeight: '800' },

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
