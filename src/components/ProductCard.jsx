import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { ShoppingCart } from 'lucide-react-native';
import { COLORS } from '../theme';
import { getImageUrl, sanitizeData } from '../services/api';
import { CartIcon, FrameIcon, HeartIcon } from './CustomIcons';
import { useWishlist } from '../context/WishlistContext';

export default function ProductCard({ product, onPress, onAddToCart, style }) {
  const { toggleWishlist, isWishlisted } = useWishlist();
  const wishlisted = product && isWishlisted(product._id || product.id);

  const name = sanitizeData(product?.name, 'Product');
  
  const price = typeof product?.price === 'number' ? product.price : (parseFloat(product?.price) || 0);
  
  const categoryObj = product?.category?.[0] || product?.categoryName || 'Item';
  const category = sanitizeData(categoryObj, 'Item');
  
  const image = getImageUrl(product?.image || product?.thumbnail || product?.img || product?.images?.[0] || product?.images);

  const rating = typeof product?.ratings === 'number' ? product.ratings : 4.5;

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.85}>
      {/* Image */}
      <View style={styles.imgWrap}>
        <Image source={{ uri: image }} style={styles.img} resizeMode="cover" />
        <TouchableOpacity style={styles.wishBtn} onPress={() => product && toggleWishlist(product)}>
          <HeartIcon 
            size={14} 
            color={wishlisted ? COLORS.error : COLORS.textSecondary} 
            filled={wishlisted} 
          />
        </TouchableOpacity>

      </View>

      {/* Details */}
      <View style={styles.body}>
        <Text style={styles.category} numberOfLines={1}>{category}</Text>
        <Text style={styles.name} numberOfLines={2}>{name}</Text>
        <View style={styles.footer}>
          <Text style={styles.price}>₹{price.toLocaleString()}</Text>
          <TouchableOpacity onPress={onAddToCart}>
            <FrameIcon size={30} />
          </TouchableOpacity>


        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 157,
    minHeight: 199,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 0.1,
    borderColor: '#000000',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  imgWrap: {
    width: '100%',
    height: 120,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  img: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  wishBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flex: 1,
    gap: 0,
  },
  category: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 16,
    marginBottom: 6,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.primary,
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
