import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type HeaderProps = {
  activeItem: string;
  onChange: (item: string) => void;
  isMobile: boolean;
  isTablet: boolean;
  onMenuPress: () => void;
  isSidebarOpen: boolean;
  adminId?: string;
};

type AdminNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  time?: string;
  read: boolean;
  provider?: string | null;
  providerLabel?: string | null;
  model?: string | null;
  errorMessage?: string | null;
  aiProvider?: string | null;
  createdAt?: unknown;
};

const NAV_ITEMS = ["Dashboard", "Class", "Admin", "Student", "Teacher"] as const;

const NAV_ICONS: Record<
  (typeof NAV_ITEMS)[number],
  keyof typeof Ionicons.glyphMap
> = {
  Dashboard: "home-outline",
  Class: "book-outline",
  Admin: "settings-outline",
  Student: "school-outline",
  Teacher: "person-outline",
};

const NAV_ICONS_ACTIVE: Record<
  (typeof NAV_ITEMS)[number],
  keyof typeof Ionicons.glyphMap
> = {
  Dashboard: "home",
  Class: "book",
  Admin: "settings",
  Student: "school",
  Teacher: "person",
};

function getApiBaseUrl() {
  if (Platform.OS === "web") {
    return "http://localhost:5000";
  }

  const possibleHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    "";

  const host = possibleHost.split(":")[0];

  if (host) {
    return `http://${host}:5000`;
  }

  return "http://192.168.1.5:5000";
}

const API_BASE_URL = getApiBaseUrl();

function getNotificationIcon(type: string): keyof typeof Ionicons.glyphMap {
  if (type === "ai-quota-limit") return "warning-outline";
  if (type === "assignment") return "document-text-outline";
  if (type === "material") return "folder-open-outline";
  if (type === "grade") return "ribbon-outline";
  return "notifications-outline";
}

