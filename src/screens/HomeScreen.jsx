import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../theme';
import { ShoppingCart, Search, Menu, Bell, Star, MapPin } from 'lucide-react-native';

import { productService, categoryService, getImageUrl, sanitizeData } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { LogoIcon, BoldPlusIcon, CategoryIcon } from '../components/CustomIcons';
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
    title: "Beautiful\nFurniture for\nyour Home",
    tag: "NEW COLLECTION",
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=900'
  },
  {
    id: 2,
    title: "Modern\nInteriors for\nComfort",
    tag: "BEST SELLER",
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=900'
  },
  {
    id: 3,
    title: "Exclusive\nDeals for\nYou",
    tag: "LIMITED TIME",
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=900'
  }
];

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBanner, setActiveBanner] = useState(0);
  const { cartCount, addToCart } = useCart();
  const bannerRef = React.useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      let nextSlide = activeBanner + 1;
      if (nextSlide >= BANNER_DATA.length) nextSlide = 0;
      
      bannerRef.current?.scrollTo({
        x: nextSlide * (width - 40),
        animated: true,
      });
      setActiveBanner(nextSlide);
    }, 4000);

    return () => clearInterval(timer);
  }, [activeBanner]);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cats, prods] = await Promise.all([
        categoryService.getCategories(),
        productService.getProducts({ limit: 8 }),
      ]);
      setCategories(Array.isArray(cats) ? cats : cats.data || []);
      const list = prods.products || prods.data || (Array.isArray(prods) ? prods : []);
      setProducts(list);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }}>
      <ActivityIndicator size="large" color={COLORS.secondary} />
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
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* ── HEADER ── */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
            <View>
              <LogoIcon size={44} />
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerIconBtn}>
                <Bell color={COLORS.text} size={20} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => navigation.navigate('Cart')}
              >
                <ShoppingCart color={COLORS.text} size={20} />
                {cartCount > 0 && (
                  <View style={styles.badge}><Text style={styles.badgeTxt}>{cartCount}</Text></View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate('Search')}
            activeOpacity={0.85}
          >
            <Search color={COLORS.textSecondary} size={18} />
            <Text style={styles.searchHint}>Search for Products...</Text>
          </TouchableOpacity>
        </View>

        {/* ── MAIN SCROLL ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollBody}
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
              {BANNER_DATA.map((item) => (
                <View key={item.id} style={{ width: width - 40 }}>
                  <ImageBackground
                    source={{ uri: item.image }}
                    style={styles.heroBanner}
                    imageStyle={styles.heroBannerImg}
                  >
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
                  </ImageBackground>
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
              <Text style={styles.sectionTitle}>Best Sellers</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AllProducts', { title: 'Best Sellers', category: 'Best Sellers' })}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.bsScroll}
              >
                {products.slice(0, 5).map((p) => (
                  <ProductCard
                    key={p._id || p.id}
                    product={p}
                    style={{ marginRight: 14 }}
                    onPress={() => navigation.navigate('ProductDetail', { productId: p._id || p.id })}
                    onAddToCart={() => addToCart({
                      id: p._id || p.id,
                      name: p.name,
                      price: p.price || 0,
                      image: getImageUrl(p.image || p.thumbnail || p.img || (p.images && p.images[0]))
                    }, 1)}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          {/* ── CATEGORIES (Switch Tabs) ── */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Category</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Category')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catScroll}
            >
              {displayCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
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
                      <CategoryIcon size={24} color={activeCategory === cat.id ? '#FFF' : COLORS.textSecondary} />
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
              <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.bsScroll}
              >
                {products.slice(3, 7).map((p) => (
                  <TouchableOpacity
                    key={p._id || p.id}
                    style={[styles.bsCard, { width: width * 0.75, height: 200, paddingVertical: 0 }]}
                    onPress={() => navigation.navigate('ProductDetail', { productId: p._id || p.id })}
                  >
                    <ImageBackground
                      source={{ uri: getImageUrl(p.image || p.thumbnail || p.img || (p.images && p.images[0])) }}
                      style={{ width: '100%', height: '100%' }}
                      imageStyle={{ borderRadius: 12 }}
                    >
                      <View style={[styles.heroOverlay, { backgroundColor: 'transparent', borderRadius: 12, padding: 15 }]}>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.85)', padding: 10, borderRadius: 10, alignSelf: 'flex-start' }}>
                          <Text style={[styles.heroTitle, { fontSize: 16, color: COLORS.text, marginBottom: 4 }]}>
                            {sanitizeData(p.name, 'Product')}
                          </Text>
                          <Text style={[styles.heroBtnTxt, { fontSize: 13, color: COLORS.secondary }]}>₹{p.price?.toLocaleString()}</Text>
                        </View>
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                ))}
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
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingStart: 16,
    paddingTop: 26,
    paddingEnd: 16,
    paddingBottom: 20,
    shadowColor: '#000000',
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
    backgroundColor: COLORS.secondary,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeTxt: { color: '#FFF', fontSize: 8, fontWeight: '900' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    height: 48,
    paddingHorizontal: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchHint: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500' },
  scroll: { flex: 1 },
  scrollBody: { backgroundColor: COLORS.background, paddingBottom: 110 },
  carouselWrapper: {
    marginTop: 20,
    marginBottom: 24,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    height: 180,
    position: 'relative',
    backgroundColor: COLORS.surface,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  heroBanner: {
    width: width - 40,
    height: 180,
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
    backgroundColor: '#FFFFFF',
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12,24,33,0.50)',
    padding: 30,
    justifyContent: 'center',
  },
  heroTag: {
    backgroundColor: COLORS.secondary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  heroTagTxt: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', lineHeight: 32, marginBottom: 16 },
  heroBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 10, alignSelf: 'flex-start',
  },
  heroBtnTxt: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  section: { marginBottom: 22 },
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: COLORS.text },
  seeAll: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
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
    backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1, borderColor: '#F2F2F2',
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10,
  },
  catIconBoxActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  catImage: { width: '100%', height: '100%' },
  catEmoji: { fontSize: 32 },
  catLabel: { fontSize: 13, fontWeight: '700', color: COLORS.primary, textAlign: 'center' },
  catLabelActive: { fontWeight: '900' },
  bsScroll: { paddingLeft: 20, paddingRight: 8, paddingBottom: 10 },
  bsCard: {
    width: 157,
    height: 189,
    marginRight: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#000000',
    paddingVertical: 5,
    paddingHorizontal: 0,
    shadowColor: '#000000',
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
  categoryLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '500' },
  bsName: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginVertical: 1 },
  bsBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bsPrice: { fontSize: 14, fontWeight: '900', color: COLORS.primary },
  addIconBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#004694',
    justifyContent: 'center', alignItems: 'center',
  },
  addIconTxt: { fontSize: 18, color: '#FFFFFF', fontWeight: '700', marginTop: -1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12 },
  gridCard: {
    width: CARD_W, backgroundColor: '#FFFFFF',
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
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
  gridName: { fontSize: 13, fontWeight: '800', color: COLORS.text, marginBottom: 3 },
  gridPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  gridPrice: { fontSize: 14, fontWeight: '900', color: COLORS.primary },
  gridAddBtn: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center', alignItems: 'center',
  },
  gridAddTxt: { color: '#FFF', fontSize: 16, fontWeight: '900', marginTop: -1 },
});
