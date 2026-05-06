import React, { useState } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, ChevronRight, X } from 'lucide-react-native';
import { COLORS } from '../theme';
import { EmptyState, AppButton } from '../components';
import { sanitizeData, userService } from '../services/api';
import { BackIcon } from '../components/CustomIcons';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const STATUS_CONFIG = {
  'ORDER CONFIRMED': { color: '#F2994A', bg: '#FFF9F3' },
  'SHIPPED': { color: '#2F80ED', bg: '#F2F8FF' },
  'DELIVERED': { color: '#27AE60', bg: '#F2FFF7' },
  'CANCELLED': { color: '#EB5757', bg: '#FFF2F2' },
};

const DEMO_ORDERS = [
  {
    id: '#ORD-9921',
    date: 'OCT 24, 2023',
    status: 'ORDER CONFIRMED',
    total: 120.00,
    itemsCount: 3,
    mainProduct: 'Curtains',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: '#ORD-9922',
    date: 'OCT 24, 2023',
    status: 'SHIPPED',
    total: 120.00,
    itemsCount: 1,
    mainProduct: 'PVC Mesh',
    image: 'https://images.unsplash.com/photo-1585412727339-54e4bae3bbf9?auto=format&fit=crop&q=80&w=400',
  },
];

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export default function OrdersScreen({ navigation }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      loadOrders();
    }, [])
  );

  const loadOrders = async () => {
    try {
      setLoading(true);
      const currentUserId = user?._id || user?.id;
      if (!currentUserId) {
        setOrders([]);
        return;
      }

      // Try fetching from backend first
      const data = await userService.getOrders(currentUserId);
      const backendOrders = Array.isArray(data) ? data : data.data || data.orders || [];
      
      if (backendOrders.length > 0) {
        setOrders(backendOrders);
        // Sync to local storage for offline view
        await AsyncStorage.setItem('@UserOrders', JSON.stringify(backendOrders));
      } else {
        // Fallback to local storage if backend is empty but user had local data
        const stored = await AsyncStorage.getItem('@UserOrders');
        if (stored) {
          const localOrders = JSON.parse(stored).filter(o => o.userId === currentUserId);
          setOrders(localOrders);
        }
      }
    } catch (e) { 
      console.error('Error fetching orders:', e);
      // Fallback to local on error
      const stored = await AsyncStorage.getItem('@UserOrders');
      if (stored) {
        const localOrders = JSON.parse(stored).filter(o => o.userId === (user?._id || user?.id));
        setOrders(localOrders);
      }
    } finally { 
      setLoading(false); 
    }
  };


  // Derived state for filtered orders
  const filteredOrders = orders.filter(o => {
    if (activeTab === 'Active') {
      return o.status === 'ORDER CONFIRMED' || o.status === 'SHIPPED';
    } else if (activeTab === 'Delivered') {
      return o.status === 'DELIVERED';
    }
    return true; // 'All'
  });

  const TABS = [
    { label: 'All', count: orders.length },
    { label: 'Active', count: orders.filter(o => o.status === 'ORDER CONFIRMED' || o.status === 'SHIPPED').length },
    { label: 'Delivered', count: orders.filter(o => o.status === 'DELIVERED').length },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <BackIcon size={18} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* TABS */}
      <View style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.label}
            style={[styles.tab, activeTab === tab.label && styles.activeTab]}
            onPress={() => setActiveTab(tab.label)}
          >
            <Text style={[styles.tabText, activeTab === tab.label && styles.activeTabText]}>
              {tab.label}{tab.count !== null ? ` (${tab.count})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={<Package size={52} color={COLORS.border} />}
          title="No orders found"
          subtitle="You have no orders matching this filter."
          action={<AppButton title="Start Shopping" onPress={() => navigation.navigate('HomeTab')} />}
        />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={o => o.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardDate}>{item.date}</Text>
                  <Text style={styles.cardId}>{item.id}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[item.status]?.bg }]}>
                  <Text style={[styles.statusText, { color: STATUS_CONFIG[item.status]?.color }]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Image source={{ uri: item.image }} style={styles.productImg} />
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.mainProduct}</Text>
                  {item.itemsCount > 1 && (
                    <Text style={styles.itemsCount}>+ {item.itemsCount - 1} more items</Text>
                  )}
                </View>
                <Text style={styles.cardPrice}>₹{item.total.toFixed(2)}</Text>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.detailsBtn}
                  onPress={() => navigation.navigate('OrderDetail', { order: item })}
                >
                  <Text style={styles.detailsBtnText}>View Details</Text>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFF',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary },

  tabsContainer: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 10,
    backgroundColor: '#FFF',
  },
  tab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  activeTab: { backgroundColor: COLORS.secondary },
  tabText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  activeTabText: { color: '#FFF' },

  list: { padding: 20, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardDate: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  cardId: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800' },

  cardBody: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  productImg: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#F1F5F9' },
  productInfo: { flex: 1, marginLeft: 16 },
  productName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  itemsCount: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  cardPrice: { fontSize: 16, fontWeight: '900', color: COLORS.text },

  cardActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, height: 40, borderRadius: 10, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  detailsBtn: {
    flex: 1.5, height: 40, borderRadius: 10, backgroundColor: COLORS.secondary,
    justifyContent: 'center', alignItems: 'center',
  },
  detailsBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
});
