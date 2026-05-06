import React from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { COLORS } from '../theme';
import { CartItem, AppButton, EmptyState } from '../components';
import { useCart } from '../context/CartContext';
import { BackIcon } from '../components/CustomIcons';

export default function CartScreen({ navigation }) {
  const { cartItems: items, removeFromCart: remove, updateQuantity: updateQty } = useCart();

  const subtotal = Array.isArray(items) 
    ? items.reduce((s, i) => s + (Number(i?.price) || 0) * (Number(i?.quantity) || 0), 0)
    : 0;
  const discount = Math.round(subtotal * 0.15);
  const packaging = 7;
  const total = subtotal - discount + packaging;

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header Removed */}

        <EmptyState
          icon={<ShoppingBag size={52} color={COLORS.border} />}
          title="Your bag is empty"
          subtitle="Browse and add items to start shopping."
          action={
            <AppButton
              title="Continue Shopping"
              onPress={() => navigation.navigate('HomeTab')}
              size="md"
            />
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart</Text>
        <View style={{ width: 40 }} /> 
      </View>



      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Order summary label */}
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryLabel}>Order Summary</Text>
          <Text style={styles.itemCount}>{items.length} ITEMS</Text>
        </View>

        {/* Cart Items */}
        {items.map(item => (
          <CartItem
            key={item.id}
            item={item}
            onRemove={() => remove(item.id)}
            onIncrease={() => updateQty(item.id, 1)}
            onDecrease={() => updateQty(item.id, -1)}
          />
        ))}

        {/* Bill Details */}
        <View style={styles.billCard}>
          <BillRow label={`Price (${items.length} item${items.length > 1 ? 's' : ''})`} value={`₹${subtotal.toLocaleString()}`} />
          <BillRow label="Discount (15%)" value={`-₹${discount.toLocaleString()}`} valueColor="#10B981" />
          <BillRow label="Secured Packaging Fee" value={`₹${packaging}`} />
          <View style={styles.totalDivider} />
          <BillRow label="Total Amount" value={`₹${total.toLocaleString()}`} bold />
        </View>
      </ScrollView>

      {/* Checkout Footer */}
      <View style={[styles.footer, { paddingBottom: Platform.OS === 'ios' ? 100 : 90 }]}>
        <AppButton
          title="Proceed to Checkout"
          onPress={() => navigation.navigate('Checkout')}
          size="lg"
          style={styles.checkoutBtn}
          icon={<ArrowRight size={18} color="#FFF" />}
          iconPosition="right"
        />
      </View>
    </SafeAreaView>
  );
}

function BillRow({ label, value, valueColor, bold }) {
  return (
    <View style={bStyles.row}>
      <Text style={[bStyles.label, bold && bStyles.bold]}>{label}</Text>
      <Text style={[bStyles.value, bold && bStyles.bold, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const bStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { fontSize: 14, color: COLORS.textSecondary },
  value: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  bold: { fontWeight: '900', fontSize: 16, color: COLORS.text },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primary, flex: 1, textAlign: 'center' },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },

  scroll: { padding: 16, paddingBottom: 20 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  summaryLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  itemCount: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  billCard: { marginTop: 8 },
  totalDivider: { height: 1, backgroundColor: '#E5E7EB', marginBottom: 14, marginTop: 2 },

  footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: 'transparent' },
  checkoutBtn: {
    backgroundColor: '#004694',
    borderRadius: 12,
  },
});
