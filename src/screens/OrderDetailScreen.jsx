import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Calendar, Truck, CheckCircle2, Package, ShoppingBag } from 'lucide-react-native';
import { COLORS } from '../theme';
import { useAuth } from '../context/AuthContext';
import { BackIcon } from '../components/CustomIcons';

const { width } = Dimensions.get('window');

const ORDER_STATUS_STEPS = [
  { label: 'CONFIRMED', icon: <CheckCircle2 size={16} color="#FFF" />, active: true, completed: true },
  { label: 'PACKED', icon: <Package size={16} color="#64748B" />, active: false, completed: false },
  { label: 'SHIPPED', icon: <Truck size={16} color="#64748B" />, active: false, completed: false },
  { label: 'OUT FOR DELIVERY', icon: <ShoppingBag size={16} color="#64748B" />, active: false, completed: false },
];

export default function OrderDetailScreen({ navigation, route }) {
  const { order } = route.params || {};
  const [showTracking, setShowTracking] = useState(false);

  if (!order) return null;

  const subtotal = order.items?.reduce((acc, item) => {
    const p = typeof item.price === 'number' ? item.price : (parseFloat(item.price) || 0);
    return acc + (p * (item.quantity || 1));
  }, 0) || (order.total - 20);

  
  // Calculate delivery date (3 days after order date)
  const getExpectedDate = () => {
    if (order.expectedDelivery) return order.expectedDelivery;
    try {
      const d = new Date(order.date || Date.now());
      if (isNaN(d.getTime())) {
        // Handle "MAY 1, 2026" format manually if needed, 
        // but new Date("MAY 1, 2026") works in most environments.
        const fallback = new Date();
        fallback.setDate(fallback.getDate() + 3);
        return fallback.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      d.setDate(d.getDate() + 3);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };
  const deliveryDate = getExpectedDate();


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {/* STATUS TIMELINE CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.orderId}>{order.id}</Text>
            <Text style={styles.updatedTime}>Updated 2m ago</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{order.status}</Text>
          </View>

          {showTracking && (
            <View style={styles.timeline}>
              {ORDER_STATUS_STEPS.map((step, idx) => (
                <React.Fragment key={step.label}>
                  <View style={styles.timelineStep}>
                    <View style={[
                      styles.iconCircle, 
                      step.completed && styles.iconCircleCompleted,
                      step.active && styles.iconCircleActive
                    ]}>
                      {step.icon}
                    </View>
                    <Text style={[styles.stepLabel, step.completed && styles.stepLabelActive]}>
                      {step.label}
                    </Text>
                  </View>
                  {idx < ORDER_STATUS_STEPS.length - 1 && (
                    <View style={[styles.timelineLine, step.completed && styles.timelineLineCompleted]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          )}
          {!showTracking && (
            <Text style={{ fontSize: 13, color: '#64748B', fontStyle: 'italic', textAlign: 'center' }}>
              Press "Track order" to see status timeline
            </Text>
          )}
        </View>

        {/* DELIVERY INFO CARD */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Expected Delivery</Text>
            <Calendar size={18} color="#94A3B8" />
          </View>
          <Text style={styles.deliveryDate}>{deliveryDate}</Text>

          <View style={styles.addressRow}>
            <View style={styles.iconBox}>
              <MapPin size={18} color={COLORS.secondary} />
            </View>
            <View style={styles.addressInfo}>
              <Text style={styles.addressLabel}>Delivery Address</Text>
              <Text style={styles.addressText}>{order.address?.name || 'Customer'}</Text>
              <Text style={styles.addressSub}>
                {order.address?.full || 'Address not available'}
              </Text>
              <Text style={styles.addressSub}>{order.address?.phone || ''}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.trackBtn, showTracking && { backgroundColor: '#F1F5F9' }]}
            onPress={() => setShowTracking(!showTracking)}
          >
            <Text style={[styles.trackBtnText, showTracking && { color: COLORS.text }]}>
              {showTracking ? 'Hide tracking' : 'Track order'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ORDER ITEMS */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            <Text style={styles.itemCount}>{order.items?.length || 0} items</Text>
          </View>

          {order.items?.map((item, idx) => (
            <View key={idx} style={[styles.itemRow, idx === order.items.length - 1 && { borderBottomWidth: 0 }]}>
              <Image 
                source={{ uri: item.image || 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?auto=format&fit=crop&q=80&w=200' }} 
                style={styles.itemImg} 
              />

              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>{item.variant || 'Standard'}</Text>
                <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                <Text style={styles.itemPrice}>₹{(typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0).toFixed(2)}</Text>

              </View>
            </View>
          ))}
        </View>

        {/* SUMMARY */}
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text style={[styles.summaryValue, { color: '#27AE60' }]}>₹20.00</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount</Text>
            <Text style={[styles.summaryValue, { color: '#EB5757' }]}>-₹0.00</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Order Total</Text>
            <Text style={styles.totalValue}>₹{order.total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFF',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary },

  scrollBody: { padding: 20, paddingBottom: 40 },

  card: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  updatedTime: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },

  statusBadge: {
    backgroundColor: '#FFF9F3', alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 20,
  },
  statusBadgeText: { color: '#F2994A', fontSize: 10, fontWeight: '800' },

  timeline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timelineStep: { alignItems: 'center', width: 60 },
  iconCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  iconCircleCompleted: { backgroundColor: '#F2994A' },
  iconCircleActive: { borderWidth: 2, borderColor: '#F2994A' },
  stepLabel: { fontSize: 8, fontWeight: '800', color: '#94A3B8', textAlign: 'center' },
  stepLabelActive: { color: COLORS.text },
  timelineLine: { flex: 1, height: 2, backgroundColor: '#F1F5F9', marginTop: -20 },
  timelineLineCompleted: { backgroundColor: '#F2994A' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  deliveryDate: { fontSize: 18, fontWeight: '900', color: COLORS.secondary, marginBottom: 20 },

  addressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F2F8FF', justifyContent: 'center', alignItems: 'center',
  },
  addressInfo: { marginLeft: 16 },
  addressLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 2 },
  addressText: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
  addressSub: { fontSize: 12, color: '#64748B', fontWeight: '500' },

  trackBtn: {
    height: 48, borderRadius: 24, backgroundColor: COLORS.secondary,
    justifyContent: 'center', alignItems: 'center',
  },
  trackBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900' },

  itemCount: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  itemRow: {
    flexDirection: 'row', paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  itemImg: { width: 70, height: 70, borderRadius: 12, backgroundColor: '#F1F5F9' },
  itemInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  itemName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  itemMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  itemQty: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  itemPrice: { fontSize: 14, fontWeight: '900', color: COLORS.primary, marginTop: 2 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  summaryValue: { fontSize: 14, color: COLORS.text, fontWeight: '700' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  totalValue: { fontSize: 18, fontWeight: '900', color: COLORS.text },
});
