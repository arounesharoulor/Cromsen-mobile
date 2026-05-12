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
        }
      }
    } catch (error) {
      console.error('Error loading auth data:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (userData, password = null) => {
    const dataToStore = { ...userData };
    if (password) dataToStore.storedPassword = password;
    setUser(dataToStore);
    if (AsyncStorage) {
      await AsyncStorage.setItem('@AuthData', JSON.stringify(dataToStore));
    }
  };

  const logout = async () => {
    setUser(null);
    if (AsyncStorage) {
      await AsyncStorage.multiRemove([
        '@AuthData', 
        '@UserAddresses', 
        '@UserOrders', 
        '@cart_items', 
        '@wishlist_items'
      ]);
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
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
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
