import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { ShoppingCart } from 'lucide-react-native';
import { THEME_COLORS, FONTS } from '../styling';
import { getImageUrl, sanitizeData } from '../services/api';
import { CartIcon, FrameIcon, HeartIcon } from './CustomIcons';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function ProductCard({ product, onPress, onAddToCart, style }) {
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { isDarkMode, theme } = useTheme();
  const { user } = useAuth();
  const wishlisted = product && isWishlisted(product._id || product.id);

  const name = sanitizeData(product?.name, 'Product');
  
  const userRole = (user?.role || user?.userType || user?.type || 'retailer').toLowerCase();
  const parseNum = (v) => (typeof v === 'number' ? v : parseFloat(v) || 0);

  // Helper to determine the price to show on the card
  const getCardPrice = () => {
    let p = 0;
    
    const variantItems = product?.variantItems || product?.variantPrices || [];
    if (variantItems.length > 0) {
       const firstVar = variantItems[0];
       p = userRole === 'dealer' ? (parseNum(firstVar.wholesalePrice) || parseNum(firstVar.dealerPrice)) : (parseNum(firstVar.retailPrice) || parseNum(firstVar.price));
       if (p <= 0) p = parseNum(firstVar.price);
       if (p > 0) return p;
    }
    
    // Check old style variants array
    const variants = product?.variants || product?.variations || product?.varients || product?.variant || [];
    if (variants.length > 0) {
      const firstVar = variants[0];
      if (typeof firstVar === 'object' && firstVar.value) {
        p = userRole === 'dealer' ? (parseNum(firstVar.wholesalePrice) || parseNum(firstVar.dealerPrice)) : (parseNum(firstVar.retailPrice) || parseNum(firstVar.price));
        if (p <= 0) p = parseNum(firstVar.price);
        if (p > 0) return p;
      }
    }
    
    // Fallback to standard base price if no variants
    p = userRole === 'dealer' ? parseNum(product?.dealerPrice) : parseNum(product?.retailPrice);
    if (p <= 0) p = parseNum(product?.price);
    return p;
  };
  
  const price = getCardPrice();
  
  const categoryObj = product?.category?.[0] || product?.categoryName || 'Item';
  const category = sanitizeData(categoryObj, 'Item');
  
  const image = getImageUrl(
    product?.image || 
    product?.images || 
    product?.thumbnail || 
    product?.img || 
    product?.imageUrl || 
    product?.imagePath || 
    product?.pic || 
    product?.photo
  );

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: isDarkMode ? '#000' : '#E2E8F0' },
        style
      ]} 
      onPress={onPress} 
      activeOpacity={0.85}
    >
      {/* Image */}
      <View style={[styles.imgWrap, { backgroundColor: theme.surface }]}>
        <Image source={{ uri: image }} style={styles.img} resizeMode="cover" />
        <TouchableOpacity 
          style={[styles.wishBtn, { backgroundColor: isDarkMode ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)' }]} 
          onPress={() => product && toggleWishlist(product)}
        >
          <HeartIcon 
            size={14} 
            color={wishlisted ? theme.error : theme.textSecondary} 
            filled={wishlisted} 
          />
        </TouchableOpacity>
      </View>

      {/* Details */}
      <View style={styles.body}>
        <Text style={[styles.category, { color: theme.textSecondary }]} numberOfLines={1}>{category}</Text>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>{name}</Text>
        <View style={styles.footer}>
          <Text style={[styles.price, { color: theme.primary }]}>₹{price.toLocaleString()}</Text>
          <TouchableOpacity onPress={onAddToCart}>
            <FrameIcon size={30} color={theme.primary} />
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
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 3,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  imgWrap: {
    width: '100%',
    height: 120,
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
    fontWeight: '600',
    marginBottom: 2,
    fontFamily: FONTS.family,
  },
  name: {
    fontFamily: FONTS.family,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 14,
    marginBottom: 6,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontFamily: FONTS.family,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 16,
  },
});
