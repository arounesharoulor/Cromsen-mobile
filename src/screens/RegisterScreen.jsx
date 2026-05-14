import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Phone, Lock, Eye, EyeOff, ArrowLeft, ChevronDown, Search } from 'lucide-react-native';
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
  const [form, setForm] = useState({ name: '', phone: '', password: '', confirm: '' });
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.phone) e.phone = 'Mobile number is required';
    else if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ''))) e.phone = 'Enter a valid 10-digit number';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      // Strip any existing country code prefix or spaces the user might have typed
      const cleanPhone = form.phone.replace(/^\+\d+\s?/, '').replace(/\s/g, '');
      const regData = { 
        name: form.name, 
        phone: cleanPhone, // Send ONLY the 10-digit number
        countryCode: selectedCountry.code, // Send country code separately
        password: form.password,
        email: `${cleanPhone}@cromsen.com` 
      };
      const response = await authService.register(regData);
      
      // Auto-login after successful registration
      const userData = response.user || response.data || response;
      await authLogin(userData, form.password);
      
      Alert.alert('Success', 'Account created and logged in successfully!', [
        { text: 'Great!', onPress: () => navigation.replace('Main') }
      ]);
    } catch (err) {
      Alert.alert('Registration Failed', err.message || 'Could not create account');
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
            <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Join thousands of happy customers</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <AppInput
              label="Full Name"
              placeholder="Enter your full name"
              value={form.name}
              onChangeText={v => set('name', v)}
              error={errors.name}
              leftIcon={<User size={18} color={theme.textSecondary} />}
              autoCapitalize="words"
            />
            <View style={styles.phoneRow}>
              <TouchableOpacity style={[styles.countryPicker, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => setShowCountryModal(true)}>
                <Text style={styles.flagTxt}>{selectedCountry.flag}</Text>
                <Text style={[styles.countryTxt, { color: theme.text }]}>{selectedCountry.code}</Text>
                <ChevronDown size={14} color={theme.textSecondary} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <AppInput
                  label="Mobile Number"
                  placeholder="Enter your mobile number"
                   value={form.phone}
                  onChangeText={v => set('phone', v.replace(/[^0-9]/g, ''))}
                  keyboardType="phone-pad"
                  error={errors.phone}
                  leftIcon={<Phone size={18} color={theme.textSecondary} />}
                />
              </View>
            </View>
            <AppInput
              label="Password"
              placeholder="Create a strong password"
              value={form.password}
              onChangeText={v => set('password', v)}
              secureTextEntry={!showPwd}
              error={errors.password}
              leftIcon={<Lock size={18} color={theme.textSecondary} />}
              rightIcon={showPwd ? <EyeOff size={18} color={theme.textSecondary} /> : <Eye size={18} color={theme.textSecondary} />}
              onRightIconPress={() => setShowPwd(v => !v)}
              hint="Minimum 6 characters"
              contextMenuHidden={true}
              selectTextOnFocus={false}
            />
            <AppInput
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={form.confirm}
              onChangeText={v => set('confirm', v)}
              secureTextEntry={!showPwd}
              error={errors.confirm}
              leftIcon={<Lock size={18} color={theme.textSecondary} />}
              contextMenuHidden={true}
              selectTextOnFocus={false}
            />

            <Text style={[styles.terms, { color: theme.textSecondary }]}>
              By creating an account, you agree to our{' '}
              <Text style={[styles.link, { color: theme.primary }]}>Terms of Service</Text> and{' '}
              <Text style={[styles.link, { color: theme.primary }]}>Privacy Policy</Text>
            </Text>

            <AppButton
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              size="lg"
              style={[styles.submitBtn, { backgroundColor: theme.primary }]}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerTxt, { color: theme.textSecondary }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.linkTxt, { color: theme.primary }]}>Sign In</Text>
            </TouchableOpacity>
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

  header: { marginBottom: 32 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: THEME_COLORS.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: THEME_COLORS.textSecondary, marginTop: 6, fontWeight: '500' },
  
  phoneRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
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

  footer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 28 },
  footerTxt: { color: THEME_COLORS.textSecondary, fontSize: 14 },
  linkTxt: { color: THEME_COLORS.primary, fontSize: 14, fontWeight: '800' },
});
