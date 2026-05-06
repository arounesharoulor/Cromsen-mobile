import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity, StatusBar, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { COLORS } from '../theme';
import { LoadingState, ErrorState, EmptyState } from '../components';
import { categoryService, getImageUrl, sanitizeData } from '../services/api';
import { CategoryIcon } from '../components/CustomIcons';

import { useFocusEffect } from '@react-navigation/native';
import { BackIcon } from '../components/CustomIcons';

export default function CategoryScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      setCategories(Array.isArray(data) ? data : data.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const navigate = (item) => {
    navigation.navigate('AllProducts', {
      title: item.name,
      category: item.name,
      categoryId: item._id || item.id,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <BackIcon size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={{ marginLeft: 16 }}>
            <Text style={styles.headerTitle}>Categories</Text>
            <Text style={styles.headerSub}>Find the best for your home</Text>
          </View>
        </View>




        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator color={COLORS.secondary} size="large" />
            <Text style={styles.loadingTxt}>Loading categories...</Text>
          </View>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchCats} />
        ) : categories.length === 0 ? (
          <EmptyState
            title="No categories found"
            subtitle="Check back later for new product categories."
          />
        ) : (
          <FlatList
            data={categories}
            keyExtractor={c => c._id || c.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const image = item.image ? getImageUrl(item.image) : null;
              return (
                <TouchableOpacity
                  style={styles.catCard}
                  activeOpacity={0.85}
                  onPress={() => navigate(item)}
                >
                  <View style={styles.imgBox}>
                    {image ? (
                      <Image source={{ uri: image }} style={styles.img} resizeMode="cover" />
                    ) : (
                      <CategoryIcon size={48} color={COLORS.secondary} />
                    )}
                  </View>
                  <View style={styles.catInfo}>
                    <Text style={styles.catName} numberOfLines={1}>{sanitizeData(item.name, 'Category')}</Text>
                    <Text style={styles.catAction}>Explore →</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text, marginBottom: 4 },
  headerSub: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },

  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  loadingTxt: { marginTop: 12, color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },

  grid: { padding: 16, paddingBottom: 110 },
  row: { justifyContent: 'space-between', marginBottom: 16 },

  catCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0.1,
    borderColor: '#000000',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  imgBox: {
    width: '100%',
    height: 120,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  img: { width: '100%', height: '100%' },
  emoji: { fontSize: 36 },
  catInfo: { padding: 12 },
  catName: {
    fontSize: 14, fontWeight: '800', color: COLORS.text,
    marginBottom: 4,
  },
  catAction: {
    fontSize: 11, color: COLORS.secondary, fontWeight: '700',
  },
});
