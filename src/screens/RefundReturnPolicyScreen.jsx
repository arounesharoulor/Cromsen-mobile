import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import { THEME_COLORS } from '../theme';
import { useTheme } from '../context/ThemeContext';

export default function RefundReturnPolicyScreen({ navigation }) {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme?.background || '#F8FAFC' }]}>
      <StatusBar barStyle={theme?.isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme?.surface || "#FFF"} />
      
      <View style={[styles.header, { backgroundColor: theme?.surface || '#FFF', borderBottomColor: theme?.border || '#F1F5F9' }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme?.background || '#F8FAFC' }]} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={theme?.primary || THEME_COLORS.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme?.text || THEME_COLORS.primary }]}>Return & Refund Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: theme?.surface || '#FFF' }]}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(0, 70, 148, 0.08)' }]}>
            <RefreshCw size={32} color={theme?.primary || THEME_COLORS.primary} />
          </View>
          <Text style={[styles.title, { color: theme?.text || '#1E293B' }]}>Return & Refund Policy</Text>
          <Text style={[styles.subtitle, { color: theme?.textSecondary || '#64748B' }]}>Effective Date: June 4, 2026</Text>
        </View>

        <View style={[styles.contentCard, { backgroundColor: theme?.surface || '#FFF' }]}>
          <Text style={[styles.introText, { color: theme?.textSecondary || '#475569' }]}>
            At Cromsen Importers, customer satisfaction is our priority. This policy outlines the terms for returns and refunds.
          </Text>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>1. Return Eligibility</Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              You may request a return within 7 days of receiving your order, subject to the following conditions:
            </Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Item must be unused and in original condition</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Item must be returned with original packaging</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Proof of purchase is required</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>2. Non-Returnable Items</Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              The following items are not eligible for return:
            </Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Used or damaged products (not caused during delivery)</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Customized or special-order items</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Clearance or final sale items</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>3. Return Process</Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              To initiate a return, please contact us at:
            </Text>
            <Text style={[styles.contactEmail, { color: theme?.primary || THEME_COLORS.primary, marginVertical: 8 }]}>
              📧 cromsen@gmail.com
            </Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              Please provide:
            </Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Order ID</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Reason for return</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Supporting images (if applicable)</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>4. Refund Policy</Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Refunds are processed after inspection of returned items</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Approved refunds will be credited to the original payment method</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Processing time: 5–10 business days</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>5. Exchange Policy</Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              We offer product replacement in case of:
            </Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Defective items</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Incorrect items delivered</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>6. Return Shipping</Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Customers are responsible for return shipping costs unless the product is defective or incorrect</Text>
              <Text style={[styles.bulletPoint, { color: theme?.textSecondary || '#475569' }]}>• Shipping charges are non-refundable</Text>
            </View>
          </View>

          <View style={[styles.section, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Text style={[styles.sectionTitle, { color: theme?.text || '#1E293B' }]}>7. Damaged or Defective Products</Text>
            <Text style={[styles.paragraph, { color: theme?.textSecondary || '#475569' }]}>
              If you receive a damaged or defective item, you must notify us within 48 hours of delivery with photographic evidence.
            </Text>
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
    textAlign: 'center',
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
  }
});
