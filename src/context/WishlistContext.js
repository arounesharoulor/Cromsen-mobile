import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
  const [wishlistItems, setWishlistItems] = useState([]);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const stored = await AsyncStorage.getItem('@wishlist');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setWishlistItems(parsed);
      }
    } catch (e) {
      console.error('Failed to load wishlist', e);
    }
  };

  const saveWishlist = async (items) => {
    try {
      await AsyncStorage.setItem('@wishlist', JSON.stringify(items));
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
        image: product.image || product.images?.[0],
      }];
      saveWishlist(updated);
      return updated;
    });
  };

  const removeFromWishlist = (id) => {
    setWishlistItems(prev => {
      const updated = prev.filter(i => i.id !== id);
      saveWishlist(updated);
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
