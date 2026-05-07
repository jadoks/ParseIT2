import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  LayoutChangeEvent,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Defs, Line, Polygon, Polyline, Rect, Stop, LinearGradient as SvgLinearGradient, Text as SvgText } from "react-native-svg";

// Replace your current file at: src/screens/LandingPage.tsx
// Required packages used by this screen:
// expo-linear-gradient, @expo/vector-icons, expo-status-bar

type LandingPageProps = {
  onGetStarted?: () => void;
};

type SectionKey = "features" | "how" | "modules" | "users" | "analytics" | "architecture";

type FeatureCard = {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: readonly [string, string];
};

type ModuleCard = {
  icon: React.ReactNode;
  title: string;
  description: string;
  bullets: string[];
  color: readonly [string, string];
};

type UserCard = {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  color: readonly [string, string];
};

const MAX_WIDTH = 1360;

type RevealDirection = "up" | "left" | "right";

type RevealSectionContextValue = {
  scrollY: Animated.Value | null;
  sectionY: number;
};

const RevealSectionContext = React.createContext<RevealSectionContextValue>({
  scrollY: null,
  sectionY: 0,
});

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showBackToTop, setShowBackToTop] = useState(false);
  const showBackToTopRef = useRef(false);
  const sectionPositions = useRef<Record<SectionKey, number>>({
    features: 0,
    how: 0,
    modules: 0,
    users: 0,
    analytics: 0,
    architecture: 0,
  });

  const isDesktop = width >= 1100;
  const isTablet = width >= 768;
  const isMobile = width < 768;
  const isSmall = width < 430;

  const goToSignIn = () => {
    if (typeof onGetStarted === "function") onGetStarted();
  };

  const onSectionLayout = (section: SectionKey) => (event: LayoutChangeEvent) => {
    sectionPositions.current[section] = event.nativeEvent.layout.y;
  };

  const scrollToSection = (section: SectionKey) => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, sectionPositions.current[section] - (isMobile ? 10 : 24)),
      animated: true,
    });
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleScrollPosition = (offsetY: number) => {
    const shouldShow = offsetY > 520;
    if (showBackToTopRef.current !== shouldShow) {
      showBackToTopRef.current = shouldShow;
      setShowBackToTop(shouldShow);
    }
  };

  const backToTopOpacity = scrollY.interpolate({
    inputRange: [420, 520],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const backToTopTranslateY = scrollY.interpolate({
    inputRange: [420, 520],
    outputRange: [18, 0],
    extrapolate: "clamp",
  });

  const features: FeatureCard[] = [
    {
      icon: <MaterialCommunityIcons name="account-school-outline" size={30} color="#fff" />,
      title: "Adaptive Learning Support",
      description:
        "Personalized academic guidance that helps students access learning materials, receive intelligent recommendations, and strengthen weak topics through AI-supported assistance.",
      color: ["#ff3b30", "#ff7a00"],
    },
    {
      icon: <Feather name="bar-chart-2" size={30} color="#fff" />,
      title: "Predictive Analytics Dashboard",
      description:
        "Track student performance, detect at-risk learners, and gain actionable insights through data-driven analytics and visualizations.",
      color: ["#ff2d7a", "#ff3b72"],
    },
    {
      icon: <Feather name="activity" size={30} color="#fff" />,
      title: "AI-Driven Academic Support System",
      description:
        "ParseIT Hub delivers adaptive learning, real-time assistance, and predictive analytics to support both students and educators in improving academic performance and decision-making.",
      color: ["#ff8a00", "#ffb000"],
    },
    {
      icon: <Feather name="users" size={30} color="#fff" />,
      title: "Academic Monitoring System",
      description:
        "Comprehensive monitoring for teachers and admins. Track class progress, individual performance, and institutional metrics.",
      color: ["#ff003d", "#ff245d"],
    },
    {
      icon: <Ionicons name="chatbox-outline" size={30} color="#fff" />,
      title: "Collaboration Tools",
      description:
        "Built-in messaging and collaboration features. Connect students, teachers, and administrators seamlessly.",
      color: ["#ff8a00", "#ff4d00"],
    },
    {
      icon: <Ionicons name="phone-portrait-outline" size={30} color="#fff" />,
      title: "Cross-Platform Access",
      description:
        "Access ParseIT Hub on any device. Fully responsive web app and native mobile experience built with React Native (Expo).",
      color: ["#ff2d7a", "#ff4385"],
    },
  ];

  const moduleCards: ModuleCard[] = [
    {
      icon: <Ionicons name="school-outline" size={30} color="#fff" />,
      title: "Student Dashboard",
      description:
        "Performance tracking, assignment submissions, AI tutor access, and personalized learning recommendations.",
      bullets: ["Performance Metrics", "Assignment Tracker", "AI Assistance", "Progress Reports"],
      color: ["#ff003d", "#ff5a1f"],
    },
    {
      icon: <Feather name="users" size={30} color="#fff" />,
      title: "Teacher Dashboard",
      description:
        "Class monitoring, student analytics, assignment management, and performance reports for effective teaching.",
      bullets: ["Class Analytics", "Student Monitoring", "Grade Management", "Reports & Insights"],
      color: ["#ff8a00", "#ff5a00"],
    },
    {
      icon: <Feather name="shield" size={30} color="#fff" />,
      title: "Admin Dashboard",
      description:
        "System-wide analytics, user management, institutional insights, and platform configuration.",
      bullets: ["System Analytics", "User Management", "Institutional Reports", "Platform Config"],
      color: ["#ff2d7a", "#ff4c98"],
    },
    {
      icon: <Ionicons name="chatbox-outline" size={30} color="#fff" />,
      title: "Messaging & Collaboration",
      description:
        "Real-time communication between students, teachers, and administrators for seamless collaboration.",
      bullets: ["Direct Messaging", "Group Chats", "Announcements", "Notifications"],
      color: ["#bd6f00", "#2e241d"],
    },
    {
      icon: <Ionicons name="book-outline" size={30} color="#fff" />,
      title: "Learning Materials",
      description:
        "Comprehensive resource library with video tutorials, coding challenges, and interactive lessons.",
      bullets: ["Video Tutorials", "Code Examples", "Documentation", "Practice Problems"],
      color: ["#ff193f", "#f50732"],
    },
    {
      icon: <Ionicons name="game-controller-outline" size={30} color="#fff" />,
      title: "Gamified Learning",
      description:
        "Interactive games and challenges that make programming education engaging and fun.",
      bullets: ["Coding Games", "Leaderboards", "Achievements", "Challenges"],
      color: ["#ff7a00", "#ff4b00"],
    },
  ];

  const userCards: UserCard[] = [
    {
      icon: <Ionicons name="school-outline" size={34} color="#fff" />,
      eyebrow: "FOR STUDENTS",
      title: "Learn Programming with AI Tutor",
      description:
        "Get personalized assistance while learning to code, receive instant feedback on your work, and track your progress in real-time.",
      bullets: [
        "24/7 AI tutoring ",
        "Instant debugging and code feedback",
        "Personalized learning recommendations",
        "Track your performance and progress",
        "Access to comprehensive learning resources",
      ],
      color: ["#ff3b30", "#ff6b00"],
    },
    {
      icon: <Feather name="users" size={34} color="#fff" />,
      eyebrow: "FOR TEACHERS",
      title: "Monitor Class Performance with Analytics",
      description:
        "Gain deep insights into student performance, identify struggling learners early, and make data-driven decisions for your classroom.",
      bullets: [
        "Real-time class performance dashboard",
        "Identify at-risk students proactively",
        "Track individual and group progress",
        "Generate comprehensive reports",
        "Manage assignments and assessments",
      ],
      color: ["#ff8a00", "#ff6d00"],
    },
    {
      icon: <Feather name="shield" size={34} color="#fff" />,
      eyebrow: "FOR ADMINISTRATORS",
      title: "Manage System & Analyze Institutional Data",
      description:
        "Access system-wide analytics, manage users and resources, and derive institutional insights for strategic decision-making.",
      bullets: [
        "Institutional performance analytics",
        "User and resource management",
        "System configuration and oversight",
        "Department-level insights",
        "Data export and reporting tools",
      ],
      color: ["#ff2d7a", "#ff4c98"],
    },
  ];

  const navItems: { label: string; section: SectionKey }[] = [
    { label: "Features", section: "features" },
    { label: "How It Works", section: "how" },
    { label: "Modules", section: "modules" },
    { label: "Analytics", section: "analytics" },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <Animated.ScrollView
        ref={scrollRef as any}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
            listener: (event: any) => {
              handleScrollPosition(event.nativeEvent.contentOffset.y);
            },
          }
        )}
      >
        <LinearGradient colors={["#050817", "#38070a", "#4b0808", "#151726"]} locations={[0, 0.34, 0.68, 1]} style={styles.page}>
          <View style={styles.bgGlowOne} />
          <View style={styles.bgGlowTwo} />

          <View style={[styles.container, isSmall && styles.containerSmall]}>
            <Header isMobile={isMobile} isSmall={isSmall} navItems={navItems} scrollToSection={scrollToSection} onGetStarted={goToSignIn} />

            <View style={[styles.hero, isDesktop ? styles.heroDesktop : styles.heroStack]}>
              <View style={[styles.heroLeft, isDesktop && styles.heroLeftDesktop]}>
                <Pill icon={<Ionicons name="sparkles-outline" size={17} color="#ff9aa5" />} text="Powered by Advanced AI & Machine Learning" />

                <GradientTextLike isDesktop={isDesktop} isTablet={isTablet} isSmall={isSmall}>
                  AI-Powered{"\n"}Learning &{"\n"}Analytics{"\n"}Platform
                </GradientTextLike>

                <Text style={[styles.heroDescription, isTablet && styles.heroDescriptionTablet, isSmall && styles.heroDescriptionSmall]}>
                  ParseIT Hub combines an intelligent AI tutor with predictive analytics to transform programming education. Get personalized learning assistance, track student performance, and gain actionable academic insights—all in one platform.
                </Text>

                <View style={[styles.heroButtons, isSmall && styles.heroButtonsSmall]}>
                  <TouchableOpacity activeOpacity={0.9} onPress={goToSignIn} style={[styles.primaryButton, isSmall && styles.buttonFull]}>
                    <LinearGradient colors={["#ff0019", "#ff4f00"]} style={styles.buttonGradient}>
                      <Text style={styles.primaryButtonText}>Get Started</Text>
                      <Feather name="arrow-right" size={22} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity activeOpacity={0.9} onPress={() => scrollToSection("features")} style={[styles.secondaryButton, isSmall && styles.buttonFull]}>
                    <Text style={styles.secondaryButtonText}>Explore Platform</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.heroStats, isSmall && styles.heroStatsSmall]}>
                  <StatMini value="AI-Powered" label="ChatGPT-Style Tutor" accent="pink" />
                  <StatMini value="Real-Time" label="Analytics Dashboard" accent="orange" />
                  <StatMini value="Cross-Platform" label="Web & Mobile" accent="pink" />
                </View>
              </View>

              <View style={[styles.heroRight, isDesktop && styles.heroRightDesktop]}>
                <HeroMockup compact={!isDesktop} />
              </View>
            </View>
          </View>

          <SectionWrapper scrollY={scrollY} onLayout={onSectionLayout("features")}>
            <SectionHeader scrollY={scrollY} title="Complete Academic Ecosystem" subtitle="More than just a chatbot—ParseIT Hub is a comprehensive platform combining AI tutoring with powerful analytics for next-generation learning." />
            <ResponsiveGrid>
              {features.map((feature, index) => (
                <FeatureTile key={feature.title} feature={feature} index={index} />
              ))}
            </ResponsiveGrid>
          </SectionWrapper>

          <SectionWrapper scrollY={scrollY} onLayout={onSectionLayout("how")}>
            <SectionHeader scrollY={scrollY} title="How It Works" subtitle="A seamless learning experience powered by AI and data analytics" />
            <View style={[styles.stepsGrid, isMobile && styles.stepsGridMobile]}>
              <StepCard revealDirection="left" index={1} title="Student Interacts" description="Students engage with the platform by asking questions, submitting assignments, and completing practice challenges, while the system generates follow-up activities based on their performance." icon={<Feather name="user" size={30} color="#ff6b78" />} />
              <StepArrow hidden={isMobile} />
              <StepCard revealDirection="up" index={2} title="AI Processes & Guides" description="The AI assistant analyzes inputs, provides intelligent feedback, and offers personalized tutoring in real-time." icon={<MaterialCommunityIcons name="brain" size={34} color="#ff9700" />} />
              <StepArrow hidden={isMobile} />
              <StepCard revealDirection="right" index={3} title="Analytics Track & Improve" description="Predictive analytics monitor performance, identify learning gaps, and suggest targeted improvements for each student." icon={<Feather name="trending-up" size={34} color="#ff5d82" />} />
            </View>
          </SectionWrapper>

          <SectionWrapper scrollY={scrollY} onLayout={onSectionLayout("modules")}>
            <SectionHeader scrollY={scrollY} title="Comprehensive Module Suite" subtitle="Everything you need for modern programming education—from dashboards to collaboration tools" />
            <ResponsiveGrid>
              {moduleCards.map((module, index) => (
                <ModuleTile key={module.title} module={module} index={index} />
              ))}
            </ResponsiveGrid>
          </SectionWrapper>

          <SectionWrapper scrollY={scrollY} onLayout={onSectionLayout("users")}>
            <SectionHeader scrollY={scrollY} title="Built for Every User" subtitle="Tailored experiences for students, teachers, and administrators" />
            <View style={[styles.userGrid, isMobile && styles.userGridMobile]}>
              {userCards.map((card, index) => (
                <UserTile key={card.eyebrow} card={card} index={index} />
              ))}
            </View>
          </SectionWrapper>

          <SectionWrapper scrollY={scrollY} onLayout={onSectionLayout("analytics")}>
            <SectionHeader scrollY={scrollY} title="AI + Analytics = Smart Learning" subtitle="Combining artificial intelligence with predictive analytics for unprecedented educational insights" />
            <View style={[styles.analyticsTopGrid, isMobile && styles.analyticsTopGridMobile]}>
              <AnalyticsMini index={0} icon={<MaterialCommunityIcons name="brain" size={36} color="#ff6b78" />} title="Real-time AI Assistance" text="Intelligent tutoring that adapts to each student's learning pace and style." />
              <AnalyticsMini index={1} icon={<Feather name="bar-chart-2" size={36} color="#ff6b78" />} title="Data-Driven Insights" text="Comprehensive analytics to track progress and identify improvement areas." />
              <AnalyticsMini index={2} icon={<Feather name="target" size={36} color="#ff6b78" />} title="Personalized Learning" text="Customized recommendations based on individual performance and goals." />
            </View>

            <View style={[styles.chartGrid, isMobile && styles.chartGridMobile]}>
              <PerformanceChart revealDirection="left" />
              <SkillsRadar revealDirection="right" />
            </View>

            <View style={[styles.metricStrip, isMobile && styles.metricStripMobile]}>
              <MetricBig index={0} value="95%" label="AI Accuracy" />
              <MetricBig index={1} value="10K+" label="Questions Answered" orange />
              <MetricBig index={2} value="85%" label="Student Satisfaction" />
              <MetricBig index={3} value="24/7" label="Availability" orange />
            </View>
          </SectionWrapper>

          

          <View style={styles.ctaOuter}>
            <ScrollReveal scrollY={scrollY} direction="left" distance={32} style={styles.ctaCard}>
              <Pill icon={<Feather name="zap" size={17} color="#ff9aa5" />} text="Transform Learning with AI" centered />
              <Text style={[styles.ctaTitle, isSmall && styles.ctaTitleSmall]}>Ready to Revolutionize Education?</Text>
              <Text style={styles.ctaText}>
               Join ParseIT Hub 2.0 and experience the future of AI-powered education. Empower students with intelligent tutoring, equip teachers with advanced analytics, and transform your institution.
              </Text>
              <View style={[styles.ctaActions, isSmall && styles.ctaActionsSmall]}>
                <TouchableOpacity activeOpacity={0.9} onPress={goToSignIn} style={[styles.ctaPrimary, isSmall && styles.buttonFull]}>
                  <LinearGradient colors={["#ff0019", "#ff4f00"]} style={styles.ctaPrimaryGradient}>
                    <Text style={styles.ctaPrimaryText}>Start Using ParseIT Hub Today</Text>
                    <Feather name="arrow-right" size={22} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <View style={[styles.ctaTags, isSmall && styles.ctaTagsSmall]}>
                <SmallTag text="AI-Powered" />
                <SmallTag text="Analytics-Driven" orange />
                <SmallTag text="Cross-Platform" />
              </View>
            </ScrollReveal>
          </View>

          <ScrollReveal scrollY={scrollY} direction="right" distance={30}>
            <Footer />
          </ScrollReveal>
        </LinearGradient>
      </Animated.ScrollView>

      <Animated.View
        pointerEvents={showBackToTop ? "auto" : "none"}
        style={[
          styles.backToTopWrap,
          isSmall && styles.backToTopWrapSmall,
          {
            opacity: backToTopOpacity,
            transform: [{ translateY: backToTopTranslateY }],
          },
        ]}
      >
        <TouchableOpacity activeOpacity={0.88} onPress={scrollToTop} accessibilityRole="button" accessibilityLabel="Return to top">
          <LinearGradient colors={["#ff0019", "#ff7a00"]} style={[styles.backToTopButton, isSmall && styles.backToTopButtonSmall]}>
            <Feather name="arrow-up" size={isSmall ? 22 : 26} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

