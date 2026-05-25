import React, { createContext, useState, useContext, useEffect } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      if (AsyncStorage) {
        const authDataSerialized = await AsyncStorage.getItem('@AuthData');
        if (authDataSerialized) {
          const _authData = JSON.parse(authDataSerialized);
          setUser(_authData);
          // Background sync on app launch - pass local data to avoid state deletion
          syncUserData(_authData._id || _authData.id, _authData.email, _authData);
        }
      }
    } catch (error) {
      console.error('Error loading auth data:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncUserData = async (userId, userEmail, localAuthData = null) => {
    if (!userId) return;
    try {
      const { authService, userService } = require('../services/api');
      
      // 1. Sync Profile
      try {
        const profile = await authService.getProfile(userId);
        const u = profile.user || profile.data || profile;
        if (u) {
          const baseData = localAuthData || user || {};
          const updated = { ...baseData, ...u };
          // Preserve securely stored password
          if (baseData.storedPassword) {
            updated.storedPassword = baseData.storedPassword;
          }
          setUser(updated);
          await AsyncStorage.setItem('@AuthData', JSON.stringify(updated));
        }
      } catch (e) {
        if (e.message && e.message.toLowerCase().includes('user not found')) {
          console.warn('[AUTH] User not found on backend. Logging out locally.');
          logout();
          return;
        }
      }

      // 2. Sync Addresses
      try {
        const addrs = await userService.getAddresses(userId);
        if (addrs && addrs.length > 0) {
          await AsyncStorage.setItem(`@UserAddresses_${userId}`, JSON.stringify(addrs));
        }
      } catch (e) {}

      // 3. Sync Orders
      try {
        const orders = await userService.getOrders(userId, userEmail);
        if (orders && orders.length > 0) {
          await AsyncStorage.setItem(`@UserOrders_${userId}`, JSON.stringify(orders));
        }
      } catch (e) {}

    } catch (e) {
      console.warn('Background sync failed:', e);
    }
  };

  const login = async (userData, password = null) => {
    const dataToStore = { ...userData };
    if (password) dataToStore.storedPassword = password;
    setUser(dataToStore);
    if (AsyncStorage) {
      await AsyncStorage.setItem('@AuthData', JSON.stringify(dataToStore));
    }
    // Background sync - pass dataToStore to preserve storedPassword
    syncUserData(userData._id || userData.id, userData.email, dataToStore);
  };

  const logout = async () => {
    setUser(null);
    if (AsyncStorage) {
      // Per user request, we keep addresses, orders, etc. permanent
      await AsyncStorage.removeItem('@AuthData');
    }
  };

  const updateUser = async (newUserData, password = null) => {
    const dataToStore = { ...newUserData };
    if (password) dataToStore.storedPassword = password;
    else if (user?.storedPassword) dataToStore.storedPassword = user.storedPassword;
    
    setUser(dataToStore);
    if (AsyncStorage) {
      await AsyncStorage.setItem('@AuthData', JSON.stringify(dataToStore));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, syncUserData, loading }}>
      {children}

    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
