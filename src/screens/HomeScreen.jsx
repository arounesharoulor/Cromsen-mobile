import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ImageBackground,
  ActivityIndicator,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FONTS, THEME_COLORS, SPACING } from '../styling';

import { Search, Menu, Star, MapPin, Bell } from 'lucide-react-native';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';

import { productService, categoryService, getImageUrl, sanitizeData } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { LogoIcon, BoldPlusIcon, CategoryIcon, CartIcon } from '../components/CustomIcons';
import ProductCard from '../components/ProductCard';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const CARD_W = (width - 40 - 12) / 2;

// Cromsen categories matching the exact Figma icon style
const STATIC_CATEGORIES = [
  { id: 'all', label: 'All', image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&q=80&w=200', active: true },
  { id: 'honeycomb', label: 'Honeycomb', image: 'https://images.unsplash.com/photo-1505691938895-1758d7eaa511?auto=format&fit=crop&q=80&w=200' },
  { id: 'curtains', label: 'Curtains', image: 'https://images.unsplash.com/photo-1585412727339-54e4bae3bbf9?auto=format&fit=crop&q=80&w=200' },
  { id: 'pvc', label: 'PVC Door', image: 'https://images.unsplash.com/photo-1506332809294-8481d5f30730?auto=format&fit=crop&q=80&w=200' },
  { id: 'blinds', label: 'Blinds', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=200' },
  { id: 'flooring', label: 'Flooring', image: 'https://images.unsplash.com/photo-1615971677499-5467cbab01c0?auto=format&fit=crop&q=80&w=200' },
  { id: 'wallpaper', label: 'Wallpaper', image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&q=80&w=200' },
  { id: 'acoustic', label: 'Acoustic', image: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&q=80&w=200' },
];

const BANNER_DATA = [
  {
    id: 1,
    title: "Premium\nFurniture for\nYour Home",
    tag: "NEW COLLECTION",
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 2,
    title: "Modern\nInteriors for\nComfort",
    tag: "BEST SELLER",
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 3,
    title: "Exclusive\nDeals for\nYou",
    tag: "LIMITED TIME",
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=1200'
  }
];

export default function HomeScreen({ navigation, route }) {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBanner, setActiveBanner] = useState(0);
  const { cartCount, addToCart } = useCart();
  const { isDarkMode, theme } = useTheme();
  const bannerRef = React.useRef(null);
  const { 
    notifications, 
    addNotification, 
    checkOrderUpdates, 
    checkProductUpdates,
    toast, 
    getIcon, 
    getBgColor, 
    toastOpacity, 
    toastY 
  } = useNotifications();

  // Show success toast when redirected from a successful payment
  useEffect(() => {
    if (route?.params?.paymentSuccess) {
      addNotification('success', 'Order Placed!', 'Payment received. Thank you for shopping.', 'Orders');
      // Clear the param so it doesn't fire again
      navigation.setParams({ paymentSuccess: undefined });
    }
  }, [route?.params?.paymentSuccess]);

  // 1. Global Order & Product Update Polling
  useEffect(() => {
    if (user) {
      const userId = user._id || user.id;
      const userEmail = user.email || '';
      
      // Initial check
      checkOrderUpdates(userId, userEmail);
      checkProductUpdates();
      
      // Poll every 15 seconds for near-instant updates
      const pollInterval = setInterval(() => {
        checkOrderUpdates(userId, userEmail);
        checkProductUpdates();
        silentRefresh();
      }, 15000);

      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [user, checkOrderUpdates, checkProductUpdates]);

  // 2. Auto-scroll for Banner
  useEffect(() => {
    const bannerTimer = setInterval(() => {
      setActiveBanner(prev => {
        const nextIndex = (prev + 1) % BANNER_DATA.length;
        bannerRef.current?.scrollTo({ x: nextIndex * (width - 40), animated: true });
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(bannerTimer);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cats, prods, trendingProds] = await Promise.all([
        categoryService.getCategories(),
        productService.getProducts({ limit: 8 }),
        productService.getProducts({ category: 'Trending Now', limit: 4 }),
      ]);
      setCategories(Array.isArray(cats) ? cats : cats.data || []);
      
      const list = prods.products || prods.data || (Array.isArray(prods) ? prods : []);
      setProducts(list);

      const trendingList = trendingProds.products || trendingProds.data || (Array.isArray(trendingProds) ? trendingProds : []);
      // Fallback: if no products in Trending Now category, use a slice of general products
      setTrendingProducts(trendingList.length > 0 ? trendingList : list.slice(3, 7));
    } finally {
      setLoading(false);
    }
  };

  const silentRefresh = async () => {
    try {
      const [prods, trendingProds] = await Promise.all([
        productService.getProducts({ limit: 8 }),
        productService.getProducts({ category: 'Trending Now', limit: 4 }),
      ]);
      const list = prods.products || prods.data || (Array.isArray(prods) ? prods : []);
      if (list.length > 0) setProducts(list);

      const trendingList = trendingProds.products || trendingProds.data || (Array.isArray(trendingProds) ? trendingProds : []);
      if (trendingList.length > 0) setTrendingProducts(trendingList);
    } catch (e) { console.warn('Background refresh failed', e); }
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
      <ActivityIndicator size="large" color={theme.secondary} />
    </View>
  );


  const renderStars = (rating = 4.5) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={10} color="#FFB800" fill={s <= Math.floor(rating) ? '#FFB800' : 'none'} />
      ))}
      <Text style={styles.ratingTxt}> {rating}</Text>
    </View>
  );

  // Use backend categories or fallback to static if loading fails
  const displayCategories = categories.length > 0 
    ? categories.map(c => ({
        id: c._id || c.id,
        label: sanitizeData(c.name || c.label, 'Category'),
        image: c.image || c.thumbnail,
        emoji: '📦'
      }))
    : STATIC_CATEGORIES;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.surface} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* ── HEADER ── */}
        <View style={[styles.headerContainer, { backgroundColor: theme.surface, shadowColor: isDarkMode ? '#000' : '#E2E8F0' }]}>
          <View style={styles.headerTop}>
            <LogoIcon size={44} />
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.headerIconBtn, { backgroundColor: isDarkMode ? '#2C3E50' : '#F8FAFC', borderRadius: 12 }]}
                onPress={() => navigation.navigate('Notifications')}
              >
                <Bell color={theme.text} size={24} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.secondary }]}><Text style={styles.badgeTxt}>{String(notifications.filter(n => !n.read).length)}</Text></View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.searchBar, { backgroundColor: theme.background, borderColor: theme.border }]}
            onPress={() => navigation.navigate('Search')}
            activeOpacity={0.85}
          >
            <Search color={theme.textSecondary} size={18} />
            <Text style={[styles.searchHint, { color: theme.textSecondary }]}>Search for Products...</Text>
          </TouchableOpacity>
        </View>

        {/* ── MAIN SCROLL ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollBody, { backgroundColor: theme.background }]}
          showsVerticalScrollIndicator={false}
        >
          {/* HERO BANNER CAROUSEL */}
          <View style={styles.carouselWrapper}>
            <ScrollView
              ref={bannerRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / (width - 40));
                setActiveBanner(index);
              }}
            >
              {BANNER_DATA.map((item, index) => (
                <View key={item.id ? `${item.id}-${index}` : index} style={{ width: width - 40, height: 200 }}>
                  <Image
                    source={{ uri: item.image }}
                    style={[styles.heroBanner, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}
                    resizeMode="cover"
                  />
                  <View style={styles.heroOverlay}>
                    <View style={styles.heroTag}>
                      <Text style={styles.heroTagTxt}>{item.tag}</Text>
                    </View>
                    <Text style={styles.heroTitle}>{item.title}</Text>
                    <TouchableOpacity
                      style={styles.heroBtn}
                      onPress={() => navigation.navigate('Search')}
                    >
                      <Text style={styles.heroBtnTxt}>Shop Now →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* PAGINATION DOTS (Inside the card area) */}
            <View style={styles.paginationRow}>
              {BANNER_DATA.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    activeBanner === i && styles.dotActive
                  ]}
                />
              ))}
            </View>
          </View>

          {/* ── BEST SELLERS ── */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Best Sellers</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AllProducts', { title: 'Best Sellers', category: 'Best Sellers' })}>
                <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color={THEME_COLORS.primary} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.bsScroll}
              >
                {products.slice(0, 5).map((p, index) => (
                  <ProductCard
                    key={p._id || p.id ? `${p._id || p.id}-${index}` : index}
                    product={p}
                    style={{ marginRight: 14 }}
                    onPress={() => navigation.navigate('ProductDetail', { productId: p._id || p.id })}
                    onAddToCart={() => {
                      const finalPrice = user?.role?.toLowerCase() === 'dealer'
                        ? (typeof p.dealerPrice === 'number' ? p.dealerPrice : p.price || 0)
                        : (typeof p.retailPrice === 'number' ? p.retailPrice : p.price || 0);
                      addToCart({
                        id: p._id || p.id,
                        name: p.name,
                        price: typeof finalPrice === 'number' ? finalPrice : (parseFloat(finalPrice) || 0),
                        priceSource: 'homeList',
                        image: getImageUrl(p.image || p.thumbnail || p.img || (p.images && p.images[0])),
                        installationRatePerSqFt: parseFloat(p.installationRatePerSqFt || p.installationRatePerSqft || p.installationPricePerSqft || p.installationPerSqFt || p.installationRate || 0) || 0,
                        baseInstallationPrice: parseFloat(p.installationPrice || p.installationFee || p.installationCost || 0) || 0,
                      }, 1);
                      addNotification('cart', 'Added to Cart', `${p.name} added successfully!`, 'Cart');
                    }}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          {/* ── CATEGORIES (Switch Tabs) ── */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Category</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Category')}>
                <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catScroll}
            >
              {displayCategories.map((cat, index) => (
                <TouchableOpacity
                  key={cat.id ? `${cat.id}-${index}` : index}
                  style={styles.catItem}
                  onPress={() => {
                    if (cat.id === 'all') {
                      navigation.navigate('AllProducts', { title: 'All Products' });
                    } else {
                      navigation.navigate('AllProducts', { title: cat.label, category: cat.label, categoryId: cat.id });
                    }
                  }}
                >
                  <View style={[
                    styles.catIconBox,
                    activeCategory === cat.id && styles.catIconBoxActive,
                  ]}>
                    {cat.image ? (
                      <Image 
                        source={{ uri: getImageUrl(cat.image) }} 
                        style={styles.catImage} 
                        resizeMode="cover"
                      />
                    ) : (
                      <CategoryIcon size={24} color={activeCategory === cat.id ? THEME_COLORS.surface : THEME_COLORS.textSecondary} />
                    )}
                  </View>
                  <Text style={[
                    styles.catLabel,
                    activeCategory === cat.id && styles.catLabelActive,
                  ]} numberOfLines={1}>
                    {typeof cat.label === 'object' ? cat.label.name : cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── TRENDING NOW (Banner Style) ── */}
          <View style={[styles.section, { marginBottom: 32 }]}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Trending Now</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AllProducts', { title: 'Trending Now', category: 'Trending Now' })}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color={THEME_COLORS.primary} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.bsScroll}
              >
                {trendingProducts.map((p, index) => {
                  const pPrice = user?.role?.toLowerCase() === 'dealer'
                    ? (typeof p.dealerPrice === 'number' ? p.dealerPrice : p.price || 0)
                    : (typeof p.retailPrice === 'number' ? p.retailPrice : p.price || 0);
                  return (
                    <TouchableOpacity
                      key={p._id || p.id ? `${p._id || p.id}-${index}` : index}
                      style={[styles.bsCard, { width: width * 0.75, height: 200, paddingVertical: 0, overflow: 'hidden' }]}
                      onPress={() => navigation.navigate('ProductDetail', { productId: p._id || p.id })}
                    >
                      <Image
                        source={{ uri: getImageUrl(p.image || (p.images && p.images[0]) || p.thumbnail || p.img || p.imageUrl) }}
                        style={{ width: '100%', height: '100%', borderRadius: 12, position: 'absolute' }}
                        resizeMode="cover"
                      />
                        <View style={[styles.heroOverlay, { backgroundColor: 'transparent', borderRadius: 12, padding: 15 }]}>
                          <View style={{ backgroundColor: 'rgba(255,255,255,0.85)', padding: 10, borderRadius: 10, alignSelf: 'flex-start' }}>
                            <Text style={[styles.heroTitle, { fontSize: 16, color: THEME_COLORS.text, marginBottom: 4 }]}>
                              {sanitizeData(p.name, 'Product')}
                            </Text>
                            <Text style={[styles.heroBtnTxt, { fontSize: 13, color: '#1E3C83' }]}>₹{pPrice?.toLocaleString()}</Text>
                          </View>
                        </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 150,
    backgroundColor: THEME_COLORS.surface,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingStart: 16,
    paddingTop: 26,
    paddingEnd: 16,
    paddingBottom: 20,
    shadowColor: THEME_COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    justifyContent: 'flex-start',
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoRow: {
    alignItems: 'center', justifyContent: 'center',
  },
  headerLogo: {
    width: 140, height: 40,
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerIconBtn: { position: 'relative', width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  badge: {
    position: 'absolute', top: 2, right: 2,
    width: 15, height: 15, borderRadius: 8,
    backgroundColor: THEME_COLORS.secondary,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeTxt: { color: THEME_COLORS.surface, fontSize: 8, fontWeight: '900', fontFamily: FONTS.family },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME_COLORS.surface,
    borderRadius: 24,
    height: 48,
    paddingHorizontal: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
  },
  searchHint: { color: THEME_COLORS.textSecondary, fontSize: 14, fontWeight: '500', fontFamily: FONTS.family },
  scroll: { flex: 1 },
  scrollBody: { backgroundColor: THEME_COLORS.background, paddingBottom: 110 },
  carouselWrapper: {
    marginTop: 20,
    marginBottom: 24,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    height: 200,
    position: 'relative',
    backgroundColor: THEME_COLORS.surface,
    elevation: 5,
    shadowColor: THEME_COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  heroBanner: {
    width: width - 40,
    height: 200,
    backgroundColor: 'transparent',
  },
  heroBannerImg: { borderRadius: 0 },
  paginationRow: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    width: 14,
    backgroundColor: THEME_COLORS.surface,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12,24,33,0.50)',
    padding: 20,
    justifyContent: 'center',
  },
  heroTag: {
    backgroundColor: THEME_COLORS.secondary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  heroTagTxt: { color: THEME_COLORS.surface, fontSize: 9, fontWeight: '900', letterSpacing: 1, fontFamily: FONTS.family },
  heroTitle: { color: THEME_COLORS.surface, fontSize: 24, fontWeight: '900', lineHeight: 30, marginBottom: 12, fontFamily: FONTS.family },
  heroBtn: {
    backgroundColor: THEME_COLORS.secondary,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 10, alignSelf: 'flex-start',
  },
  heroBtnTxt: { color: THEME_COLORS.surface, fontWeight: '900', fontSize: 12, fontFamily: FONTS.family },
  section: { marginBottom: 22 },
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: THEME_COLORS.text, fontFamily: FONTS.family },
  seeAll: { fontSize: 13, color: THEME_COLORS.primary, fontWeight: '700', fontFamily: FONTS.family },
  catScroll: { paddingLeft: 20, paddingRight: 8 },
  catItem: { 
    alignItems: 'center', 
    marginRight: 14, 
    width: 110, 
    height: 131,
    justifyContent: 'flex-start',
    gap: 3,
  },
  catIconBox: {
    width: 110, height: 104, borderRadius: 12,
    backgroundColor: THEME_COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1, borderColor: '#F2F2F2',
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10,
  },
  catIconBoxActive: {
    borderColor: THEME_COLORS.primary,
    borderWidth: 2,
  },
  catImage: { width: '100%', height: '100%' },
  catEmoji: { fontSize: 32 },
  catLabel: { fontSize: 13, fontWeight: '700', color: THEME_COLORS.primary, textAlign: 'center', fontFamily: FONTS.family },
  catLabelActive: { fontWeight: '900' },
  bsScroll: { paddingLeft: 20, paddingRight: 8, paddingBottom: 10 },
  bsCard: {
    width: 157,
    height: 189,
    marginRight: 14,
    backgroundColor: THEME_COLORS.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: THEME_COLORS.text,
    paddingVertical: 5,
    paddingHorizontal: 0,
    shadowColor: THEME_COLORS.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  bsImgWrap: { position: 'relative', width: '100%', height: 110 },
  bsImg: { width: '100%', height: '100%', borderRadius: 10, resizeMode: 'cover' },
  heartBtn: {
    position: 'absolute', top: 6, right: 6,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center', alignItems: 'center',
  },
  bsInfo: { paddingHorizontal: 4, paddingVertical: 4, flex: 1, justifyContent: 'space-between' },
  categoryLabel: { fontSize: 10, color: THEME_COLORS.textSecondary, fontWeight: '500', fontFamily: FONTS.family },
  bsName: { fontSize: 12, fontWeight: '700', color: THEME_COLORS.text, marginVertical: 1, fontFamily: FONTS.family },
  bsBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bsPrice: { fontSize: 14, fontWeight: '900', color: THEME_COLORS.primary, fontFamily: FONTS.family },
  addIconBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: THEME_COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  addIconTxt: { color: THEME_COLORS.surface, fontSize: 18, fontWeight: '700', marginTop: -1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12 },
  gridCard: {
    width: CARD_W, backgroundColor: THEME_COLORS.surface,
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: THEME_COLORS.border,
  },
  gridImgWrap: { position: 'relative' },
  gridImg: { width: '100%', height: 128, resizeMode: 'cover' },
  gridHeart: {
    position: 'absolute', top: 8, right: 8,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center', alignItems: 'center',
  },
  gridInfo: { padding: 10 },
  gridName: { fontSize: 13, fontWeight: '800', color: THEME_COLORS.text, marginBottom: 3, fontFamily: FONTS.family },
  gridPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  gridPrice: { fontSize: 14, fontWeight: '900', color: THEME_COLORS.primary, fontFamily: FONTS.family },
  gridAddBtn: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: THEME_COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  gridAddTxt: { color: THEME_COLORS.surface, fontSize: 16, fontWeight: '900', marginTop: -1 },

  successToast: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    zIndex: 9999,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    borderRadius: 16,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  successLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  successCheckCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '900',
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
  },
  successSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  closeToastBtn: {
    padding: 8,
    marginLeft: 10,
  },
  closeToastTxt: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    opacity: 0.8,
  },
});
