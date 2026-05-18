import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, StatusBar, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapPin, Plus, Trash2, X, ArrowLeft, ChevronDown } from 'lucide-react-native';
import { sanitizeData, userService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { THEME_COLORS } from '../theme';
import { BackIcon } from '../components/CustomIcons';
import { EmptyState } from '../components';

export default function AddressesScreen({ navigation }) {
  const [addresses, setAddresses] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ 
    type: 'HOME', name: '', address: '', line2: '', city: '', state: '', zip: '', phone: '' 
  });



  const { user } = useAuth();

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const currentUserId = user?._id || user?.id;
      if (!currentUserId) return;

      const addressKey = `@UserAddresses_${currentUserId}`;

      // Fetch from backend
      const data = await userService.getAddresses(currentUserId);
      const backendAddrs = Array.isArray(data) ? data : data.data || data.addresses || [];
      
      if (backendAddrs.length > 0) {
        setAddresses(backendAddrs);
        await AsyncStorage.setItem(addressKey, JSON.stringify(backendAddrs));
      } else {
        const stored = await AsyncStorage.getItem(addressKey);
        if (stored) setAddresses(JSON.parse(stored));
      }
    } catch (e) { 
      console.error('Error loading addresses:', e);
      const currentUserId = user?._id || user?.id;
      if (currentUserId) {
        const stored = await AsyncStorage.getItem(`@UserAddresses_${currentUserId}`);
        if (stored) setAddresses(JSON.parse(stored));
      }
    }
  };

  const handleDelete = async (id) => {
    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const currentUserId = user?._id || user?.id;
          if (currentUserId) {
            try {
              await userService.deleteAddress(currentUserId, id);
            } catch (err) {
              console.warn('Backend delete failed, removing locally:', err);
            }
          }
          const filtered = addresses.filter(a => (a.id !== id && a._id !== id));
          setAddresses(filtered);
          if (currentUserId) {
            await AsyncStorage.setItem(`@UserAddresses_${currentUserId}`, JSON.stringify(filtered));
          }
        } catch (e) {
          Alert.alert('Error', 'Failed to delete address from server.');
        }
      }}
    ]);
  };

  const handleSave = async () => {
    if (!form.name || !form.address || !form.city || !form.zip || !form.phone) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    const currentUserId = user?._id || user?.id;
    const fullAddr = `${form.address}, ${form.line2 ? form.line2 + ', ' : ''}${form.city}, ${form.state} - ${form.zip}`;
    const raw = {
      firstName: form.name, countryCode: '+91', mobile: form.phone.replace(/^\+91\s?/, ''),
      pincode: form.zip, state: form.state, city: form.city, line1: form.address, line2: form.line2, saveAs: form.type
    };
    
    // Ensure phone has the prefix when saving
    // Ensure phone stores only digits, country code is separate
    const mobileDigits = form.phone.replace(/[^0-9]/g, '').slice(-10);
    const newAddr = { 
      ...form, 
      phone: mobileDigits, 
      countryCode: '+91', // Defaulting to India for this screen as well
      id: editingId || Date.now().toString(), 
      full: fullAddr, 
      raw 
    };

    try {
      if (currentUserId) {
        try {
          await userService.addAddress(currentUserId, newAddr, user?.storedPassword);
        } catch (err) {
          console.warn('Backend save failed, saving locally:', err);
        }
      }

      let updated;
      if (editingId) {
        updated = addresses.map(a => (a.id === editingId || a._id === editingId) ? newAddr : a);
      } else {
        updated = [...addresses, newAddr];
      }

      setAddresses(updated);
      if (currentUserId) {
        await AsyncStorage.setItem(`@UserAddresses_${currentUserId}`, JSON.stringify(updated));
      }
      setModalVisible(false);
      loadAddresses();
    } catch (e) {
      Alert.alert('Error', 'Failed to save address to server.');
    }
  };

  const openForm = (addr = null) => {
    if (addr) {
      setEditingId(addr._id || addr.id);
      // Recovery logic for addresses saved with older structure
      const initialForm = {
        type: addr.type || addr.raw?.saveAs || 'HOME',
        name: addr.name || addr.raw?.firstName || '',
        address: addr.address || addr.raw?.line1 || '',
        line2: addr.line2 || addr.raw?.line2 || '',
        city: addr.city || addr.raw?.city || '',
        state: addr.state || addr.raw?.state || '',
        zip: addr.zip || addr.raw?.pincode || '',
        phone: addr.phone || (addr.raw?.mobile ? `${addr.raw?.countryCode || '+91'} ${addr.raw?.mobile}` : '') || '',
      };
      setForm(initialForm);
    } else {
      setEditingId(null);
      setForm({ 
        type: 'HOME', name: '', address: '', line2: '', city: '', state: '', zip: '', phone: '' 
      });
    }
    setModalVisible(true);
  };



  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={THEME_COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Addresses</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => openForm(null)}>
          <Plus size={20} color={THEME_COLORS.primary} />
        </TouchableOpacity>

      </View>

      {addresses.length === 0 ? (
        <EmptyState
          icon={<MapPin size={52} color={THEME_COLORS.border} />}
          title="No Addresses Found"
          subtitle="You haven't saved any delivery addresses yet."
        />
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(a, idx) => a._id || a.id || String(idx)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openForm(item)}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MapPin size={20} color="#F4712F" />
                  <Text style={styles.cardType}>{(item.type || 'Home').toUpperCase()}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.delBtn}>
                  <Trash2 size={18} color="#EB5757" />
                </TouchableOpacity>
              </View>
              <Text style={styles.addressName}>{item.name}</Text>
              <Text style={styles.addressText}>{item.address}</Text>
              {item.line2 ? <Text style={styles.addressText}>{item.line2}</Text> : null}
              <Text style={styles.addressText}>{item.city}, {item.state} - {item.zip}</Text>
              <Text style={styles.addressText}>{item.phone}</Text>

            </TouchableOpacity>

          )}
        />
      )}

      {/* ADD/EDIT MODAL */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Address' : 'Add Address'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><X size={24} color="#000" /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Name *</Text>

              <TextInput style={styles.input} value={form.name} onChangeText={v => setForm({...form, name: v})} placeholder="Full Name" />
              
              <Text style={styles.label}>Address Line *</Text>
              <TextInput style={styles.input} value={form.address} onChangeText={v => setForm({...form, address: v})} placeholder="House No, Street, Area" />
              
              <Text style={styles.label}>Address Line 2 (Optional)</Text>
              <TextInput style={styles.input} value={form.line2} onChangeText={v => setForm({...form, line2: v})} placeholder="Apartment, suite, etc." />

              <Text style={styles.label}>City *</Text>
              <TextInput style={styles.input} value={form.city} onChangeText={v => setForm({...form, city: v})} placeholder="City" />
              
              <Text style={styles.label}>State *</Text>
              <TextInput style={styles.input} value={form.state} onChangeText={v => setForm({...form, state: v})} placeholder="State" />

              <Text style={styles.label}>ZIP/Pincode *</Text>

              <TextInput style={styles.input} value={form.zip} onChangeText={v => setForm({...form, zip: v})} keyboardType="number-pad" placeholder="Pincode" />
              
              <Text style={styles.label}>Phone Number *</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.input, { width: 80, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 4 }]}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: THEME_COLORS.text }}>+91</Text>
                  <ChevronDown size={14} color={THEME_COLORS.textSecondary} />
                </View>
                <TextInput 
                  style={[styles.input, { flex: 1 }]} 
                  value={form.phone.replace(/^\+91\s?/, '')} 
                  onChangeText={v => setForm({...form, phone: v})} 
                  keyboardType="phone-pad" 
                  placeholder="98765 43210" 
                />
              </View>
              
              <TouchableOpacity style={styles.saveModalBtn} onPress={handleSave}>
                <Text style={styles.saveModalTxt}>Save Address</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: THEME_COLORS.primary, fontFamily: 'Plus Jakarta Sans' },
  list: { padding: 20 },
  card: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardType: { fontSize: 14, fontWeight: '800', color: THEME_COLORS.text, fontFamily: 'Plus Jakarta Sans' },
  delBtn: { padding: 4 },
  addressText: { fontSize: 14, color: THEME_COLORS.textSecondary, marginBottom: 4, fontFamily: 'Plus Jakarta Sans' },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: THEME_COLORS.primary, fontFamily: 'Plus Jakarta Sans' },
  label: { fontSize: 13, fontWeight: '700', color: THEME_COLORS.textSecondary, marginBottom: 8, marginTop: 12, fontFamily: 'Plus Jakarta Sans' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, height: 50, fontSize: 15, color: THEME_COLORS.text, fontWeight: '600', fontFamily: 'Plus Jakarta Sans' },
  saveModalBtn: { backgroundColor: THEME_COLORS.primary, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 30, marginBottom: 20 },
  saveModalTxt: { color: '#FFF', fontSize: 16, fontWeight: '800', fontFamily: 'Plus Jakarta Sans' }
});
