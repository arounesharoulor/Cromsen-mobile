import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity, Image, Dimensions, ScrollView, Alert, StatusBar, Modal, TextInput, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, ChevronRight, X, ArrowLeft, Video, Plus, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { THEME_COLORS } from '../theme';
import { EmptyState, AppButton } from '../components';
import { sanitizeData, userService, getImageUrl, productService } from '../services/api';
import { BackIcon } from '../components/CustomIcons';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const STATUS_CONFIG = {
  'ORDER CONFIRMED': { color: '#F2994A', bg: '#FFF9F3' },
  'PROCESSING': { color: '#F2994A', bg: '#FFF9F3' },
  'PACKED': { color: '#9B51E0', bg: '#F9F2FF' },
  'SHIPPED': { color: '#2F80ED', bg: '#F2F8FF' },
  'DELIVERED': { color: '#27AE60', bg: '#F2FFF7' },
  'CANCELLED': { color: '#EB5757', bg: '#FFF2F2' },
  'RETURN REQUESTED': { color: '#F2994A', bg: '#FFF9F3' },
  'RETURN COMPLETED': { color: '#9B51E0', bg: '#F9F2FF' },
  'RETURNED': { color: '#9B51E0', bg: '#F9F2FF' },
  'REFUNDED': { color: '#27AE60', bg: '#F2FFF7' },
  'REFUND TRACKING': { color: '#2F80ED', bg: '#F2F8FF' },
  'REPLACEMENT REQUESTED': { color: '#F2994A', bg: '#FFF9F3' },
  'REPLACEMENT COMPLETED': { color: '#27AE60', bg: '#F2FFF7' },
  'REPLACEMENT DELIVERED': { color: '#27AE60', bg: '#F2FFF7' },
  'REPLACEMENT PROCESSING': { color: '#F2994A', bg: '#FFF9F3' },
};

const RETURN_REASONS = [
  "Manufacturing Defect",
  "Damage during Transit",
  "Wrong Item Received",
  "Quality Not as Expected",
  "Product Not as Described",
  "Size/Fit Issue",
  "Other"
];

