import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Shield } from 'lucide-react-native';
import { THEME_COLORS } from '../theme';
import { useTheme } from '../context/ThemeContext';

export default function PrivacyPolicyScreen({ navigation }) {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme?.background || '#F8FAFC' }]}>
      <StatusBar barStyle={theme?.isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme?.surface || "#FFF"} />
      
      <View style={[styles.header, { backgroundColor: theme?.surface || '#FFF', borderBottomColor: theme?.border || '#F1F5F9' }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme?.background || '#F8FAFC' }]} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={theme?.primary || THEME_COLORS.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme?.text || THEME_COLORS.primary }]}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: theme?.surface || '#FFF' }]}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(0, 70, 148, 0.08)' }]}>
            <Shield size={32} color={theme?.primary || THEME_COLORS.primary} />
          </View>
          <Text style={[styles.title, { color: theme?.text || '#1E293B' }]}>Privacy Policy</Text>
          <Text style={[styles.subtitle, { color: theme?.textSecondary || '#64748B' }]}>Effective Date: June 4, 2026</Text>
        </View>

        <View style={[styles.contentCard, { backgroundColor: theme?.surface || '#FFF' }]}>
          <Text style={[styles.introText, { color: theme?.textSecondary || '#475569' }]}>
            Welcome to Cromsen Importers. Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our mobile application.
          </Text>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>1. Information We Collect</Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              We may collect personal information that you voluntarily provide to us when you:
            </Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Register on the website or app</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Place an order</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Subscribe to our newsletter</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Contact customer support</Text>
            </View>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569', marginTop: 10 }]}>
              This information may include:
            </Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Full Name</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Email Address</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Phone Number</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Billing and Shipping Address</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Payment Information (processed securely via third-party providers)</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>2. How We Use Your Information</Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              We use the collected information for purposes such as:
            </Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Processing and fulfilling orders</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Managing payments and transactions</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Providing customer support</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Improving website/app functionality and user experience</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Sending promotional communications (only if consent is given)</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>3. Sharing of Information</Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              We do not sell or rent your personal information. We may share your data with:
            </Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Payment processing providers</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Shipping and logistics partners</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Legal authorities when required by law</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>4. Data Security</Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              We implement appropriate technical and organizational security measures to protect your personal data. However, no system is completely secure, and we cannot guarantee absolute security.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>5. Cookies and Tracking Technologies</Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              We use cookies and similar technologies to:
            </Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Enhance user experience</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Analyze website traffic</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Personalize content</Text>
            </View>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569', marginTop: 10 }]}>
              You may choose to disable cookies through your browser settings.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>6. Your Rights</Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              Depending on your location, you may have the right to:
            </Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Access your personal data</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Request correction or deletion</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Withdraw consent for marketing communications</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>7. Changes to This Policy</Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              We reserve the right to update this Privacy Policy at any time. Updates will be posted on this page with a revised “Effective Date.”
            </Text>
          </View>

          <View style={[styles.section, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>8. Contact Information</Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              If you have any questions about this Privacy Policy, please contact us at:
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:cromsen@gmail.com')}>
              <Text style={[styles.contactEmail, { color: theme?.primary || THEME_COLORS.primary }]}>
                📧 cromsen@gmail.com
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  scroll: { padding: 20, paddingBottom: 40 },
  
  heroCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
  },

  contentCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 24,
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  bulletList: {
    marginTop: 8,
    paddingLeft: 8,
    gap: 6,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  contactEmail: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  }
});
