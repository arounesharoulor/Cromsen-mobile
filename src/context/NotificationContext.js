import React, { createContext, useState, useContext, useCallback, useRef, useEffect } from 'react';
import { Animated, StyleSheet, Text, View, Dimensions, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell, CheckCircle, Info, AlertCircle, ShoppingCart, Heart, User } from 'lucide-react-native';
import { THEME_COLORS } from '../theme';
import { userService, productService } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id;
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastY = useRef(new Animated.Value(-50)).current;
  const orderUpdateListeners = useRef(new Set());

  const subscribeToOrderUpdates = useCallback((callback) => {
    orderUpdateListeners.current.add(callback);
    return () => {
      orderUpdateListeners.current.delete(callback);
    };
  }, []);

  // Load notifications from history when active user ID changes
  useEffect(() => {
    const loadNotifs = async () => {
      try {
        const notifKey = currentUserId ? `@UserNotifications_${currentUserId}` : '@UserNotifications_guest';
        const stored = await AsyncStorage.getItem(notifKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Deduplicate by id in case old notifications had duplicate Date.now() keys
          const seen = new Set();
          const unique = parsed.filter(n => {
            if (seen.has(n.id)) return false;
            seen.add(n.id);
            return true;
          });
          setNotifications(unique);
        } else {
          setNotifications([]);
        }
      } catch (e) {
        console.error('Error loading notifications:', e);
      }
    };
    loadNotifs();
  }, [currentUserId]);

  // Save notifications whenever they change
  useEffect(() => {
    const saveNotifs = async () => {
      try {
        const notifKey = currentUserId ? `@UserNotifications_${currentUserId}` : '@UserNotifications_guest';
        await AsyncStorage.setItem(notifKey, JSON.stringify(notifications));
      } catch (e) {
        console.error('Error saving notifications:', e);
      }
    };
    saveNotifs();
  }, [notifications, currentUserId]);

  const addNotification = useCallback((type, title, message, screen = null, params = null) => {
    // 1. Normalize and identify notification categories (case-insensitive)
    const notifTitle = (title || '').toLowerCase();
    const notifType = (type || '').toLowerCase();

    const isCartNotif = notifType === 'cart' || notifTitle.includes('cart');
    const isWishlistNotif = notifType === 'wishlist' || notifTitle.includes('wishlist');
    const isNewArrivalsNotif = notifTitle.includes('new arrivals') || notifTitle.includes('new arrival');
    const isProductUpdateNotif = notifTitle.includes('product') ||
      notifTitle.includes('price') ||
      notifTitle.includes('status') ||
      notifTitle.includes('stock') ||
      notifTitle.includes('out of stock') ||
      notifTitle.includes('back in stock') ||
      notifTitle.includes('category');

    // Order Status Notification Filter (Shipped, Delivered, Processing, Cancelled, Pending)
    const isOrderStatusNotif = notifTitle.includes('order') ||
      notifTitle.includes('ship') ||
      notifTitle.includes('deliver') ||
      notifTitle.includes('process') ||
      notifTitle.includes('cancel') ||
      notifTitle.includes('pending');

    // 2. Strict Filter Check: Only allow designated notifications
    const isAllowed = isCartNotif || isWishlistNotif || isNewArrivalsNotif || isProductUpdateNotif || isOrderStatusNotif;

    // Toast-Only overrides (e.g. Order Placed notification should come as toast, but not clutter history)
    const isOrderPlaced = notifTitle.includes('order placed');
    if (isOrderPlaced) {
      showToast(type, title || message);
      return;
    }

    if (!isAllowed) {
      console.log(`[Notification Filter] Ignored disallowed category: "${title}" (Type: ${type})`);
      return;
    }

    const newNotif = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      title,
      message,
      screen,
      params,
      time: 'Just now',
      read: false,
      date: new Date().toISOString()
    };

    setNotifications(prev => [newNotif, ...prev].slice(0, 50)); // Keep last 50
    showToast(type, title || message);
  }, []);

  const showToast = (type, message) => {
    console.log(`[Toast] Triggered: ${message}`);
    setToast({ type, message });

    toastOpacity.setValue(0);
    toastY.setValue(-50);

    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.spring(toastY, {
        toValue: 0,
        useNativeDriver: false,
        bounciness: 8,
        speed: 12,
      }),
    ]).start(() => {
      setTimeout(() => {
        hideToast();
      }, 3500);
    });
  };

  const hideToast = () => {
    Animated.timing(toastOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setToast(null);
    });
  };

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
    const notifKey = currentUserId ? `@UserNotifications_${currentUserId}` : '@UserNotifications_guest';
    AsyncStorage.removeItem(notifKey);
  };

  const checkOrderUpdates = useCallback(async (userId, userEmail) => {
    if (!userId) return;
    try {
      const data = await userService.getOrders(userId, userEmail);
      const rawOrders = Array.isArray(data) ? data : data.data || data.orders || [];
      if (rawOrders.length === 0) return;

      const backendOrders = rawOrders.map(o => ({
        id: String(o.orderId || o.id || o._id),
        status: String(o.status || 'ORDER CONFIRMED').toUpperCase()
      }));

      const ordersKey = `@UserOrders_${userId}`;
      const stored = await AsyncStorage.getItem(ordersKey);
      if (stored) {
        const localOrders = JSON.parse(stored).map(o => ({
          id: String(o.orderId || o.id || o._id),
          status: String(o.status || 'ORDER CONFIRMED').toUpperCase()
        }));

        backendOrders.forEach(newOrder => {
          const oldOrder = localOrders.find(o => o.id === newOrder.id);
          if (oldOrder && oldOrder.status !== newOrder.status) {
            console.log(`[Order Polling] Status change detected for ${newOrder.id} (${oldOrder.status} -> ${newOrder.status})`);

            const newStatus = newOrder.status.toUpperCase();
            let toastType = 'success';
            let title = `Order ${newStatus}`;

            if (newStatus.includes('CANCEL')) {
              toastType = 'error';
              title = 'Order Cancelled';
            } else if (newStatus.includes('SHIP')) {
              toastType = 'info';
              title = 'Order Shipped';
            } else if (newStatus.includes('DELIVERED') || newStatus.includes('DELIVER')) {
              toastType = 'success';
              title = 'Order Delivered';
            } else if (newStatus.includes('OUT') || newStatus.includes('WAY') || newStatus.includes('ROUTE')) {
              toastType = 'info';
              title = 'Out for Delivery';
            }

            const match = String(newOrder.id || newOrder.orderId).match(/(?:CIM|CIW|CIDM)?-?#?(\d+)/i);
            const displayId = match ? `CIM-${match[1]}` : (newOrder.id || newOrder.orderId);


            addNotification(
              toastType,
              title,
              `Status for Order ${displayId} has been updated to ${newStatus}.`,
              'Orders'
            );

            // Send email if status is refund, return, cancel, or payment failed
            if (['REFUND', 'RETURN', 'CANCEL', 'FAIL'].some(s => newStatus.includes(s))) {
              try {
                const uEmail = userEmail || user?.email;
                if (uEmail) {
                  userService.sendStatusEmail(uEmail, newStatus, {
                    orderId: newOrder.id,
                    status: newStatus
                  });
                }
              } catch (e) {}
            }

            // Notify listeners to trigger UI refresh
            orderUpdateListeners.current.forEach(cb => {
              try { cb(); } catch (e) { console.warn('Listener call failed:', e); }
            });
          }
        });
      }
      // Merge backend orders (rawOrders) and existing local orders to prevent deletion
      let mergedOrders = [...rawOrders];
      if (stored) {
        try {
          const localFullOrders = JSON.parse(stored);
          if (Array.isArray(localFullOrders)) {
            localFullOrders.forEach(lo => {
              const loId = String(lo.orderId || lo.id || lo._id);
              const existsById = mergedOrders.some(bo => String(bo.orderId || bo.id || bo._id) === loId);
              
              // Deduplicate ghost local orders that have a different generated ID but same paymentId
              const isOnlinePayment = lo.paymentId && lo.paymentId !== 'COD' && lo.paymentId !== 'Pending';
              const existsByPaymentId = isOnlinePayment && mergedOrders.some(bo => bo.paymentId === lo.paymentId);
              
              if (!existsById && !existsByPaymentId) {
                mergedOrders.push(lo);
              }
            });
          }
        } catch (parseErr) {
          console.warn('Failed to parse local orders in checkOrderUpdates:', parseErr);
        }
      }
      await AsyncStorage.setItem(ordersKey, JSON.stringify(mergedOrders));
    } catch (e) {
      console.warn('Order status polling failed:', e);
    }
  }, [addNotification]);

  const checkProductUpdates = useCallback(async () => {
    try {
      const data = await productService.getProducts({ limit: 100 });
      const backendProducts = data.products || data.data || (Array.isArray(data) ? data : []);
      if (backendProducts.length === 0) return;

      const stored = await AsyncStorage.getItem('@UserProductsCache');
      if (stored) {
        const localProducts = JSON.parse(stored);

        // Detect new products
        const newOnes = backendProducts.filter(bp => {
          const bpId = String(bp._id || bp.id);
          return !localProducts.find(lp => String(lp._id || lp.id) === bpId);
        });

        if (newOnes.length > 0) {
          console.log(`[Product Polling] Detected ${newOnes.length} new products`);
          addNotification(
            'success',
            'New Arrivals!',
            `${newOnes[0].name} and others are now available. Check them out!`,
            'AllProducts'
          );
        }

        // Detect price and status changes
        backendProducts.forEach(bp => {
          const bpId = String(bp._id || bp.id);
          const lp = localProducts.find(p => String(p._id || p.id) === bpId);
          if (lp) {
            // 1. Detect product status change (Active/Inactive or In Stock/Out of Stock)
            const oldStatus = String(lp.status || (lp.inStock !== false ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
            const newStatus = String(bp.status || (bp.inStock !== false ? 'ACTIVE' : 'INACTIVE')).toUpperCase();

            if (oldStatus !== newStatus) {
              console.log(`[Product Polling] Status change for ${bp.name}: ${oldStatus} -> ${newStatus}`);

              let title = 'Product Update 📦';
              let msg = `"${bp.name}" status is now ${newStatus.replace('_', ' ')}.`;
              let type = 'info';

              if (newStatus.includes('OUT') || newStatus.includes('INACTIVE') || newStatus.includes('OFF')) {
                type = 'error';
                title = 'Product Out of Stock ⚠️';
                msg = `"${bp.name}" is currently out of stock.`;
              } else if (newStatus.includes('IN_STOCK') || newStatus.includes('ACTIVE') || newStatus.includes('ON')) {
                type = 'success';
                title = 'Product Back in Stock! 🎉';
                msg = `"${bp.name}" is back in stock! Order yours now.`;
              }

              addNotification(type, title, msg, 'ProductDetail', { productId: bpId });
            }

            // 2. Detect other admin-side modifications (name, description, category)
            const hasNameChange = lp.name && bp.name && lp.name !== bp.name;
            const hasDescChange = lp.description && bp.description && lp.description !== bp.description;

            // Extract flat string keys if category is populated as an object
            const lpCatStr = typeof lp.category === 'object' && lp.category ? String(lp.category._id || lp.category.name || '') : String(lp.category || '');
            const bpCatStr = typeof bp.category === 'object' && bp.category ? String(bp.category._id || bp.category.name || '') : String(bp.category || '');
            const hasCategoryChange = lp.category && bp.category && lpCatStr !== bpCatStr;

            if (hasNameChange || hasDescChange || hasCategoryChange) {
              console.log(`[Product Polling] Admin modifications detected for ${bp.name}`);

              let updateType = 'Product Updated 📦';
              let updateMsg = `The product details for "${bp.name}" have been updated by the admin.`;

              if (hasNameChange) {
                updateType = 'Product Renamed 🏷️';
                updateMsg = `"${lp.name}" has been renamed to "${bp.name}".`;
              } else if (hasCategoryChange) {
                updateType = 'Product Category Updated 📁';
                updateMsg = `"${bp.name}" category is now updated.`;
              }

              addNotification(
                'info',
                updateType,
                updateMsg,
                'ProductDetail',
                { productId: bpId }
              );
            }
          }
        });
      }
      await AsyncStorage.setItem('@UserProductsCache', JSON.stringify(backendProducts));
    } catch (e) {
      console.warn('Product polling failed:', e);
    }
  }, [addNotification]);

  const getIcon = (type) => {
    switch (type) {
      case 'cart': return <ShoppingCart size={20} color="#FFF" />;
      case 'wishlist': return <Heart size={20} color="#FFF" fill="#FFF" />;
      case 'profile': return <User size={20} color="#FFF" />;
      case 'success': return <CheckCircle size={20} color="#FFF" />;
      case 'error': return <AlertCircle size={20} color="#FFF" />;
      case 'info': return <Info size={20} color="#FFF" />;
      default: return <Bell size={20} color="#FFF" />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case 'cart': return '#F26522'; // Premium warm brand orange
      case 'wishlist': return '#E11D48'; // Elegant Crimson Rose Pink
      case 'profile': return '#4F46E5'; // Sophisticated Indigo Blue
      case 'success': return '#059669'; // Premium Emerald Green
      case 'error': return '#DC2626'; // Deep Terracotta Red
      case 'info': return '#0EA5E9'; // Modern Sky Blue
      default: return '#004694'; // Brand Navy Blue
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications, addNotification, markAsRead, removeNotification, clearAll,
      checkOrderUpdates, checkProductUpdates, subscribeToOrderUpdates,
      toast, getIcon, getBgColor, toastOpacity, toastY, showToast
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 70 : 50,
    left: 20,
    right: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 999,
    zIndex: 999999,
  },
  toastIcon: {
    marginRight: 12,
  },
  toastText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    lineHeight: 20,
  },
});
