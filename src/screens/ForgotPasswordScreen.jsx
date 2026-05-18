import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ArrowLeft, Phone } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { AppButton, AppInput } from '../components';
import { LogoIcon } from '../components/CustomIcons';

export default function ForgotPasswordScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDarkMode, theme } = useTheme();

  const handleReset = async () => {
    if (!identifier) {
      Alert.alert('Error', 'Please enter your mobile number or email address');
      return;
    }

    const isEmail = identifier.includes('@');
    const isPhone = /^\d{10}$/.test(identifier.replace(/\D/g, ''));

    if (!isEmail && !isPhone) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number or email address');
      return;
    }

    try {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setLoading(false);
        Alert.alert(
          'Success', 
          isPhone 
            ? 'A secure password reset link/code has been sent to your mobile number via SMS.' 
            : 'Password reset link has been sent to your email address.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }, 1500);
    } catch (err) {
      Alert.alert('Error', 'Failed to request reset. Please try again.');
      setLoading(false);
    }
  };

  const isEmailInput = identifier.includes('@') || !/^\d+$/.test(identifier.replace(/\D/g, ''));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.backBtn, { backgroundColor: isDarkMode ? '#2C3E50' : '#FFF' }]} 
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.headerArea}>
            <View style={styles.logoRow}>
              <LogoIcon size={56} color={theme.primary} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Reset Password</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Enter your mobile number or email and we'll send you recovery details
            </Text>
          </View>

          <View style={styles.form}>
            <AppInput
              label="Mobile Number or Email"
              placeholder="e.g. +91 98765 43210 or name@example.com"
              value={identifier}
              onChangeText={setIdentifier}
              keyboardType={isEmailInput ? "email-address" : "phone-pad"}
              autoCapitalize="none"
              leftIcon={isEmailInput ? <Mail size={18} color={theme.textSecondary} /> : <Phone size={18} color={theme.textSecondary} />}
            />

            <AppButton
              title="Send Recovery Details"
              onPress={handleReset}
              loading={loading}
              size="lg"
              style={styles.btn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 20 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  content: { flex: 1, paddingHorizontal: 24 },
  headerArea: { marginTop: 40, marginBottom: 36 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: {
    fontSize: 15, 
    lineHeight: 22, marginBottom: 12,
  },
  form: { marginTop: 10 },
  btn: { width: '100%', borderRadius: 14, marginTop: 24 },
});
