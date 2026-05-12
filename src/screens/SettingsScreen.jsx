import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, StatusBar, 
  TextInput, Alert, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Mail, Phone, Lock, MapPin, ArrowLeft, Camera, Save } from 'lucide-react-native';

import { THEME_COLORS } from '../theme';
import { useAuth } from '../context/AuthContext';
import { userService, authService } from '../services/api';
import { useNotifications } from '../context/NotificationContext';

export default function SettingsScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const { addNotification } = useNotifications();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState(user?.storedPassword || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Address fields
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [origAddr, setOrigAddr] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const currentUserId = user?._id || user?.id;

  // Fetch fresh profile on focus
  useFocusEffect(
    React.useCallback(() => {
      const fetchProfile = async () => {
        if (!currentUserId) return;
        try {
          const profile = await authService.getProfile(currentUserId);
          const u = profile.user || profile.data || profile;
          if (u) {
            setName(u.name || '');
            setEmail(u.email || '');
            setPhone(u.phone || '');
            
            if (u.addresses && u.addresses.length > 0) {
              const addr = u.addresses[u.addresses.length - 1]; // Latest address
              setAddress(addr.street || addr.address || '');
              setCity(addr.city || '');
              setState(addr.state || '');
              setZip(addr.zip || addr.pincode || '');
            }
            
            // Keep context in sync
            updateUser({ ...user, ...u });
            return; // Success
          }
        } catch (err) {
          console.warn('Failed to fetch fresh profile:', err);
        }

        // FALLBACK: If backend fails or has no address, try local storage
        try {
          const stored = await AsyncStorage.getItem('@UserAddresses');
          if (stored) {
            const addrs = JSON.parse(stored);
            if (addrs && addrs.length > 0) {
              const addr = addrs[addrs.length - 1];
              setAddress(addr.address || addr.street || '');
              setCity(addr.city || '');
              setState(addr.state || '');
              setZip(addr.zip || addr.pincode || '');
            }
          }
        } catch (e) {
          console.warn('Local address fallback failed:', e);
        } finally {
          setIsFirstLoad(false);
        }
      };
      fetchProfile();
    }, [currentUserId])
  );

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const currentUserId = user?._id || user?.id;
      if (!currentUserId) return;

      // Fetch latest profile from backend
      const profile = await authService.getProfile(currentUserId);
      const userData = profile.user || profile.data || profile;
      
      if (userData) {
        setName(userData.name || '');
        setEmail(userData.email || '');
        setPhone(userData.phone || '');
      }

      const addrs = await userService.getAddresses(currentUserId);
      if (addrs && addrs.length > 0) {
        const first = addrs[0];
        setAddress(first.address || '');
        setCity(first.city || '');
        setState(first.state || '');
        setZip(first.zip || '');
        setOrigAddr(first);
        if (!phone && first.phone) {
          setPhone(first.phone);
        }
      }
    } catch (err) {
      console.warn('Failed to load profile details:', err);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const currentUserId = user?._id || user?.id;
      if (!currentUserId) throw new Error('User not logged in');

      const nameChanged = name !== user?.name;
      const emailChanged = email !== user?.email;
      const phoneChanged = phone !== (user?.phone || '');
      const pwdChanged = newPassword.trim().length > 0;
      const addrChanged = address !== (origAddr?.address || '') || 
                          city !== (origAddr?.city || '') || 
                          state !== (origAddr?.state || '') || 
                          zip !== (origAddr?.zip || '');
      const anythingChanged = nameChanged || emailChanged || phoneChanged || pwdChanged || addrChanged;

      if (anythingChanged && !currentPassword) {
        Alert.alert('Authentication Required', 'Your current password is required to save changes. Please enter it below.');
        setLoading(false);
        return;
      }

      if (pwdChanged) {
        if (newPassword.length < 6) {
          Alert.alert('Error', 'New password must be at least 6 characters');
          setLoading(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          Alert.alert('Error', 'Passwords do not match');
          setLoading(false);
          return;
        }
      }

      const updateData = { name, email, phone };
      if (pwdChanged) {
        updateData.currentPassword = currentPassword;
        updateData.password = newPassword;
      } else {
        // Even if password didn't change, we might need it for auth
        updateData.currentPassword = currentPassword;
      }

      // 1. Update Profile (Name, Email, Phone, Password)
      await userService.updateProfile(currentUserId, updateData);

      // 2. Update Address if provided
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
        try {
          await userService.addAddress(currentUserId, addrData, currentPassword);
        } catch (e) {
          console.warn('Address sync failed:', e);
        }
      }

      // 3. Update local auth context
      // If password was changed, update storedPassword
      const updatedPassword = pwdChanged ? newPassword : currentPassword;
      await updateUser({ ...user, ...updateData, phone }, updatedPassword);
      addNotification('success', 'Profile Updated', 'Your profile details have been saved successfully.', 'Settings');
      
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (label, value, onChange, icon, props = {}) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <View style={styles.iconBox}>{icon}</View>
        <TextInput 
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholderTextColor="#94A3B8"
          {...props}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={THEME_COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity disabled={loading} onPress={handleSave}>
          <Text style={[styles.headerSave, loading && { opacity: 0.5 }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <User size={40} color={THEME_COLORS.primary} />
              <TouchableOpacity style={styles.cameraBtn}>
                <Camera size={14} color="#FFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.avatarName}>{name || 'User'}</Text>
            <Text style={styles.avatarRole}>Cromsen Member</Text>
          </View>

          {/* Profile Details */}
          <Text style={styles.sectionTitle}>Profile Details</Text>
          <View style={styles.card}>
            {renderInput('Full Name', name, setName, <User size={18} color="#64748B" />, { placeholder: 'Your name' })}
            {renderInput('Email Address', email, setEmail, <Mail size={18} color="#64748B" />, { 
              placeholder: 'name@example.com',
              keyboardType: 'email-address',
              autoCapitalize: 'none'
            })}
            {renderInput('Phone Number', phone, (v) => setPhone(v.replace(/[^0-9]/g, '').slice(0, 10)), <Phone size={18} color="#64748B" />, { 
              placeholder: '10-digit number',
              keyboardType: 'phone-pad',
              maxLength: 10
            })}
          </View>

          {/* Security */}
          <Text style={styles.sectionTitle}>Security & Password</Text>
          <View style={styles.card}>
            {renderInput('Current Password', currentPassword, setCurrentPassword, <Lock size={18} color="#64748B" />, { 
              placeholder: 'Verify current password',
              secureTextEntry: true
            })}
            {renderInput('New Password', newPassword, setNewPassword, <Lock size={18} color="#64748B" />, { 
              placeholder: 'Minimum 6 characters',
              secureTextEntry: true
            })}
            {renderInput('Confirm New Password', confirmPassword, setConfirmPassword, <Lock size={18} color="#64748B" />, { 
              placeholder: 'Re-enter new password',
              secureTextEntry: true
            })}
          </View>

          {/* Address */}
          <Text style={styles.sectionTitle}>Shipping Information</Text>
          <View style={styles.card}>
            {renderInput('Street Address', address, setAddress, <MapPin size={18} color="#64748B" />, { placeholder: 'House/Building/Street' })}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1.5 }}>
                {renderInput('City', city, setCity, null, { placeholder: 'City' })}
              </View>
              <View style={{ flex: 1 }}>
                {renderInput('ZIP Code', zip, setZip, null, { keyboardType: 'number-pad', placeholder: 'ZIP' })}
              </View>
            </View>
            {renderInput('State', state, setState, null, { placeholder: 'State/Province' })}
          </View>

          <TouchableOpacity 
            style={[styles.mainSaveBtn, loading && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Save size={20} color="#FFF" />
                <Text style={styles.mainSaveTxt}>Update Profile</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  headerSave: { fontSize: 16, fontWeight: '800', color: THEME_COLORS.secondary },
  
  scroll: { padding: 20, paddingBottom: 60 },

  /* Avatar */
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, position: 'relative',
  },
  cameraBtn: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: THEME_COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#FFF',
  },
  avatarName: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  avatarRole: { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 2 },

  /* Card and Inputs */
  sectionTitle: { fontSize: 13, fontWeight: '900', color: '#64748B', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 25,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 8, marginLeft: 2 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
    height: 52, paddingHorizontal: 12,
  },
  iconBox: { width: 32, alignItems: 'center' },
  input: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1E293B', marginLeft: 8 },

  /* Main Button */
  mainSaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME_COLORS.primary, height: 56, borderRadius: 16,
    gap: 10, marginTop: 10,
    shadowColor: THEME_COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  mainSaveTxt: { color: '#FFF', fontSize: 17, fontWeight: '900' },
});

