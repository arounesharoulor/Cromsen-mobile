import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Image, 
  ActivityIndicator, TextInput, Dimensions, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, ChevronRight } from 'lucide-react-native';
import { THEME_COLORS } from '../theme';
import { LoadingState, ErrorState, EmptyState } from '../components';
import { categoryService, productService, getImageUrl, sanitizeData } from '../services/api';
import { CategoryIcon, BoldPlusIcon, OtherMachineriesIcon, PvcDoorsIcon, UmbrellaIcon, UpvcHardwareIcon, UpvcToolsIcon, HoneycombIcon, MagicScreenIcon, CurtainsIcon, MosquitoIcon, FencingIcon, BalconyIcon, PvcCurtainIcon, PleatedIcon, CabinetHingesIcon } from '../components/CustomIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

// Map category name keywords → icon component
const getCategoryIcon = (name, color, size = 20) => {
  const n = (name || '').toLowerCase();
  if (n.includes('upvc hardware') || n.includes('upvc hardwares')) return <UpvcHardwareIcon size={size} color={color} />;
  if (n.includes('upvc tool') || n.includes('tool')) return <UpvcToolsIcon size={size} color={color} />;
  if (n.includes('pvc door') || n.includes('door')) return <PvcDoorsIcon size={size} color={color} />;
  if (n.includes('pvc curtain') || n.includes('pvccurtain')) return <PvcCurtainIcon size={size} color={color} />;
  if (n.includes('honeycomb')) return <HoneycombIcon size={size} color={color} />;
  if (n.includes('magic screen') || n.includes('magicscreen')) return <MagicScreenIcon size={size} color={color} />;
  if (n.includes('curtain')) return <CurtainsIcon size={size} color={color} />;
  if (n.includes('blind')) return <PleatedIcon size={size} color={color} />;
  if (n.includes('mosquito') || n.includes('net')) return <MagicScreenIcon size={size} color={color} />;
  if (n.includes('fencing') || n.includes('fence')) return <FencingIcon size={size} color={color} />;
  if (n.includes('balcony')) return <BalconyIcon size={size} color={color} />;
  if (n.includes('pleated')) return <PleatedIcon size={size} color={color} />;
  if (n.includes('cabinet hinge') || n.includes('hinge')) return <CabinetHingesIcon size={size} color={color} />;
  if (n.includes('umbrella')) return <UmbrellaIcon size={size} color={color} />;
  if (n.includes('machin') || n.includes('other')) return <OtherMachineriesIcon size={size} color={color} />;
  return <CategoryIcon size={size} color={color} />;
};

