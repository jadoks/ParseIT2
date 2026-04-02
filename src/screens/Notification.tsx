import React, { useEffect, useMemo, useState } from 'react';
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
  mode?: 'screen' | 'popover';
  onClosePopover?: () => void;
}

const Notification: React.FC<NotificationScreenProps> = ({
  onBack,
  notifications: incomingNotifications = [],
  mode = 'screen',
  onClosePopover,
}) => {
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(incomingNotifications);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);

  const isPopover = mode === 'popover';

  useEffect(() => {
    setNotifications(incomingNotifications);
    setShowAllNotifications(false);
    setMenuVisible(false);
  }, [incomingNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const displayedNotifications = useMemo(() => {
    if (isPopover && !showAllNotifications) {
      return notifications.slice(0, 6);
    }
    return notifications;
  }, [notifications, isPopover, showAllNotifications]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    setMenuVisible(false);
  };

  const getNotificationIcon = (type: NotificationType, read: boolean) => {
    const color = read ? '#666' : '#D32F2F';

    switch (type) {
      case 'assignment':
        return (
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={22}
            color={color}
          />
        );
      case 'material':
        return (
          <MaterialCommunityIcons
            name="book-open-page-variant-outline"
            size={22}
            color={color}
          />
        );
      case 'community-answer':
        return (
          <MaterialCommunityIcons
            name="forum-outline"
            size={22}
            color={color}
          />
        );
      case 'support-activity':
        return (
          <MaterialCommunityIcons
            name="lightbulb-on-outline"
            size={22}
            color={color}
          />
        );
      default:
        return (
          <MaterialCommunityIcons
            name="bell-outline"
            size={22}
            color={color}
          />
        );
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
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>

        <Text
          style={styles.message}
          numberOfLines={isPopover ? 2 : undefined}
        >
          {item.message}
        </Text>
      </View>
    </Pressable>
  );

  const content = (
    <View style={styles.contentWrapper}>
      <View style={[styles.header, isPopover && styles.popoverHeader]}>
        {isPopover ? (
          <>
            <View style={styles.headerTextWrapper}>
              <Text style={styles.headerTitle}>Notifications</Text>
              <Text style={styles.headerSubtitle}>
                {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
              </Text>
            </View>

            <View style={styles.popoverActions}>
              <Pressable
                onPress={() => setMenuVisible((prev) => !prev)}
                style={styles.iconButton}
              >
                <MaterialCommunityIcons
                  name="dots-vertical"
                  size={22}
                  color="#000"
                />
              </Pressable>

              <Pressable onPress={onClosePopover} style={styles.iconButton}>
                <MaterialCommunityIcons name="close" size={22} color="#000" />
              </Pressable>
            </View>

            {menuVisible && (
              <>
                <Pressable
                  style={styles.menuOverlay}
                  onPress={() => setMenuVisible(false)}
                />
                <View style={styles.popupMenu}>
                  <Pressable
                    onPress={markAllAsRead}
                    style={styles.popupMenuItem}
                  >
                    <Text style={styles.popupMenuText}>Mark all as read</Text>
                  </Pressable>
                </View>
              </>
            )}
          </>
        ) : (
          <>
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
          </>
        )}
      </View>

      <FlatList
        data={displayedNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={styles.list}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={[
          styles.listContent,
          isPopover && styles.popoverListContent,
          notifications.length === 0 && styles.emptyListContent,
        ]}
        ListFooterComponent={
          isPopover && !showAllNotifications && notifications.length > 6 ? (
            <Pressable
              onPress={() => setShowAllNotifications(true)}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAllButtonText}>See all notifications</Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="bell-check-outline"
              size={48}
              color="#999"
            />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>You’re all caught up.</Text>
          </View>
        }
      />
    </View>
  );

  if (isPopover) {
    return <View style={styles.popoverContainer}>{content}</View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      {content}
    </SafeAreaView>
  );
};

export default Notification;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },

  popoverContainer: {
    width: 380,
    height: 500,
    backgroundColor: '#FFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    borderWidth: 1,
    borderColor: '#EEE',
  },

  contentWrapper: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#FFF',
    position: 'relative',
    zIndex: 2,
  },

  popoverHeader: {
    paddingVertical: 12,
  },

  backButton: {
    padding: 8,
    marginRight: 6,
  },

  iconButton: {
    padding: 8,
  },

  popoverActions: {
    flexDirection: 'row',
    alignItems: 'center',
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

  popupMenu: {
    position: 'absolute',
    top: 56,
    right: 52,
    backgroundColor: '#FFF',
    borderRadius: 12,
    minWidth: 170,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#EEE',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    zIndex: 20,
  },

  popupMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  popupMenuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },

  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },

  list: {
    flex: 1,
  },

  listContent: {
    padding: 16,
    paddingBottom: 24,
  },

  popoverListContent: {
    paddingTop: 8,
    paddingBottom: 12,
  },

  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  seeAllButton: {
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(211,47,47,0.08)',
    borderWidth: 1,
    borderColor: '#FFD7D7',
  },

  seeAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D32F2F',
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
    paddingHorizontal: 24,
    paddingVertical: 40,
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