const DEMO_ORDERS = [
  {
    id: '#ORD-9921',
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase(),
    status: 'DELIVERED',
    total: 120.00,
    itemsCount: 3,
    mainProduct: 'Premium Curtains',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?auto=format&fit=crop&q=80&w=400',
    items: [{ name: 'Premium Curtains', quantity: 3, price: 40, image: 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?auto=format&fit=crop&q=80&w=400' }]
  },
  {
    id: '#ORD-9922',
    date: 'OCT 24, 2023',
    status: 'SHIPPED',
    total: 120.00,
    itemsCount: 1,
    mainProduct: 'PVC Mesh',
    image: 'https://images.unsplash.com/photo-1585412727339-54e4bae3bbf9?auto=format&fit=crop&q=80&w=400',
    items: [{ name: 'PVC Mesh', quantity: 1, price: 120, image: 'https://images.unsplash.com/photo-1585412727339-54e4bae3bbf9?auto=format&fit=crop&q=80&w=400' }]
  },
];

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export default function OrdersScreen({ navigation }) {
  const { user } = useAuth();
  const { addNotification, checkOrderUpdates, subscribeToOrderUpdates } = useNotifications();
  const { isDarkMode, theme } = useTheme();
  const [activeTab, setActiveTab] = useState('All');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Auto-refresh when order status changes on backend
  useEffect(() => {
    if (subscribeToOrderUpdates) {
      const unsubscribe = subscribeToOrderUpdates(() => {
        console.log('[OrdersScreen] Order status update detected. Auto-refreshing...');
        loadOrders();
      });
      return unsubscribe;
    }
  }, [subscribeToOrderUpdates]);

  // Review Modal States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewProductId, setReviewProductId] = useState(null);
  const [reviewProductName, setReviewProductName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  
  // Return/Replace Modal States
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [requestType, setRequestType] = useState('Return');
  const [media, setMedia] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const pickMedia = async () => {
    Alert.alert(
      "Add Media",
      "Choose a source",
      [
        {
          text: "Camera",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              alert('Sorry, we need camera permissions to make this work!');
              return;
            }
            let result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.All,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
              base64: true,
            });
            if (!result.canceled) {
              setMedia([...media, result.assets[0]]);
            }
          }
        },
        {
          text: "Gallery",
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              alert('Sorry, we need gallery permissions to make this work!');
              return;
            }
            let result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.All,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
              base64: true,
            });
            if (!result.canceled) {
              setMedia([...media, result.assets[0]]);
            }
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const removeMedia = (index) => {
    const newMedia = [...media];
    newMedia.splice(index, 1);
    setMedia(newMedia);
  };

  const handleReturnReplaceSubmit = async () => {
    if (!returnReason.trim()) {
      alert('Please provide a reason for ' + requestType.toLowerCase());
      return;
    }
    if (media.length === 0) {
      alert('Please upload at least one image or video of the product');
      return;
    }

    try {
      setSubmittingRequest(true);

      const newStatus = requestType === 'Return' ? 'Refund Tracking' : 'Replacement Requested';
      const base64Media = media.map(m => m.base64 ? `data:image/jpeg;base64,${m.base64}` : m.uri);

      const requestPayload = {
        orderId: selectedOrder.id || selectedOrder._id,
        productId: selectedItem?.productId || selectedItem?.product?._id || selectedItem?.id,
        productName: selectedItem?.name || selectedOrder.mainProduct,
        type: requestType,
        reason: returnReason === 'Other' ? `Other: ${comment}` : returnReason.trim(),
        media: base64Media,
        timestamp: new Date().toISOString(),
        customerName: user?.name || 'Customer',
        customerEmail: user?.email || '',
        status: 'PENDING',
        // Include new order status so admin dashboard can reflect it
        orderStatus: newStatus,
      };

      // 1. Save locally to AsyncStorage
      const storedKey = `@ReturnRequests_${user?._id || user?.id}`;
      const stored = await AsyncStorage.getItem(storedKey);
      const requests = stored ? JSON.parse(stored) : [];
      await AsyncStorage.setItem(storedKey, JSON.stringify([requestPayload, ...requests]));

      // 2. Update order status on backend so admin sees "RETURN REQUESTED" / "REPLACEMENT REQUESTED"
      try {
        const orderId = selectedOrder.id || selectedOrder._id;
        await userService.updateOrderStatus(orderId, newStatus);
        console.log(`[${requestType}] Order status updated to "${newStatus}" on backend.`);
      } catch (statusErr) {
        console.warn(`[${requestType}] Could not update order status on backend:`, statusErr.message);
      }

      // 3. Send return/replace request details to backend
      try {
        await userService.submitReturnRequest(requestPayload);
        console.log(`[${requestType}] Request sent to backend successfully.`);
      } catch (reqErr) {
        console.warn(`[${requestType}] Could not send request to backend:`, reqErr.message);
      }

      // 4. Update local AsyncStorage order list
      const currentUserId = user?._id || user?.id;
      const userOrdersKey = currentUserId ? `@UserOrders_${currentUserId}` : '@UserOrders_guest';
      const storedOrders = await AsyncStorage.getItem(userOrdersKey);
      if (storedOrders) {
        try {
          const parsedOrders = JSON.parse(storedOrders);
          const updated = parsedOrders.map(o =>
            (o.id === requestPayload.orderId || o._id === requestPayload.orderId)
              ? { ...o, status: newStatus }
              : o
          );
          await AsyncStorage.setItem(userOrdersKey, JSON.stringify(updated));
        } catch (storageErr) {
          console.warn('Failed to update local AsyncStorage orders:', storageErr);
        }
      }

      // 5. Update local state safely using already-normalized prevOrders list
      setOrders(prevOrders => prevOrders.map(o =>
        (o.id === requestPayload.orderId || o._id === requestPayload.orderId)
          ? { ...o, status: newStatus }
          : o
      ));

      console.log(`[${requestType}] Saved request with customer details:`, { name: requestPayload.customerName, email: requestPayload.customerEmail });

      addNotification('success', `${requestType} Request Received`, `We have received your ${requestType.toLowerCase()} request for ${selectedItem?.name || selectedOrder.mainProduct}.`, 'Orders');
      setShowReturnModal(false);
      alert(`Your ${requestType.toLowerCase()} request has been submitted successfully.`);
    } catch (e) {
      console.error('Error submitting request:', e);
      alert('Failed to submit request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const isReturnReplaceEligible = (order) => {
    if (!order) return false;
    const statusUpper = String(order.status).trim().toUpperCase();
    
    // Don't show if already returned/replaced or in progress
    if (statusUpper.includes('RETURN') || statusUpper.includes('REPLACEMENT') || statusUpper.includes('REFUND')) return false;

    // Only allow for DELIVERED orders per website policy
    if (statusUpper !== 'DELIVERED') return false;

    try {
      const orderDate = new Date(order.date);
      if (isNaN(orderDate.getTime())) return true; 

      // 7-day return policy + 3 days estimated delivery time
      const totalEligibleDays = 10; 
      const expiryDate = new Date(orderDate);
      expiryDate.setDate(expiryDate.getDate() + totalEligibleDays);
      
      return new Date() < expiryDate;
    } catch (e) {
      return true;
    }
  };

  const handleSubmitReview = async () => {
    if (!comment.trim()) {
      alert('Please enter a comment for your review.');
      return;
    }

    try {
      setSubmittingReview(true);
      
      const base64Media = media.map(m => m.base64 ? `data:image/jpeg;base64,${m.base64}` : m.uri);

      const reviewPayload = {
        name: user?.name || 'Anonymous Buyer',
        userName: user?.name || 'Anonymous Buyer', // Backend expects userName
        email: user?.email || '',
        rating: rating,
        comment: comment.trim(),
        title: `${rating} Star Review`,
        review: comment.trim(),
        images: base64Media,
        media: base64Media,
        localMedia: media.map(m => m.uri), // Pass raw URIs for FormData
        date: new Date().toISOString()
      };

      const newRev = {
        ...reviewPayload,
        productId: reviewProductId,
        productName: reviewProductName,
        time: new Date().toISOString(),
        user: user?._id || user?.id || null,
        userId: user?._id || user?.id || null,
        name: user?.name || reviewPayload.name,
        email: user?.email || reviewPayload.email,
        likes: 0,
        dislikes: 0,
        userImage: user?.image || user?.avatar || null
      };

      // 1. ALWAYS save to local storage first, so the user sees it immediately
      try {
        const stored = await AsyncStorage.getItem(`@LocalReviews_${reviewProductId}`);
        const locals = stored ? JSON.parse(stored) : [];
        const updated = [newRev, ...locals];
        await AsyncStorage.setItem(`@LocalReviews_${reviewProductId}`, JSON.stringify(updated));
        
        // Also save to global review store so ProductDetailScreen can always find it
        const globalStored = await AsyncStorage.getItem('@GlobalLocalReviews');
        const globalList = globalStored ? JSON.parse(globalStored) : [];
        await AsyncStorage.setItem('@GlobalLocalReviews', JSON.stringify([newRev, ...globalList]));
        
        console.log(`[REVIEW] Saved review locally first in OrdersScreen for productId: ${reviewProductId}`);
      } catch (err) {
        console.warn('[REVIEW] Local save error in OrdersScreen:', err);
      }

      // 2. Try to sync with backend
      try {
        await productService.addReview(reviewProductId, reviewPayload);
      } catch (apiErr) {
        console.warn('Backend sync failed from OrdersScreen, review remains stored locally:', apiErr);
      }
      
      alert('Thank you! Your product review has been saved successfully.');
      setShowReviewModal(false);
    } catch (e) {
      console.error('Error submitting review:', e);
      alert('Thank you! Your product review has been saved successfully.');
      setShowReviewModal(false);
    } finally {
      setSubmittingReview(false);
    }
  };

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
      const normalize = (o) => {
        // Build the display ID exactly like the admin dashboard
        let displayId = o.id || o._id;
        if (o.orderId) {
          const oid = String(o.orderId).toUpperCase();
          const match = oid.match(/(?:CIM|CIW|CIDM)?-?#?(\d+)/);
          if (match) {
            const prefix = oid.startsWith('CIW') ? 'CIW' : oid.startsWith('CIDM') ? 'CIDM' : 'CIM';
            displayId = `${prefix}-#${match[1]}`;
          } else {
            displayId = oid;
          }
        } else if (displayId && String(displayId).length > 20) {
          // It's likely a raw MongoDB ObjectId, convert to standard format for consistency
          displayId = `CIM-#${String(displayId).slice(-4).toUpperCase()}`;
        } else if (!displayId) {
          displayId = `#ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        } else {
          // Ensure short IDs like #01EC78A4 are uppercase
          displayId = String(displayId).toUpperCase();
        }

        return {
          _id: o._id || o.id || `local-${Math.random().toString(36).substr(2, 9)}`,
          id: displayId,
          orderId: o.orderId,
          date: o.date || (o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : ''),
          createdAt: o.createdAt || new Date().toISOString(), // Preserve original timestamp for sorting
          status: o.status || 'ORDER CONFIRMED',
          total: o.total || o.totalAmount || 0,
          itemsCount: o.itemsCount || (o.items ? o.items.length : 0),
          mainProduct: o.mainProduct || (o.items && o.items[0] ? sanitizeData(o.items[0].name, 'Product') : 'Product'),
          image: o.image || (o.items && o.items[0] ? getImageUrl(o.items[0].image) : '') || 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?auto=format&fit=crop&q=80&w=400',
          userId: o.userId || currentUserId,
          items: o.items || [],
          address: o.address || o.shippingAddress || {},
        };
      };

      // Always fetch local storage first
      const storedKey = currentUserId ? `@UserOrders_${currentUserId}` : '@UserOrders_guest';
      const stored = await AsyncStorage.getItem(storedKey);
      let localOrdersList = [];
      if (stored) {
        try {
          localOrdersList = JSON.parse(stored).filter(o => o.userId === currentUserId || o.userEmail === userEmail);
        } catch (parseErr) {
          console.warn('Failed to parse local orders in OrdersScreen:', parseErr);
        }
      }

      if (backendOrders.length > 0) {
        const normalized = backendOrders.map(normalize);
        
        // Merge backend and local list, ensuring no duplicate _ids or display IDs
        const mergedList = [];
        const seenIds = new Set();

        // Process backend orders first
        normalized.forEach(bo => {
          if (!seenIds.has(String(bo._id)) && !seenIds.has(String(bo.id))) {
            mergedList.push(bo);
            seenIds.add(String(bo._id));
            seenIds.add(String(bo.id));
          }
        });

        // Add local orders if they don't exist in backend
        localOrdersList.forEach(lo => {
          const loDisplayId = normalize(lo).id;
          const loId = String(lo._id || lo.id);
          
          const isOnlinePayment = lo.paymentId && lo.paymentId !== 'COD' && lo.paymentId !== 'Pending';
          const existsByPaymentId = isOnlinePayment && mergedList.some(bo => bo.paymentId === lo.paymentId);
          
          if (!seenIds.has(loId) && !seenIds.has(loDisplayId) && !existsByPaymentId) {
            mergedList.push(normalize(lo));
            seenIds.add(loId);
            seenIds.add(loDisplayId);
          }
        });

        // Use centralized status change detection
        checkOrderUpdates(currentUserId, userEmail);
        setOrders(mergedList);
      } else {
        setOrders(localOrdersList.map(normalize));
      }
    } catch (e) {
      console.error('Error fetching orders:', e);
      const currentUserId = user?._id || user?.id;
      if (currentUserId) {
        const storedKey = `@UserOrders_${currentUserId}`;
        const stored = await AsyncStorage.getItem(storedKey);
        if (stored) {
          const localOrders = JSON.parse(stored).filter(o => o.userId === currentUserId);
          setOrders(localOrders);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const handleCancelOrder = (orderId) => {
    setCancellingOrderId(orderId);
    setCancelReason('');
    setCustomReason('');
    setShowCancelModal(true);
  };

  const submitCancellation = async () => {
    if (!cancelReason) {
      Alert.alert('Required', 'Please select a reason for cancellation');
      return;
    }

    const finalReason = cancelReason === 'Other' ? customReason : cancelReason;
    if (cancelReason === 'Other' && !customReason.trim()) {
      Alert.alert('Required', 'Please specify your reason');
      return;
    }

    try {
      setLoading(true);
      setShowCancelModal(false);
      
      // Update backend with reason if it's a real order
      if (!String(cancellingOrderId).startsWith('#')) {
        await userService.updateOrderStatus(cancellingOrderId, 'Cancelled', { 
          reason: finalReason,
          cancelledBy: 'Customer'
        });
      }
      
      const updatedOrders = orders.map(o => (o.id === cancellingOrderId || o._id === cancellingOrderId) ? { ...o, status: 'CANCELLED' } : o);
      setOrders(updatedOrders);
      
      const currentUserId = user?._id || user?.id;
      if (currentUserId) {
        await AsyncStorage.setItem(`@UserOrders_${currentUserId}`, JSON.stringify(updatedOrders));
      }
      
      Alert.alert('Order Cancelled', 'Your order has been cancelled. Our team has been notified.');
    } catch (e) {
      console.error('Error cancelling order:', e);
      Alert.alert('Error', 'Failed to cancel order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getOrdersForTab = (tabLabel) => {
    let filtered = orders.filter(o => {
      const s = String(o.status).toUpperCase();
      if (tabLabel === 'Active') {
        return s !== 'DELIVERED' && s !== 'CANCELLED' && !s.includes('COMPLETED') && !s.includes('RETURNED') && !s.includes('REFUNDED');
      } else if (tabLabel === 'Delivered') {
        return s === 'DELIVERED' || s.includes('COMPLETED');
      } else if (tabLabel === 'Cancelled') {
        return s === 'CANCELLED';
      }
      return true; // 'All'
    });

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const TABS = [
    { label: 'All', count: orders.length },
    { label: 'Active', count: orders.filter(o => {
      const s = String(o.status).toUpperCase();
      return s !== 'DELIVERED' && s !== 'CANCELLED' && !s.includes('COMPLETED');
    }).length },
    { label: 'Delivered', count: orders.filter(o => {
      const s = String(o.status).toUpperCase();
      return s === 'DELIVERED' || s.includes('COMPLETED') || s.includes('DELIVERED');
    }).length },
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: isDarkMode ? '#2C3E50' : '#F8FAFC' }]} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Orders</Text>
        <View style={{ width: 36 }} />
      </View>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.surface} />

      {/* TABS */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {TABS.map((tab, index) => (
            <TouchableOpacity
              key={tab.label}
              style={[styles.tab, { backgroundColor: theme.border }, activeTab === tab.label && { backgroundColor: theme.primary }]}
              onPress={() => handleTabPress(index, tab.label)}
            >
              <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === tab.label && { color: '#FFF' }]}>
                {String(tab.label)}{tab.count !== null && tab.count !== undefined ? ` (${tab.count})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Cancellation Modal */}
      <Modal visible={showCancelModal} animationType="slide" transparent onRequestClose={() => setShowCancelModal(false)}>
        <View style={styles.reviewModalOverlay}>
          <View style={styles.reviewModalSheet}>
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.reviewModalTitle, { marginBottom: 0 }]}>Cancel Order</Text>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <Text style={{ fontSize: 24, color: '#94A3B8' }}>×</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.reviewModalSub, { marginBottom: 20 }]}>Please select a reason for cancelling this order</Text>

            <View style={styles.reasonsWrapper}>
              {[
                'Change in product specifications', 
                'Revised project timeline', 
                'Accidental duplicate purchase', 
                'Found a more suitable alternative', 
                'Shipping schedule exceeds requirements', 
                'Financial/Budgetary revisions',
                'Other'
              ].map((reason) => (
                <TouchableOpacity 
                  key={reason} 
                  style={[styles.reasonChip, cancelReason === reason && styles.reasonChipSelected]}
                  onPress={() => setCancelReason(reason)}
                >
                  <Text style={[styles.reasonChipTxt, cancelReason === reason && styles.reasonChipTxtSelected]}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {cancelReason === 'Other' && (
              <TextInput
                style={[styles.reviewInput, { height: 80, marginTop: 12 }]}
                placeholder="Specify your reason..."
                placeholderTextColor="#94A3B8"
                value={customReason}
                onChangeText={setCustomReason}
                multiline
                numberOfLines={3}
              />
            )}

            <View style={[styles.reviewActionButtons, { marginTop: 24 }]}>
              <TouchableOpacity 
                style={[styles.reviewSubmitBtn, { backgroundColor: '#EB5757' }]} 
                onPress={submitCancellation}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.reviewSubmitBtnTxt}>Confirm Cancellation</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                  keyExtractor={o => String(o._id || o.id)}
                  contentContainerStyle={styles.list}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const statusUpper = String(item.status).toUpperCase();
                    const isReplacement = statusUpper.includes('REPLACEMENT');
                    return (
                    <View style={[
                      styles.card, 
                      { backgroundColor: theme.surface, borderColor: theme.border },
                      (statusUpper === 'CANCELLED' || statusUpper === 'DELIVERED' || statusUpper.includes('COMPLETED')) && { opacity: 0.85 }
                    ]}>
                      <View style={styles.cardHeader}>
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.cardDate}>{item.date}</Text>
                            {isReplacement && (
                              <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ fontSize: 8, fontWeight: '800', color: THEME_COLORS.secondary }}>REPLACEMENT</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.cardId}>{item.orderId || item.id}</Text>
                        </View>

                        <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[String(item.status).toUpperCase()]?.bg || '#F3F4F6', paddingVertical: 2, paddingHorizontal: 8 }]}>
                          <Text style={[styles.statusText, { color: STATUS_CONFIG[String(item.status).toUpperCase()]?.color || '#6B7280', fontSize: 9 }]}>
                            {item.status}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.cardBody, { marginBottom: 12 }]}>
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
                          <Text style={[styles.productName, { fontSize: 13 }]} numberOfLines={1}>{String(item.mainProduct)}</Text>
                          {item.itemsCount > 1 && (
                            <Text style={[styles.itemsCount, { fontSize: 11 }]}>{String(item.itemsCount)} items</Text>
                          )}
                        </View>
                        <Text style={[styles.cardPrice, { fontSize: 14 }]}>₹{(Number(item.total) || 0).toFixed(2)}</Text>
                      </View>

                      <View style={[styles.cardActions, { flexWrap: 'wrap' }]}>
                        <TouchableOpacity 
                          style={styles.detailsBtn}
                          onPress={() => navigation.navigate('OrderDetail', { order: item })}
                        >
                          <Text style={styles.detailsBtnText}>View Details</Text>
                        </TouchableOpacity>

                        {item.status !== 'CANCELLED' && item.status !== 'DELIVERED' && item.status !== 'Refund Tracking' && (
                          <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelOrder(item.id || item._id)}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                          </TouchableOpacity>
                        )}
                        

                      </View>
                    </View>
                  );
                }}
                />
              )}
            </View>
          );
        }}
      />

      <Modal visible={showReturnModal} animationType="slide" transparent onRequestClose={() => setShowReturnModal(false)}>
        <View style={styles.reviewModalOverlay}>
          <View style={[styles.reviewModalSheet, { maxHeight: '90%' }]}>
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.reviewModalTitle, { marginBottom: 0 }]}>{requestType} Order</Text>
              <TouchableOpacity onPress={() => setShowReturnModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.reviewModalSub, { marginBottom: 12 }]}>{selectedItem?.name || selectedOrder?.mainProduct}</Text>

            <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Reason for {requestType}</Text>
              
              <View style={[styles.reasonsWrapper, { marginBottom: 4 }]}>
                {RETURN_REASONS.map((reason) => (
                  <TouchableOpacity 
                    key={reason} 
                    style={[styles.reasonChip, { paddingVertical: 4, paddingHorizontal: 10 }, returnReason === reason && styles.reasonChipSelected]}
                    onPress={() => setReturnReason(returnReason === reason ? '' : reason)}
                  >
                    <Text style={[styles.reasonChipTxt, { fontSize: 11 }, returnReason === reason && styles.reasonChipTxtSelected]}>{reason}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {returnReason === 'Other' && (
                <TextInput
                  style={[styles.reviewInput, { height: 80, marginTop: 12 }]}
                  placeholder="Please specify your reason..."
                  placeholderTextColor="#94A3B8"
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={3}
                />
              )}

              <Text style={styles.inputLabel}>Upload Images or Video</Text>
              <View style={styles.mediaContainer}>
                {media.map((item, index) => (
                  <View key={index} style={{ alignItems: 'center' }}>
                    <View style={styles.mediaPreview}>
                      <Image source={{ uri: item.uri }} style={styles.mediaItem} />
                      <TouchableOpacity style={styles.removeMediaBtn} onPress={() => removeMedia(index)}>
                        <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 9, color: '#94A3B8', marginTop: 2, fontWeight: '600' }}>Optional</Text>
                  </View>
                ))}
                
                {media.length < 5 && (
                  <TouchableOpacity style={styles.addMediaBtn} onPress={pickMedia}>
                    <Plus size={24} color="#94A3B8" />
                    <Text style={styles.addMediaText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={{ fontSize: 11, color: '#EB5757', marginTop: 10, textAlign: 'center', paddingHorizontal: 20 }}>
                Note: Returns/Replacements are accepted within 7 days of delivery for manufacturing defects.
              </Text>

              <View style={[styles.reviewActionButtons, { marginTop: 20 }]}>
                <TouchableOpacity 
                  style={[styles.reviewSubmitBtn, requestType === 'Return' ? { backgroundColor: '#EB5757' } : { backgroundColor: THEME_COLORS.secondary }]} 
                  onPress={handleReturnReplaceSubmit}
                  disabled={submittingRequest}
                >
                  {submittingRequest ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.reviewSubmitBtnTxt}>Submit {requestType}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Premium Product Review Modal */}
      <Modal visible={showReviewModal} animationType="fade" transparent onRequestClose={() => setShowReviewModal(false)}>
        <View style={styles.reviewModalOverlay}>
          <View style={styles.reviewModalSheet}>
            <Text style={styles.reviewModalTitle}>Write a Review</Text>
            <Text style={styles.reviewModalSub}>{reviewProductName}</Text>

            {/* Interactive Stars Selector */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starTouch}>
                  <Text style={[styles.starIconText, { color: star <= rating ? '#F2C94C' : '#D1D5DB' }]}>
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Tell us what you like or dislike about this product..."
              placeholderTextColor="#94A3B8"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              maxLength={200}
            />

            <Text style={styles.inputLabel}>Add Photos or Video (Optional)</Text>
            <View style={styles.mediaContainer}>
              {media.map((m, index) => (
                <View key={index} style={styles.mediaPreview}>
                  <Image source={{ uri: m.uri }} style={styles.mediaItem} />
                  <TouchableOpacity style={styles.removeMediaBtn} onPress={() => removeMedia(index)}>
                    <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {media.length < 5 && (
                <TouchableOpacity style={styles.addMediaBtn} onPress={pickMedia}>
                  <Plus size={24} color="#94A3B8" />
                  <Text style={styles.addMediaText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.reviewActionButtons, { marginTop: 16 }]}>
              <TouchableOpacity 
                style={styles.reviewSubmitBtn} 
                onPress={handleSubmitReview}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.reviewSubmitBtnTxt}>Submit Review</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.reviewCancelBtn} 
                onPress={() => setShowReviewModal(false)}
              >
                <Text style={styles.reviewCancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#FFF', borderRadius: 14, padding: 12, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
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
    flex: 1.2, height: 40, borderRadius: 10, backgroundColor: THEME_COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  detailsBtnText: { fontSize: 13, fontWeight: '700', color: THEME_COLORS.surface },

  // Review Modal Styles
  reviewModalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(12, 24, 33, 0.75)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 24 
  },
  reviewModalSheet: {
    width: '100%', 
    maxWidth: 360, 
    borderRadius: 24, 
    padding: 24, 
    alignItems: 'center', 
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25, 
    shadowRadius: 15, 
    elevation: 10
  },
  reviewModalTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    textAlign: 'center', 
    marginBottom: 6,
    color: '#0F172A',
  },
  reviewModalSub: { 
    fontSize: 14, 
    textAlign: 'center', 
    color: '#64748B', 
    marginBottom: 20,
    fontWeight: '600',
  },
  starsRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20, 
    gap: 8 
  },
  starTouch: {
    padding: 4,
  },
  starIconText: {
    fontSize: 36,
  },
  reviewInput: {
    width: '100%', 
    height: 100, 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14, 
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  reviewActionButtons: { 
    width: '100%', 
    gap: 10 
  },
  reviewSubmitBtn: { 
    height: 50, 
    borderRadius: 12, 
    backgroundColor: THEME_COLORS.primary,
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  reviewSubmitBtnTxt: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: '800' 
  },
  reviewCancelBtn: { 
    height: 50, 
    borderRadius: 12, 
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  reviewCancelBtnTxt: { 
    fontSize: 16, 
    fontWeight: '700',
    color: '#64748B',
  },
  directReviewBtn: {
    paddingHorizontal: 12,
    height: 40, 
    borderRadius: 10, 
    backgroundColor: THEME_COLORS.primary + '10',
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME_COLORS.primary + '30',
  },
  directReviewBtnText: { 
    fontSize: 12, 
    fontWeight: '800', 
    color: THEME_COLORS.primary 
  },
  reasonsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonChipSelected: {
    backgroundColor: THEME_COLORS.primary,
    borderColor: THEME_COLORS.primary,
  },
  reasonChipTxt: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  reasonChipTxtSelected: {
    color: '#FFF',
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnTxt: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Plus Jakarta Sans',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME_COLORS.text,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  mediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  actionBtnTxt: {
    fontSize: 13,
    fontWeight: '700'
  },
  mediaPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    position: 'relative',
  },
  mediaItem: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeMediaBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EB5757',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  addMediaBtn: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  addMediaText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    marginTop: 2,
  },
});
