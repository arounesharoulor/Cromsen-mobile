import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  TextInput, Keyboard, StatusBar, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X, ArrowLeft, Clock, TrendingUp } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME_COLORS } from '../theme';
import { ProductCard, LoadingState, EmptyState } from '../components';
import { productService } from '../services/api';
import { BackIcon } from '../components/CustomIcons';

const TRENDING = ['Blinds', 'Honeycomb', 'Curtains', 'PVC Mesh', 'Wallpaper', 'Acoustic Panel'];

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    loadRecent();
  }, []);

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
    setResults([]);
    setSearched(false);
    inputRef.current?.focus();
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
            onChangeText={setQuery}
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
                  {TRENDING.map((t, i) => (
                    <TouchableOpacity key={i} style={[styles.chip, styles.trendChip]} onPress={() => handleSuggestion(t)}>
                      <Text style={[styles.chipTxt, { color: THEME_COLORS.textSecondary }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
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
                onAddToCart={() => navigation.navigate('ProductDetail', { productId: item._id || item.id })}
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
});
