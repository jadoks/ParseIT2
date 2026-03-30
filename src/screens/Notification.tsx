import React, { useMemo, useState } from 'react';
import {
    FlatList,
    Pressable,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export type NotificationType =
  | 'assignment'
  | 'material'
  | 'community-answer'
  | 'support-activity';

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

interface NotificationScreenProps {
  onBack?: () => void;
  notifications?: NotificationItem[];
}

const Notification: React.FC<NotificationScreenProps> = ({
  onBack,
  notifications: incomingNotifications = [],
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(incomingNotifications);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const getNotificationIcon = (type: NotificationType, read: boolean) => {
    const color = read ? '#666' : '#D32F2F';

    switch (type) {
      case 'assignment':
        return <MaterialCommunityIcons name="clipboard-text-outline" size={22} color={color} />;
      case 'material':
        return <MaterialCommunityIcons name="book-open-page-variant-outline" size={22} color={color} />;
      case 'community-answer':
        return <MaterialCommunityIcons name="forum-outline" size={22} color={color} />;
      case 'support-activity':
        return <MaterialCommunityIcons name="lightbulb-on-outline" size={22} color={color} />;
      default:
        return <MaterialCommunityIcons name="bell-outline" size={22} color={color} />;
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <Pressable
      onPress={() => markAsRead(item.id)}
      style={[styles.card, !item.read && styles.unreadCard]}
    >
      <View style={styles.iconWrapper}>{getNotificationIcon(item.type, item.read)}</View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text style={styles.message}>{item.message}</Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </Pressable>

        <View style={styles.headerTextWrapper}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
          </Text>
        </View>

        <Pressable onPress={markAllAsRead} style={styles.markAllButton}>
          <Text style={styles.markAllText}>Mark all</Text>
        </Pressable>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="bell-check-outline" size={48} color="#999" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>You’re all caught up.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default Notification;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },

  backButton: {
    padding: 8,
    marginRight: 6,
  },

  headerTextWrapper: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#666',
  },

  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(211,47,47,0.08)',
  },

  markAllText: {
    color: '#D32F2F',
    fontWeight: '600',
    fontSize: 13,
  },

  listContent: {
    padding: 16,
    paddingBottom: 24,
  },

  card: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FAFAFA',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },

  unreadCard: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FFD7D7',
  },

  iconWrapper: {
    marginRight: 12,
    paddingTop: 2,
    width: 24,
    alignItems: 'center',
  },

  content: {
    flex: 1,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },

  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },

  time: {
    fontSize: 12,
    color: '#777',
  },

  message: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#444',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },

  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: '#777',
  },
});