export default function CategoryScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const { isDarkMode, theme } = useTheme();
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase();

  useFocusEffect(
    React.useCallback(() => {
      fetchCats();
    }, [])
  );

  const fetchCats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoryService.getCategories();
      const cats = Array.isArray(data) ? data : data.data || [];
      setCategories(cats);
      if (cats.length > 0 && !selectedCat) {
        setSelectedCat(cats[0]);
        fetchProducts(cats[0]._id || cats[0].id);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (catId) => {
    try {
      setDetailLoading(true);
      const data = await productService.getProducts({ category: catId });
      const list = Array.isArray(data) ? data : data.data || data.products || [];
      setProducts(list);
    } catch (e) {
      console.warn('Failed to fetch products for category:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSelectCat = (cat) => {
    setSelectedCat(cat);
    fetchProducts(cat._id || cat.id);
  };

  const navigateToAll = () => {
    if (!selectedCat) return;
    navigation.navigate('AllProducts', {
      title: selectedCat.name,
      category: selectedCat.name,
      categoryId: selectedCat._id || selectedCat.id,
    });
  };

  if (loading) return (
    <View style={[styles.centerLoading, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={theme.secondary} size="large" />
      <Text style={[styles.loadingTxt, { color: theme.textSecondary }]}>Loading categories...</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.surface} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        
        {/* Search Header */}
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <View style={[styles.searchBar, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Search size={18} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Type to Search..."
              placeholderTextColor={theme.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        <View style={styles.main}>
          {/* Sidebar */}
          <View style={[styles.sidebar, { backgroundColor: theme.surface, borderRightColor: theme.border }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
              {categories.map((cat) => {
                const catId = cat._id || cat.id;
                const selId = selectedCat?._id || selectedCat?.id;
                const isActive = catId && selId && catId === selId;
                return (
                  <TouchableOpacity
                    key={cat._id || cat.id}
                    style={[styles.sideItem, isActive && { backgroundColor: isDarkMode ? '#2C3E50' : '#EFF6FF' }]}
                    onPress={() => handleSelectCat(cat)}
                  >
                    {isActive && <View style={[styles.activeIndicator, { backgroundColor: theme.secondary }]} />}
                    <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' }]}>
                       {getCategoryIcon(
                        sanitizeData(cat.name, ''),
                        isActive ? theme.secondary : theme.primary,
                        20
                      )}
                    </View>
                    <Text style={[styles.sideLabel, { color: isActive ? theme.secondary : theme.textSecondary, fontWeight: isActive ? '900' : '700' }]} numberOfLines={2}>
                      {sanitizeData(cat.name || cat.label || cat.title, 'Category')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Content Area */}
          <View style={[styles.content, { backgroundColor: theme.background }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {selectedCat && (
                <>
                  {/* Category Banner */}
                  <TouchableOpacity style={styles.banner} onPress={navigateToAll}>
                    <Image 
                      source={{ uri: getImageUrl(selectedCat.image || 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15') }} 
                      style={styles.bannerImg} 
                    />
                    <View style={styles.bannerOverlay}>
                      <Text style={styles.bannerText}>New {selectedCat.name || selectedCat.label || selectedCat.title || ''} Collection</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Section Title */}
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{selectedCat.name || selectedCat.label || selectedCat.title || 'Products'}</Text>
                  </View>

                  {/* Products Grid */}
                  {detailLoading ? (
                    <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} />
                  ) : products.length > 0 ? (
                    <View style={styles.grid}>
                      {products.map((p, idx) => {
                        const pPrice = userRole === 'dealer'
                          ? (typeof p.dealerPrice === 'number' ? p.dealerPrice : p.price || 0)
                          : (typeof p.retailPrice === 'number' ? p.retailPrice : p.price || 0);
                        return (
                          <TouchableOpacity 
                            key={p._id || p.id || idx} 
                            style={styles.gridItem}
                            onPress={() => navigation.navigate('ProductDetail', { productId: p._id || p.id })}
                          >
                            <Image source={{ uri: getImageUrl(p.image || (p.images && p.images[0]) || p.thumbnail || p.img || p.imageUrl || selectedCat.image) }} style={[styles.gridImg, { backgroundColor: theme.surface }]} />
                            <Text style={[styles.gridName, { color: theme.text }]} numberOfLines={2}>{sanitizeData(p.name)}</Text>
                            {(pPrice !== undefined && pPrice !== null) && (
                              <Text style={[styles.gridPrice, { color: theme.primary }]}>₹{Number(pPrice).toLocaleString()}</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={[styles.emptyTxt, { color: theme.textSecondary }]}>No items in this category</Text>
                  )}

                  {/* Popular Section */}
                  <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>POPULAR IN THIS CATEGORY</Text>
                    <TouchableOpacity onPress={navigateToAll}>
                      <Text style={[styles.viewAll, { color: theme.primary }]}>View all</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.popularScroll}>
                    {products.slice(0, 5).map((p, idx) => (
                      <TouchableOpacity 
                        key={'pop-' + (p._id || p.id || idx)} 
                        style={[styles.popItem, { backgroundColor: theme.surface }]}
                        onPress={() => navigation.navigate('ProductDetail', { productId: p._id || p.id })}
                      >
                        <Image source={{ uri: getImageUrl(p.image || (p.images && p.images[0]) || p.thumbnail || p.img || p.imageUrl || selectedCat.image) }} style={styles.popImg} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}
            </ScrollView>
          </View>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    height: 48,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: THEME_COLORS.text,
    fontWeight: '500',
  },

  main: { flex: 1, flexDirection: 'row' },

  /* Sidebar */
  sidebar: {
    width: 86,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  sideItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    paddingHorizontal: 4,
    position: 'relative',
  },
  sideItemActive: {
    backgroundColor: '#EFF6FF',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: THEME_COLORS.secondary,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    overflow: 'hidden',
  },
  sideImg: { width: '80%', height: '80%', borderRadius: 4 },
  sideLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME_COLORS.textSecondary,
    textAlign: 'center',
  },
  sideLabelActive: {
    color: THEME_COLORS.secondary,
  },

  /* Content */
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 220,
  },
  banner: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
  },
  bannerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME_COLORS.text,
  },
  viewAll: {
    fontSize: 11,
    color: THEME_COLORS.primary,
    fontWeight: '700',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: 16,
  },
  gridImg: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  gridName: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME_COLORS.text,
    marginTop: 6,
    textAlign: 'center',
  },
  gridPrice: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME_COLORS.primary,
    marginTop: 2,
    textAlign: 'center',
  },

  popularScroll: {
    flexDirection: 'row',
  },
  popItem: {
    width: 85,
    height: 85,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  popImg: {
    width: '100%',
    height: '100%',
  },

  emptyTxt: {
    textAlign: 'center',
    color: THEME_COLORS.textSecondary,
    fontSize: 12,
    marginTop: 20,
  },

  /* Simulated Tab Bar */
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingBottom: 10,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    marginBottom: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconActive: {
    backgroundColor: THEME_COLORS.secondary,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME_COLORS.textSecondary,
  },
  tabLabelActive: {
    color: THEME_COLORS.secondary,
  },

  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  loadingTxt: { marginTop: 12, color: THEME_COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
});
