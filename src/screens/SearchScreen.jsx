import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  TextInput, Keyboard, StatusBar, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X, ArrowLeft, Clock, TrendingUp } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME_COLORS } from '../theme';
import { ProductCard, LoadingState, EmptyState } from '../components';
import { productService, getImageUrl } from '../services/api';
import { useCart } from '../context/CartContext';
import { useNotifications } from '../context/NotificationContext';
import { BackIcon } from '../components/CustomIcons';
import { useAuth } from '../context/AuthContext';
import { categoryService } from '../services/api';


export default function SearchScreen({ navigation }) {
  const { addToCart } = useCart();
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [trendingKeywords, setTrendingKeywords] = useState(['Blinds', 'Honeycomb', 'Curtains', 'PVC Mesh', 'Wallpaper', 'Acoustic Panel']);
  const [allProducts, setAllProducts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    loadRecent();
    loadTrending();
    loadAllProducts();
  }, []);

  const loadAllProducts = async () => {
    try {
      const res = await productService.getProducts({ limit: 1000 });
      const list = Array.isArray(res) ? res : res.data || res.products || [];
      if (Array.isArray(list)) setAllProducts(list);
    } catch(e) {
      console.warn('Failed to load products for suggestions', e);
    }
  };

  const loadTrending = async () => {
    try {
      const cats = await categoryService.getCategories();
      const list = Array.isArray(cats) ? cats : cats.data || [];
      if (list.length > 0) {
        // Extract category names
        const keywords = list.map(c => c.name || c.label).filter(Boolean);
        
        // Deduplicate and take top 6
        const unique = [...new Set(keywords)].slice(0, 6);
        if (unique.length > 0) {
          setTrendingKeywords(unique);
        }
      }
    } catch (e) {
      console.warn('Failed to load dynamic categories', e);
    }
  };

  const loadRecent = async () => {
    try {
      const stored = await AsyncStorage.getItem('@recent_searches');
      if (stored) setRecent(JSON.parse(stored));
    } catch (_) {}
  };

  const saveRecent = async (q) => {
    const updated = [q, ...recent.filter(r => r !== q)].slice(0, 8);
    setRecent(updated);
    await AsyncStorage.setItem('@recent_searches', JSON.stringify(updated));
  };

  const clearRecent = async () => {
    setRecent([]);
    await AsyncStorage.removeItem('@recent_searches');
  };

  const handleSearch = async (q = query) => {
    const term = q.trim();
    if (!term) return;
    Keyboard.dismiss();
    setLoading(true);
    setSearched(true);
    await saveRecent(term);
    try {
      const data = await productService.searchProducts(term);
      const list = Array.isArray(data) ? data : data.data || data.products || [];
      setResults(list);
    } catch (_) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (term) => {
    setQuery(term);
    handleSearch(term);
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setResults([]);
    setSearched(false);
    inputRef.current?.focus();
  };

  const handleQueryChange = (text) => {
    setQuery(text);
    setSearched(false);
    if (text.trim().length > 0) {
      const keywords = text.toLowerCase().trim().split(/\s+/);
      
      const startsWithKeyword = (str, kw) => {
        if (!str) return false;
        const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`\\b${escapedKw}`, 'i').test(String(str));
      };

      const matches = allProducts.filter(p => {
        if (!p) return false;
        
        return keywords.every(kw => {
          const nameMatch = startsWithKeyword(p.name, kw);
          const descMatch = startsWithKeyword(p.description, kw);
          let catMatch = false;
          if (p.category) {
            if (typeof p.category === 'string') {
              catMatch = startsWithKeyword(p.category, kw);
            } else if (Array.isArray(p.category)) {
              catMatch = p.category.some(c => 
                c && (typeof c === 'string' 
                  ? startsWithKeyword(c, kw) 
                  : startsWithKeyword(c.name, kw)
                )
              );
            } else if (p.category.name) {
              catMatch = startsWithKeyword(p.category.name, kw);
            }
          }
          return nameMatch || descMatch || catMatch;
        });
      });

      // Sort matches to prioritize products that start exactly with the search query
      const exactQuery = text.toLowerCase().trim();
      matches.sort((a, b) => {
        const aStarts = a.name && String(a.name).toLowerCase().startsWith(exactQuery) ? 1 : 0;
        const bStarts = b.name && String(b.name).toLowerCase().startsWith(exactQuery) ? 1 : 0;
        return bStarts - aStarts;
      });

      // Deduplicate suggestions by ID or name
      const seen = new Set();
      const uniqueMatches = [];
      for (const p of matches) {
        const id = p._id || p.id;
        if (id && !seen.has(id)) {
          seen.add(id);
          uniqueMatches.push({
            id: id,
            name: p.name,
            image: p.image || p.thumbnail || p.img || (p.images && p.images[0])
          });
        }
      }

      setSuggestions(uniqueMatches.slice(0, 10));
    } else {
      setSuggestions([]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={THEME_COLORS.primary} />
        </TouchableOpacity>
        <View style={[styles.searchBox, inputRef.current?.isFocused() && styles.searchBoxFocused]}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search products..."
            autoFocus={true}
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={() => handleSearch()}
            onFocus={() => {}} // Trigger re-render to apply focus style
            onBlur={() => {}}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {!searched ? (
        <FlatList
          data={[]}
          ListHeaderComponent={
            <View>
              {query.trim().length > 0 && !searched && suggestions.length > 0 ? (
                <View style={styles.suggestionsContainer}>
                  {suggestions.map((s) => (
                    <TouchableOpacity 
                      key={s.id} 
                      style={styles.suggestionRow} 
                      onPress={() => navigation.navigate('ProductDetail', { productId: s.id })}
                    >
                      <Image 
                        source={{ uri: getImageUrl(s.image) }} 
                        style={styles.suggestionImage} 
                        resizeMode="cover"
                      />
                      <Text style={styles.suggestionTxt} numberOfLines={1}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <>
                  {/* Recent Searches */}
              {recent.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionRow}>
                    <View style={styles.sectionTitle}>
                      <Text style={styles.sectionTxt}>Recent Search</Text>
                    </View>
                    <TouchableOpacity onPress={clearRecent}>
                      <Text style={styles.clearTxt}>Clear All</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.chips}>
                    {recent.map((r, i) => (
                      <TouchableOpacity key={i} style={styles.chip} onPress={() => handleSuggestion(r)}>
                        <Text style={styles.chipTxt}>{r}</Text>
                        <X size={12} color={THEME_COLORS.textSecondary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Trending Searches */}
              <View style={styles.section}>
                <View style={styles.sectionRow}>
                  <View style={styles.sectionTitle}>
                    <TrendingUp size={15} color={THEME_COLORS.secondary} />
                    <Text style={styles.sectionTxt}>Trending Now</Text>
                  </View>
                </View>
                <View style={styles.chips}>
                  {trendingKeywords.map((t, i) => (
                    <TouchableOpacity key={i} style={[styles.chip, styles.trendChip]} onPress={() => handleSuggestion(t)}>
                      <Text style={[styles.chipTxt, { color: THEME_COLORS.textSecondary }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
                </>
              )}
            </View>
          }
          keyExtractor={(_, i) => String(i)}
          renderItem={() => null}
          showsVerticalScrollIndicator={false}
        />
      ) : loading ? (
        <LoadingState message="Searching..." />
      ) : results.length === 0 ? (
        <EmptyState
          title={`No results for "${query}"`}
          subtitle="Try different keywords or check spelling."
        />
      ) : (
        <>
          <Text style={styles.resultCount}>{results.length} results for "{query}"</Text>
          <FlatList
            data={results}
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
                  const parseNum = (v) => (typeof v === 'number' ? v : parseFloat(v) || 0);
                  let finalPrice = userRole === 'dealer'
                    ? (typeof item.dealerPrice === 'number' ? item.dealerPrice : item.price || 0)
                    : (typeof item.retailPrice === 'number' ? item.retailPrice : item.price || 0);
                    
                  const variantItems = item.variantItems || item.variantPrices || [];
                  if (variantItems.length > 0) {
                    const firstVar = variantItems[0];
                    finalPrice = userRole === 'dealer' ? (parseNum(firstVar.wholesalePrice) || parseNum(firstVar.dealerPrice)) : (parseNum(firstVar.retailPrice) || parseNum(firstVar.price));
                    if (finalPrice <= 0) finalPrice = parseNum(firstVar.price);
                  }
                  
                  addToCart({
                    id: item._id || item.id,
                    name: item.name,
                    price: typeof finalPrice === 'number' ? finalPrice : (parseFloat(finalPrice) || 0),
                    priceSource: 'search',
                    image: getImageUrl(item.image || item.thumbnail || item.img || (item.images && item.images[0])),
                    installationRatePerSqFt: parseFloat(item.installationRatePerSqFt || item.installationRatePerSqft || item.installationPricePerSqft || item.installationPerSqFt || item.installationRate || 0) || 0,
                    baseInstallationPrice: parseFloat(item.installationPrice || item.installationFee || item.installationCost || 0) || 0,
                  }, 1);
                  addNotification('cart', 'Added to Cart', `${item.name} added successfully!`, 'Cart');
                }}
              />
            )}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME_COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 10 : 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center',
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 30, height: 52,
    paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  searchBoxFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#1E3C83', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 5,
  },
  input: { flex: 1, fontSize: 15, fontWeight: '500', color: '#05102D' },

  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTxt: { fontSize: 15, fontWeight: '800', color: THEME_COLORS.text },
  clearTxt: { fontSize: 13, color: THEME_COLORS.primary, fontWeight: '700' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFF', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: THEME_COLORS.border,
  },
  trendChip: { borderWidth: 0, backgroundColor: '#F3F4F6' },
  chipTxt: { fontSize: 13, fontWeight: '600', color: THEME_COLORS.text },

  resultCount: {
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8,
    fontSize: 13, color: THEME_COLORS.textSecondary, fontWeight: '600',
  },
  grid: { paddingHorizontal: 16, paddingBottom: 110 },
  row: { justifyContent: 'space-between', marginBottom: 16 },

  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME_COLORS.border,
  },
  suggestionTxt: {
    fontSize: 15,
    color: THEME_COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  suggestionImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
});
