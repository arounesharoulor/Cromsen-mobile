import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Dimensions, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { THEME_COLORS } from '../theme';
import { AppButton, AppInput } from '../components';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogoIcon } from '../components/CustomIcons';

const { height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const { login: authLogin } = useAuth();
  const { isDarkMode, theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const data = await authService.login(email, password);
      await authLogin(data.user || data.data || data, password);
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Invalid email or password');
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
            <AppInput
              label="Email Address"
              placeholder="name@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              leftIcon={<Mail size={18} color={theme.textSecondary} />}
            />

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
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              size="lg"
              style={[styles.loginBtn, { backgroundColor: theme.primary }]}
            />

            {/* Footer moved below button */}
            <View style={styles.footer}>
              <Text style={[styles.footerTxt, { color: theme.textSecondary }]}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={[styles.linkTxt, { color: theme.primary }]}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME_COLORS.background },
  scroll: { flexGrow: 1, padding: 24 },

  header: { marginTop: height * 0.06, marginBottom: 36 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 30, fontWeight: '800', color: THEME_COLORS.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: THEME_COLORS.textSecondary, marginTop: 6, fontWeight: '500' },

  form: { flex: 1 },
  forgotRow: { alignSelf: 'flex-end', marginBottom: 24, marginTop: -8 },
  forgotTxt: { color: THEME_COLORS.primary, fontSize: 13, fontWeight: '700' },
  loginBtn: { width: '100%', borderRadius: 14 },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 32 },
  footerTxt: { color: THEME_COLORS.textSecondary, fontSize: 14 },
  linkTxt: { color: THEME_COLORS.primary, fontSize: 14, fontWeight: '800' },
});
