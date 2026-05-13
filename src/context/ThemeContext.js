import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const LIGHT_THEME = {
  primary: '#004694',
  secondary: '#F26522',
  cartBtn: '#FCD7CF',
  darkNavy: '#0C1821',
  background: '#EFF1F3',
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#4F4F4F',
  border: '#E0E0E0',
  error: '#FF3B30',
  success: '#34C759',
  card: '#FFFFFF',
  input: '#F8FAFC',
};

export const DARK_THEME = {
  primary: '#6366F1', // Indigo primary
  secondary: '#F59E0B', // Amber secondary
  cartBtn: '#312E81',
  darkNavy: '#F8FAFC',
  background: '#0F172A', // Deep Midnight Blue
  surface: '#1E293B', // Slate Surface
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  border: '#334155',
  error: '#EF4444',
  success: '#10B981',
  card: '#1E293B',
  input: '#0F172A',
};

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const stored = await AsyncStorage.getItem('@DarkMode');
      if (stored !== null) {
        setIsDarkMode(stored === 'true');
      } else {
        setIsDarkMode(systemScheme === 'dark');
      }
    } catch (e) {}
  };

  const toggleTheme = async () => {
    const newVal = !isDarkMode;
    setIsDarkMode(newVal);
    await AsyncStorage.setItem('@DarkMode', String(newVal));
  };

  const theme = isDarkMode ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
