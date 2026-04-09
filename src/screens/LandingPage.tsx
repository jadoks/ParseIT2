import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import {
    Image, LayoutChangeEvent,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from "react-native";

type LandingPageProps = {
  onGetStarted?: () => void;
};

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1100;
  const isTablet = width >= 720;
  const isMobile = width < 720;
  const isSmallMobile = width < 480;

  const scrollRef = useRef<ScrollView>(null);

  const [sectionPositions, setSectionPositions] = useState({
    features: 0,
  });

  const goToSignIn = () => {
    if (typeof onGetStarted === "function") {
      onGetStarted();
    } else {
      console.warn("onGetStarted was not provided to LandingPage");
    }
  };

  const handleSectionLayout =
    (section: "features") =>
    (event: LayoutChangeEvent) => {
      const { y } = event.nativeEvent.layout;
      setSectionPositions((prev) => ({
        ...prev,
        [section]: y,
      }));
    };

  const scrollToSection = (section: "features") => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, sectionPositions[section] - (isMobile ? 12 : 20)),
      animated: true,
    });
  };

  const featureCards = [
    {
      icon: (
        <MaterialCommunityIcons
          name="account-group-outline"
          size={24}
          color="#ffffff"
        />
      ),
      title: "Role-Based Access",
      description:
        "Built for students, teachers, and admins with dedicated app experiences after sign in.",
    },
    {
      icon: <Ionicons name="book-outline" size={24} color="#ffffff" />,
      title: "Classes and Learning Materials",
      description:
        "Supports academic workflows around classes, materials, and learning content in one system.",
    },
    {
      icon: (
        <MaterialCommunityIcons
          name="clipboard-text-outline"
          size={24}
          color="#ffffff"
        />
      ),
      title: "Assignments and Academic Tasks",
      description:
        "Organizes assignment-related flows for classroom activity, tracking, and updates.",
    },
    {
      icon: <Ionicons name="notifications-outline" size={24} color="#ffffff" />,
      title: "Announcements and Notifications",
      description:
        "Keeps users updated with school-related notices, communication, and activity alerts.",
    },
    {
      icon: <Feather name="message-square" size={24} color="#ffffff" />,
      title: "Messaging and Communication",
      description:
        "Includes messaging-oriented features to support interaction across the academic environment.",
    },
    {
      icon: <Feather name="bar-chart-2" size={24} color="#ffffff" />,
      title: "Dashboards and Management",
      description:
        "Provides admin- and teacher-oriented tools for management, oversight, and academic operations.",
    },
  ];

  const highlights = [
    "Student, Teacher, and Admin access",
    "Assignments, materials, and class workflows",
    "Announcements, messaging, and notifications",
    "Management-focused modules and dashboards",
  ];

  const stats = [
    { label: "Access Model", value: "3 User Roles" },
    { label: "Architecture", value: "Expo + React Native" },
    { label: "Core Focus", value: "Academic Workflow System" },
  ];

  const navItems = ["Features"];

  const sidebarItems = [
    "Overview",
    "Classes",
    "Assignments",
    "Messages",
    "Analytics",
  ];

  const activeModules = [
    "Announcements",
    "Assignments",
    "Messaging",
    "Materials",
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <LinearGradient
          colors={["#140405", "#2A080B", "#3E0A10", "#160406"]}
          style={styles.pageBg}
        >
          <View style={styles.glowTop} />
          <View style={styles.glowBottom} />

          <View
            style={[
              styles.container,
              isSmallMobile && styles.containerSmallMobile,
            ]}
          >
            <View style={[styles.navbar, isMobile && styles.navbarMobile]}>
              <View style={styles.brandWrap}>
                <LinearGradient
                    colors={["#ffffff", "#f1d7db"]}
                    style={[
                        styles.logoBox,
                        isSmallMobile && styles.logoBoxSmall,
                    ]}
                    >
                    <Image
                        source={require("../../assets/images/logo.png")}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    </LinearGradient>

                <View style={styles.brandTextWrap}>
                  <Text
                    style={[
                      styles.brandTitle,
                      isSmallMobile && styles.brandTitleSmall,
                    ]}
                  >
                    ParseIT Hub 2.0
                  </Text>
                  <Text
                    style={[
                      styles.brandSub,
                      isSmallMobile && styles.brandSubSmall,
                    ]}
                  >
                    Role-based academic management platform
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.navActions,
                  isMobile && styles.navActionsMobile,
                ]}
              >
                {navItems.map((item) => (
                  <TouchableOpacity
                    key={item}
                    activeOpacity={0.8}
                    onPress={() => scrollToSection("features")}
                    style={styles.navLinkButton}
                  >
                    <Text
                      style={[
                        styles.navLink,
                        isSmallMobile && styles.navLinkSmall,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[
                    styles.navButton,
                    isMobile && styles.navButtonMobile,
                  ]}
                  onPress={goToSignIn}
                  activeOpacity={0.9}
                >
                  <Text style={styles.navButtonText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={[
                styles.heroSection,
                isDesktop ? styles.heroDesktop : styles.heroMobile,
              ]}
            >
              <View
                style={[styles.heroLeft, isDesktop && styles.heroLeftDesktop]}
              >
                <BlurView intensity={24} tint="dark" style={styles.badge}>
                  <Text style={styles.badgeText}>
                    Professional Academic Platform
                  </Text>
                </BlurView>

                <Text
                  style={[
                    styles.heroTitle,
                    isTablet && styles.heroTitleTablet,
                    isDesktop && styles.heroTitleDesktop,
                    isMobile && styles.heroTitleMobile,
                    isSmallMobile && styles.heroTitleSmallMobile,
                  ]}
                >
                  A complete school system for students, teachers, and admins.
                </Text>

                <Text
                  style={[
                    styles.heroDescription,
                    isTablet && styles.heroDescriptionTablet,
                    isMobile && styles.heroDescriptionMobile,
                  ]}
                >
                  ParseIT2 is structured as an Expo and React Native academic
                  platform with dedicated application flows for different user
                  roles. The system supports learning, assignments,
                  announcements, communication, dashboards, and management
                  workflows in one connected experience.
                </Text>

                <View style={styles.highlightList}>
                  {highlights.map((item) => (
                    <View key={item} style={styles.highlightItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#FF6B78"
                      />
                      <Text style={styles.highlightText}>{item}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.ctaRow, !isTablet && styles.ctaColumn]}>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      isMobile && styles.primaryButtonMobile,
                    ]}
                    onPress={goToSignIn}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={["#FF4D5E", "#A80C27"]}
                      style={styles.primaryButtonBg}
                    >
                      <Text style={styles.primaryButtonText}>Get Started</Text>
                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color="#ffffff"
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    styles.statsGrid,
                    !isTablet && styles.statsGridMobile,
                  ]}
                >
                  {stats.map((item) => (
                    <BlurView
                      key={item.label}
                      intensity={18}
                      tint="dark"
                      style={styles.statCard}
                    >
                      <Text style={styles.statLabel}>{item.label}</Text>
                      <Text style={styles.statValue}>{item.value}</Text>
                    </BlurView>
                  ))}
                </View>
              </View>

              <View
                style={[
                  styles.heroRight,
                  isDesktop && styles.heroRightDesktop,
                  isMobile && styles.heroRightMobile,
                ]}
              >
                <View style={styles.dashboardShell}>
                  <LinearGradient
                    colors={[
                      "rgba(255,255,255,0.09)",
                      "rgba(255,255,255,0.03)",
                    ]}
                    style={[
                      styles.dashboardCard,
                      isMobile && styles.dashboardCardMobile,
                      isSmallMobile && styles.dashboardCardSmallMobile,
                    ]}
                  >
                    <View
                      style={[
                        styles.dashboardTopBar,
                        isMobile && styles.dashboardTopBarMobile,
                      ]}
                    >
                      <View style={styles.windowDots}>
                        <View
                          style={[
                            styles.windowDot,
                            { backgroundColor: "#FF6B78" },
                          ]}
                        />
                        <View
                          style={[
                            styles.windowDot,
                            { backgroundColor: "#FFB347" },
                          ]}
                        />
                        <View
                          style={[
                            styles.windowDot,
                            { backgroundColor: "#6EE7B7" },
                          ]}
                        />
                      </View>

                      <View
                        style={[
                          styles.dashboardSearch,
                          isMobile && styles.dashboardSearchMobile,
                        ]}
                      >
                        <Ionicons name="search" size={14} color="#FAD3D8" />
                        <Text
                          numberOfLines={1}
                          style={styles.dashboardSearchText}
                        >
                          ParseIT Hub 2.0 Dashboard
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.dashboardBody,
                        isMobile && styles.dashboardBodyMobile,
                      ]}
                    >
                      <View
                        style={[
                          styles.dashboardSidebar,
                          isMobile && styles.dashboardSidebarMobile,
                        ]}
                      >
                        <View style={styles.sidebarBrand}>
                          <MaterialCommunityIcons
                            name="school-outline"
                            size={18}
                            color="#ffffff"
                          />
                          <Text style={styles.sidebarBrandText}>Portal</Text>
                        </View>

                        {sidebarItems.map((item) => (
                          <View key={item} style={styles.sidebarItem}>
                            <View style={styles.sidebarBullet} />
                            <Text style={styles.sidebarItemText}>{item}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.dashboardMain}>
                        <View style={styles.mainHeroCard}>
                          <Text style={styles.mainHeroEyebrow}>
                            SYSTEM OVERVIEW
                          </Text>
                          <Text
                            style={[
                              styles.mainHeroTitle,
                              isMobile && styles.mainHeroTitleMobile,
                            ]}
                          >
                            Manage academic workflows from one place
                          </Text>
                          <Text style={styles.mainHeroText}>
                            Role-based access for students, teachers, and
                            administrators with modules for classes,
                            announcements, materials, messaging, and reports.
                          </Text>

                          <View style={styles.mainHeroStats}>
                            <View style={styles.mainHeroStat}>
                              <Text style={styles.mainHeroStatValue}>3</Text>
                              <Text style={styles.mainHeroStatLabel}>
                                User Roles
                              </Text>
                            </View>
                            <View style={styles.mainHeroStat}>
                              <Text style={styles.mainHeroStatValue}>24/7</Text>
                              <Text style={styles.mainHeroStatLabel}>
                                Access Flow
                              </Text>
                            </View>
                            <View style={styles.mainHeroStat}>
                              <Text style={styles.mainHeroStatValue}>
                                All-in-1
                              </Text>
                              <Text style={styles.mainHeroStatLabel}>
                                Academic Hub
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.mainGrid,
                            isMobile && styles.mainGridMobile,
                          ]}
                        >
                          <View style={styles.metricCard}>
                            <View style={styles.metricHeader}>
                              <Text style={styles.metricTitle}>
                                Student Activity
                              </Text>
                              <Ionicons
                                name="trending-up"
                                size={16}
                                color="#FF92A0"
                              />
                            </View>

                            <View style={styles.metricBars}>
                              <View
                                style={[styles.metricBar, styles.metricBarLarge]}
                              />
                              <View
                                style={[
                                  styles.metricBar,
                                  styles.metricBarMedium,
                                ]}
                              />
                              <View
                                style={[styles.metricBar, styles.metricBarSmall]}
                              />
                              <View
                                style={[styles.metricBar, styles.metricBarLarge]}
                              />
                              <View
                                style={[
                                  styles.metricBar,
                                  styles.metricBarMedium,
                                ]}
                              />
                            </View>
                          </View>

                          <View style={styles.metricCard}>
                            <Text style={styles.metricTitle}>Active Modules</Text>
                            <View style={styles.moduleList}>
                              {activeModules.map((module) => (
                                <View key={module} style={styles.moduleItem}>
                                  <View style={styles.moduleDot} />
                                  <Text style={styles.moduleText}>{module}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.bottomPanel,
                            isMobile && styles.bottomPanelMobile,
                          ]}
                        >
                          <View style={styles.bottomPanelLeft}>
                            <Text style={styles.bottomPanelTitle}>
                              Teacher & Admin Controls
                            </Text>
                            <Text style={styles.bottomPanelText}>
                              Oversight tools for dashboards, reporting,
                              announcements, and academic coordination.
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.bottomPanelBadge,
                              isMobile && styles.bottomPanelBadgeMobile,
                            ]}
                          >
                            <Feather name="shield" size={16} color="#ffffff" />
                            <Text style={styles.bottomPanelBadgeText}>
                              Secure Access
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </LinearGradient>
                </View>

                <View
                  style={[
                    styles.floatingMiniCard,
                    isDesktop
                      ? styles.floatingMiniTopDesktop
                      : styles.floatingMiniInline,
                  ]}
                >
                  <View style={styles.floatingMiniIcon}>
                    <Ionicons
                      name="notifications-outline"
                      size={16}
                      color="#ffffff"
                    />
                  </View>
                  <View style={styles.flexFill}>
                    <Text style={styles.floatingMiniTitle}>
                      Live Announcements
                    </Text>
                    <Text style={styles.floatingMiniText}>
                      Stay updated with notices and reminders.
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.floatingMiniCard,
                    isDesktop
                      ? styles.floatingMiniBottomDesktop
                      : styles.floatingMiniInline,
                  ]}
                >
                  <View style={styles.floatingMiniIcon}>
                    <Feather
                      name="message-circle"
                      size={16}
                      color="#ffffff"
                    />
                  </View>
                  <View style={styles.flexFill}>
                    <Text style={styles.floatingMiniTitle}>
                      Built-in Communication
                    </Text>
                    <Text style={styles.floatingMiniText}>
                      Messaging support across academic roles.
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View
              onLayout={handleSectionLayout("features")}
              style={styles.sectionWrap}
            >
              
              <Text
                style={[
                  styles.sectionTitle,
                  isMobile && styles.sectionTitleMobile,
                ]}
              >
                System Features
              </Text>
              <Text style={styles.sectionDescription}>
                The system is designed as a role-based academic platform with
                user-specific experiences, structured modules, and management
                features that make it feel like a real production build.
              </Text>

              <View style={styles.featureGrid}>
                {featureCards.map((feature) => (
                  <BlurView
                    key={feature.title}
                    intensity={16}
                    tint="dark"
                    style={[
                      styles.featureCard,
                      isDesktop
                        ? styles.featureCardDesktop
                        : isTablet
                        ? styles.featureCardTablet
                        : styles.featureCardMobile,
                    ]}
                  >
                    <LinearGradient
                      colors={["#FF4D5E", "#A80C27"]}
                      style={styles.featureIconWrap}
                    >
                      {feature.icon}
                    </LinearGradient>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>
                      {feature.description}
                    </Text>
                  </BlurView>
                ))}
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                © 2026 ParseIT Hub 2.0. All rights reserved.
              </Text>
            </View>
          </View>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#140405",
  },
  scrollContent: {
    flexGrow: 1,
  },
  pageBg: {
    flex: 1,
    minHeight: "100%",
  },
  glowTop: {
    position: "absolute",
    top: 10,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: "rgba(255,77,94,0.16)",
  },
  glowBottom: {
    position: "absolute",
    bottom: 80,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: "rgba(168,12,39,0.18)",
  },
  container: {
    width: "100%",
    maxWidth: 1280,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
  },
  containerSmallMobile: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  navbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    gap: 16,
  },
  navbarMobile: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 1,
  },
  brandTextWrap: {
    flexShrink: 1,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  logoBoxSmall: {
    width: 42,
    height: 42,
    borderRadius: 14,
  },
  logoText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 20,
  },
  brandTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  brandTitleSmall: {
    fontSize: 16,
  },
  brandSub: {
    color: "rgba(255,225,228,0.78)",
    fontSize: 12,
    marginTop: 2,
  },
  brandSubSmall: {
    fontSize: 11,
  },
  navActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  navActionsMobile: {
    justifyContent: "flex-start",
  },
  navLinkButton: {
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  navLink: {
    color: "rgba(255,229,231,0.82)",
    fontSize: 14,
    fontWeight: "500",
  },
  navLinkSmall: {
    fontSize: 13,
  },
  navButton: {
    backgroundColor: "rgba(255,77,94,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,107,120,0.38)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
  },
  navButtonMobile: {
    marginTop: 2,
  },
  navButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  heroSection: {
    marginTop: 28,
    gap: 28,
  },
  heroDesktop: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroMobile: {
    flexDirection: "column",
  },
  heroLeft: {
    width: "100%",
  },
  heroLeftDesktop: {
    flex: 1,
    paddingRight: 22,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,132,144,0.26)",
    backgroundColor: "rgba(255,77,94,0.08)",
  },
  badgeText: {
    color: "#FFD4D8",
    fontSize: 12,
    fontWeight: "700",
  },
  heroTitle: {
    marginTop: 18,
    color: "#ffffff",
    fontSize: 38,
    lineHeight: 46,
    fontWeight: "900",
    letterSpacing: -1.2,
  },
  heroTitleTablet: {
    fontSize: 52,
    lineHeight: 60,
  },
  heroTitleDesktop: {
    fontSize: 64,
    lineHeight: 72,
    maxWidth: 720,
  },
  heroTitleMobile: {
    fontSize: 34,
    lineHeight: 41,
  },
  heroTitleSmallMobile: {
    fontSize: 29,
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  heroDescription: {
    marginTop: 16,
    color: "#F8D9DC",
    fontSize: 15,
    lineHeight: 27,
    maxWidth: 720,
  },
  heroDescriptionTablet: {
    fontSize: 17,
    lineHeight: 30,
  },
  heroDescriptionMobile: {
    fontSize: 14,
    lineHeight: 24,
  },
  highlightList: {
    marginTop: 22,
    gap: 12,
  },
  highlightItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  highlightText: {
    color: "#FFE6E8",
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 28,
  },
  ctaColumn: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  primaryButton: {
    borderRadius: 18,
    overflow: "hidden",
  },
  primaryButtonMobile: {
    width: "100%",
  },
  primaryButtonBg: {
    minHeight: 56,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 18,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 28,
  },
  statsGridMobile: {
    flexDirection: "column",
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,132,144,0.18)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  statLabel: {
    color: "#F5B7BE",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  statValue: {
    marginTop: 10,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  heroRight: {
    width: "100%",
    position: "relative",
  },
  heroRightDesktop: {
    flex: 1,
    minHeight: 700,
    justifyContent: "center",
  },
  heroRightMobile: {
    gap: 14,
  },
  dashboardShell: {
    width: "100%",
    position: "relative",
  },
  dashboardCard: {
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,132,144,0.18)",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  dashboardCardMobile: {
    borderRadius: 24,
    padding: 14,
  },
  dashboardCardSmallMobile: {
    borderRadius: 20,
    padding: 12,
  },
  dashboardTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 10,
  },
  dashboardTopBarMobile: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  windowDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  windowDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  dashboardSearch: {
    flex: 1,
    maxWidth: 280,
    minHeight: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,132,144,0.12)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  dashboardSearchMobile: {
    maxWidth: "100%",
    width: "100%",
  },
  dashboardSearchText: {
    color: "#FAD3D8",
    fontSize: 12,
    flexShrink: 1,
  },
  dashboardBody: {
    flexDirection: "row",
    gap: 14,
  },
  dashboardBodyMobile: {
    flexDirection: "column",
  },
  dashboardSidebar: {
    width: 110,
    borderRadius: 20,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,132,144,0.12)",
    gap: 12,
  },
  dashboardSidebarMobile: {
    width: "100%",
  },
  sidebarBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  sidebarBrandText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sidebarBullet: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#FF6B78",
  },
  sidebarItemText: {
    color: "#F6D7DB",
    fontSize: 12,
  },
  dashboardMain: {
    flex: 1,
    gap: 14,
  },
  mainHeroCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: "rgba(255,77,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,132,144,0.18)",
  },
  mainHeroTitle: {
    color: "#ffffff",
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
  },
  mainHeroTitleMobile: {
    fontSize: 18,
    lineHeight: 24,
  },
  mainHeroEyebrow: {
    color: "#FF9AA5",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  mainHeroText: {
    color: "#F8D9DC",
    fontSize: 13,
    lineHeight: 21,
    marginTop: 10,
  },
  mainHeroStats: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    flexWrap: "wrap",
  },
  mainHeroStat: {
    minWidth: 88,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  mainHeroStatValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  mainHeroStatLabel: {
    color: "#FFDADF",
    fontSize: 11,
    marginTop: 4,
  },
  mainGrid: {
    flexDirection: "row",
    gap: 14,
  },
  mainGridMobile: {
    flexDirection: "column",
  },
  metricCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,132,144,0.14)",
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  metricTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  metricBars: {
    height: 88,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  metricBar: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: "#C41231",
  },
  metricBarLarge: {
    height: 72,
  },
  metricBarMedium: {
    height: 50,
  },
  metricBarSmall: {
    height: 32,
  },
  moduleList: {
    gap: 10,
    marginTop: 6,
  },
  moduleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moduleDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#FF6B78",
  },
  moduleText: {
    color: "#F8D9DC",
    fontSize: 12,
  },
  bottomPanel: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,132,144,0.14)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  bottomPanelMobile: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  bottomPanelLeft: {
    flex: 1,
  },
  bottomPanelTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  bottomPanelText: {
    color: "#F5D9DD",
    fontSize: 12,
    lineHeight: 20,
    marginTop: 6,
  },
  bottomPanelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#B80F2B",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  bottomPanelBadgeMobile: {
    alignSelf: "flex-start",
  },
  bottomPanelBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  floatingMiniCard: {
    flexDirection: "row",
    gap: 10,
    width: 240,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "rgba(38,8,11,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,132,144,0.22)",
    zIndex: 5,
  },
  floatingMiniTopDesktop: {
    position: "absolute",
    top: -30,
    right: -24,
  },
  floatingMiniBottomDesktop: {
    position: "absolute",
    bottom: -30,
    left: -24,
  },
  floatingMiniInline: {
    position: "relative",
    width: "100%",
    top: undefined,
    right: undefined,
    bottom: undefined,
    left: undefined,
  },
  floatingMiniIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C41231",
  },
  floatingMiniTitle: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  floatingMiniText: {
    color: "#F5D9DD",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },
  sectionWrap: {
    marginTop: 46,
    paddingBottom: 16,
  },
  sectionEyebrow: {
    textAlign: "center",
    color: "#FF9AA5",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.6,
  },
  sectionTitle: {
    textAlign: "center",
    color: "#ffffff",
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "900",
    marginTop: 10,
  },
  sectionTitleMobile: {
    fontSize: 24,
    lineHeight: 31,
  },
  sectionDescription: {
    marginTop: 12,
    textAlign: "center",
    color: "#F3C5CB",
    fontSize: 15,
    lineHeight: 26,
    maxWidth: 820,
    alignSelf: "center",
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 28,
  },
  featureCard: {
    borderRadius: 26,
    overflow: "hidden",
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,132,144,0.18)",
  },
  featureCardMobile: {
    width: "100%",
  },
  featureCardTablet: {
    width: "48.6%",
  },
  featureCardDesktop: {
    width: "31.8%",
  },
  featureIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  featureTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  featureDescription: {
    marginTop: 10,
    color: "#F5D9DD",
    fontSize: 14,
    lineHeight: 24,
  },
  footer: {
    marginTop: 24,
    paddingTop: 18,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,132,144,0.14)",
    alignItems: "center",
  },
  footerText: {
    color: "#FFCFD4",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  flexFill: {
    flex: 1,
  },
  logoImage: {
  width: "70%",
  height: "70%",
},
});