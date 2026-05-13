import React from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { THEME_COLORS } from '../theme';
import { CartItem, AppButton, EmptyState } from '../components';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { BackIcon } from '../components/CustomIcons';

export default function CartScreen({ navigation }) {
  const { cartItems: items, removeFromCart: remove, updateQuantity: updateQty } = useCart();
  const { isDarkMode, theme } = useTheme();

  const subtotal = Array.isArray(items) 
    ? items.reduce((s, i) => s + (Number(i?.price) || 0) * (Number(i?.quantity) || 0), 0)
    : 0;
  const discount = Math.round(subtotal * 0.15);
  const packaging = 7;
  const total = subtotal - discount + packaging;

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.surface} />

        <EmptyState
          icon={<ShoppingBag size={52} color={THEME_COLORS.border} />}
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.surface} />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: isDarkMode ? '#2C3E50' : '#F8FAFC' }]}>
          <ArrowLeft size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Cart</Text>
        <View style={{ width: 40 }} /> 
      </View>



      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Order summary label */}
        <View style={styles.summaryHeader}>
          <Text style={[styles.summaryLabel, { color: theme.text }]}>Order Summary</Text>
          <Text style={[styles.itemCount, { color: theme.primary }]}>{items.length} ITEMS</Text>
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
          icon={<ArrowRight size={18} color={THEME_COLORS.surface} />}
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
  label: { fontSize: 14, color: THEME_COLORS.textSecondary },
  value: { fontSize: 14, fontWeight: '700', color: THEME_COLORS.text },
  bold: { fontWeight: '900', fontSize: 16, color: THEME_COLORS.text },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME_COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: THEME_COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: THEME_COLORS.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: THEME_COLORS.primary, flex: 1, textAlign: 'center' },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center',
  },

  scroll: { padding: 16, paddingBottom: 20 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  summaryLabel: { fontSize: 16, fontWeight: '700', color: THEME_COLORS.text },
  itemCount: { fontSize: 12, fontWeight: '700', color: THEME_COLORS.primary },

  billCard: { marginTop: 8 },
  totalDivider: { height: 1, backgroundColor: THEME_COLORS.border, marginBottom: 14, marginTop: 2 },

  footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: 'transparent' },
  checkoutBtn: {
    backgroundColor: THEME_COLORS.primary,
    borderRadius: 12,
  },
});
