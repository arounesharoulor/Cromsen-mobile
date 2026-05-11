import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import { THEME_COLORS } from '../theme';
import { AppButton, AppInput } from '../components';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LogoIcon } from '../components/CustomIcons';

export default function RegisterScreen({ navigation }) {
  const { login: authLogin } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
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
      await authService.register({ name: form.name, email: form.email, password: form.password });
      Alert.alert('Success', 'Account created! Please sign in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (err) {
      Alert.alert('Registration Failed', err.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <LogoIcon size={50} />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join thousands of happy customers</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <AppInput
              label="Full Name"
              placeholder="John Doe"
              value={form.name}
              onChangeText={v => set('name', v)}
              error={errors.name}
              leftIcon={<User size={18} color={THEME_COLORS.textSecondary} />}
              autoCapitalize="words"
            />
            <AppInput
              label="Email Address"
              placeholder="name@example.com"
              value={form.email}
              onChangeText={v => set('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              leftIcon={<Mail size={18} color={THEME_COLORS.textSecondary} />}
            />
            <AppInput
              label="Password"
              placeholder="Create a strong password"
              value={form.password}
              onChangeText={v => set('password', v)}
              secureTextEntry={!showPwd}
              error={errors.password}
              leftIcon={<Lock size={18} color={THEME_COLORS.textSecondary} />}
              rightIcon={showPwd ? <EyeOff size={18} color={THEME_COLORS.textSecondary} /> : <Eye size={18} color={THEME_COLORS.textSecondary} />}
              onRightIconPress={() => setShowPwd(v => !v)}
              hint="Minimum 6 characters"
            />
            <AppInput
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={form.confirm}
              onChangeText={v => set('confirm', v)}
              secureTextEntry={!showPwd}
              error={errors.confirm}
              leftIcon={<Lock size={18} color={THEME_COLORS.textSecondary} />}
            />

            <Text style={styles.terms}>
              By creating an account, you agree to our{' '}
              <Text style={styles.link}>Terms of Service</Text> and{' '}
              <Text style={styles.link}>Privacy Policy</Text>
            </Text>

            <AppButton
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              size="lg"
              style={styles.submitBtn}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerTxt}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkTxt}>Sign In</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
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
