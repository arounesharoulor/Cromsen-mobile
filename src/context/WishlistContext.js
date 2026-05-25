import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import { userService, authService } from '../services/api';

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
  const { user, logout } = useAuth();
  const { addNotification } = useNotifications();
  const currentUserId = user?._id || user?.id;
  const [wishlistItems, setWishlistItems] = useState([]);

  useEffect(() => {
    const loadWishlist = async () => {
      try {
        const wishlistKey = currentUserId ? `@wishlist_${currentUserId}` : '@wishlist_guest';
        const stored = await AsyncStorage.getItem(wishlistKey);
        let localWishlist = [];
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            localWishlist = parsed;
          }
        }
        
        if (currentUserId) {
          try {
            const profileRes = await authService.getProfile(currentUserId);
            const userProfile = profileRes.user || profileRes.data || profileRes;
            if (userProfile && userProfile.wishlist && Array.isArray(userProfile.wishlist)) {
               if (userProfile.wishlist.length > 0 || localWishlist.length === 0) {
                 localWishlist = userProfile.wishlist;
                 await AsyncStorage.setItem(wishlistKey, JSON.stringify(localWishlist));
               }
            }
          } catch(err) {
             console.warn('Failed to fetch backend wishlist', err);
             if (err.message && err.message.toLowerCase().includes('user not found')) {
                 if (logout) logout();
             }
          }
        }
        
        setWishlistItems(localWishlist);
      } catch (e) {
        console.error('Failed to load wishlist', e);
      }
    };
    loadWishlist();
  }, [currentUserId]);

  const saveWishlist = async (items) => {
    try {
      const wishlistKey = currentUserId ? `@wishlist_${currentUserId}` : '@wishlist_guest';
      await AsyncStorage.setItem(wishlistKey, JSON.stringify(items));
      
      if (currentUserId) {
        try {
           await userService.updateProfile(currentUserId, { 
              wishlist: items,
              currentPassword: user?.storedPassword 
           });
        } catch(err) {
           console.warn('Failed to sync wishlist to backend', err);
           if (err.message && err.message.toLowerCase().includes('user not found')) {
               if (logout) logout();
           }
        }
      }
    } catch (e) {
      console.error('Failed to save wishlist', e);
    }
  };

  const addToWishlist = (product) => {
    setWishlistItems(prev => {
      const exists = prev.find(i => i.id === (product._id || product.id));
      if (exists) return prev;
      const updated = [...prev, {
        id: product._id || product.id,
        name: product.name,
        price: product.price,
        dealerPrice: product.dealerPrice,
        retailPrice: product.retailPrice,
        image: product.image || product.images?.[0],
      }];
      saveWishlist(updated);
      
      try {
        addNotification(
          'wishlist',
          'Added to Wishlist ✓',
          `"${product.name}" has been added to your wishlist.`,
          'Wishlist'
        );
      } catch (e) {
        console.warn('Toast failed in Wishlist:', e);
      }
      
      return updated;
    });
  };

  const removeFromWishlist = (id) => {
    setWishlistItems(prev => {
      const item = prev.find(i => i.id === id);
      const name = item ? item.name : 'Product';
      const updated = prev.filter(i => i.id !== id);
      saveWishlist(updated);
      
      try {
        addNotification(
          'wishlist',
          'Removed from Wishlist',
          `"${name}" has been removed from your wishlist.`,
          'Wishlist'
        );
      } catch (e) {
        console.warn('Toast failed in Wishlist:', e);
      }
      
      return updated;
    });
  };

  const isWishlisted = (id) => wishlistItems.some(i => i.id === id);

  const toggleWishlist = (product) => {
    const id = product._id || product.id;
    if (isWishlisted(id)) removeFromWishlist(id);
    else addToWishlist(product);
  };

  return (
    <WishlistContext.Provider value={{
      wishlistItems,
      addToWishlist,
      removeFromWishlist,
      isWishlisted,
      toggleWishlist,
      wishlistCount: wishlistItems.length,
    }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
};