function NotificationList({
  notifications,
  loading,
  onClose,
  onRefresh,
  onMarkAsRead,
  onMarkAllAsRead,
  isMobile,
}: {
  notifications: AdminNotification[];
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  isMobile: boolean;
}) {
  const [showAllNotifications, setShowAllNotifications] = useState(false);

  const unreadCount = notifications.filter((item) => !item.read).length;
  const visibleNotifications = showAllNotifications
    ? notifications
    : notifications.slice(0, 6);
  const hasMoreNotifications = notifications.length > 6;

  return (
    <View style={[styles.notificationPanel, isMobile && styles.notificationPanelMobile]}>
      <View style={styles.notificationHeader}>
        <View style={styles.notificationHeaderLeft}>
          {isMobile && (
            <TouchableOpacity
              style={styles.notificationBackButton}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-back" size={22} color="#DC2626" />
            </TouchableOpacity>
          )}

          <View>
            <Text style={styles.notificationTitle}>Notifications</Text>
            <Text style={styles.notificationSubtitle}>
              {unreadCount > 0
                ? `${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}`
                : "You're all caught up"}
            </Text>
          </View>
        </View>

        <View style={styles.notificationActions}>
          <TouchableOpacity
            style={styles.notificationIconButton}
            onPress={onRefresh}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={18} color="#7A4A4A" />
          </TouchableOpacity>

          {!isMobile && (
            <TouchableOpacity
              style={styles.notificationIconButton}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={18} color="#7A4A4A" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {unreadCount > 0 && (
        <TouchableOpacity
          style={styles.markAllButton}
          onPress={onMarkAllAsRead}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-done-outline" size={17} color="#DC2626" />
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        style={styles.notificationScroll}
        contentContainerStyle={styles.notificationScrollContent}
        showsVerticalScrollIndicator={true}
      >
        {loading ? (
          <View style={styles.emptyNotificationBox}>
            <Ionicons name="sync" size={28} color="#DC2626" />
            <Text style={styles.emptyNotificationTitle}>Loading alerts...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyNotificationBox}>
            <Ionicons name="notifications-off-outline" size={30} color="#DC2626" />
            <Text style={styles.emptyNotificationTitle}>No notifications yet</Text>
            <Text style={styles.emptyNotificationText}>
              AI API quota alerts will appear here when a provider reaches its limit.
            </Text>
          </View>
        ) : (
          <>
            {visibleNotifications.map((item) => {
              const unread = !item.read;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.notificationItem, unread && styles.notificationItemUnread]}
                  activeOpacity={0.85}
                  onPress={() => onMarkAsRead(item.id)}
                >
                  <View style={[styles.notificationItemIcon, unread && styles.notificationItemIconUnread]}>
                    <Ionicons
                      name={getNotificationIcon(item.type)}
                      size={20}
                      color={unread ? "#DC2626" : "#A07C7C"}
                    />
                  </View>

                  <View style={styles.notificationItemBody}>
                    <View style={styles.notificationItemTopRow}>
                      <Text style={styles.notificationItemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {unread && <View style={styles.unreadDot} />}
                    </View>

                    {item.type === "ai-quota-limit" && (
                      <View style={styles.aiQuotaDetailBox}>
                        <Text style={styles.aiQuotaDetailText}>
                          AI Provider: {item.providerLabel || item.aiProvider || item.provider || "Unknown AI"}
                        </Text>
                        {!!item.model && (
                          <Text style={styles.aiQuotaDetailText}>
                            Model: {item.model}
                          </Text>
                        )}
                      </View>
                    )}

                    <Text style={styles.notificationItemMessage} numberOfLines={4}>
                      {item.message}
                    </Text>

                    {!!item.errorMessage && item.type === "ai-quota-limit" && (
                      <Text style={styles.aiQuotaErrorText} numberOfLines={3}>
                        Reason: {item.errorMessage}
                      </Text>
                    )}

                    {!!item.time && <Text style={styles.notificationItemTime}>{item.time}</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}

            {hasMoreNotifications && !showAllNotifications && (
              <TouchableOpacity
                style={styles.seeAllButton}
                onPress={() => setShowAllNotifications(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.seeAllButtonText}>
                  See All Notifications
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default function Header({
  activeItem,
  onChange,
  isMobile,
  onMenuPress,
  isSidebarOpen,
  adminId,
}: HeaderProps) {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const loadNotifications = useCallback(async () => {
    if (!adminId) return;

    try {
      setLoadingNotifications(true);
      const response = await fetch(
        `${API_BASE_URL}/notifications?userId=${encodeURIComponent(adminId)}&role=admin`
      );
      const data = await response.json();

      if (response.ok && Array.isArray(data?.data)) {
        setNotifications(data.data);
      }
    } catch (error) {
      console.error("Error loading admin notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [adminId]);

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 30_000);
    return () => clearInterval(timer);
  }, [loadNotifications]);

  const markNotificationAsRead = async (id: string) => {
    const target = notifications.find((item) => item.id === id);
    if (!target || target.read) return;

    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );

    try {
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: "PATCH",
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      loadNotifications();
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!adminId) return;

    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));

    try {
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: adminId, role: "admin" }),
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      loadNotifications();
    }
  };

  const notificationButton = (
    <TouchableOpacity
      style={styles.notificationButton}
      onPress={() => {
        setNotificationOpen((prev) => !prev);
        loadNotifications();
      }}
      activeOpacity={0.85}
    >
      <Ionicons
        name={notificationOpen ? "notifications" : "notifications-outline"}
        size={22}
        color="#DC2626"
      />
      {unreadCount > 0 && (
        <View style={styles.notificationBadge}>
          <Text style={styles.notificationBadgeText}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.headerWrapper, !isMobile && styles.headerWrapperDesktop]}>
      {!isMobile ? (
        <View style={styles.row}>
          <View style={styles.left}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brand}>Parsers Hub</Text>
          </View>

          <View style={styles.navRow}>
            {NAV_ITEMS.map((item) => {
              const active = activeItem === item && !isSidebarOpen;

              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.navItem, active && styles.navItemActive]}
                  onPress={() => onChange(item)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={active ? NAV_ICONS_ACTIVE[item] : NAV_ICONS[item]}
                    size={18}
                    color={active ? "#DC2626" : "#9CA3AF"}
                    style={styles.navIcon}
                  />

                  <Text style={[styles.navText, active && styles.navTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.rightActions}>{notificationButton}</View>

          {notificationOpen && (
            <>
              <Pressable
                style={styles.desktopNotificationBackdrop}
                onPress={() => setNotificationOpen(false)}
              />
              <View style={styles.desktopNotificationDropdown}>
                <NotificationList
                  notifications={notifications}
                  loading={loadingNotifications}
                  onClose={() => setNotificationOpen(false)}
                  onRefresh={loadNotifications}
                  onMarkAsRead={markNotificationAsRead}
                  onMarkAllAsRead={markAllNotificationsAsRead}
                  isMobile={false}
                />
              </View>
            </>
          )}
        </View>
      ) : (
        <View style={styles.mobileContainer}>
          <View style={styles.topRow}>
            <View style={styles.leftMobile}>
              <TouchableOpacity style={styles.menuBtn} onPress={onMenuPress}>
                <Ionicons name="menu" size={22} color="#DC2626" />
              </TouchableOpacity>

              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />

              <Text style={styles.brand}>Parsers Hub</Text>
            </View>

            {notificationButton}
          </View>

          <View style={styles.navRowMobile}>
            {NAV_ITEMS.map((item) => {
              const active = activeItem === item && !isSidebarOpen;

              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.navItemMobile, active && styles.navItemActive]}
                  onPress={() => onChange(item)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={active ? NAV_ICONS_ACTIVE[item] : NAV_ICONS[item]}
                    size={20}
                    color={active ? "#DC2626" : "#9CA3AF"}
                  />
                  <Text style={[styles.iconLabel, active && styles.navTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <Modal
        visible={isMobile && notificationOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setNotificationOpen(false)}
      >
        <View style={styles.mobileNotificationScreen}>
          <NotificationList
            notifications={notifications}
            loading={loadingNotifications}
            onClose={() => setNotificationOpen(false)}
            onRefresh={loadNotifications}
            onMarkAsRead={markNotificationAsRead}
            onMarkAllAsRead={markAllNotificationsAsRead}
            isMobile={true}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: "transparent",
    zIndex: 20,
  },

  headerWrapperDesktop: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },

  mobileContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 140,
  },

  leftMobile: {
    flexDirection: "row",
    alignItems: "center",
  },

  rightActions: {
    minWidth: 140,
    alignItems: "flex-end",
  },

  menuBtn: {
    marginRight: 10,
    padding: 6,
  },

  logo: {
    width: 34,
    height: 34,
    marginRight: 8,
  },

  brand: {
    fontSize: 18,
    fontWeight: "800",
    color: "#DC2626",
  },

  navRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  navRowMobile: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 10,
  },

  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginHorizontal: 4,
  },

  navIcon: {
    marginRight: 6,
  },

  navItemMobile: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },

  navItemActive: {
    backgroundColor: "#FEE2E2",
  },

  navText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },

  navTextActive: {
    color: "#DC2626",
  },

  iconLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
  },

  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#F3D4D4",
    alignItems: "center",
    justifyContent: "center",
  },

  notificationBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: "#DC2626",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  notificationBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  desktopNotificationBackdrop: {
    position: "absolute",
    top: -40,
    right: -40,
    bottom: -700,
    left: -900,
    zIndex: 25,
  },

  desktopNotificationDropdown: {
    position: "absolute",
    top: 58,
    right: 0,
    width: 390,
    height: 540,
    zIndex: 30,
  },

  mobileNotificationScreen: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },

  notificationPanel: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 12,
  },

  notificationPanelMobile: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },

  notificationHeader: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F8E3E3",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  notificationHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  notificationBackButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  notificationTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2B1111",
  },

  notificationSubtitle: {
    fontSize: 13,
    color: "#8A6F6F",
    marginTop: 2,
  },

  notificationActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },

  notificationIconButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  markAllButton: {
    marginHorizontal: 18,
    marginTop: 14,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#F3D4D4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  markAllText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#DC2626",
    marginLeft: 8,
  },

  notificationScroll: {
    flex: 1,
  },

  notificationScrollContent: {
    padding: 14,
    paddingBottom: 22,
  },

  notificationItem: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },

  notificationItemUnread: {
    backgroundColor: "#FFF7F7",
    borderColor: "#F1BEBE",
  },

  notificationItemIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  notificationItemIconUnread: {
    backgroundColor: "#FEE2E2",
  },

  notificationItemBody: {
    flex: 1,
  },

  notificationItemTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  notificationItemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#2B1111",
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DC2626",
    marginLeft: 8,
  },

  notificationItemMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: "#7A4A4A",
    marginTop: 5,
  },

  notificationItemTime: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A07C7C",
    marginTop: 8,
  },

  aiQuotaDetailBox: {
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#F3D4D4",
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
  },

  aiQuotaDetailText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#7A1F1F",
    lineHeight: 18,
  },

  aiQuotaErrorText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#9A3412",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
  },

  seeAllButton: {
    height: 44,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  seeAllButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  emptyNotificationBox: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  emptyNotificationTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2B1111",
    marginTop: 12,
    textAlign: "center",
  },

  emptyNotificationText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#8A6F6F",
    marginTop: 6,
    textAlign: "center",
  },
});