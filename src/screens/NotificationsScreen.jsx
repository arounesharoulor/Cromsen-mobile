import React, { useMemo } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, SectionList, 
  StatusBar, Animated, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, ShoppingCart, CheckCircle, Info, Trash2, Clock, X, AlertCircle } from 'lucide-react-native';
import { THEME_COLORS } from '../styling';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationsScreen({ navigation }) {
  const { notifications, markAsRead, removeNotification, clearAll } = useNotifications();

  const sections = useMemo(() => {
    const groups = {};
    notifications.forEach(n => {
      const date = new Date(n.date || n.timestamp || Date.now());
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let title = '';
      if (date.toDateString() === today.toDateString()) title = 'Today';
      else if (date.toDateString() === yesterday.toDateString()) title = 'Yesterday';
      else title = date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });

      if (!groups[title]) groups[title] = [];
      groups[title].push(n);
    });

    return Object.keys(groups).map(title => ({
      title,
      data: groups[title]
    }));
  }, [notifications]);

  const getIcon = (type, read) => {
    let color = read ? '#94A3B8' : THEME_COLORS.primary;
    const size = 22;
    if (type === 'error' && !read) color = '#EF4444'; // Red for errors/cancellations
    
    switch (type) {
      case 'cart': return <ShoppingCart size={size} color={color} />;
      case 'success': return <CheckCircle size={size} color={color} />;
      case 'error': return <AlertCircle size={size} color={color} />;
      default: return <Bell size={size} color={color} />;
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handlePress = (item) => {
    markAsRead(item.id);
    if (item.screen) {
      navigation.navigate(item.screen, item.params || {});
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.cardWrapper}>
      <TouchableOpacity 
        style={[styles.notifCard, !item.read && styles.unreadCard]} 
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.iconBox, 
          !item.read && (item.type === 'error' ? { backgroundColor: '#FEE2E2' } : styles.unreadIconBox)
        ]}>
          {getIcon(item.type, item.read)}
        </View>
        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text style={[styles.notifTitle, !item.read && styles.unreadText]}>{item.title}</Text>
            <View style={styles.timeRow}>
              <Clock size={12} color="#94A3B8" />
              <Text style={styles.timeTxt}>{formatTime(item.date || item.timestamp)}</Text>
            </View>
          </View>
          <Text style={styles.notifMsg}>{item.message}</Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.deleteBtn} 
        onPress={() => removeNotification(item.id)}
      >
        <X size={16} color="#94A3B8" />
      </TouchableOpacity>
    </View>
  );

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={THEME_COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={clearAll} style={styles.clearAllBtn}>
          <Trash2 size={20} color={THEME_COLORS.error} />
        </TouchableOpacity>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Bell size={40} color="#CBD5E1" />
          </View>
          <Text style={styles.emptyTitle}>No Notifications Yet</Text>
          <Text style={styles.emptySubtitle}>We'll notify you about orders, arrivals, and profile updates.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: THEME_COLORS.primary },
  clearAllBtn: { padding: 4 },
  
  list: { padding: 16 },
  cardWrapper: { position: 'relative', marginBottom: 12 },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadCard: {
    borderColor: THEME_COLORS.primary + '20',
    backgroundColor: THEME_COLORS.primary + '05',
  },
  deleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    zIndex: 10,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  unreadIconBox: {
    backgroundColor: THEME_COLORS.primary + '15',
  },
  notifContent: { flex: 1, paddingRight: 20 },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: { fontSize: 15, fontWeight: '700', color: '#64748B' },
  unreadText: { color: THEME_COLORS.text, fontWeight: '900' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeTxt: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  notifMsg: { fontSize: 13, color: '#64748B', lineHeight: 18 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginRight: 12,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F1F5F9',
  },
});
