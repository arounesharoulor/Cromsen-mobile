import React, { createContext, useState, useContext, useCallback, useRef, useEffect } from 'react';
import { Animated, StyleSheet, Text, View, Dimensions, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell, CheckCircle, Info, AlertCircle, ShoppingCart } from 'lucide-react-native';
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

  // Load notifications from history when active user ID changes
  useEffect(() => {
    const loadNotifs = async () => {
      try {
        const notifKey = currentUserId ? `@UserNotifications_${currentUserId}` : '@UserNotifications_guest';
        const stored = await AsyncStorage.getItem(notifKey);
        if (stored) {
          setNotifications(JSON.parse(stored));
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
    const newNotif = {
      id: Date.now().toString(),
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
        useNativeDriver: true,
      }),
      Animated.spring(toastY, {
        toValue: 0,
        useNativeDriver: true,
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
      useNativeDriver: true,
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
        id: String(o._id || o.id),
        status: String(o.status || 'ORDER CONFIRMED').toUpperCase()
      }));

      const ordersKey = `@UserOrders_${userId}`;
      const stored = await AsyncStorage.getItem(ordersKey);
      if (stored) {
        const localOrders = JSON.parse(stored).map(o => ({
          id: String(o._id || o.id),
          status: String(o.status || 'ORDER CONFIRMED').toUpperCase()
        }));

        backendOrders.forEach(newOrder => {
          const oldOrder = localOrders.find(o => o.id === newOrder.id);
          if (oldOrder && oldOrder.status !== newOrder.status) {
            console.log(`[Order Polling] Status change detected for ${newOrder.id}`);
            const isCancelled = newOrder.status.includes('CANCELLED') || newOrder.status.includes('CANCEL');
            
            addNotification(
              isCancelled ? 'error' : 'success', 
              `Order ${newOrder.status}`, 
              `Status for Order #${newOrder.id.slice(-6)} has been updated to ${newOrder.status}.`, 
              'Orders'
            );
          }
        });
      }
      await AsyncStorage.setItem(ordersKey, JSON.stringify(rawOrders));
    } catch (e) {
      console.warn('Order status polling failed:', e);
    }
  }, [addNotification]);

  const checkProductUpdates = useCallback(async () => {
    try {
      const data = await productService.getProducts({ limit: 20 });
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

        // Detect price changes
        backendProducts.forEach(bp => {
          const bpId = String(bp._id || bp.id);
          const lp = localProducts.find(p => String(p._id || p.id) === bpId);
          if (lp && Number(lp.price) !== Number(bp.price)) {
            console.log(`[Product Polling] Price change for ${bp.name}`);
            addNotification(
              'info', 
              'Price Dropped!', 
              `The price for ${bp.name} has been updated. View details.`, 
              'ProductDetail', 
              { productId: bpId }
            );
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
      case 'success': return <CheckCircle size={20} color="#FFF" />;
      case 'error': return <AlertCircle size={20} color="#FFF" />;
      default: return <Bell size={20} color="#FFF" />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case 'cart': return THEME_COLORS.primary;
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      default: return THEME_COLORS.secondary;
    }
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, addNotification, markAsRead, removeNotification, clearAll, 
      checkOrderUpdates, checkProductUpdates 
    }}>
      {children}
      
      {toast && (
        <Animated.View 
          style={[
            styles.toastContainer, 
            { 
              opacity: toastOpacity,
              transform: [{ translateY: toastY }],
              backgroundColor: getBgColor(toast.type)
            }
          ]}
        >
          <View style={styles.toastIcon}>
            {getIcon(toast.type)}
          </View>
          <Text style={styles.toastText} numberOfLines={2}>{toast.message}</Text>
        </Animated.View>
      )}
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
    elevation: 10,
    zIndex: 99999,
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
