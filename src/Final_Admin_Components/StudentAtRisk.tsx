import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";

type RiskNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  time?: string;
  createdAt?: any;
  read: boolean;
  classId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
};

type SortMode = "newest" | "oldest" | "lowest" | "highest";

const SORT_OPTIONS: { key: SortMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "newest", label: "Newest", icon: "time-outline" },
  { key: "oldest", label: "Oldest", icon: "hourglass-outline" },
  { key: "lowest", label: "Lowest %", icon: "trending-down-outline" },
  { key: "highest", label: "Highest %", icon: "trending-up-outline" },
];

// Pulls a percentage like "10%" out of a notification message such as
// "Jade Lisondra may need support. Low score detected: 10% in ...".
function extractPercent(message: string): number | null {
  const match = message.match(/(\d{1,3})\s*%/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

// Firestore timestamps usually arrive as { _seconds, _nanoseconds }.
// Fall back to parsing the pre-formatted "time" string if that's absent.
function getTimestampMs(item: RiskNotification): number {
  const raw = item.createdAt;
  if (raw && typeof raw === "object" && typeof raw._seconds === "number") {
    return raw._seconds * 1000;
  }
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (item.time) {
    const parsed = Date.parse(item.time);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

type Props = {
  apiBaseUrl: string;
  adminId?: string;
  onClose: () => void;
};

export default function StudentAtRisk({ apiBaseUrl, adminId, onClose }: Props) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  const [notifications, setNotifications] = useState<RiskNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const load = useCallback(
    async (isRefresh = false) => {
      if (!adminId) return;
      try {
        isRefresh ? setRefreshing(true) : setLoading(true);
        const response = await fetch(
          `${apiBaseUrl}/notifications?userId=${encodeURIComponent(adminId)}&role=admin`
        );
        const data = await response.json();
        if (response.ok && Array.isArray(data?.data)) {
          const atRisk = data.data.filter(
            (item: RiskNotification) => item.type === "student-at-risk"
          );
          setNotifications(atRisk);
        }
      } catch (error) {
        console.error("Error loading at-risk students:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminId, apiBaseUrl]
  );

  useEffect(() => {
    load();
  }, [load]);

  const markAsRead = async (id: string) => {
    const target = notifications.find((item) => item.id === id);
    if (!target || target.read) return;

    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );

    try {
      await fetch(`${apiBaseUrl}/notifications/${id}/read`, { method: "PATCH" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const sortedNotifications = useMemo(() => {
    const withPercent = notifications.map((item) => ({
      ...item,
      _percent: extractPercent(item.message),
      _time: getTimestampMs(item),
    }));

    const list = [...withPercent];

    if (sortMode === "newest") {
      list.sort((a, b) => b._time - a._time);
    } else if (sortMode === "oldest") {
      list.sort((a, b) => a._time - b._time);
    } else if (sortMode === "lowest") {
      list.sort((a, b) => {
        if (a._percent === null && b._percent === null) return b._time - a._time;
        if (a._percent === null) return 1;
        if (b._percent === null) return -1;
        return a._percent - b._percent;
      });
    } else if (sortMode === "highest") {
      list.sort((a, b) => {
        if (a._percent === null && b._percent === null) return b._time - a._time;
        if (a._percent === null) return 1;
        if (b._percent === null) return -1;
        return b._percent - a._percent;
      });
    }

    return list;
  }, [notifications, sortMode]);

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backButton} onPress={onClose} activeOpacity={0.85}>
              <Ionicons name="chevron-back" size={22} color="#DC2626" />
            </TouchableOpacity>

            <View>
              <Text style={styles.title}>Student At Risk</Text>
              <Text style={styles.subtitle}>
                {notifications.length} flagged
                {unreadCount > 0 ? ` · ${unreadCount} unread` : ""}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => load(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={18} color="#7A4A4A" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sortRow}>
        <View style={styles.sortRowInner}>
          {SORT_OPTIONS.map((option) => {
            const active = sortMode === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.sortChip, active && styles.sortChipActive]}
                onPress={() => setSortMode(option.key)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={option.icon}
                  size={14}
                  color={active ? "#FFFFFF" : "#DC2626"}
                  style={styles.sortChipIcon}
                />
                <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, isLargeScreen && styles.scrollContentLarge]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#DC2626" />
        }
      >
        {loading ? (
          <View style={styles.emptyBox}>
            <Ionicons name="sync" size={28} color="#DC2626" />
            <Text style={styles.emptyTitle}>Loading at-risk students...</Text>
          </View>
        ) : sortedNotifications.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-circle-outline" size={30} color="#DC2626" />
            <Text style={styles.emptyTitle}>No students flagged</Text>
            <Text style={styles.emptyText}>
              Students who need support will show up here as soon as they're detected.
            </Text>
          </View>
        ) : (
          sortedNotifications.map((item) => {
            const percent = extractPercent(item.message);
            const unread = !item.read;

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, unread && styles.cardUnread]}
                activeOpacity={0.85}
                onPress={() => markAsRead(item.id)}
              >
                <View style={[styles.cardIcon, unread && styles.cardIconUnread]}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color={unread ? "#DC2626" : "#A07C7C"}
                  />
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {item.actorName || "A student"}
                    </Text>
                    {percent !== null && (
                      <View
                        style={[
                          styles.percentBadge,
                          percent < 60 ? styles.percentBadgeHigh : styles.percentBadgeModerate,
                        ]}
                      >
                        <Text style={styles.percentBadgeText}>{percent}%</Text>
                      </View>
                    )}
                    {unread && <View style={styles.unreadDot} />}
                  </View>

                  <Text style={styles.cardMessage}>{item.message}</Text>

                  {!!item.time && <Text style={styles.cardTime}>{item.time}</Text>}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3D4D4",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2B1111",
  },
  subtitle: {
    fontSize: 13,
    color: "#8A6F6F",
    marginTop: 2,
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  sortRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3D4D4",
  },
  sortRowInner: {
    flexDirection: "row",
    flexWrap: "wrap",
    flex: 1,
  },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    backgroundColor: "#FFF7F7",
    marginRight: 8,
    marginBottom: 8,
  },
  sortChipActive: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  sortChipIcon: {
    marginRight: 6,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },
  sortChipTextActive: {
    color: "#FFFFFF",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  scrollContentLarge: {
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
  },
  card: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },
  cardUnread: {
    backgroundColor: "#FFF7F7",
    borderColor: "#F1BEBE",
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardIconUnread: {
    backgroundColor: "#FEE2E2",
  },
  cardBody: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#2B1111",
  },
  percentBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  percentBadgeHigh: {
    backgroundColor: "#FEE2E2",
  },
  percentBadgeModerate: {
    backgroundColor: "#FEF3C7",
  },
  percentBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#991B1B",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DC2626",
    marginLeft: 8,
  },
  cardMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: "#7A4A4A",
    marginTop: 5,
  },
  cardTime: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A07C7C",
    marginTop: 8,
  },
  emptyBox: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2B1111",
    marginTop: 12,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#8A6F6F",
    marginTop: 6,
    textAlign: "center",
  },
});