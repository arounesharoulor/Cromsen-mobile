import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { userService, authService } from '../services/api';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id;
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const loadCart = async () => {
      try {
        const cartKey = currentUserId ? `@cart_items_${currentUserId}` : '@cart_items_guest';
        const stored = await AsyncStorage.getItem(cartKey);
        let localCart = [];
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            localCart = parsed;
          }
        }
        
        if (currentUserId) {
          try {
            const profileRes = await authService.getProfile(currentUserId);
            const userProfile = profileRes.user || profileRes.data || profileRes;
            if (userProfile && userProfile.cart && Array.isArray(userProfile.cart)) {
               if (userProfile.cart.length > 0 || localCart.length === 0) {
                 localCart = userProfile.cart;
                 await AsyncStorage.setItem(cartKey, JSON.stringify(localCart));
               }
            }
          } catch(err) {
             console.warn('Failed to fetch backend cart', err);
          }
        }

        setCartItems(localCart);
      } catch (e) {
        console.error('Error loading cart', e);
      }
    };
    loadCart();
  }, [currentUserId]);

  useEffect(() => {
    const saveCart = async () => {
      try {
        const cartKey = currentUserId ? `@cart_items_${currentUserId}` : '@cart_items_guest';
        await AsyncStorage.setItem(cartKey, JSON.stringify(cartItems));

        if (currentUserId) {
          try {
             await userService.updateProfile(currentUserId, { 
                cart: cartItems,
                currentPassword: user?.storedPassword 
             });
          } catch(err) {
             console.warn('Failed to sync cart to backend', err);
          }
        }
      } catch (e) {
        console.error('Error saving cart', e);
      }
    };
    saveCart();
  }, [cartItems, currentUserId]);

  const addToCart = (product, quantity = 1) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, ...product, quantity: item.quantity + quantity } : item
        );
      }

      return [...prev, { ...product, quantity }];
    });
  };

  const removeFromCart = (id) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id, delta) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = Array.isArray(cartItems) 
    ? cartItems.reduce((total, item) => total + (item?.quantity || 0), 0)
    : 0;

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
