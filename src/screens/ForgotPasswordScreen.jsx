import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react-native';
import { THEME_COLORS } from '../theme';
import { AppButton, AppInput } from '../components';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setLoading(false);
        Alert.alert(
          'Success', 
          'Password reset link has been sent to your email.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }, 1500);
    } catch (err) {
      Alert.alert('Error', 'Failed to send reset link. Please try again.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={THEME_COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <KeyRound size={40} color={THEME_COLORS.primary} />
          </View>
          
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>

          <AppInput
            label="Email Address"
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Mail size={18} color={THEME_COLORS.textSecondary} />}
          />

          <AppButton
            title="Send Reset Link"
            onPress={handleReset}
            loading={loading}
            size="lg"
            style={styles.btn}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME_COLORS.background },
  header: { padding: 20 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  content: { flex: 1, paddingHorizontal: 24, alignItems: 'center' },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
    marginBottom: 24, marginTop: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 5,
  },
  title: { fontSize: 26, fontWeight: '800', color: THEME_COLORS.text, marginBottom: 12 },
  subtitle: {
    fontSize: 15, color: THEME_COLORS.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: 32,
    paddingHorizontal: 10,
  },
  btn: { width: '100%', borderRadius: 14, marginTop: 10 },
});