function ScrollReveal({
  children,
  scrollY,
  style,
  direction = "up",
  distance = 30,
}: {
  children: React.ReactNode;
  scrollY: Animated.Value;
  style?: any;
  direction?: "up" | "left" | "right";
  distance?: number;
}) {
  const { height } = useWindowDimensions();
  const [layoutY, setLayoutY] = React.useState(0);

  const start = Math.max(0, layoutY - height * 0.96);
  const end = Math.max(start + 1, layoutY - height * 0.46);

  const opacity = scrollY.interpolate({
    inputRange: [start, end],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const translate = scrollY.interpolate({
    inputRange: [start, end],
    outputRange: [distance, 0],
    extrapolate: "clamp",
  });

  const transform =
    direction === "left"
      ? [{ translateX: translate }]
      : direction === "right"
      ? [{ translateX: Animated.multiply(translate, -1) }]
      : [{ translateY: translate }];

  return (
    <Animated.View
      onLayout={(event) => setLayoutY(event.nativeEvent.layout.y)}
      style={[style, { opacity, transform }]}
    >
      {children}
    </Animated.View>
  );
}

function Header({ isMobile, isSmall, navItems, scrollToSection, onGetStarted }: { isMobile: boolean; isSmall: boolean; navItems: { label: string; section: SectionKey }[]; scrollToSection: (section: SectionKey) => void; onGetStarted: () => void; }) {
  return (
    <View style={[styles.header, isMobile && styles.headerMobile]}>
      <View style={styles.brandRow}>
        <View style={[styles.brandIcon, isSmall && styles.brandIconSmall]}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.brandLogoImage}
            resizeMode="contain"
          />
        </View>
        <View style={styles.brandTextWrap}>
          <Text style={[styles.brandTitle, isSmall && styles.brandTitleSmall]}>ParseIT Hub</Text>
          <Text style={styles.brandSubtitle}>AI-Powered Learning Platform</Text>
        </View>
      </View>

      <View style={[styles.navRow, isMobile && styles.navRowMobile]}>
        {navItems.map((item) => (
          <TouchableOpacity key={item.label} onPress={() => scrollToSection(item.section)} style={styles.navItem}>
            <Text style={styles.navText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={onGetStarted} style={styles.signInButton}>
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Pill({ icon, text, centered }: { icon: React.ReactNode; text: string; centered?: boolean }) {
  return (
    <View style={[styles.pill, centered && styles.pillCentered]}>
      {icon}
      <Text style={styles.pillText}>{text}</Text>
    </View>
  );
}

function GradientTextLike({ children, isDesktop, isTablet, isSmall }: { children: React.ReactNode; isDesktop: boolean; isTablet: boolean; isSmall: boolean }) {
  return (
    <Text style={[styles.heroTitle, isDesktop && styles.heroTitleDesktop, isTablet && !isDesktop && styles.heroTitleTablet, isSmall && styles.heroTitleSmall]}>
      {children}
    </Text>
  );
}

function StatMini({ value, label, accent }: { value: string; label: string; accent: "pink" | "orange" }) {
  return (
    <View style={styles.statMini}>
      <Text style={[styles.statMiniValue, accent === "orange" && styles.orangeText]}>{value}</Text>
      <Text style={styles.statMiniLabel}>{label}</Text>
    </View>
  );
}

function HeroMockup({ compact }: { compact: boolean }) {
  const sparkBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkBounce, {
          toValue: -10,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sparkBounce, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [sparkBounce]);

  return (
    <View style={[styles.mockupWrap, compact && styles.mockupWrapCompact]}>
      <Animated.View style={[styles.sparkFloat, { transform: [{ translateY: sparkBounce }] }]}>
        <Ionicons name="sparkles-outline" size={30} color="#fff" />
      </Animated.View>
      <View style={styles.mockupCard}>
        <View style={styles.mockupHeader}>
          <View style={styles.mockupBrandRow}>
            <View style={styles.mockupIcon}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.mockupLogoImage}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={styles.mockupTitle}>ParseIT Hub</Text>
              <Text style={styles.mockupSubtitle}>Student Dashboard</Text>
            </View>
          </View>
          <View style={styles.dotsRow}>
            <View style={[styles.dot, { backgroundColor: "#ff3344" }]} />
            <View style={[styles.dot, { backgroundColor: "#ffbf00" }]} />
            <View style={[styles.dot, { backgroundColor: "#17c964" }]} />
          </View>
        </View>
        <View style={[styles.mockupStats, compact && styles.mockupStatsCompact]}>
          <View style={styles.mockupStatCard}>
            <Text style={styles.mockupStatValue}>92%</Text>
            <Text style={styles.mockupStatLabel}>Overall Performance</Text>
          </View>
          <View style={styles.mockupStatCardOrange}>
            <Text style={styles.orangeStatValue}>24</Text>
            <Text style={styles.mockupStatLabel}>Tasks Completed</Text>
          </View>
        </View>
        <View style={styles.aiBox}>
          <View style={styles.aiBoxHeader}>
            <MaterialCommunityIcons name="brain" size={20} color="#ff6676" />
            <Text style={styles.aiBoxTitle}>AI Assistant</Text>
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.questionBubble}>
            <Text style={styles.questionText}>How do I implement a binary search tree?</Text>
          </View>
          <View style={styles.answerBubble}>
            <Text style={styles.answerText}>I'll help you understand binary search trees...</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function SectionWrapper({
  children,
  onLayout,
  scrollY,
}: {
  children: React.ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
  scrollY: Animated.Value;
}) {
  const { height } = useWindowDimensions();
  const [sectionY, setSectionY] = React.useState(0);

  const start = Math.max(0, sectionY - height * 0.96);
  const end = Math.max(start + 1, sectionY - height * 0.46);

  const sectionOpacity = scrollY.interpolate({
    inputRange: [start, end],
    outputRange: [0.96, 1],
    extrapolate: "clamp",
  });

  return (
    <View
      onLayout={(event) => {
        setSectionY(event.nativeEvent.layout.y);
        onLayout?.(event);
      }}
      style={styles.sectionOuter}
    >
      <RevealSectionContext.Provider value={{ scrollY, sectionY }}>
        <Animated.View style={[styles.container, { opacity: sectionOpacity }]}>{children}</Animated.View>
      </RevealSectionContext.Provider>
    </View>
  );
}

function ContainerReveal({
  children,
  direction = "up",
  distance = 30,
  style,
}: {
  children: React.ReactNode;
  direction?: RevealDirection;
  distance?: number;
  style?: any;
}) {
  const { height } = useWindowDimensions();
  const { scrollY, sectionY } = React.useContext(RevealSectionContext);
  const [localY, setLocalY] = React.useState(0);

  if (!scrollY) return <View style={style}>{children}</View>;

  const itemY = sectionY + localY;
  const start = Math.max(0, itemY - height * 0.98);
  const end = Math.max(start + 1, itemY - height * 0.48);

  const opacity = scrollY.interpolate({
    inputRange: [start, end],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const translate = scrollY.interpolate({
    inputRange: [start, end],
    outputRange: [distance, 0],
    extrapolate: "clamp",
  });

  const transform =
    direction === "left"
      ? [{ translateX: Animated.multiply(translate, -1) }]
      : direction === "right"
      ? [{ translateX: translate }]
      : [{ translateY: translate }];

  return (
    <Animated.View
      onLayout={(event) => setLocalY(event.nativeEvent.layout.y)}
      style={[style, { opacity, transform }]}
    >
      {children}
    </Animated.View>
  );
}

function SectionHeader({ title, subtitle, scrollY }: { title: string; subtitle: string; scrollY: Animated.Value }) {
  return (
    <View style={styles.sectionHeader}>
      <ContainerReveal direction="left" distance={24}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </ContainerReveal>
      <ContainerReveal direction="right" distance={24}>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </ContainerReveal>
    </View>
  );
}

function ResponsiveGrid({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1000;
  const isTablet = width >= 690 && width < 1000;
  return <View style={[styles.grid, isDesktop ? styles.gridDesktop : isTablet ? styles.gridTablet : styles.gridMobile]}>{children}</View>;
}

function FeatureTile({ feature, index }: { feature: FeatureCard; index: number }) {
  const direction: RevealDirection = index % 2 === 0 ? "left" : "right";
  return (
    <ContainerReveal direction={direction} distance={32} style={styles.cardBase}>
      <LinearGradient colors={feature.color} style={styles.tileIcon}>
        {feature.icon}
      </LinearGradient>
      <Text style={styles.tileTitle}>{feature.title}</Text>
      <Text style={styles.tileDescription}>{feature.description}</Text>
    </ContainerReveal>
  );
}

function StepCard({ index, title, description, icon, revealDirection = "up" }: { index: number; title: string; description: string; icon: React.ReactNode; revealDirection?: RevealDirection }) {
  return (
    <ContainerReveal direction={revealDirection} distance={32} style={styles.stepCard}>
      <LinearGradient colors={index === 2 ? ["#ff7a00", "#ff4d00"] : index === 3 ? ["#ff0062", "#ff2f75"] : ["#ff0019", "#ff2848"]} style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{index}</Text>
      </LinearGradient>
      <View style={styles.stepIconBox}>{icon}</View>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepText}>{description}</Text>
    </ContainerReveal>
  );
}

function StepArrow({ hidden }: { hidden: boolean }) {
  if (hidden) return null;
  return (
    <View style={styles.stepArrow}>
      <View style={styles.arrowLine} />
      <Feather name="arrow-right" size={36} color="#fff" />
    </View>
  );
}

function ModuleTile({ module, index }: { module: ModuleCard; index: number }) {
  const direction: RevealDirection = index % 2 === 0 ? "left" : "right";
  return (
    <ContainerReveal direction={direction} distance={32} style={styles.cardBase}>
      <LinearGradient colors={module.color} style={styles.moduleIcon}>
        {module.icon}
      </LinearGradient>
      <Text style={styles.tileTitle}>{module.title}</Text>
      <Text style={styles.tileDescription}>{module.description}</Text>
      <View style={styles.bulletStack}>
        {module.bullets.map((bullet) => (
          <Text key={bullet} style={styles.moduleBullet}>{bullet}</Text>
        ))}
      </View>
    </ContainerReveal>
  );
}

function UserTile({ card, index }: { card: UserCard; index: number }) {
  const direction: RevealDirection = index % 2 === 0 ? "left" : "right";
  return (
    <ContainerReveal direction={direction} distance={34} style={styles.userCard}>
      <LinearGradient colors={card.color} style={styles.userIcon}>
        {card.icon}
      </LinearGradient>
      <Text style={styles.userEyebrow}>{card.eyebrow}</Text>
      <Text style={styles.userTitle}>{card.title}</Text>
      <Text style={styles.userDescription}>{card.description}</Text>
      <View style={styles.checkStack}>
        {card.bullets.map((bullet) => (
          <View key={bullet} style={styles.checkRow}>
            <Feather name="check-circle" size={22} color="#00f58a" />
            <Text style={styles.checkText}>{bullet}</Text>
          </View>
        ))}
      </View>
    </ContainerReveal>
  );
}

function AnalyticsMini({ icon, title, text, index }: { icon: React.ReactNode; title: string; text: string; index: number }) {
  const direction: RevealDirection = index % 2 === 0 ? "left" : "right";
  return (
    <ContainerReveal direction={direction} distance={30} style={styles.analyticsMini}>
      {icon}
      <Text style={styles.analyticsMiniTitle}>{title}</Text>
      <Text style={styles.analyticsMiniText}>{text}</Text>
    </ContainerReveal>
  );
}

function PerformanceChart({ revealDirection = "left" }: { revealDirection?: RevealDirection }) {
  const performanceData = [
    { month: "Jan", score: 65, engagement: 70 },
    { month: "Feb", score: 72, engagement: 75 },
    { month: "Mar", score: 78, engagement: 82 },
    { month: "Apr", score: 85, engagement: 88 },
    { month: "May", score: 90, engagement: 92 },
  ];

  const chartLeft = 58;
  const chartRight = 526;
  const chartTop = 20;
  const chartBottom = 220;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [chartPixelWidth, setChartPixelWidth] = useState(0);

  const points = performanceData.map((item, index) => {
    const x = chartLeft + (chartWidth / (performanceData.length - 1)) * index;
    const y = chartBottom - (item.score / 100) * chartHeight;
    return { ...item, x, y };
  });

  const linePoints = points.map((item) => `${item.x},${item.y}`).join(" ");
  const fillPoints = `${linePoints} ${chartRight},${chartBottom} ${chartLeft},${chartBottom}`;
  const activePoint = activeIndex !== null ? points[activeIndex] : null;

  const updateActivePoint = (locationX: number) => {
    if (!chartPixelWidth) return;

    const svgX = (locationX / chartPixelWidth) * 560;
    const clampedX = Math.min(Math.max(svgX, chartLeft), chartRight);
    const ratio = (clampedX - chartLeft) / chartWidth;
    const nextIndex = Math.round(ratio * (performanceData.length - 1));
    setActiveIndex(Math.min(Math.max(nextIndex, 0), performanceData.length - 1));
  };

  const responderHandlers = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: (event: any) => updateActivePoint(event.nativeEvent.locationX),
    onResponderMove: (event: any) => updateActivePoint(event.nativeEvent.locationX),
  };

  const webHoverHandlers =
    Platform.OS === "web"
      ? ({
          onMouseEnter: (event: any) => {
            const x = event?.nativeEvent?.offsetX ?? event?.nativeEvent?.locationX ?? 0;
            updateActivePoint(x);
          },
          onMouseMove: (event: any) => {
            const x = event?.nativeEvent?.offsetX ?? event?.nativeEvent?.locationX ?? 0;
            updateActivePoint(x);
          },
          onMouseLeave: () => setActiveIndex(null),
        } as any)
      : {};

  const tooltipX = activePoint ? Math.min(Math.max(activePoint.x + 12, 72), 360) : 0;
  const tooltipY = activePoint ? (activePoint.y < 80 ? activePoint.y + 12 : activePoint.y - 64) : 0;

  return (
    <ContainerReveal direction={revealDirection} distance={34} style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <LinearGradient colors={["#ff3b30", "#ff7a00"]} style={styles.chartIconSmall}>
          <Feather name="trending-up" size={22} color="#fff" />
        </LinearGradient>
        <View>
          <Text style={styles.chartTitle}>Performance Trends</Text>
          <Text style={styles.chartSubtitle}>Student progress over time</Text>
        </View>
      </View>

      <View
        style={styles.lineChartArea}
        onLayout={(event) => setChartPixelWidth(event.nativeEvent.layout.width)}
        {...responderHandlers}
        {...webHoverHandlers}
      >
        <Svg width="100%" height="100%" viewBox="0 0 560 285" style={styles.chartSvg}>
          <Defs>
            <SvgLinearGradient id="performanceFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#ff7a00" stopOpacity="0.48" />
              <Stop offset="0.58" stopColor="#ff7a00" stopOpacity="0.2" />
              <Stop offset="1" stopColor="#ff7a00" stopOpacity="0.02" />
            </SvgLinearGradient>
          </Defs>

          {[20, 70, 120, 170, 220].map((y) => (
            <Line
              key={`h-${y}`}
              x1="58"
              y1={y}
              x2="526"
              y2={y}
              stroke="rgba(148,163,184,0.28)"
              strokeWidth="1"
              strokeDasharray="4 5"
            />
          ))}

          {[58, 175, 292, 409, 526].map((x) => (
            <Line
              key={`v-${x}`}
              x1={x}
              y1="20"
              x2={x}
              y2="220"
              stroke="rgba(148,163,184,0.22)"
              strokeWidth="1"
              strokeDasharray="4 5"
            />
          ))}

          <Line x1="58" y1="20" x2="58" y2="220" stroke="#94a3b8" strokeWidth="1.3" />
          <Line x1="58" y1="220" x2="526" y2="220" stroke="#94a3b8" strokeWidth="1.3" />

          <Polygon points={fillPoints} fill="url(#performanceFill)" />

          <Polyline
            points={linePoints}
            fill="none"
            stroke="#ff7a00"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {activePoint && (
            <>
              <Line
                x1={activePoint.x}
                y1="20"
                x2={activePoint.x}
                y2="220"
                stroke="rgba(255,255,255,0.72)"
                strokeWidth="1.2"
              />
              <Circle cx={activePoint.x} cy={activePoint.y} r="5.5" fill="#ff3344" stroke="#ffffff" strokeWidth="2.2" />
              <Rect x={tooltipX} y={tooltipY} width="160" height="96" rx="8" fill="#1b2b40" stroke="rgba(148,163,184,0.28)" strokeWidth="1" />
              <SvgText x={tooltipX + 12} y={tooltipY + 28} fill="#dbeafe" fontSize="18">
                {activePoint.month}
              </SvgText>
              <SvgText x={tooltipX + 12} y={tooltipY + 58} fill="#ff3344" fontSize="18">
                {`score : ${activePoint.score}`}
              </SvgText>
              <SvgText x={tooltipX + 12} y={tooltipY + 88} fill="#ff7a00" fontSize="18">
                {`engagement : ${activePoint.engagement}`}
              </SvgText>
            </>
          )}

          {[
            ["100", 25],
            ["75", 75],
            ["50", 125],
            ["25", 175],
            ["0", 225],
          ].map(([label, y]) => (
            <SvgText key={label} x="48" y={Number(y)} fill="#9ca8bf" fontSize="20" textAnchor="end">
              {label}
            </SvgText>
          ))}

          {points.map((item) => (
            <SvgText key={item.month} x={item.x} y="245" fill="#9ca8bf" fontSize="20" textAnchor="middle">
              {item.month}
            </SvgText>
          ))}
        </Svg>
      </View>

      <View style={styles.legendRow}>
        <View style={[styles.legendDot, { backgroundColor: "#ff3344" }]} />
        <Text style={styles.legendText}>Score</Text>
        <View style={[styles.legendDot, { backgroundColor: "#ff7a00" }]} />
        <Text style={styles.legendText}>Engagement</Text>
      </View>
    </ContainerReveal>
  );
}

function SkillsRadar({ revealDirection = "right" }: { revealDirection?: RevealDirection }) {
  return (
    <ContainerReveal direction={revealDirection} distance={34} style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <LinearGradient colors={["#ff3b30", "#ff2d7a"]} style={styles.chartIconSmall}>
          <Feather name="bar-chart-2" size={22} color="#fff" />
        </LinearGradient>
        <View>
          <Text style={styles.chartTitle}>Skills Analysis</Text>
          <Text style={styles.chartSubtitle}>Competency across subjects</Text>
        </View>
      </View>

      <View style={styles.radarBox}>
        <Svg width="100%" height="100%" viewBox="0 0 390 270" style={styles.radarSvg}>
          <Defs>
            <SvgLinearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#ff7a00" stopOpacity="0.58" />
              <Stop offset="1" stopColor="#ff7a00" stopOpacity="0.34" />
            </SvgLinearGradient>
          </Defs>

          <Polygon points="195,36 286,102 251,209 139,209 104,102" fill="none" stroke="#94a3b8" strokeWidth="1.4" />
          <Polygon points="195,65 258,111 234,185 156,185 132,111" fill="none" stroke="rgba(148,163,184,0.42)" strokeWidth="1" />
          <Polygon points="195,94 231,120 217,162 173,162 159,120" fill="none" stroke="rgba(148,163,184,0.27)" strokeWidth="1" />
          <Polygon points="195,123 203,129 200,138 190,138 187,129" fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="1" />

          {[["195", "135", "195", "36"], ["195", "135", "286", "102"], ["195", "135", "251", "209"], ["195", "135", "139", "209"], ["195", "135", "104", "102"]].map((line, index) => (
            <Line
              key={`axis-${index}`}
              x1={line[0]}
              y1={line[1]}
              x2={line[2]}
              y2={line[3]}
              stroke="rgba(148,163,184,0.28)"
              strokeWidth="1"
            />
          ))}

          <Polygon
            points="195,58 252,112 232,194 150,195 128,112"
            fill="url(#radarFill)"
            stroke="#ff7a00"
            strokeWidth="2"
          />

          <SvgText x="195" y="27" fill="#a8b4cc" fontSize="20" textAnchor="middle">Python</SvgText>
          <SvgText x="298" y="105" fill="#a8b4cc" fontSize="20" textAnchor="start">JavaScript</SvgText>
          <SvgText x="250" y="224" fill="#a8b4cc" fontSize="20" textAnchor="middle">Data Structures</SvgText>
          <SvgText x="135" y="224" fill="#a8b4cc" fontSize="20" textAnchor="middle">Algorithms</SvgText>
          <SvgText x="92" y="105" fill="#a8b4cc" fontSize="20" textAnchor="end">Web Dev</SvgText>

          <SvgText x="203" y="151" fill="#a8b4cc" fontSize="18">0</SvgText>
          <SvgText x="229" y="151" fill="#a8b4cc" fontSize="18">25</SvgText>
          <SvgText x="255" y="151" fill="#a8b4cc" fontSize="18">50</SvgText>
          <SvgText x="280" y="151" fill="#a8b4cc" fontSize="18">75</SvgText>
          <SvgText x="306" y="151" fill="#a8b4cc" fontSize="18">100</SvgText>

          <Circle cx="195" cy="135" r="2.5" fill="rgba(255,255,255,0.45)" />
        </Svg>
      </View>

      <Text style={styles.averageText}>Average Competency: <Text style={styles.averageValue}>84.6%</Text></Text>
    </ContainerReveal>
  );
}

function MetricBig({ value, label, orange, index }: { value: string; label: string; orange?: boolean; index: number }) {
  const direction: RevealDirection = index % 2 === 0 ? "left" : "right";
  return (
    <ContainerReveal direction={direction} distance={26} style={styles.metricBig}>
      <Text style={[styles.metricBigValue, orange && styles.orangeText]}>{value}</Text>
      <Text style={styles.metricBigLabel}>{label}</Text>
    </ContainerReveal>
  );
}

function ArchitectureFlow() {
  const items = [
    { icon: <Feather name="users" size={26} color="#fff" />, title: "Users", text: "Students, teachers, and admins access the platform from web and mobile devices." },
    { icon: <Ionicons name="phone-portrait-outline" size={26} color="#fff" />, title: "Frontend", text: "React Native with Expo delivers responsive interfaces across screen sizes." },
    { icon: <Feather name="server" size={26} color="#fff" />, title: "Backend", text: "Firebase services handle authentication, storage, and real-time data operations." },
    { icon: <MaterialCommunityIcons name="brain" size={26} color="#fff" />, title: "AI + Analytics", text: "AI tutor and predictive analytics provide guidance and learning insights." },
    { icon: <Feather name="database" size={26} color="#fff" />, title: "Database", text: "Firestore stores academic records, content, messages, and system activity." },
  ];
  return (
    <View style={styles.archGrid}>
      {items.map((item, index) => (
        <View key={item.title} style={styles.archItem}>
          <LinearGradient colors={["#ff0019", "#ff7a00"]} style={styles.archIcon}>{item.icon}</LinearGradient>
          <Text style={styles.archIndex}>0{index + 1}</Text>
          <Text style={styles.archTitle}>{item.title}</Text>
          <Text style={styles.archText}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
}

function SmallTag({ text, orange }: { text: string; orange?: boolean }) {
  return (
    <View style={[styles.smallTag, orange && styles.smallTagOrange]}>
      <Ionicons name="sparkles-outline" size={16} color={orange ? "#ffb000" : "#ff83a0"} />
      <Text style={styles.smallTagText}>{text}</Text>
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.footerOuter}>
      <View style={styles.footerGrid}>
        <View style={styles.footerMain}>
          <View style={styles.footerBrandRow}>
            <View style={styles.footerLogo}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.footerLogoImage}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={styles.footerBrandTitle}>ParseIT Hub</Text>
              <Text style={styles.footerBrandSub}>AI-Powered Learning Platform</Text>
            </View>
          </View>
          <Text style={styles.footerDescription}>
           An intelligent academic platform designed for BSIT students and faculty at Cebu Technological University, combining AI-powered tutoring with predictive analytics for next-generation education.
          </Text>
          <View style={styles.universityRow}>
            <LinearGradient colors={["#2563eb", "#1d4ed8"]} style={styles.universityIcon}>
              <Ionicons name="school-outline" size={27} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={styles.universityTitle}>Cebu Technological University - Argao Campus</Text>
              <Text style={styles.universitySub}>College of Technology and Engineering</Text>
            </View>
          </View>
        </View>
        <View style={styles.footerColumn}>
          <Text style={styles.footerColumnTitle}>Platform</Text>
          {[
            ["book-open", "Features"],
            ["cpu", "AI Assistant"],
            ["file-text", "Analytics"],
            ["external-link", "Documentation"],
          ].map(([icon, label]) => (
            <View key={label} style={styles.footerLinkRow}>
              <Feather name={icon as keyof typeof Feather.glyphMap} size={19} color="#93a4bd" />
              <Text style={styles.footerLinkText}>{label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.footerColumn}>
          <Text style={styles.footerColumnTitle}>Resources</Text>
          {[
            ["github", "GitHub Repository"],
            ["file-text", "API Documentation"],
            ["book-open", "User Guide"],
            ["mail", "Contact Support"],
          ].map(([icon, label]) => (
            <View key={label} style={styles.footerLinkRow}>
              <Feather name={icon as keyof typeof Feather.glyphMap} size={19} color="#93a4bd" />
              <Text style={styles.footerLinkText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.footerBottom}>
        <Text style={styles.copyright}>© 2026 ParseIT Hub 2.0 - Cebu Technological University. All rights reserved.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#050817" },
  scrollContent: { flexGrow: 1 },
  page: { flex: 1, minHeight: "100%" },
  bgGlowOne: { position: "absolute", top: -90, right: -90, width: 340, height: 340, borderRadius: 999, backgroundColor: "rgba(255,0,40,0.18)" },
  bgGlowTwo: { position: "absolute", top: 440, left: -120, width: 360, height: 360, borderRadius: 999, backgroundColor: "rgba(255,116,0,0.1)" },
  container: { width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center", paddingHorizontal: 38 },
  containerSmall: { paddingHorizontal: 18 },

  header: { paddingVertical: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 20 },
  headerMobile: { flexDirection: "column", alignItems: "stretch" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 14, flexShrink: 1 },
  brandIcon: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#fff" },
  brandIconSmall: { width: 48, height: 48, borderRadius: 15 },
  brandLogoImage: { width: "80%", height: "80%" },
  brandTextWrap: { flexShrink: 1 },
  brandTitle: { color: "#fff", fontSize: 24, fontWeight: "900", lineHeight: 29 },
  brandTitleSmall: { fontSize: 20 },
  brandSubtitle: { color: "#aab6cc", fontSize: 14, marginTop: 3 },
  navRow: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  navRowMobile: { justifyContent: "flex-start" },
  navItem: { paddingVertical: 9, paddingHorizontal: 8 },
  navText: { color: "#ccd4e4", fontSize: 15, fontWeight: "700" },
  signInButton: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.07)" },
  signInText: { color: "#fff", fontWeight: "800" },

  hero: { paddingTop: 78, paddingBottom: 110, gap: 42 },
  heroDesktop: { flexDirection: "row", alignItems: "center", minHeight: 720 },
  heroStack: { flexDirection: "column" },
  heroLeft: { width: "100%" },
  heroLeftDesktop: { flex: 0.97, paddingRight: 30 },
  heroRight: { width: "100%" },
  heroRightDesktop: { flex: 1.03, paddingLeft: 16 },
  pill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 19, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,95,110,0.35)", backgroundColor: "rgba(255,40,70,0.12)" },
  pillCentered: { alignSelf: "center" },
  pillText: { color: "#ffb7bf", fontSize: 16, fontWeight: "700" },
  heroTitle: { marginTop: 34, fontSize: 56, lineHeight: 64, fontWeight: "900", letterSpacing: -1.8, color: "#ff6b6b" },
  heroTitleDesktop: { fontSize: 75, lineHeight: 76, maxWidth: 560 },
  heroTitleTablet: { fontSize: 64, lineHeight: 68 },
  heroTitleSmall: { fontSize: 42, lineHeight: 47, letterSpacing: -1 },
  heroDescription: { marginTop: 28, color: "#cbd5e1", fontSize: 25, lineHeight: 41, maxWidth: 700 },
  heroDescriptionTablet: { fontSize: 21, lineHeight: 34 },
  heroDescriptionSmall: { fontSize: 17, lineHeight: 29 },
  heroButtons: { flexDirection: "row", gap: 20, marginTop: 42, alignItems: "center" },
  heroButtonsSmall: { flexDirection: "column", alignItems: "stretch" },
  primaryButton: { borderRadius: 14, overflow: "hidden", shadowColor: "#ff1c1c", shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  buttonGradient: { minHeight: 72, paddingHorizontal: 38, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 },
  primaryButtonText: { color: "#fff", fontSize: 18, fontWeight: "900" },
  secondaryButton: { minHeight: 72, paddingHorizontal: 38, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.06)" },
  secondaryButtonText: { color: "#fff", fontSize: 18, fontWeight: "900" },
  buttonFull: { width: "100%" },
  heroStats: { marginTop: 66, flexDirection: "row", gap: 52, flexWrap: "wrap" },
  heroStatsSmall: { gap: 20 },
  statMini: { minWidth: 180 },
  statMiniValue: { color: "#ff6688", fontSize: 36, lineHeight: 44, fontWeight: "900" },
  orangeText: { color: "#ff9900" },
  statMiniLabel: { color: "#aeb8ce", fontSize: 16, marginTop: 7 },

  mockupWrap: { position: "relative", width: "100%", maxWidth: 650, alignSelf: "center" },
  mockupWrapCompact: { maxWidth: 760 },
  sparkFloat: { position: "absolute", top: -26, right: -20, width: 60, height: 60, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#ff1028", zIndex: 5, shadowColor: "#ff1028", shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  mockupCard: { borderRadius: 22, padding: 30, backgroundColor: "rgba(26,26,44,0.82)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 16 }, elevation: 12 },
  mockupHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  mockupBrandRow: { flexDirection: "row", alignItems: "center", gap: 16, flexShrink: 1 },
  mockupIcon: { width: 50, height: 50, borderRadius: 13, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#fff" },
  mockupLogoImage: { width: "78%", height: "78%" },
  mockupTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  mockupSubtitle: { color: "#aeb8ce", fontSize: 14, marginTop: 4 },
  dotsRow: { flexDirection: "row", gap: 10 },
  dot: { width: 15, height: 15, borderRadius: 999 },
  mockupStats: { flexDirection: "row", gap: 16, marginTop: 30 },
  mockupStatsCompact: { flexDirection: "column" },
  mockupStatCard: { flex: 1, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: "rgba(255,51,68,0.25)", backgroundColor: "rgba(255,40,70,0.15)" },
  mockupStatCardOrange: { flex: 1, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: "rgba(255,122,0,0.25)", backgroundColor: "rgba(255,122,0,0.14)" },
  mockupStatValue: { color: "#ff6676", fontSize: 31, fontWeight: "900" },
  orangeStatValue: { color: "#ff9800", fontSize: 31, fontWeight: "900" },
  mockupStatLabel: { color: "#aeb8ce", fontSize: 14, marginTop: 6 },
  aiBox: { marginTop: 20, borderRadius: 12, padding: 20, backgroundColor: "rgba(17,22,40,0.82)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  aiBoxHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  aiBoxTitle: { color: "#fff", fontSize: 17, fontWeight: "900", flex: 1 },
  onlineDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: "#1ecb6b" },
  questionBubble: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 12, backgroundColor: "rgba(126,25,46,0.72)", marginBottom: 10 },
  questionText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  answerBubble: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 12, backgroundColor: "rgba(31,38,60,0.9)" },
  answerText: { color: "#cbd5e1", fontSize: 14 },

  sectionOuter: { paddingVertical: 86 },
  sectionHeader: { alignItems: "center", marginBottom: 72 },
  sectionTitle: { color: "#fff", textAlign: "center", fontSize: 58, lineHeight: 68, fontWeight: "900", letterSpacing: -1.2 },
  sectionSubtitle: { color: "#a9b5cb", textAlign: "center", marginTop: 16, fontSize: 25, lineHeight: 34, maxWidth: 960 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 30 },
  gridDesktop: {},
  gridTablet: {},
  gridMobile: { flexDirection: "column" },
  cardBase: { flexGrow: 1, flexBasis: Platform.OS === "web" ? "30%" : 0, minWidth: 280, borderRadius: 16, padding: 30, minHeight: 320, backgroundColor: "rgba(24,27,45,0.72)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  tileIcon: { width: 61, height: 61, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 25 },
  moduleIcon: { width: 70, height: 70, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 26 },
  tileTitle: { color: "#fff", fontSize: 25, lineHeight: 34, fontWeight: "900" },
  tileDescription: { color: "#a8b4cc", fontSize: 20, lineHeight: 33, marginTop: 15 },
  bulletStack: { marginTop: 24, gap: 15 },
  moduleBullet: { color: "#e5e7eb", fontSize: 17, paddingLeft: 17 },

  stepsGrid: { flexDirection: "row", alignItems: "center", gap: 0 },
  stepsGridMobile: { flexDirection: "column", gap: 22 },
  stepCard: { flex: 1, minHeight: 300, borderRadius: 16, padding: 38, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(26,30,48,0.82)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  stepNumber: { position: "absolute", top: -19, left: -19, width: 50, height: 50, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  stepNumberText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  stepIconBox: { width: 80, height: 80, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,80,100,0.25)", backgroundColor: "rgba(255,255,255,0.03)", marginBottom: 32 },
  stepTitle: { color: "#fff", textAlign: "center", fontSize: 29, lineHeight: 39, fontWeight: "900" },
  stepText: { color: "#a8b4cc", textAlign: "center", fontSize: 19, lineHeight: 32, marginTop: 18 },
  stepArrow: { width: 40, alignItems: "center", justifyContent: "center", zIndex: 3 },
  arrowLine: { position: "absolute", height: 3, width: 40, backgroundColor: "#ff5b00" },

  userGrid: { flexDirection: "row", gap: 40 },
  userGridMobile: { flexDirection: "column" },
  userCard: { flex: 1, borderRadius: 16, padding: 40, backgroundColor: "rgba(26,30,48,0.82)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  userIcon: { width: 80, height: 80, borderRadius: 17, alignItems: "center", justifyContent: "center", marginBottom: 36 },
  userEyebrow: { color: "#95a3bb", fontSize: 16, fontWeight: "900", letterSpacing: 1.2, marginBottom: 17 },
  userTitle: { color: "#fff", fontSize: 29, lineHeight: 41, fontWeight: "900" },
  userDescription: { color: "#a8b4cc", fontSize: 20, lineHeight: 34, marginTop: 22 },
  checkStack: { gap: 18, marginTop: 34 },
  checkRow: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  checkText: { color: "#d9deea", fontSize: 17, lineHeight: 24, flex: 1 },

  analyticsTopGrid: { flexDirection: "row", gap: 30, marginBottom: 80 },
  analyticsTopGridMobile: { flexDirection: "column" },
  analyticsMini: { flex: 1, borderRadius: 16, padding: 31, minHeight: 220, justifyContent: "center", backgroundColor: "rgba(112,20,16,0.58)", borderWidth: 1, borderColor: "rgba(255,80,80,0.18)" },
  analyticsMiniTitle: { color: "#fff", fontSize: 23, fontWeight: "900", marginTop: 23 },
  analyticsMiniText: { color: "#cbd5e1", fontSize: 17, lineHeight: 25, marginTop: 16 },
  chartGrid: { flexDirection: "row", gap: 40 },
  chartGridMobile: { flexDirection: "column" },
  chartCard: { flex: 1, borderRadius: 16, padding: 30, backgroundColor: "rgba(26,30,48,0.82)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", minHeight: 460 },
  chartHeader: { flexDirection: "row", alignItems: "center", gap: 15, marginBottom: 30 },
  chartIconSmall: { width: 48, height: 48, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  chartTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },
  chartSubtitle: { color: "#a8b4cc", fontSize: 16, marginTop: 5 },
  lineChartArea: { height: 285, marginHorizontal: 0, marginTop: 4, position: "relative" },
  chartSvg: { overflow: "visible" },
  gridLine: { position: "absolute", left: 0, right: 0, borderTopWidth: 1, borderStyle: "dashed", borderColor: "rgba(148,163,184,0.28)" },
  verticalGridLine: { position: "absolute", top: 0, bottom: 0, borderLeftWidth: 1, borderStyle: "dashed", borderColor: "rgba(148,163,184,0.24)" },
  chartFill: { position: "absolute", left: 0, right: 0, bottom: 0, height: "76%", backgroundColor: "rgba(255,105,0,0.22)" },
  chartLine: { position: "absolute", left: 0, right: 0, bottom: "58%", height: 3, backgroundColor: "#ff7a00", transform: [{ rotate: "-7deg" }] },
  yLabels: { position: "absolute", left: -42, top: -11, bottom: -13, justifyContent: "space-between" },
  xLabels: { position: "absolute", left: -10, right: -10, bottom: -34, flexDirection: "row", justifyContent: "space-between" },
  axisLabel: { color: "#9ca8bf", fontSize: 20 },
  legendRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 56 },
  legendDot: { width: 15, height: 15, borderRadius: 999, marginLeft: 18 },
  legendText: { color: "#a8b4cc", fontSize: 16 },
  radarBox: { height: 275, alignItems: "center", justifyContent: "center", position: "relative" },
  radarSvg: { overflow: "visible" },
  radarDiamondBig: { position: "absolute", width: 180, height: 180, borderWidth: 1, borderColor: "#94a3b8", transform: [{ rotate: "45deg" }] },
  radarDiamondMid: { position: "absolute", width: 124, height: 124, borderWidth: 1, borderColor: "rgba(148,163,184,0.45)", transform: [{ rotate: "45deg" }] },
  radarDiamondSmall: { position: "absolute", width: 70, height: 70, borderWidth: 1, borderColor: "rgba(148,163,184,0.28)", transform: [{ rotate: "45deg" }] },
  radarPolygon: { position: "absolute", width: 145, height: 145, backgroundColor: "rgba(255,122,0,0.42)", borderWidth: 2, borderColor: "#ff7a00", transform: [{ rotate: "45deg" }] },
  radarLabel: { position: "absolute", color: "#a8b4cc", fontSize: 18 },
  radarTop: { top: 16 },
  radarRight: { right: 76, top: 96 },
  radarBottomRight: { right: 94, bottom: 36 },
  radarBottomLeft: { left: 104, bottom: 36 },
  radarLeft: { left: 86, top: 96 },
  averageText: { color: "#a8b4cc", textAlign: "center", fontSize: 18, marginTop: 14 },
  averageValue: { color: "#ff9800", fontWeight: "900", fontSize: 23 },
  metricStrip: { marginTop: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderRadius: 16, paddingVertical: 34, paddingHorizontal: 20, backgroundColor: "rgba(112,20,16,0.58)", borderWidth: 1, borderColor: "rgba(255,80,80,0.18)" },
  metricStripMobile: { flexDirection: "column", gap: 26 },
  metricBig: { alignItems: "center", minWidth: 150 },
  metricBigValue: { color: "#ff6688", fontSize: 36, fontWeight: "900" },
  metricBigLabel: { color: "#a8b4cc", fontSize: 16, marginTop: 8 },

  archGrid: { flexDirection: "row", flexWrap: "wrap", gap: 22 },
  archItem: { flexGrow: 1, flexBasis: Platform.OS === "web" ? "18%" : 0, minWidth: 220, borderRadius: 18, padding: 24, backgroundColor: "rgba(26,30,48,0.82)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  archIcon: { width: 54, height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  archIndex: { color: "#ff7a00", fontSize: 13, fontWeight: "900", marginBottom: 8 },
  archTitle: { color: "#fff", fontSize: 21, fontWeight: "900" },
  archText: { color: "#a8b4cc", fontSize: 15, lineHeight: 23, marginTop: 12 },

  ctaOuter: { paddingVertical: 90, paddingHorizontal: 38 },
  ctaCard: { width: "100%", maxWidth: 1280, alignSelf: "center", borderRadius: 28, paddingVertical: 56, paddingHorizontal: 34, alignItems: "center", backgroundColor: "rgba(70,32,40,0.68)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" },
  ctaTitle: { marginTop: 38, color: "#ff7a4a", textAlign: "center", fontSize: 72, lineHeight: 78, fontWeight: "900", letterSpacing: -1.8, maxWidth: 840 },
  ctaTitleSmall: { fontSize: 40, lineHeight: 47 },
  ctaText: { color: "#e2e8f0", textAlign: "center", fontSize: 26, lineHeight: 42, maxWidth: 980, marginTop: 32 },
  ctaActions: { flexDirection: "row", gap: 20, marginTop: 52, alignItems: "center" },
  ctaActionsSmall: { flexDirection: "column", alignItems: "stretch", width: "100%" },
  ctaPrimary: { borderRadius: 14, overflow: "hidden" },
  ctaPrimaryGradient: { minHeight: 86, paddingHorizontal: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
  ctaPrimaryText: { color: "#fff", fontSize: 22, fontWeight: "900" },
  ctaSecondary: { minHeight: 86, paddingHorizontal: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.12)" },
  ctaSecondaryText: { color: "#fff", fontSize: 22, fontWeight: "900" },
  ctaTags: { flexDirection: "row", gap: 14, flexWrap: "wrap", justifyContent: "center", marginTop: 60 },
  ctaTagsSmall: { marginTop: 34 },
  smallTag: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 18, backgroundColor: "rgba(255,40,70,0.16)", borderWidth: 1, borderColor: "rgba(255,80,120,0.25)" },
  smallTagOrange: { backgroundColor: "rgba(255,122,0,0.13)", borderColor: "rgba(255,122,0,0.25)" },
  smallTagText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  footerOuter: { paddingHorizontal: 40, paddingTop: 82, paddingBottom: 38, backgroundColor: "rgba(12,18,37,0.78)" },
  footerGrid: { maxWidth: MAX_WIDTH, alignSelf: "center", width: "100%", flexDirection: "row", gap: 70, flexWrap: "wrap" },
  footerMain: { flex: 1.4, minWidth: 310 },
  footerBrandRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  footerLogo: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "rgb(255, 255, 255)" },
  footerLogoImage: { width: "78%", height: "78%" },
  footerBrandTitle: { color: "#fff", fontSize: 25, fontWeight: "900" },
  footerBrandSub: { color: "#a8b4cc", fontSize: 16, marginTop: 4 },
  footerDescription: { color: "#a8b4cc", fontSize: 19, lineHeight: 32, marginTop: 24, maxWidth: 610 },
  universityRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 30 },
  universityIcon: { width: 50, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  universityTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  universitySub: { color: "#a8b4cc", fontSize: 16, marginTop: 4 },
  footerColumn: { minWidth: 230, gap: 22 },
  footerColumnTitle: { color: "#fff", fontSize: 18, fontWeight: "900", marginBottom: 8 },
  footerLinkRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  footerLinkText: { color: "#93a4bd", fontSize: 19 },
  footerBottom: { maxWidth: MAX_WIDTH, alignSelf: "center", width: "100%", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)", marginTop: 60, paddingTop: 28, alignItems: "center" },
  copyright: { color: "#a8b4cc", fontSize: 16, textAlign: "center" },
  backToTopWrap: { position: "absolute", right: 28, bottom: 28, zIndex: 50 },
  backToTopWrapSmall: { right: 18, bottom: 18 },
  backToTopButton: { width: 58, height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.24)", shadowColor: "#ff2a1f", shadowOpacity: 0.38, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  backToTopButtonSmall: { width: 52, height: 52, borderRadius: 16 },
  builtWith: { color: "#68758d", fontSize: 14, textAlign: "center", marginTop: 26 },
});
