import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import {
  Image,
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

export default function Header({
  activeItem,
  onChange,
  isMobile,
  onMenuPress,
  isSidebarOpen,
}: HeaderProps) {
  return (
    <View style={[styles.headerWrapper, !isMobile && styles.headerWrapperDesktop]}>
      {!isMobile ? (
        // ✅ DESKTOP / TABLET
        <View style={styles.row}>
          <View style={styles.left}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brand}>ParseIT</Text>
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
                  {/* ✅ ICON ADDED */}
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

          <View style={styles.rightSpacer} />
        </View>
      ) : (
        // ✅ MOBILE
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

              <Text style={styles.brand}>ParseIT</Text>
            </View>
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
                  <Text
                    style={[
                      styles.iconLabel,
                      active && styles.navTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: "transparent",
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

  rightSpacer: {
    minWidth: 140,
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

  // ✅ UPDATED for icon + text layout
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
});