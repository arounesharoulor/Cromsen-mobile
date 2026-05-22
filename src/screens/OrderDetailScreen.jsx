import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Dimensions, Modal, TextInput, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Calendar, Truck, CheckCircle2, Package, ShoppingBag, Video, Image as ImageIcon, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { THEME_COLORS } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { BackIcon } from '../components/CustomIcons';
import { sanitizeData, getImageUrl, userService, productService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const ORDER_STATUS_STEPS = [
  { label: 'CONFIRMED', icon: <CheckCircle2 size={16} color="#FFF" />, active: true, completed: true },
  { label: 'PACKED', icon: <Package size={16} color="#64748B" />, active: false, completed: false },
  { label: 'SHIPPED', icon: <Truck size={16} color="#64748B" />, active: false, completed: false },
  { label: 'OUT FOR DELIVERY', icon: <ShoppingBag size={16} color="#64748B" />, active: false, completed: false },
];

const RETURN_REASONS = [
  "Manufacturing Defect",
  "Damage during Transit",
  "Wrong Item Received",
  "Quality Not as Expected",
  "Product Not as Described",
  "Size/Fit Issue",
  "Other"
];

export default function OrderDetailScreen({ navigation, route }) {
  const { order } = route.params || {};
  const { user } = useAuth();
  const { addNotification, checkOrderUpdates } = useNotifications();
  const [showTracking, setShowTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(order);

  // Review Modal States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewProductId, setReviewProductId] = useState(null);
  const [reviewProductName, setReviewProductName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  
  // Return/Replace Modal States
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [requestType, setRequestType] = useState('Return'); // 'Return' or 'Replace'
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
      
      const requestPayload = {
        orderId: currentOrder.id || currentOrder._id,
        productId: selectedItem?.productId || selectedItem?.product?._id || selectedItem?.id,
        productName: selectedItem?.name,
        type: requestType,
        reason: returnReason === 'Other' ? `Other: ${comment}` : returnReason.trim(),
        media: media.map(m => m.uri),
        timestamp: new Date().toISOString(),
        customerName: user?.name || 'Customer',
        customerEmail: user?.email || '',
        status: 'PENDING'
      };

      console.log(`[${requestType}] Detail: Saved request with customer details:`, { name: requestPayload.customerName, email: requestPayload.customerEmail });

      // Store locally for now
      const storedKey = `@ReturnRequests_${user?._id || user?.id}`;
      const stored = await AsyncStorage.getItem(storedKey);
      const requests = stored ? JSON.parse(stored) : [];
      await AsyncStorage.setItem(storedKey, JSON.stringify([requestPayload, ...requests]));

      addNotification('success', `${requestType} Request Received`, `We have received your ${requestType.toLowerCase()} request for ${selectedItem?.name}. Our team will review it.`, 'Orders');
      
      setShowReturnModal(false);
      alert(`Your ${requestType.toLowerCase()} request has been submitted successfully.`);
    } catch (e) {
      console.error('Error submitting request:', e);
      alert('Failed to submit request. Please try again.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const isReturnReplaceEligible = () => {
    if (!currentOrder) return false;
    const statusUpper = String(currentOrder.status).trim().toUpperCase();
    
    // Don't show if already returned/replaced or in progress
    if (statusUpper.includes('RETURN') || statusUpper.includes('REPLACEMENT') || statusUpper.includes('REFUND')) return false;

    // Only allow returns/replacements for DELIVERED orders per website policy
    if (statusUpper !== 'DELIVERED') return false;

    try {
      const orderDate = new Date(currentOrder.date);
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
      
      const reviewPayload = {
        name: user?.name || 'Anonymous Buyer',
        email: user?.email || '',
        rating: rating,
        comment: comment.trim(),
        title: `${rating} Star Review`,
        review: comment.trim(),
        images: media.map(m => m.uri),
        media: media.map(m => m.uri),
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

      // 1. ALWAYS save to local storage first, so the user sees it immediately even if backend is offline/fails
      try {
        const stored = await AsyncStorage.getItem(`@LocalReviews_${reviewProductId}`);
        const locals = stored ? JSON.parse(stored) : [];
        const updated = [newRev, ...locals];
        await AsyncStorage.setItem(`@LocalReviews_${reviewProductId}`, JSON.stringify(updated));
        
        // Also save to global review store so ProductDetailScreen can always find it
        const globalStored = await AsyncStorage.getItem('@GlobalLocalReviews');
        const globalList = globalStored ? JSON.parse(globalStored) : [];
        await AsyncStorage.setItem('@GlobalLocalReviews', JSON.stringify([newRev, ...globalList]));
        
        console.log(`[REVIEW] Saved review locally first for productId: ${reviewProductId}`);
      } catch (err) {
        console.warn('[REVIEW] Local save error:', err);
      }

      // 2. Try to sync with backend
      let backendSuccess = false;
      try {
        await productService.addReview(reviewProductId, reviewPayload);
        backendSuccess = true;
      } catch (apiErr) {
        console.warn('Backend sync failed, review remains stored locally:', apiErr);
      }

      if (backendSuccess) {
        addNotification('success', 'Review Submitted ✓', `Your review for "${reviewProductName}" has been posted!`, 'Orders');
      } else {
        addNotification('success', 'Review Saved Locally', 'Your review was saved locally and will sync later.', 'Orders');
      }
      setShowReviewModal(false);
    } catch (e) {
      console.error('Error submitting review:', e);
      addNotification('error', 'Error', 'Failed to submit review.', 'Orders');
    } finally {
      setSubmittingReview(false);
    }
  };

  React.useEffect(() => {
    refreshOrder();
    const interval = setInterval(refreshOrder, 10000);
    return () => clearInterval(interval);
  }, []);

  const refreshOrder = async () => {
    try {
      const orderId = currentOrder._id || currentOrder.id;
      if (!orderId || String(orderId).startsWith('#')) return;

      const currentUserId = currentOrder.userId || user?._id || user?.id;
      const userEmail = user?.email || '';

      // Centralized status change detection
      if (currentUserId && checkOrderUpdates) {
        await checkOrderUpdates(currentUserId, userEmail);
      }

      const orders = await userService.getOrders(currentUserId, userEmail);
      const latest = (Array.isArray(orders) ? orders : orders.data || orders.orders || [])
        .find(o => (o._id === orderId || o.id === orderId));
      
      if (latest) {
        setCurrentOrder(prev => ({
          ...prev,
          status: latest.status,
          // Sync any other fields if needed
        }));
      }
    } catch (e) {
      console.warn('Could not refresh order status:', e);
    }
  };

  if (!currentOrder) return null;

  const subtotal = currentOrder.items?.reduce((acc, item) => {
    const p = typeof item.price === 'number' ? item.price : (parseFloat(item.price) || 0);
    return acc + (p * (item.quantity || 1));
  }, 0) || (currentOrder.total - 20);

  
  // Calculate delivery date (3 days after order date)
  const getExpectedDate = () => {
    if (currentOrder.expectedDelivery) return currentOrder.expectedDelivery;
    try {
      const d = new Date(currentOrder.date || Date.now());
      if (isNaN(d.getTime())) {
        // Handle "MAY 1, 2026" format manually if needed, 
        // but new Date("MAY 1, 2026") works in most environments.
        const fallback = new Date();
        fallback.setDate(fallback.getDate() + 3);
        return fallback.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      d.setDate(d.getDate() + 3);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };
  const deliveryDate = getExpectedDate();

  const handleCancelOrder = async () => {
    try {
      setLoading(true);
      const orderIdStr = String(currentOrder.id || currentOrder._id);
      
      if (!orderIdStr.startsWith('#')) {
        await userService.updateOrderStatus(orderIdStr, 'Cancelled');
      }
      
      const updatedOrder = { ...currentOrder, status: 'CANCELLED' };
      setCurrentOrder(updatedOrder);
      
      // Update local storage
      const currentUserId = currentOrder.userId;
      if (currentUserId) {
        const storedKey = `@UserOrders_${currentUserId}`;
        const stored = await AsyncStorage.getItem(storedKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          const updatedOrders = parsed.map(o => (o.id === updatedOrder.id || o._id === updatedOrder._id) ? updatedOrder : o);
          await AsyncStorage.setItem(storedKey, JSON.stringify(updatedOrders));
        }
      }
      
      alert('Order cancelled successfully.');
    } catch (e) {
      console.error('Error cancelling order:', e);
      alert('Failed to cancel order. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={THEME_COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {/* STATUS TIMELINE CARD */}
        <View style={styles.card}>
          <View style={styles.orderHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderIdLabel}>Order ID</Text>
              <Text style={styles.orderIdValue} numberOfLines={1} ellipsizeMode="tail">{currentOrder.id}</Text>
            </View>
            <View style={[styles.statusBadge, { marginBottom: 0 }]}>
              <Text style={styles.statusBadgeText}>{currentOrder.status}</Text>
            </View>
          </View>
          <Text style={styles.updatedTime}>Updated just now</Text>

          {showTracking && (
            <View style={styles.timelineWrapper}>
              {/* Progress Line Background */}
              <View style={styles.timelineLineBackground}>
                {ORDER_STATUS_STEPS.slice(0, -1).map((_, idx) => {
                  const s = String(currentOrder.status).toUpperCase();
                  let lineCompleted = false;
                  if (s.includes('DELIVERED')) lineCompleted = true;
                  else if (s.includes('SHIPPED')) lineCompleted = idx < 2;
                  else if (s.includes('PACKED')) lineCompleted = idx < 1;
                  else lineCompleted = false;

                  return (
                    <View 
                      key={`line-${idx}`} 
                      style={[
                        styles.timelineLine, 
                        lineCompleted && styles.timelineLineCompleted
                      ]} 
                    />
                  );
                })}
              </View>

              {/* Steps Foreground */}
              <View style={styles.timelineStepsRow}>
                {ORDER_STATUS_STEPS.map((step, idx) => {
                  const s = String(currentOrder.status).toUpperCase();
                  let completed = false;
                  let active = false;
                  
                  if (s.includes('DELIVERED')) completed = true;
                  else if (s.includes('SHIPPED')) completed = idx <= 2;
                  else if (s.includes('PACKED')) completed = idx <= 1;
                  else completed = idx === 0;

                  active = (s.includes('DELIVERED') && idx === 3) ||
                           (s.includes('SHIPPED') && idx === 2) ||
                           (s.includes('PACKED') && idx === 1) ||
                           (!s.includes('DELIVERED') && !s.includes('SHIPPED') && !s.includes('PACKED') && idx === 0);

                  return (
                    <View key={step.label} style={styles.timelineStep}>
                      <View style={[
                        styles.iconCircle, 
                        completed && styles.iconCircleCompleted,
                        active && styles.iconCircleActive
                      ]}>
                        {completed ? <CheckCircle2 size={16} color="#FFF" /> : step.icon}
                      </View>
                      <View style={styles.stepInfo}>
                        <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{step.label}</Text>
                        <Text style={styles.stepDate}>{completed ? 'Completed' : 'Pending'}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
          {!showTracking && (
            <Text style={{ fontSize: 13, color: '#64748B', fontStyle: 'italic', textAlign: 'center' }}>
              Press "Track order" to see status timeline
            </Text>
          )}
        </View>

        {/* DELIVERY INFO CARD */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Expected Delivery</Text>
            <Calendar size={18} color="#94A3B8" />
          </View>
          <Text style={styles.deliveryDate}>{deliveryDate}</Text>

          <View style={styles.addressRow}>
            <View style={styles.iconBox}>
              <MapPin size={18} color={THEME_COLORS.secondary} />
            </View>
            <View style={styles.addressInfo}>
              <Text style={styles.addressLabel}>Delivery Address</Text>
              <Text style={styles.addressText}>{currentOrder.address?.name || 'Customer'}</Text>
              <Text style={styles.addressSub} numberOfLines={2}>
                {currentOrder.address?.full || currentOrder.address?.address || 'Address not available'}
              </Text>
              {currentOrder.address?.phone && <Text style={styles.addressSub}>{currentOrder.address?.phone}</Text>}
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.trackBtn, showTracking && { backgroundColor: '#F1F5F9' }]}
            onPress={() => setShowTracking(!showTracking)}
          >
            <Text style={[styles.trackBtnText, showTracking && { color: THEME_COLORS.text }]}>
              {showTracking ? 'Hide tracking' : 'Track order'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ORDER ITEMS */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            <Text style={styles.itemCount}>{currentOrder.items?.length || 0} items</Text>
          </View>

          {currentOrder.items?.map((item, idx) => {
            const statusUpper = String(currentOrder.status).toUpperCase();
            const canReview = ['DELIVERED', 'CONFIRMED', 'PROCESSING', 'PAID'].includes(statusUpper);
            const itemProdId = item.productId || (typeof item.product === 'string' ? item.product : (item.product?._id || item.product?.id)) || item._id || item.id;

            return (
              <View key={idx} style={[styles.itemRow, idx === currentOrder.items.length - 1 && { borderBottomWidth: 0 }, { flexDirection: 'column', alignItems: 'stretch' }]}>
                <TouchableOpacity 
                  activeOpacity={0.7}
                  style={{ flexDirection: 'row', flex: 1, marginBottom: 8 }}
                  onPress={() => {
                    if (itemProdId && !String(itemProdId).startsWith('#')) {
                      navigation.navigate('ProductDetail', { productId: itemProdId });
                    }
                  }}
                >
                  <Image 
                    source={{ uri: getImageUrl(item?.image || item?.product?.image || currentOrder?.image) }} 
                    style={styles.itemImg} 
                  />

                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{sanitizeData(item.name, 'Product')}</Text>
                    <Text style={styles.itemMeta}>{item.variant || 'Standard'}</Text>
                    <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                    <Text style={styles.itemPrice}>₹{(typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0).toFixed(2)}</Text>
                  </View>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginLeft: 64, marginTop: 12 }}>
                  {canReview && (
                    <TouchableOpacity 
                      style={styles.writeReviewBtn} 
                      onPress={() => {
                        setReviewProductId(itemProdId);
                        setReviewProductName(sanitizeData(item.name, 'Product'));
                        setRating(5);
                        setComment('');
                        setMedia([]);
                        setShowReviewModal(true);
                      }}
                    >
                      <Text style={styles.writeReviewTxt}>★ Review</Text>
                    </TouchableOpacity>
                  )}

                  {isReturnReplaceEligible() && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity 
                        style={[styles.actionBtn, { flex: 1, backgroundColor: '#FFF2F2', borderColor: '#FFD5D5', borderWidth: 1 }]} 
                        onPress={() => {
                          setSelectedItem(item);
                          setRequestType('Return');
                          setMedia([]);
                          setReturnReason('');
                          setShowReturnModal(true);
                        }}
                      >
                        <Text style={[styles.actionBtnTxt, { color: '#EB5757' }]}>Return</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.actionBtn, { flex: 1, backgroundColor: '#F2F8FF', borderColor: '#D5E6FF', borderWidth: 1 }]} 
                        onPress={() => {
                          setSelectedItem(item);
                          setRequestType('Replace');
                          setMedia([]);
                          setReturnReason('');
                          setShowReturnModal(true);
                        }}
                      >
                        <Text style={[styles.actionBtnTxt, { color: THEME_COLORS.secondary }]}>Replace</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* SUMMARY */}
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text style={[styles.summaryValue, { color: '#27AE60' }]}>₹20.00</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount</Text>
            <Text style={[styles.summaryValue, { color: '#EB5757' }]}>-₹0.00</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Order Total</Text>
            <Text style={styles.totalValue}>₹{currentOrder.total.toFixed(2)}</Text>
          </View>
        </View>

        {currentOrder.status !== 'CANCELLED' && currentOrder.status !== 'DELIVERED' && currentOrder.status !== 'Refund Tracking' && (
          <TouchableOpacity style={styles.cancelBigBtn} onPress={handleCancelOrder} disabled={loading}>
            <Text style={styles.cancelBigBtnText}>{loading ? 'Cancelling...' : 'Cancel Order'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

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

      {/* Return/Replace Modal */}
      <Modal visible={showReturnModal} animationType="slide" transparent onRequestClose={() => setShowReturnModal(false)}>
        <View style={styles.reviewModalOverlay}>
          <View style={[styles.reviewModalSheet, { maxHeight: '90%' }]}>
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.reviewModalTitle, { marginBottom: 0 }]}>{requestType} Product</Text>
              <TouchableOpacity onPress={() => setShowReturnModal(false)}>
                <Text style={{ fontSize: 24, color: '#94A3B8' }}>×</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.reviewModalSub, { marginBottom: 12 }]}>{selectedItem?.name}</Text>

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
                      {item.type === 'video' && (
                        <View style={styles.videoIndicator}>
                          <Video size={12} color="#FFF" />
                        </View>
                      )}
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
              <Text style={styles.mediaHint}>You can upload up to 5 photos or videos.</Text>
              <Text style={[styles.mediaHint, { color: '#EB5757', marginTop: 10 }]}>Note: Returns/Replacements are accepted within 7 days of delivery for manufacturing defects.</Text>

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
  headerTitle: { fontSize: 16, fontWeight: '800', color: THEME_COLORS.primary, fontFamily: 'Plus Jakarta Sans' },

  scrollBody: { padding: 20, paddingBottom: 40 },

  card: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  orderIdLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 2 },
  orderIdValue: { fontSize: 16, fontWeight: '900', color: THEME_COLORS.text, fontFamily: 'Plus Jakarta Sans' },
  orderId: { fontSize: 18, fontWeight: '900', color: THEME_COLORS.text, fontFamily: 'Plus Jakarta Sans' },
  updatedTime: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginBottom: 12 },

  statusBadge: {
    backgroundColor: THEME_COLORS.primary + '15', alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 20,
    borderWidth: 1, borderColor: THEME_COLORS.primary + '30',
  },
  statusBadgeText: { color: THEME_COLORS.primary, fontSize: 11, fontWeight: '800', fontFamily: 'Plus Jakarta Sans', textTransform: 'uppercase' },

  timelineWrapper: {
    marginTop: 10,
    position: 'relative',
    paddingBottom: 10,
  },
  timelineLineBackground: {
    position: 'absolute',
    top: 16, // Half of 32px circle
    left: 35, // Half of 70px step
    right: 35,
    height: 2,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 0,
  },
  timelineStepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  timelineStep: { 
    alignItems: 'center', 
    width: 70,
  },
  iconCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2, borderColor: '#F1F5F9',
  },
  iconCircleCompleted: { backgroundColor: THEME_COLORS.primary, borderColor: THEME_COLORS.primary },
  iconCircleActive: { backgroundColor: THEME_COLORS.primary, borderColor: THEME_COLORS.primary },
  stepInfo: { alignItems: 'center', marginTop: 4 },
  stepLabel: { fontSize: 8, fontWeight: '800', color: '#94A3B8', textAlign: 'center', width: 70, textTransform: 'uppercase' },
  stepLabelActive: { color: THEME_COLORS.text },
  stepDate: { fontSize: 9, color: '#94A3B8', fontWeight: '600', marginTop: 1, textAlign: 'center' },
  timelineLine: { 
    flex: 1, 
    height: 2, 
    backgroundColor: '#F1F5F9', 
  },
  timelineLineCompleted: { backgroundColor: THEME_COLORS.primary },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: THEME_COLORS.text },
  deliveryDate: { fontSize: 18, fontWeight: '900', color: THEME_COLORS.primary, marginBottom: 20, fontFamily: 'Plus Jakarta Sans' },

  addressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F2F8FF', justifyContent: 'center', alignItems: 'center',
  },
  addressInfo: { flex: 1, marginLeft: 16 },
  addressLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 4 },
  addressText: { fontSize: 15, fontWeight: '800', color: THEME_COLORS.text, marginBottom: 4, fontFamily: 'Plus Jakarta Sans' },
  addressSub: { fontSize: 13, color: '#64748B', fontWeight: '500', lineHeight: 18 },

  trackBtn: {
    height: 48, borderRadius: 24, backgroundColor: THEME_COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  trackBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900', fontFamily: 'Plus Jakarta Sans' },

  itemCount: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  itemRow: {
    flexDirection: 'row', paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  itemImg: { width: 70, height: 70, borderRadius: 12, backgroundColor: '#F1F5F9' },
  itemInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  itemName: { fontSize: 15, fontWeight: '800', color: THEME_COLORS.text, fontFamily: 'Plus Jakarta Sans' },
  itemMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  itemQty: { fontSize: 12, fontWeight: '700', color: THEME_COLORS.text, marginTop: 4 },
  itemPrice: { fontSize: 14, fontWeight: '900', color: THEME_COLORS.primary, marginTop: 2, fontFamily: 'Plus Jakarta Sans' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  summaryValue: { fontSize: 14, color: THEME_COLORS.text, fontWeight: '700' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '900', color: THEME_COLORS.text },
  totalValue: { fontSize: 18, fontWeight: '900', color: THEME_COLORS.text },

  cancelBigBtn: {
    height: 56, borderRadius: 28, backgroundColor: '#FFF2F2',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, borderWidth: 1, borderColor: '#FFD5D5'
  },
  cancelBigBtnText: { color: '#EB5757', fontSize: 16, fontWeight: '800' },

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
  writeReviewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: THEME_COLORS.primary + '10',
    borderWidth: 1,
    borderColor: THEME_COLORS.primary + '30',
  },
  writeReviewTxt: {
    color: THEME_COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
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
  videoIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 2,
    borderRadius: 4,
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
  mediaHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 16,
  },
});
