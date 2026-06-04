import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, FileText } from 'lucide-react-native';
import { THEME_COLORS } from '../theme';
import { useTheme } from '../context/ThemeContext';

export default function TermsConditionsScreen({ navigation }) {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme?.background || '#F8FAFC' }]}>
      <StatusBar barStyle={theme?.isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme?.surface || "#FFF"} />
      
      <View style={[styles.header, { backgroundColor: theme?.surface || '#FFF', borderBottomColor: theme?.border || '#F1F5F9' }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme?.background || '#F8FAFC' }]} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={theme?.primary || THEME_COLORS.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme?.text || THEME_COLORS.primary }]}>Terms & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: theme?.surface || '#FFF' }]}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(242, 101, 34, 0.08)' }]}>
            <FileText size={32} color={theme?.secondary || THEME_COLORS.secondary} />
          </View>
          <Text style={[styles.title, { color: theme?.text || '#1E293B' }]}>Terms & Conditions</Text>
          <Text style={[styles.subtitle, { color: theme?.textSecondary || '#64748B' }]}>Last Updated: June 4, 2026</Text>
        </View>

        <View style={[styles.contentCard, { backgroundColor: theme?.surface || '#FFF' }]}>
          <Text style={[styles.introText, { color: theme?.textSecondary || '#475569' }]}>
            Welcome to Cromsen Importers. By using our website and mobile application, you agree to comply with and be bound by the following terms and conditions of use.
          </Text>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>1. Acceptance of Terms</Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              By accessing, browsing, or placing an order through the Cromsen mobile app, you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions. If you do not agree, please do not use our services.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>2. Account Registration</Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              To purchase products or access certain app services, you must register for an account. You agree to provide accurate, current, and complete information during registration and to update it as necessary. You are solely responsible for protecting your account credentials.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>3. Products and Specifications</Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              Cromsen Importers specializes in architectural, luxury home exterior, and interior products, including louvers, pergolas, and customized fixtures. While we make every effort to display product dimensions, colors, and designs accurately, actual products may vary slightly due to device displays, natural materials, or manufacturing differences.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>4. Pricing and Payment</Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              All prices listed are subject to change without notice. Payments must be made securely through our authorized payment gateways (Razorpay, UPI, Cards, etc.) or Cash on Delivery (COD) as configured. We reserve the right to refuse or cancel any order if inaccurate pricing or promotional details occur.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>5. Order Fulfillment & Delivery</Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              Delivery dates provided are estimates. Cromsen is not liable for transport delays caused by weather, logistic partners, or unforeseen customs clearances. In-house professional assembly and setup are provided during delivery as indicated on product listings.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>6. Limitation of Liability</Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              To the maximum extent permitted by law, Cromsen Importers shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use our products or app services.
            </Text>
          </View>

          <View style={[styles.section, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>7. Contact Us</Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              If you have any questions or require clarifications regarding these terms, please write to us at:
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:cromsen@gmail.com')}>
              <Text style={[styles.contactEmail, { color: theme?.primary || THEME_COLORS.primary }]}>📧 cromsen@gmail.com</Text>
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
  contactEmail: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  }
});
