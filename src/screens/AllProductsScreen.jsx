import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  TextInput, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, SlidersHorizontal } from 'lucide-react-native';
import { THEME_COLORS } from '../theme';
import { ProductCard, EmptyState, ErrorState } from '../components';
import { productService, sanitizeData, getImageUrl } from '../services/api';
import { useCart } from '../context/CartContext';
import { useNotifications } from '../context/NotificationContext';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator } from 'react-native';
import { BackIcon } from '../components/CustomIcons';

export default function AllProductsScreen({ navigation, route }) {
  const { addToCart } = useCart();
  const { addNotification } = useNotifications();
  const { title = 'Products', category, categoryId } = route.params || {};
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('default');

  useFocusEffect(
    React.useCallback(() => {
      fetchProducts();
    }, [category, categoryId])
  );

  const applyFilter = React.useCallback(() => {
    let list = [...(products || [])];
    if (search.trim()) {

      list = list.filter(p => sanitizeData(p.name).toLowerCase().includes(search.toLowerCase()));
    }
    if (sortBy === 'price_asc') list.sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sortBy === 'price_desc') list.sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (sortBy === 'rating') list.sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
    setFiltered(list);
  }, [search, products, sortBy]);

  useEffect(() => {
    applyFilter();
  }, [applyFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      let params = {};
      // Use 'category' as the standard parameter for filtering
      if (categoryId) params.category = categoryId;
      else if (category) params.category = category;

      let data = await productService.getProducts(params);
      let list = Array.isArray(data) ? data : data.data || data.products || [];

      // Fallback: keyword search if no results
      if (list.length === 0 && category) {
        const fallback = await productService.getProducts({ keyword: category });
        list = Array.isArray(fallback) ? fallback : fallback.data || fallback.products || [];
      }

      setProducts(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }}>
      <ActivityIndicator size="large" color={THEME_COLORS.secondary} />
    </View>
  );


  const SORT_OPTIONS = [
    { key: 'ALL', label: 'All' },
    { key: 'price_asc', label: 'Price ↓' },
    { key: 'price_desc', label: 'Price ↑' },
    { key: 'rating', label: 'Rating' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={THEME_COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>



      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color={THEME_COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search in ${title}...`}
            placeholderTextColor={THEME_COLORS.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Sort chips */}
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.sortChip, sortBy === opt.key && styles.sortChipActive]}
            onPress={() => setSortBy(opt.key)}
          >
            <Text style={[styles.sortTxt, sortBy === opt.key && styles.sortTxtActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results count */}
      {!loading && !error && (
        <Text style={styles.resultCount}>{filtered.length} products found</Text>
      )}

      {/* Content */}
      {loading ? (
        <LoadingState message="Loading products..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchProducts} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No products found"
          subtitle={search ? `No results for "${search}"` : "No products in this category yet."}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p, idx) => String(p?._id || p?.id || idx)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => navigation.navigate('ProductDetail', { productId: item._id || item.id })}
              onAddToCart={() => {
                addToCart({
                  id: item._id || item.id,
                  name: item.name,
                  price: item.price || 0,
                  image: getImageUrl(item.image || item.thumbnail || item.img || (item.images && item.images[0]))
                }, 1);
                addNotification('cart', 'Added to Cart', `${item.name} added successfully!`, 'Cart');
              }}
            />
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: THEME_COLORS.primary, flex: 1, textAlign: 'center' },

  searchRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF', borderRadius: 24, height: 48,
    paddingHorizontal: 20,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  searchInput: { flex: 1, fontSize: 14, color: THEME_COLORS.text },

  sortRow: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8,
  },
  sortChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: THEME_COLORS.border,
  },
  sortChipActive: { backgroundColor: THEME_COLORS.primary, borderColor: THEME_COLORS.primary },
  sortTxt: { fontSize: 12, fontWeight: '700', color: THEME_COLORS.textSecondary },
  sortTxtActive: { color: '#FFF' },

  resultCount: {
    paddingHorizontal: 20, fontSize: 12, color: THEME_COLORS.textSecondary,
    fontWeight: '600', marginBottom: 8,
  },

  grid: { paddingHorizontal: 16, paddingBottom: 110 },
  row: { justifyContent: 'space-between', marginBottom: 16 },
});
