import React, { useMemo } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, SectionList, 
  StatusBar, Animated, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, ShoppingCart, CheckCircle, Info, Trash2, Clock, X, AlertCircle, Heart, User } from 'lucide-react-native';
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
    const size = 22;
    if (read) {
      switch (type) {
        case 'cart': return <ShoppingCart size={size} color="#94A3B8" />;
        case 'wishlist': return <Heart size={size} color="#94A3B8" fill="#94A3B8" />;
        case 'profile': return <User size={size} color="#94A3B8" />;
        case 'success': return <CheckCircle size={size} color="#94A3B8" />;
        case 'error': return <AlertCircle size={size} color="#94A3B8" />;
        case 'info': return <Info size={size} color="#94A3B8" />;
        default: return <Bell size={size} color="#94A3B8" />;
      }
    }

    switch (type) {
      case 'cart': return <ShoppingCart size={size} color="#F26522" />;
      case 'wishlist': return <Heart size={size} color="#E11D48" fill="#E11D48" />;
      case 'profile': return <User size={size} color="#4F46E5" />;
      case 'success': return <CheckCircle size={size} color="#059669" />;
      case 'error': return <AlertCircle size={size} color="#DC2626" />;
      case 'info': return <Info size={size} color="#0EA5E9" />;
      default: return <Bell size={size} color="#004694" />;
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
        activeOpacity={0.8}
      >
        {/* Accent Bar */}
        <View style={[styles.accentBar, { backgroundColor: getIcon(item.type, false).props.color }]} />
        
        <View style={styles.contentContainer}>
          <View style={[
            styles.iconBox, 
            !item.read && (item.type === 'error' ? { backgroundColor: '#FEE2E2' } : styles.unreadIconBox)
          ]}>
            {getIcon(item.type, item.read)}
          </View>
          
          <View style={styles.textContainer}>
            <View style={styles.notifHeader}>
              <Text style={[styles.notifTitle, !item.read && styles.unreadText]} numberOfLines={1}>
                {item.title}
              </Text>
              {!item.read && <View style={styles.unreadDot} />}
            </View>
            
            <Text style={styles.notifMsg} numberOfLines={2}>
              {item.message}
            </Text>
            
            <View style={styles.footerRow}>
              <View style={styles.timeRow}>
                <Clock size={11} color="#94A3B8" />
                <Text style={styles.timeTxt}>{formatTime(item.date || item.timestamp)}</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.inlineDeleteBtn} 
                onPress={() => removeNotification(item.id)}
              >
                <X size={14} color="#94A3B8" />
                <Text style={styles.deleteLabel}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={THEME_COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Updates & Alerts</Text>
        <TouchableOpacity onPress={clearAll} style={styles.clearAllBtn}>
          <Text style={styles.clearAllTxt}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Bell size={40} color="#CBD5E1" />
          </View>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtitle}>No new notifications at the moment.</Text>
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
  container: { flex: 1, backgroundColor: '#FAFBFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 18, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  clearAllBtn: { 
    paddingHorizontal: 12, paddingVertical: 6, 
    borderRadius: 8, backgroundColor: '#FEF2F2' 
  },
  clearAllTxt: { fontSize: 12, fontWeight: '800', color: THEME_COLORS.error },
  
  list: { padding: 16, paddingBottom: 40 },
  cardWrapper: { marginBottom: 16 },
  notifCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  unreadCard: {
    backgroundColor: '#FFF',
    borderColor: THEME_COLORS.primary + '15',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  contentContainer: {
    flexDirection: 'row',
    padding: 16,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  unreadIconBox: {
    backgroundColor: THEME_COLORS.primary + '08',
    borderColor: THEME_COLORS.primary + '15',
  },
  textContainer: { flex: 1 },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: { fontSize: 15, fontWeight: '800', color: '#334155' },
  unreadText: { color: '#0F172A' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME_COLORS.primary,
  },
  notifMsg: { 
    fontSize: 13, 
    color: '#64748B', 
    lineHeight: 18,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 10,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeTxt: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
  inlineDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8' },

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
