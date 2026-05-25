import React from 'react';
import {
  StyleSheet, Text, View, FlatList, Image, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag, Trash2, ArrowLeft } from 'lucide-react-native';
import { THEME_COLORS } from '../theme';
import { EmptyState, AppButton } from '../components';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useNotifications } from '../context/NotificationContext';
import { getImageUrl, sanitizeData } from '../services/api';
import { BackIcon, HeartIcon } from '../components/CustomIcons';
import { useAuth } from '../context/AuthContext';

export default function WishlistScreen({ navigation }) {
  const { wishlistItems, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase();

  const getRolePrice = (i) => {
    if (userRole === 'dealer') {
      return typeof i.dealerPrice === 'number' ? i.dealerPrice : i.price || 0;
    }
    return typeof i.retailPrice === 'number' ? i.retailPrice : i.price || 0;
  };

  const moveToCart = (item) => {
    const finalPrice = getRolePrice(item);
    addToCart({
      id: item.id,
      name: item.name,
      price: typeof finalPrice === 'number' ? finalPrice : (parseFloat(finalPrice) || 0),
      priceSource: 'wishlist',
      image: item.image,
      variant: '',
      installationRatePerSqFt: parseFloat(item.installationRatePerSqFt || item.installationRatePerSqft || item.installationPricePerSqft || item.installationPerSqFt || item.installationRate || 0) || 0,
      baseInstallationPrice: parseFloat(item.installationPrice || item.installationFee || item.installationCost || 0) || 0,
    }, 1);
    addNotification('cart', 'Added to Cart', `${item.name} moved to cart!`, 'Cart');
    removeFromWishlist(item.id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={THEME_COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wishlist</Text>
        <Text style={styles.count}>{wishlistItems.length} items</Text>
      </View>

      {wishlistItems.length === 0 ? (
        <EmptyState
          icon={<HeartIcon size={52} color={THEME_COLORS.border} />}
          title="Your wishlist is empty"
          subtitle="Save items you love and come back to them anytime."
          action={
            <AppButton
              title="Explore Products"
              onPress={() => navigation.navigate('HomeTab')}
              size="md"
            />
          }
        />
      ) : (
        <FlatList
          data={wishlistItems}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeFromWishlist(item.id)}
              >
                <Trash2 size={14} color={THEME_COLORS.error} />
              </TouchableOpacity>
              <Image
                source={{ uri: getImageUrl(item.image) }}
                style={styles.img}
                resizeMode="cover"
              />
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={2}>{sanitizeData(item.name, 'Product')}</Text>
                <Text style={styles.price}>₹{getRolePrice(item)?.toLocaleString()}</Text>
                <TouchableOpacity style={styles.cartBtn} onPress={() => moveToCart(item)}>
                  <ShoppingBag size={13} color="#FFF" />
                  <Text style={styles.cartBtnTxt}>Add to Cart</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME_COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: THEME_COLORS.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: THEME_COLORS.primary },
  count: { fontSize: 13, color: THEME_COLORS.textSecondary, fontWeight: '600' },

  list: { padding: 16, paddingBottom: 110 },
  row: { justifyContent: 'space-between', marginBottom: 16 },

  card: {
    width: '48%', backgroundColor: '#FFF',
    borderRadius: 12, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#000000',
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 5,
  },
  removeBtn: {
    position: 'absolute', top: 8, right: 8, zIndex: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center', alignItems: 'center',
  },
  img: { width: '100%', height: 120, backgroundColor: '#F3F4F6' },
  info: { padding: 10 },
  name: { fontSize: 12, fontWeight: '700', color: THEME_COLORS.text, marginBottom: 4, lineHeight: 16 },
  price: { fontSize: 14, fontWeight: '900', color: THEME_COLORS.primary, marginBottom: 8 },
  cartBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: THEME_COLORS.secondary, borderRadius: 8, paddingVertical: 7,
  },
  cartBtnTxt: { color: '#FFF', fontSize: 11, fontWeight: '800' },
});
