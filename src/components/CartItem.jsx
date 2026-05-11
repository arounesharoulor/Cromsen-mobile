import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Trash2, Plus, Minus } from 'lucide-react-native';
import { THEME_COLORS } from '../theme';
import { sanitizeData } from '../services/api';

export default function CartItem({ item, onRemove, onIncrease, onDecrease }) {
  const discountedMRP = Math.round(item.price * 1.5);
  const discountPct = Math.round((1 - item.price / discountedMRP) * 100);

  return (
    <View style={styles.card}>
      {/* Top: image + details */}
      <View style={styles.top}>
        <Image source={{ uri: item.image }} style={styles.img} />
        <View style={styles.details}>
          <Text style={styles.name} numberOfLines={1}>{sanitizeData(item.name, 'Product')}</Text>
          <Text style={styles.meta}>Size: 1/4 • Color: Brown</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingTxt}>4.8 ★</Text>
            <Text style={styles.reviews}>(172 reviews)</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{item.price}</Text>
            <Text style={styles.mrp}>₹{discountedMRP}</Text>
            <Text style={styles.discount}>{discountPct}% off</Text>
          </View>
        </View>
      </View>

      {/* Bottom: remove + qty */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <Trash2 size={13} color={THEME_COLORS.error} />
          <Text style={styles.removeTxt}>Remove</Text>
        </TouchableOpacity>
        <View style={styles.qtyBox}>
          <TouchableOpacity style={styles.qtyBtn} onPress={onDecrease}>
            <Minus size={13} color={THEME_COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.qty}>{item.quantity}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={onIncrease}>
            <Plus size={13} color={THEME_COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#000000',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  top: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  img: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#F3F4F6' },
  details: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: THEME_COLORS.text, marginBottom: 2 },
  meta: { fontSize: 11, color: THEME_COLORS.textSecondary, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  ratingTxt: { fontSize: 10, fontWeight: '700', color: '#27AE60' },
  reviews: { fontSize: 10, color: THEME_COLORS.textSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  price: { fontSize: 15, fontWeight: '800', color: THEME_COLORS.text },
  mrp: { fontSize: 11, color: THEME_COLORS.textSecondary, textDecorationLine: 'line-through' },
  discount: { fontSize: 11, color: '#27AE60', fontWeight: '700' },

  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  removeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 6, backgroundColor: '#FEF2F2',
  },
  removeTxt: { fontSize: 12, fontWeight: '700', color: THEME_COLORS.error },
  qtyBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6,
  },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  qty: { fontSize: 14, fontWeight: '700', minWidth: 20, textAlign: 'center' },
});
