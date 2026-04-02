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

/* 🔥 SAMPLE DATA */
const SAMPLE_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    type: 'assignment',
    title: 'New Assignment Posted',
    message: 'You created a new assignment in Web Development.',
    time: '2 min ago',
    read: false,
  },
  {
    id: '2',
    type: 'material',
    title: 'Material Uploaded',
    message: 'Lecture slides have been uploaded.',
    time: '10 min ago',
    read: false,
  },
  {
    id: '3',
    type: 'community-answer',
    title: 'Student Answered',
    message: 'Juan answered your question in Community.',
    time: '30 min ago',
    read: true,
  },
  {
    id: '4',
    type: 'support-activity',
    title: 'Helpful Contribution',
    message: 'You helped a student solve a problem.',
    time: '1 hour ago',
    read: true,
  },
];

const Notification: React.FC<NotificationScreenProps> = ({
  onBack,
  notifications: incomingNotifications,
}) => {
  /* 🔥 USE SAMPLE IF EMPTY */
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    incomingNotifications?.length ? incomingNotifications : SAMPLE_NOTIFICATIONS
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, read: true } : item
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, read: true }))
    );
  };

  const getNotificationIcon = (type: NotificationType, read: boolean) => {
    const color = read ? '#999' : '#D32F2F';

    switch (type) {
      case 'assignment':
        return <MaterialCommunityIcons name="clipboard-text" size={24} color={color} />;
      case 'material':
        return <MaterialCommunityIcons name="book-open" size={24} color={color} />;
      case 'community-answer':
        return <MaterialCommunityIcons name="forum" size={24} color={color} />;
      case 'support-activity':
        return <MaterialCommunityIcons name="lightbulb-on" size={24} color={color} />;
      default:
        return <MaterialCommunityIcons name="bell" size={24} color={color} />;
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <Pressable
      onPress={() => markAsRead(item.id)}
      style={[styles.card, !item.read && styles.unreadCard]}
    >
      <View style={styles.iconWrapper}>
        {getNotificationIcon(item.type, item.read)}
      </View>

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

      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="" size={24} color="#000" />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount} unread
          </Text>
        </View>

        <Pressable onPress={markAllAsRead} style={styles.markAllBtn}>
          <Text style={styles.markAllText}>Mark all</Text>
        </Pressable>
      </View>

      {/* LIST */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
};

export default Notification;

/* 🔥 STYLES */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },

  backButton: {
    marginRight: 10,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },

  headerSubtitle: {
    fontSize: 13,
    color: '#666',
  },

  markAllBtn: {
    backgroundColor: '#FFEAEA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  markAllText: {
    color: '#D32F2F',
    fontWeight: '600',
  },

  card: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
    marginBottom: 12,
  },

  unreadCard: {
    backgroundColor: '#FFF0F0',
  },

  iconWrapper: {
    marginRight: 12,
    justifyContent: 'center',
  },

  content: {
    flex: 1,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  title: {
    fontWeight: 'bold',
    fontSize: 15,
  },

  time: {
    fontSize: 12,
    color: '#777',
  },

  message: {
    marginTop: 5,
    color: '#444',
  },
});