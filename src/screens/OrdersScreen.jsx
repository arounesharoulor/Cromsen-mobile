import React, { useState, useRef } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity, Image, Dimensions, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, ChevronRight, X, ArrowLeft } from 'lucide-react-native';
import { THEME_COLORS } from '../theme';
import { EmptyState, AppButton } from '../components';
import { sanitizeData, userService, getImageUrl } from '../services/api';
import { BackIcon } from '../components/CustomIcons';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const { width } = Dimensions.get('window');

const STATUS_CONFIG = {
  'ORDER CONFIRMED': { color: '#F2994A', bg: '#FFF9F3' },
  'PROCESSING': { color: '#F2994A', bg: '#FFF9F3' },
  'PACKED': { color: '#9B51E0', bg: '#F9F2FF' },
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
  const { addNotification, checkOrderUpdates } = useNotifications();
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
      const userEmail = user?.email || '';

      // Try fetching from backend first (filtered by guestEmail)
      const data = await userService.getOrders(currentUserId, userEmail);
      const backendOrders = Array.isArray(data) ? data : data.data || data.orders || [];

      // Normalize backend schema to app schema
      const normalize = (o) => ({
        id: o.id || o._id || `#ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        date: o.date || (o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : ''),
        status: o.status || 'ORDER CONFIRMED',
        total: o.total || o.totalAmount || 0,
        itemsCount: o.itemsCount || (o.items ? o.items.length : 0),
        mainProduct: o.mainProduct || (o.items && o.items[0] ? sanitizeData(o.items[0].name, 'Product') : 'Product'),
        image: o.image || (o.items && o.items[0] ? getImageUrl(o.items[0].image) : '') || 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?auto=format&fit=crop&q=80&w=400',
        userId: o.userId || currentUserId,
        items: o.items || [],
        address: o.address || o.shippingAddress || {},
      });

      if (backendOrders.length > 0) {
        const normalized = backendOrders.map(normalize);
        
        // Use centralized status change detection
        checkOrderUpdates(currentUserId, userEmail);
        setOrders(normalized);
      } else {
        // Fallback to local storage
        const stored = await AsyncStorage.getItem('@UserOrders');
        if (stored) {
          const localOrders = JSON.parse(stored).filter(o => o.userId === currentUserId || o.userEmail === userEmail);
          setOrders(localOrders.map(normalize));
        }
      }
    } catch (e) {
      console.error('Error fetching orders:', e);
      const stored = await AsyncStorage.getItem('@UserOrders');
      if (stored) {
        const localOrders = JSON.parse(stored).filter(o => o.userId === (user?._id || user?.id));
        setOrders(localOrders);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      setLoading(true);
      
      // Only call backend if it's a real MongoDB ObjectId (not our local fallback #ORD- string)
      if (!String(orderId).startsWith('#')) {
        await userService.updateOrderStatus(orderId, 'Cancelled');
      }
      
      const updatedOrders = orders.map(o => (o.id === orderId || o._id === orderId) ? { ...o, status: 'CANCELLED' } : o);
      setOrders(updatedOrders);
      await AsyncStorage.setItem('@UserOrders', JSON.stringify(updatedOrders));
      
      alert('Order cancelled successfully.');
    } catch (e) {
      console.error('Error cancelling order:', e);
      alert('Failed to cancel order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getOrdersForTab = (tabLabel) => {
    return orders.filter(o => {
      const s = String(o.status).toUpperCase();
      if (tabLabel === 'Active') {
        return s !== 'DELIVERED' && s !== 'CANCELLED';
      } else if (tabLabel === 'Delivered') {
        return s === 'DELIVERED';
      } else if (tabLabel === 'Cancelled') {
        return s === 'CANCELLED';
      }
      return true; // 'All'
    });
  };

  const TABS = [
    { label: 'All', count: orders.length },
    { label: 'Active', count: orders.filter(o => {
      const s = String(o.status).toUpperCase();
      return s !== 'DELIVERED' && s !== 'CANCELLED';
    }).length },
    { label: 'Delivered', count: orders.filter(o => String(o.status).toUpperCase() === 'DELIVERED').length },
    { label: 'Cancelled', count: orders.filter(o => String(o.status).toUpperCase() === 'CANCELLED').length },
  ];

  const flatListRef = useRef(null);

  const handleTabPress = (index, label) => {
    setActiveTab(label);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setActiveTab(viewableItems[0].item.label);
    }
  }).current;
  
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={THEME_COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* TABS */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {TABS.map((tab, index) => (
            <TouchableOpacity
              key={tab.label}
              style={[styles.tab, activeTab === tab.label && styles.activeTab]}
              onPress={() => handleTabPress(index, tab.label)}
            >
              <Text style={[styles.tabText, activeTab === tab.label && styles.activeTabText]}>
                {String(tab.label)}{tab.count !== null && tab.count !== undefined ? ` (${tab.count})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        ref={flatListRef}
        data={TABS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        keyExtractor={t => t.label}
        renderItem={({ item: tab }) => {
          const tabOrders = getOrdersForTab(tab.label);
          return (
            <View style={{ width }}>
              {tabOrders.length === 0 ? (
                <EmptyState
                  icon={<Package size={52} color={THEME_COLORS.border} />}
                  title={`No ${tab.label.toLowerCase()} orders`}
                  subtitle="You have no orders matching this filter."
                  action={<AppButton title="Start Shopping" onPress={() => navigation.navigate('HomeTab')} />}
                />
              ) : (
                <FlatList
                  data={tabOrders}
                  keyExtractor={o => o.id}
                  contentContainerStyle={styles.list}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={[
                      styles.card, 
                      (item.status === 'CANCELLED' || item.status === 'DELIVERED') && styles.disabledCard
                    ]}>
                      <View style={styles.cardHeader}>
                        <View>
                          <Text style={styles.cardDate}>{item.date}</Text>
                          <Text style={styles.cardId}>{item.id}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[String(item.status).toUpperCase()]?.bg || '#F3F4F6' }]}>
                          <Text style={[styles.statusText, { color: STATUS_CONFIG[String(item.status).toUpperCase()]?.color || '#6B7280' }]}>
                            {item.status}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardBody}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', maxWidth: 120 }}>
                          {item.items && item.items.length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, paddingRight: 4 }}>
                              {item.items.map((prod, idx) => {
                                const uri = getImageUrl(prod?.image || prod?.product?.image || item?.image);
                                return <Image key={idx} source={{ uri }} style={styles.productImg} />;
                              })}
                            </ScrollView>
                          ) : (
                            <Image source={{ uri: getImageUrl(item?.image) }} style={styles.productImg} />
                          )}
                        </View>
                        <View style={styles.productInfo}>
                          <Text style={styles.productName} numberOfLines={1}>{String(item.mainProduct)}</Text>
                          {item.itemsCount > 1 && (
                            <Text style={styles.itemsCount}>{String(item.itemsCount)} items</Text>
                          )}
                        </View>
                        <Text style={styles.cardPrice}>₹{item.total.toFixed(2)}</Text>
                      </View>

                      <View style={styles.cardActions}>
                        {item.status !== 'CANCELLED' && item.status !== 'DELIVERED' && item.status !== 'Refund Tracking' && (
                          <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelOrder(item.id || item._id)}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                          </TouchableOpacity>
                        )}
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
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME_COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: THEME_COLORS.surface,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: THEME_COLORS.primary },

  tabsContainer: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 10,
    backgroundColor: THEME_COLORS.surface,
  },
  tab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: THEME_COLORS.border,
  },
  activeTab: { backgroundColor: THEME_COLORS.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: THEME_COLORS.textSecondary },
  activeTabText: { color: THEME_COLORS.surface },

  list: { padding: 20, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  disabledCard: {
    opacity: 0.7,
    backgroundColor: '#FAFBFC',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardDate: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  cardId: { fontSize: 14, fontWeight: '800', color: THEME_COLORS.text, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800' },

  cardBody: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  productImg: { width: 56, height: 56, borderRadius: 10, backgroundColor: THEME_COLORS.border },
  productInfo: { flex: 1, marginLeft: 16 },
  productName: { fontSize: 15, fontWeight: '800', color: THEME_COLORS.text },
  itemsCount: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  cardPrice: { fontSize: 16, fontWeight: '900', color: THEME_COLORS.text },

  cardActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, height: 40, borderRadius: 10, backgroundColor: THEME_COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  detailsBtn: {
    flex: 1.5, height: 40, borderRadius: 10, backgroundColor: THEME_COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  detailsBtnText: { fontSize: 13, fontWeight: '700', color: THEME_COLORS.surface },
});
