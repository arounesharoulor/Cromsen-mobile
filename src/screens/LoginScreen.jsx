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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('dealer'); // 'dealer' or 'retailer'
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const validateForm = () => {
    const e = {};
    if (!email) e.email = 'Email address is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email address';
    
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLoginPress = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      
      // 1. Look up user by email from GET /users list
      let matchedUser = null;
      try {
        const response = await fetch('https://cromsen-backend.onrender.com/api/users');
        if (response.ok) {
          const listData = await response.json();
          const users = Array.isArray(listData) ? listData : (listData.users || listData.data || []);
          matchedUser = users.find(u => {
            const dbEmail = (u.email || '').trim().toLowerCase();
            const dbRole = (u.role || '').toLowerCase();
            return dbEmail === cleanEmail && dbRole === selectedRole.toLowerCase();
          });
        }
      } catch (err) {
        console.warn('Failed to retrieve user, checking backend failed:', err);
      }

      if (!matchedUser) {
        Alert.alert(
          'Account Not Found',
          `No registered ${selectedRole === 'dealer' ? 'Dealer' : 'Retailer'} account was found with this email address. Please register first.`
        );
        setLoading(false);
        return;
      }
      
      const response = await authService.login(cleanEmail, password);
      
      const userData = response.user || response.data || response;
      await authLogin({ ...matchedUser, ...userData }, password);
      
      Alert.alert('Success', 'Logged in successfully!', [
        { text: 'OK', onPress: () => navigation.replace('Main') }
      ]);
    } catch (err) {
      const isNetworkErr = err.message?.toLowerCase().includes('network') || err.message?.toLowerCase().includes('fetch');
      const errorMsg = isNetworkErr 
        ? 'Unable to connect to the server. The database server may be warming up (Render free tier) or your device is offline. Please wait 30 seconds and try again.'
        : (err.message || 'Incorrect password or account mismatch. Please try again.');
      Alert.alert('Connection Alert', errorMsg);
    } finally {
      setLoading(false);
    }
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
                  Dealer Login
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
                  Retailer Login
                </Text>
              </TouchableOpacity>
            </View>

            {/* Email Address Input */}
            <AppInput
              label="Email Address"
              placeholder="Enter registered email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              leftIcon={<Mail size={18} color={theme.textSecondary} />}
            />

            {/* Password Field */}
            <AppInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              error={errors.password}
              leftIcon={<Lock size={18} color={theme.textSecondary} />}
              rightIcon={showPassword ? <EyeOff size={18} color={theme.textSecondary} /> : <Eye size={18} color={theme.textSecondary} />}
              onRightIconPress={() => setShowPassword(!showPassword)}
            />

            {/* Forgot Password Link */}
            <TouchableOpacity 
              style={styles.forgotPwdContainer}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={[styles.forgotPwdTxt, { color: theme.primary }]}>Forgot Password?</Text>
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

      {/* OTP verification removed in favor of standard password flow */}
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
  phoneRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginBottom: 24 },
  countryPicker: {
    height: 48, paddingHorizontal: 12, borderRadius: 24,
    borderWidth: 1, borderColor: THEME_COLORS.border,
    backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center',
    gap: 4, marginBottom: 16,
  },
  flagTxt: { fontSize: 16 },
  countryTxt: { fontSize: 14, fontWeight: '700', color: THEME_COLORS.text },

  loginBtn: { width: '100%', borderRadius: 14 },
  forgotPwdContainer: { alignSelf: 'flex-end', marginBottom: 24, marginTop: -4 },
  forgotPwdTxt: { fontSize: 13, fontWeight: '800' },

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
