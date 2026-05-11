import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Settings, Save, MapPin, ArrowLeft } from 'lucide-react-native';

import { THEME_COLORS } from '../theme';
import { useAuth } from '../context/AuthContext';
import { sanitizeData, userService } from '../services/api';
import { Platform } from 'react-native';

export default function SettingsScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [password, setPassword] = useState('');
  
  // Address fields
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const currentUserId = user?._id || user?.id;
      if (!currentUserId) return;

      const addrs = await userService.getAddresses(currentUserId);
      if (addrs && addrs.length > 0) {
        const first = addrs[0];
        setAddress(first.address || '');
        setCity(first.city || '');
        setState(first.state || '');
        setZip(first.zip || '');
        if (!phone && first.phone) {
          setPhone(first.phone);
        }
      }
    } catch (err) {
      console.warn('Failed to load addresses for settings, trying local:', err);
      const stored = await AsyncStorage.getItem('@UserAddresses');
      if (stored) {
        const addrs = JSON.parse(stored);
        if (addrs.length > 0) {
          const first = addrs[0];
          setAddress(first.address || '');
          setCity(first.city || '');
          setState(first.state || '');
          setZip(first.zip || '');
          if (!phone && first.phone) setPhone(first.phone);
        }
      }
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const currentUserId = user?._id || user?.id;
      if (!currentUserId) throw new Error('User not logged in');

      // Update Profile
      const updateData = { name, email, phone };
      if (password.trim().length > 0) {
        if (password.length < 6) {
          Alert.alert('Error', 'Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        updateData.password = password;
      }
      try {
        await userService.updateProfile(currentUserId, updateData);
        if (address || city || zip) {
          const addrData = {
            name: name,
            address: address,
            city: city,
            state: state,
            zip: zip,
            phone: phone,
            type: 'HOME'
          };
          await userService.addAddress(currentUserId, addrData);
        }
      } catch (e) {
        console.warn('Backend update failed, saving locally:', e);
      }

      await updateUser({ ...user, ...updateData });
      
      Alert.alert('Success', 'Profile settings updated locally!');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={THEME_COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionHeading}>Personal Information</Text>
        
        <View style={styles.section}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput 
            style={styles.input} 
            value={name} 
            onChangeText={setName} 
            placeholder="Enter your full name" 
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput 
            style={styles.input} 
            value={email} 
            onChangeText={setEmail} 
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="Enter your email" 
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput 
            style={styles.input} 
            value={phone} 
            onChangeText={setPhone} 
            keyboardType="phone-pad"
            placeholder="Enter your phone number" 
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>New Password (Optional)</Text>
          <TextInput 
            style={styles.input} 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry
            placeholder="Enter new password" 
          />
        </View>

        <Text style={[styles.sectionHeading, { marginTop: 10 }]}>Primary Address</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Street Address</Text>
          <TextInput 
            style={styles.input} 
            value={address} 
            onChangeText={setAddress} 
            placeholder="House No, Street, Area" 
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={[styles.section, { flex: 1 }]}>
            <Text style={styles.label}>City</Text>
            <TextInput 
              style={styles.input} 
              value={city} 
              onChangeText={setCity} 
              placeholder="City" 
            />
          </View>
          <View style={[styles.section, { flex: 1 }]}>
            <Text style={styles.label}>ZIP Code</Text>
            <TextInput 
              style={styles.input} 
              value={zip} 
              onChangeText={setZip} 
              keyboardType="number-pad"
              placeholder="Pincode" 
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, loading && { opacity: 0.7 }]} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Save size={18} color="#FFF" />
              <Text style={styles.saveTxt}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>


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
    backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#004694', 
    fontFamily: 'Plus Jakarta Sans' 
  },
  scroll: { padding: 20, paddingBottom: 50 },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME_COLORS.primary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Plus Jakarta Sans'
  },
  section: { marginBottom: 20 },
  label: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: THEME_COLORS.textSecondary, 
    marginBottom: 8,
    fontFamily: 'Plus Jakarta Sans' 
  },
  input: {
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 12, paddingHorizontal: 16, height: 50,
    fontSize: 15, color: THEME_COLORS.text, fontWeight: '600',
    fontFamily: 'Plus Jakarta Sans'
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: 14, backgroundColor: THEME_COLORS.secondary,
    marginTop: 20
  },
  saveTxt: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#FFF',
    fontFamily: 'Plus Jakarta Sans' 
  }
});
