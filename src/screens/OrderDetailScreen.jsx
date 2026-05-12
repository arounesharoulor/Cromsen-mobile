import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Calendar, Truck, CheckCircle2, Package, ShoppingBag } from 'lucide-react-native';
import { THEME_COLORS } from '../theme';
import { useAuth } from '../context/AuthContext';
import { BackIcon } from '../components/CustomIcons';
import { sanitizeData, getImageUrl, userService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [loading, setLoading] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(order);

  React.useEffect(() => {
    refreshOrder();
  }, []);

  const refreshOrder = async () => {
    try {
      const orderId = currentOrder._id || currentOrder.id;
      if (!orderId || String(orderId).startsWith('#')) return;

      const orders = await userService.getOrders(currentOrder.userId);
      const latest = (Array.isArray(orders) ? orders : orders.data || orders.orders || [])
        .find(o => (o._id === orderId || o.id === orderId));
      
      if (latest) {
        setCurrentOrder(prev => ({
          ...prev,
          status: latest.status,
          // Sync any other fields if needed
        }));
      }
    } catch (e) {
      console.warn('Could not refresh order status:', e);
    }
  };

  if (!currentOrder) return null;

  const subtotal = currentOrder.items?.reduce((acc, item) => {
    const p = typeof item.price === 'number' ? item.price : (parseFloat(item.price) || 0);
    return acc + (p * (item.quantity || 1));
  }, 0) || (currentOrder.total - 20);

  
  // Calculate delivery date (3 days after order date)
  const getExpectedDate = () => {
    if (currentOrder.expectedDelivery) return currentOrder.expectedDelivery;
    try {
      const d = new Date(currentOrder.date || Date.now());
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

  const handleCancelOrder = async () => {
    try {
      setLoading(true);
      const orderIdStr = String(currentOrder.id || currentOrder._id);
      
      if (!orderIdStr.startsWith('#')) {
        await userService.updateOrderStatus(orderIdStr, 'Cancelled');
      }
      
      const updatedOrder = { ...currentOrder, status: 'CANCELLED' };
      setCurrentOrder(updatedOrder);
      
      // Update local storage
      const stored = await AsyncStorage.getItem('@UserOrders');
      if (stored) {
        const parsed = JSON.parse(stored);
        const updatedOrders = parsed.map(o => (o.id === updatedOrder.id || o._id === updatedOrder._id) ? updatedOrder : o);
        await AsyncStorage.setItem('@UserOrders', JSON.stringify(updatedOrders));
      }
      
      alert('Order cancelled successfully.');
    } catch (e) {
      console.error('Error cancelling order:', e);
      alert('Failed to cancel order. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={THEME_COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {/* STATUS TIMELINE CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.orderId}>{currentOrder.id}</Text>
            <Text style={styles.updatedTime}>Updated just now</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{currentOrder.status}</Text>
          </View>

          {showTracking && (
            <View style={styles.timelineWrapper}>
              {/* Progress Line Background */}
              <View style={styles.timelineLineBackground}>
                {ORDER_STATUS_STEPS.slice(0, -1).map((_, idx) => {
                  const s = String(currentOrder.status).toUpperCase();
                  let lineCompleted = false;
                  if (s.includes('DELIVERED')) lineCompleted = true;
                  else if (s.includes('SHIPPED')) lineCompleted = idx < 2;
                  else if (s.includes('PACKED')) lineCompleted = idx < 1;
                  else lineCompleted = false;

                  return (
                    <View 
                      key={`line-${idx}`} 
                      style={[
                        styles.timelineLine, 
                        lineCompleted && styles.timelineLineCompleted
                      ]} 
                    />
                  );
                })}
              </View>

              {/* Steps Foreground */}
              <View style={styles.timelineStepsRow}>
                {ORDER_STATUS_STEPS.map((step, idx) => {
                  const s = String(currentOrder.status).toUpperCase();
                  let completed = false;
                  let active = false;
                  
                  if (s.includes('DELIVERED')) completed = true;
                  else if (s.includes('SHIPPED')) completed = idx <= 2;
                  else if (s.includes('PACKED')) completed = idx <= 1;
                  else completed = idx === 0;

                  active = (s.includes('DELIVERED') && idx === 3) ||
                           (s.includes('SHIPPED') && idx === 2) ||
                           (s.includes('PACKED') && idx === 1) ||
                           (!s.includes('DELIVERED') && !s.includes('SHIPPED') && !s.includes('PACKED') && idx === 0);

                  return (
                    <View key={step.label} style={styles.timelineStep}>
                      <View style={[
                        styles.iconCircle, 
                        completed && styles.iconCircleCompleted,
                        active && styles.iconCircleActive
                      ]}>
                        {completed ? <CheckCircle2 size={16} color="#FFF" /> : step.icon}
                      </View>
                      <View style={styles.stepInfo}>
                        <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{step.label}</Text>
                        <Text style={styles.stepDate}>{completed ? 'Completed' : 'Pending'}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
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
              <MapPin size={18} color={THEME_COLORS.secondary} />
            </View>
            <View style={styles.addressInfo}>
              <Text style={styles.addressLabel}>Delivery Address</Text>
              <Text style={styles.addressText}>{currentOrder.address?.name || 'Customer'}</Text>
              <Text style={styles.addressSub}>
                {currentOrder.address?.full || currentOrder.address?.address || 'Address not available'}
              </Text>
              <Text style={styles.addressSub}>{currentOrder.address?.phone || ''}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.trackBtn, showTracking && { backgroundColor: '#F1F5F9' }]}
            onPress={() => setShowTracking(!showTracking)}
          >
            <Text style={[styles.trackBtnText, showTracking && { color: THEME_COLORS.text }]}>
              {showTracking ? 'Hide tracking' : 'Track order'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ORDER ITEMS */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            <Text style={styles.itemCount}>{currentOrder.items?.length || 0} items</Text>
          </View>

          {currentOrder.items?.map((item, idx) => (
            <View key={idx} style={[styles.itemRow, idx === currentOrder.items.length - 1 && { borderBottomWidth: 0 }]}>
              <Image 
                source={{ uri: getImageUrl(item?.image || item?.product?.image || currentOrder?.image) }} 
                style={styles.itemImg} 
              />

              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{sanitizeData(item.name, 'Product')}</Text>
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
            <Text style={styles.totalValue}>₹{currentOrder.total.toFixed(2)}</Text>
          </View>
        </View>

        {currentOrder.status !== 'CANCELLED' && currentOrder.status !== 'DELIVERED' && currentOrder.status !== 'Refund Tracking' && (
          <TouchableOpacity style={styles.cancelBigBtn} onPress={handleCancelOrder} disabled={loading}>
            <Text style={styles.cancelBigBtnText}>{loading ? 'Cancelling...' : 'Cancel Order'}</Text>
          </TouchableOpacity>
        )}
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
  headerTitle: { fontSize: 16, fontWeight: '800', color: THEME_COLORS.primary, fontFamily: 'Plus Jakarta Sans' },

  scrollBody: { padding: 20, paddingBottom: 40 },

  card: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { fontSize: 18, fontWeight: '900', color: THEME_COLORS.text, fontFamily: 'Plus Jakarta Sans' },
  updatedTime: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },

  statusBadge: {
    backgroundColor: THEME_COLORS.primary + '10', alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 20,
  },
  statusBadgeText: { color: THEME_COLORS.primary, fontSize: 10, fontWeight: '800', fontFamily: 'Plus Jakarta Sans' },

  timelineWrapper: {
    marginTop: 10,
    position: 'relative',
    paddingBottom: 10,
  },
  timelineLineBackground: {
    position: 'absolute',
    top: 16, // Half of 32px circle
    left: 35, // Half of 70px step
    right: 35,
    height: 2,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 0,
  },
  timelineStepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  timelineStep: { 
    alignItems: 'center', 
    width: 70,
  },
  iconCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2, borderColor: '#F1F5F9',
  },
  iconCircleCompleted: { backgroundColor: THEME_COLORS.primary, borderColor: THEME_COLORS.primary },
  iconCircleActive: { backgroundColor: THEME_COLORS.primary, borderColor: THEME_COLORS.primary },
  stepInfo: { alignItems: 'center', marginTop: 4 },
  stepLabel: { fontSize: 8, fontWeight: '800', color: '#94A3B8', textAlign: 'center', width: 70, textTransform: 'uppercase' },
  stepLabelActive: { color: THEME_COLORS.text },
  stepDate: { fontSize: 9, color: '#94A3B8', fontWeight: '600', marginTop: 1, textAlign: 'center' },
  timelineLine: { 
    flex: 1, 
    height: 2, 
    backgroundColor: '#F1F5F9', 
  },
  timelineLineCompleted: { backgroundColor: THEME_COLORS.primary },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: THEME_COLORS.text },
  deliveryDate: { fontSize: 18, fontWeight: '900', color: THEME_COLORS.primary, marginBottom: 20, fontFamily: 'Plus Jakarta Sans' },

  addressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F2F8FF', justifyContent: 'center', alignItems: 'center',
  },
  addressInfo: { marginLeft: 16 },
  addressLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 2 },
  addressText: { fontSize: 14, fontWeight: '800', color: THEME_COLORS.text, marginBottom: 2, fontFamily: 'Plus Jakarta Sans' },
  addressSub: { fontSize: 12, color: '#64748B', fontWeight: '500' },

  trackBtn: {
    height: 48, borderRadius: 24, backgroundColor: THEME_COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  trackBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900', fontFamily: 'Plus Jakarta Sans' },

  itemCount: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  itemRow: {
    flexDirection: 'row', paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  itemImg: { width: 70, height: 70, borderRadius: 12, backgroundColor: '#F1F5F9' },
  itemInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  itemName: { fontSize: 15, fontWeight: '800', color: THEME_COLORS.text, fontFamily: 'Plus Jakarta Sans' },
  itemMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  itemQty: { fontSize: 12, fontWeight: '700', color: THEME_COLORS.text, marginTop: 4 },
  itemPrice: { fontSize: 14, fontWeight: '900', color: THEME_COLORS.primary, marginTop: 2, fontFamily: 'Plus Jakarta Sans' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  summaryValue: { fontSize: 14, color: THEME_COLORS.text, fontWeight: '700' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '900', color: THEME_COLORS.text },
  totalValue: { fontSize: 18, fontWeight: '900', color: THEME_COLORS.text },

  cancelBigBtn: {
    height: 56, borderRadius: 28, backgroundColor: '#FFF2F2',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, borderWidth: 1, borderColor: '#FFD5D5'
  },
  cancelBigBtnText: { color: '#EB5757', fontSize: 16, fontWeight: '800' }
});
