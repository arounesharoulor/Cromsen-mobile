import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MessageCircle, Mail, Phone, ExternalLink, ChevronDown } from 'lucide-react-native';
import { THEME_COLORS } from '../theme';

const FAQS = [
  {
    question: "How do I track my furniture order?",
    answer: "Once your order is shipped, you will receive a tracking link via email and SMS. You can also view real-time updates in the 'My Orders' section of your profile."
  },
  {
    question: "What is the standard delivery timeline?",
    answer: "For standard furniture, delivery usually takes 5-7 business days. For customized interior pieces, it may take 12-15 days depending on the complexity of the craft."
  },
  {
    question: "Do you offer assembly services?",
    answer: "Yes! Most of our furniture comes with professional installation. Our delivery team will assemble and set up the product at your home during the time of delivery."
  },
  {
    question: "What is your return policy?",
    answer: "We offer a 7-day return policy for manufacturing defects or damage during transit. Please ensure you report any issues within 24 hours of delivery."
  },
  {
    question: "How can I book a design consultation?",
    answer: "You can reach out to our design experts via the 'WhatsApp' button below or visit our experience center for a one-on-one session."
  }
];

export default function HelpScreen({ navigation }) {
  const [expandedIndex, setExpandedIndex] = React.useState(null);

  const handleContact = (type) => {
    switch(type) {
      case 'WHATSAPP':
        Linking.openURL('whatsapp://send?text=Hi Cromsen Support!&phone=+911234567890');
        break;
      case 'EMAIL':
        Linking.openURL('mailto:support@cromsen.com?subject=App Support Request');
        break;
      case 'CALL':
        Linking.openURL('tel:+911234567890');
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={THEME_COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Support Options */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          <View style={styles.contactGrid}>
            <TouchableOpacity style={styles.contactCard} onPress={() => handleContact('WHATSAPP')}>
              <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                <MessageCircle size={24} color="#15803D" />
              </View>
              <Text style={styles.contactLabel}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactCard} onPress={() => handleContact('EMAIL')}>
              <View style={[styles.iconBox, { backgroundColor: '#DBEAFE' }]}>
                <Mail size={24} color="#1D4ED8" />
              </View>
              <Text style={styles.contactLabel}>Email Us</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactCard} onPress={() => handleContact('CALL')}>
              <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                <Phone size={24} color="#B91C1C" />
              </View>
              <Text style={styles.contactLabel}>Call Support</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQs */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {FAQS.map((faq, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.faqItem}
              onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <View style={{ transform: [{ rotate: expandedIndex === index ? '180deg' : '0deg' }] }}>
                  <ChevronDown size={20} color="#64748B" />
                </View>
              </View>
              {expandedIndex === index && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Legal */}
        <View style={styles.legalSection}>
          <Text style={styles.sectionTitle}>Information</Text>
          <TouchableOpacity style={styles.legalRow}>
            <Text style={styles.legalText}>Terms & Conditions</Text>
            <ExternalLink size={16} color="#94A3B8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.legalRow}>
            <Text style={styles.legalText}>Privacy Policy</Text>
            <ExternalLink size={16} color="#94A3B8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.legalRow}>
            <Text style={styles.legalText}>Warranty Information</Text>
            <ExternalLink size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>Cromsen Home Interiors • Version 1.0.4</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: THEME_COLORS.primary },
  scroll: { padding: 20 },

  sectionTitle: {
    fontSize: 15, fontWeight: '900', color: '#1E293B',
    marginBottom: 16, letterSpacing: 0.5,
  },

  /* Contact Cards */
  contactSection: { marginBottom: 30 },
  contactGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  contactCard: {
    width: '30%', backgroundColor: '#FFF', borderRadius: 16,
    paddingVertical: 20, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  contactLabel: { fontSize: 12, fontWeight: '800', color: '#475569' },

  /* FAQs */
  faqSection: { marginBottom: 30 },
  faqItem: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWhidth: 1, borderColor: '#F1F5F9',
  },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1E293B', paddingRight: 10 },
  faqAnswer: { fontSize: 13, color: '#64748B', marginTop: 12, lineHeight: 20, fontWeight: '500' },

  /* Legal */
  legalSection: { marginBottom: 40 },
  legalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 10,
  },
  legalText: { fontSize: 14, fontWeight: '700', color: '#475569' },

  footerText: {
    textAlign: 'center', fontSize: 11, fontWeight: '700',
    color: '#CBD5E1', letterSpacing: 1.5, marginBottom: 20,
  }
});
