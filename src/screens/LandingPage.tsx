import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  LayoutChangeEvent,
  Linking,
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

type SectionKey = "features" | "how" | "modules" | "users" | "analytics" | "architecture" | "contact";

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

// --- Contact Us settings -----------------------------------------------
// CONTACT_EMAIL: tapping the Email card opens a compose window
// (Gmail compose on web, the default mail app on mobile) addressed to this.
const CONTACT_EMAIL = "parseitlearninghub@gmail.com"; // TODO: replace with the real contact email if different

// FACEBOOK_URL: tapping the Social card opens this link.
// ⚠️ PLACEHOLDER — replace with the actual ParseIT Hub Facebook page URL before shipping.
const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61575864027115"; // TODO: update Facebook link
// -------------------------------------------------------------------------

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
  const [menuOpen, setMenuOpen] = useState(false);
  const sectionPositions = useRef<Record<SectionKey, number>>({
    features: 0,
    how: 0,
    modules: 0,
    users: 0,
    analytics: 0,
    architecture: 0,
    contact: 0,
  });

  const isDesktop = width >= 1100;
  const isTablet = width >= 768 && width < 1100;
  const isMobile = width < 768;
  const isSmall = width < 430;
  const isTiny = width < 360;

  const goToSignIn = () => {
    if (typeof onGetStarted === "function") onGetStarted();
  };

  const onSectionLayout = (section: SectionKey) => (event: LayoutChangeEvent) => {
    sectionPositions.current[section] = event.nativeEvent.layout.y;
  };

  const scrollToSection = (section: SectionKey) => {
    setMenuOpen(false); // Close menu when navigating
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
      title: "AI Tutor",
      description:
        "Receive personalized programming assistance, instant explanations, coding guidance, and AI-generated follow-up activities tailored to your learning progress.",
      color: ["#ff3b30", "#ff7a00"],
    },
    {
      icon: <Feather name="bar-chart-2" size={30} color="#fff" />,
      title: "Assignment Analytics Dashboard",
      description:
        "Track assignment grades, monitor academic progress, identify learning gaps, and gain actionable insights through interactive performance visualizations.",
      color: ["#ff2d7a", "#ff3b72"],
    },
    {
      icon: <Feather name="activity" size={30} color="#fff" />,
      title: "Academic Progress Tracking",
      description:
        "Monitor your learning journey with real-time progress tracking, assignment completion, grade trends, and performance summaries across subjects.",
      color: ["#ff8a00", "#ffb000"],
    },
    {
      icon: <Feather name="users" size={30} color="#fff" />,
      title: "Learning Materials",
      description:
        "Access organized learning resources, lecture materials, programming exercises, and downloadable files to support classroom and self-paced learning.",
      color: ["#ff003d", "#ff245d"],
    },
    {
      icon: <Ionicons name="chatbox-outline" size={30} color="#fff" />,
      title: "Collaboration Tools",
      description:
        "Communicate seamlessly with teachers and classmates through built-in messaging, announcements, and collaborative discussions for a connected learning experience.",
      color: ["#ff8a00", "#ff4d00"],
    },
    {
      icon: <Ionicons name="phone-portrait-outline" size={30} color="#fff" />,
      title: "Cross-Platform Access",
      description:
        "Use ParseIT Hub anytime, anywhere through a fully responsive web application and native mobile experience with synchronized access across devices.",
      color: ["#ff2d7a", "#ff4385"],
    },
  ];

  const moduleCards: ModuleCard[] = [
    {
      icon: <Ionicons name="school-outline" size={30} color="#fff" />,
      title: "Student Dashboard",
      description:
        "Assignment grade tracking, performance analytics, AI tutor access, and personalized learning recommendations.",
      bullets: ["Performance Metrics", "Assignment Tracker", "AI Assistance", "Progress Reports"],
      color: ["#ff003d", "#ff5a1f"],
    },
    {
      icon: <Feather name="users" size={30} color="#fff" />,
      title: "Teacher Dashboard",
      description:
        "Assignment analytics, grade monitoring, class performance, and student progress reports.",
      bullets: ["Class Analytics", "Student Monitoring", "Grade Management", "Reports & Insights"],
      color: ["#ff8a00", "#ff5a00"],
    },
    {
      icon: <Feather name="shield" size={30} color="#fff" />,
      title: "Admin Dashboard",
      description:
        "System-wide analytics, user management, and institutional insights",
      bullets: ["System Analytics", "User Management", "Institutional Reports"],
      color: ["#ff2d7a", "#ff4c98"],
    },
    {
      icon: <Ionicons name="chatbox-outline" size={30} color="#fff" />,
      title: "Messaging & Collaboration",
      description:
        "Real-time communication between students and teachers for seamless collaboration.",
      bullets: ["Group Chats", "Announcements", "Notifications"],
      color: ["#bd6f00", "#2e241d"],
    },
    {
      icon: <Ionicons name="book-outline" size={30} color="#fff" />,
      title: "Learning Materials",
      description:
        "Access organized course materials, lecture resources, and downloadable documents to support classroom learning and independent study.",
      bullets: ["Lecture Notes", "PDF & Presentation Files", "Downloadable Resources", "Inline Document Viewer"],
      color: ["#ff193f", "#f50732"],
    },
    {
      icon: <Ionicons name="game-controller-outline" size={30} color="#fff" />,
      title: "AI Learning Games",
      description:
        "Generate interactive learning games from lesson materials to reinforce programming concepts through AI-powered quizzes, flashcards, matching activities, and fill-in-the-blank challenges.",
      bullets: ["AI-Generated Quiz Games", "Flashcards", "Matching Cards", "Trivia & Fill-in-the-Blank"],
      color: ["#ff7a00", "#ff4b00"],
    },
  ];

  const userCards: UserCard[] = [
    {
      icon: <Ionicons name="school-outline" size={34} color="#fff" />,
      eyebrow: "FOR STUDENTS",
      title: "Learn Anytime, Anywhere",
      description:
        "Access learning materials, explore educational video tutorials, submit assignments, participate in AI-powered learning activities, communicate with instructors, and monitor your academic progress—all within one intelligent learning platform.",
      bullets: [
        "Access Learning Materials",
        "Search Educational Videos",
        "AI Assistant Mode",
        "AI Tutor Mode",
        "Submit Assignments",
        "Track Assignment Grades",
      ],
      color: ["#ff3b30", "#ff6b00"],
    },
    {
      icon: <Feather name="users" size={34} color="#fff" />,
      eyebrow: "FOR TEACHERS",
      title: "Manage Classes with Ease",
      description:
        "Create and manage classes, distribute learning materials, monitor student progress, evaluate assignments, and gain valuable insights through assignment analytics.",
      bullets: [
        "Upload learning materials",
        "Create and manage assignments",
        "Monitor class performance",
        "Generate AI learning activities",
        "Communicate with students",
      ],
      color: ["#ff8a00", "#ff6d00"],
    },
    {
      icon: <Feather name="shield" size={34} color="#fff" />,
      eyebrow: "FOR ADMINISTRATORS",
      title: "Oversee the Learning Platform",
      description:
        "Manage users, oversee academic activities, monitor institutional performance, and maintain a secure, organized, and efficient learning environment.",
      bullets: [
        "User management",
        "Institution-wide analytics",
        "Academic monitoring",
        "Reports and insights",
      ],
      color: ["#ff2d7a", "#ff4c98"],
    },
  ];

  const navItems: { label: string; section: SectionKey }[] = [
    { label: "Features", section: "features" },
    { label: "How It Works", section: "how" },
    { label: "Modules", section: "modules" },
    { label: "Analytics", section: "analytics" },
    { label: "Contact", section: "contact" },
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
              // Close menu when scrolling
              if (menuOpen) setMenuOpen(false);
            },
          }
        )}
      >
        <LinearGradient colors={["#050817", "#38070a", "#4b0808", "#151726"]} locations={[0, 0.34, 0.68, 1]} style={styles.page}>
          <View style={styles.bgGlowOne} />
          <View style={styles.bgGlowTwo} />

          <View style={[styles.container, isSmall && styles.containerSmall]}>
            <Header 
              isMobile={isMobile} 
              isSmall={isSmall} 
              navItems={navItems} 
              scrollToSection={scrollToSection} 
              onGetStarted={goToSignIn}
              menuOpen={menuOpen}
              setMenuOpen={setMenuOpen}
            />

            <View style={[styles.hero, isDesktop ? styles.heroDesktop : styles.heroStack]}>
              <View style={[styles.heroLeft, isDesktop && styles.heroLeftDesktop]}>
                <Pill icon={<Ionicons name="sparkles-outline" size={17} color="#ff9aa5" />} text="Powered by Advanced AI & Machine Learning" />

                <GradientTextLike isDesktop={isDesktop} isTablet={isTablet} isSmall={isSmall}>
                  AI-Powered{"\n"}Learning &{"\n"}Analytics{"\n"}Platform
                </GradientTextLike>

                <Text style={[styles.heroDescription, isTablet && styles.heroDescriptionTablet, isSmall && styles.heroDescriptionSmall]}>
                 ParseIT Hub is an AI-powered Learning Management System that combines classroom management, AI tutoring, educational video resources, assignment analytics, interactive learning games, and collaboration tools to create a smarter teaching and learning experience.
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
                  <StatMini value="AI-Powered" label="Gemini-Style Tutor" accent="pink" isSmall={isSmall} />
                  <StatMini value="Real-Time" label="Analytics Dashboard" accent="orange" isSmall={isSmall} />
                  <StatMini value="Cross-Platform" label="Web & Mobile" accent="pink" isSmall={isSmall} />
                </View>
              </View>

              <View style={[styles.heroRight, isDesktop && styles.heroRightDesktop]}>
                <HeroMockup compact={!isDesktop} />
              </View>
            </View>
          </View>

          <SectionWrapper scrollY={scrollY} onLayout={onSectionLayout("features")}>
            <SectionHeader scrollY={scrollY} isMobile={isMobile} isSmall={isSmall} title="Complete Academic Ecosystem" subtitle="More than just a chatbot—ParseIT Hub is a comprehensive platform combining AI tutoring with powerful analytics for next-generation learning." />
            <ResponsiveGrid>
              {features.map((feature, index) => (
                <FeatureTile key={feature.title} feature={feature} index={index} />
              ))}
            </ResponsiveGrid>
          </SectionWrapper>

          <SectionWrapper scrollY={scrollY} onLayout={onSectionLayout("how")}>
            <SectionHeader scrollY={scrollY} isMobile={isMobile} isSmall={isSmall} title="How It Works" subtitle="A seamless learning experience powered by AI and data analytics" />
            <View style={[styles.stepsGrid, isMobile && styles.stepsGridMobile]}>
              <StepCard revealDirection="left" index={1} title="Student Interacts" description="Students engage with the platform by asking questions, submitting assignments, and completing practice challenges, while the system generates follow-up activities based on their performance." icon={<Feather name="user" size={30} color="#ff6b78" />} isSmall={isSmall} />
              <StepArrow hidden={isMobile} />
              <StepCard revealDirection="up" index={2} title="AI Processes & Guides" description="The AI assistant analyzes inputs, provides intelligent feedback, and offers personalized tutoring in real-time." icon={<MaterialCommunityIcons name="brain" size={34} color="#ff9700" />} isSmall={isSmall} />
              <StepArrow hidden={isMobile} />
              <StepCard revealDirection="right" index={3} title="Analytics Track & Improve" description="Analytics Dashboard monitor performance, identify learning gaps, and suggest targeted improvements for each student." icon={<Feather name="trending-up" size={34} color="#ff5d82" />} isSmall={isSmall} />
            </View>
          </SectionWrapper>

          <SectionWrapper scrollY={scrollY} onLayout={onSectionLayout("modules")}>
            <SectionHeader scrollY={scrollY} isMobile={isMobile} isSmall={isSmall} title="Comprehensive Module Suite" subtitle="Everything you need for modern programming education—from dashboards to collaboration tools" />
            <ResponsiveGrid>
              {moduleCards.map((module, index) => (
                <ModuleTile key={module.title} module={module} index={index} />
              ))}
            </ResponsiveGrid>
          </SectionWrapper>

          <SectionWrapper scrollY={scrollY} onLayout={onSectionLayout("users")}>
            <SectionHeader scrollY={scrollY} isMobile={isMobile} isSmall={isSmall} title="Built for Modern Education" subtitle="Tailored experiences for students, teachers, and administrators" />
            <View style={[styles.userGrid, isMobile && styles.userGridMobile, isSmall && styles.userGridSmall]}>
              {userCards.map((card, index) => (
                <UserTile key={card.eyebrow} card={card} index={index} isSmall={isSmall} />
              ))}
            </View>
          </SectionWrapper>

          <SectionWrapper scrollY={scrollY} onLayout={onSectionLayout("analytics")}>
            <SectionHeader scrollY={scrollY} isMobile={isMobile} isSmall={isSmall} title="AI + Assignment Analytics = Smarter Learning" subtitle="Combining AI tutoring with assignment performance analytics to support personalized learning and informed teaching." />
            <View style={[styles.analyticsTopGrid, isMobile && styles.analyticsTopGridMobile, isSmall && styles.analyticsTopGridSmall]}>
              <AnalyticsMini index={0} icon={<MaterialCommunityIcons name="brain" size={36} color="#ff6b78" />} title="Real-time AI Assistance" text="Intelligent tutoring that adapts to each student's learning pace and style." />
              <AnalyticsMini index={1} icon={<Feather name="bar-chart-2" size={36} color="#ff6b78" />} title="Data-Driven Insights" text="Analyze assignment grades, monitor academic progress, and identify learning gaps through interactive dashboards." />
              <AnalyticsMini index={2} icon={<Feather name="target" size={36} color="#ff6b78" />} title="Personalized Learning" text="Receive AI-generated recommendations based on assignment performance and learning progress." />
            </View>

            <View style={[styles.chartGrid, isMobile && styles.chartGridMobile]}>
              <PerformanceChart revealDirection="left" isSmall={isSmall} />
              <SkillsRadar revealDirection="right" isSmall={isSmall} />
            </View>

            <View style={[styles.metricStrip, isMobile && styles.metricStripMobile, isSmall && styles.metricStripSmall]}>
              <MetricBig index={0} value="95%" label="AI Accuracy" />
              <MetricBig index={1} value="10K+" label="Questions Answered" orange />
              <MetricBig index={2} value="85%" label="Student Satisfaction" />
              <MetricBig index={3} value="24/7" label="Availability" orange />
            </View>
          </SectionWrapper>

          <SectionWrapper scrollY={scrollY} onLayout={onSectionLayout("contact")}>
            <SectionHeader scrollY={scrollY} isMobile={isMobile} isSmall={isSmall} title="Contact Us" subtitle="Reach out by email or follow our page for updates." />
            <ContactSection isSmall={isSmall} />
          </SectionWrapper>

          <View style={[styles.ctaOuter, isSmall && styles.ctaOuterSmall]}>
            <ScrollReveal scrollY={scrollY} direction="left" distance={32} style={[styles.ctaCard, isMobile && styles.ctaCardMobile, isSmall && styles.ctaCardSmall]}>
              <Pill icon={<Feather name="zap" size={17} color="#ff9aa5" />} text="Transform Learning with AI" centered />
              <Text style={[styles.ctaTitle, isMobile && styles.ctaTitleMobile, isSmall && styles.ctaTitleSmall]}>Ready to Revolutionize Education?</Text>
              <Text style={[styles.ctaText, isMobile && styles.ctaTextMobile, isSmall && styles.ctaTextSmall]}>
               Join ParseIT Hub and experience the future of AI-powered education. Empower students with AI tutoring, help teachers monitor assignment performance, and make informed academic decisions through interactive analytics.
              </Text>
              <View style={[styles.ctaActions, isSmall && styles.ctaActionsSmall]}>
                <TouchableOpacity activeOpacity={0.9} onPress={goToSignIn} style={[styles.ctaPrimary, isSmall && styles.buttonFull]}>
                  <LinearGradient colors={["#ff0019", "#ff4f00"]} style={[styles.ctaPrimaryGradient, isSmall && styles.ctaPrimaryGradientSmall]}>
                    <Text style={[styles.ctaPrimaryText, isSmall && styles.ctaPrimaryTextSmall]}>Start Using ParseIT Hub Today</Text>
                    <Feather name="arrow-right" size={isSmall ? 19 : 22} color="#fff" />
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

function Header({ 
  isMobile, 
  isSmall, 
  navItems, 
  scrollToSection, 
  onGetStarted,
  menuOpen,
  setMenuOpen
}: { 
  isMobile: boolean; 
  isSmall: boolean; 
  navItems: { label: string; section: SectionKey }[]; 
  scrollToSection: (section: SectionKey) => void; 
  onGetStarted: () => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}) {
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

      {/* Desktop/Tablet Navigation */}
      {!isMobile && (
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
      )}

      {/* Mobile Hamburger Menu Button */}
      {isMobile && (
        <View style={styles.mobileHeaderRight}>
          <TouchableOpacity onPress={onGetStarted} style={styles.signInButtonMobile}>
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setMenuOpen(!menuOpen)} 
            style={styles.hamburgerButton}
            accessibilityRole="button"
            accessibilityLabel={menuOpen ? "Close menu" : "Open menu"}
          >
            <Feather 
              name={menuOpen ? "x" : "menu"} 
              size={28} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Mobile Menu Dropdown */}
      {isMobile && menuOpen && (
        <View style={styles.mobileMenu}>
          {navItems.map((item) => (
            <TouchableOpacity 
              key={item.label} 
              onPress={() => scrollToSection(item.section)} 
              style={styles.mobileMenuItem}
            >
              <Text style={styles.mobileMenuText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
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

function StatMini({ value, label, accent, isSmall }: { value: string; label: string; accent: "pink" | "orange"; isSmall?: boolean }) {
  return (
    <View style={[styles.statMini, isSmall && styles.statMiniSmall]}>
      <Text style={[styles.statMiniValue, accent === "orange" && styles.orangeText, isSmall && styles.statMiniValueSmall]}>{value}</Text>
      <Text style={styles.statMiniLabel}>{label}</Text>
    </View>
  );
}

function HeroMockup({ compact }: { compact: boolean }) {
  const sparkBounce = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const isSmall = width < 430;

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
      <Animated.View style={[styles.sparkFloat, isSmall && styles.sparkFloatSmall, { transform: [{ translateY: sparkBounce }] }]}>
        <Ionicons name="sparkles-outline" size={isSmall ? 22 : 30} color="#fff" />
      </Animated.View>
      <View style={[styles.mockupCard, isSmall && styles.mockupCardSmall]}>
        <View style={styles.mockupHeader}>
          <View style={styles.mockupBrandRow}>
            <View style={[styles.mockupIcon, isSmall && styles.mockupIconSmall]}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.mockupLogoImage}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={[styles.mockupTitle, isSmall && styles.mockupTitleSmall]}>ParseIT Hub</Text>
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
          <View style={[styles.mockupStatCard, isSmall && styles.mockupStatCardSmall]}>
            <Text style={[styles.mockupStatValue, isSmall && styles.mockupStatValueSmall]}>92%</Text>
            <Text style={styles.mockupStatLabel}>Overall Performance</Text>
          </View>
          <View style={[styles.mockupStatCardOrange, isSmall && styles.mockupStatCardSmall]}>
            <Text style={[styles.orangeStatValue, isSmall && styles.mockupStatValueSmall]}>24</Text>
            <Text style={styles.mockupStatLabel}>Tasks Completed</Text>
          </View>
        </View>
        <View style={[styles.aiBox, isSmall && styles.aiBoxSmall]}>
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
  const { height, width } = useWindowDimensions();
  const isSmall = width < 430;
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
      style={[styles.sectionOuter, isSmall && styles.sectionOuterSmall]}
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

function SectionHeader({ title, subtitle, scrollY, isMobile, isSmall }: { title: string; subtitle: string; scrollY: Animated.Value; isMobile?: boolean; isSmall?: boolean }) {
  return (
    <View style={[styles.sectionHeader, isSmall && styles.sectionHeaderSmall]}>
      <ContainerReveal direction="left" distance={24}>
        <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile, isSmall && styles.sectionTitleSmall]}>{title}</Text>
      </ContainerReveal>
      <ContainerReveal direction="right" distance={24}>
        <Text style={[styles.sectionSubtitle, isMobile && styles.sectionSubtitleMobile, isSmall && styles.sectionSubtitleSmall]}>{subtitle}</Text>
      </ContainerReveal>
    </View>
  );
}

function ResponsiveGrid({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1100;
  const isTablet = width >= 768 && width < 1100;
  const isMobile = width < 768;
  const isSmall = width < 430;

  return (
    <View style={[
      styles.grid,
      isDesktop ? styles.gridDesktop : isTablet ? styles.gridTablet : styles.gridMobile,
      isSmall && styles.gridSmall,
    ]}>
      {children}
    </View>
  );
}

function FeatureTile({ feature, index }: { feature: FeatureCard; index: number }) {
  const { width } = useWindowDimensions();
  const isSmall = width < 430;
  const direction: RevealDirection = index % 2 === 0 ? "left" : "right";
  return (
    <ContainerReveal direction={direction} distance={32} style={[styles.cardBase, isSmall && styles.cardBaseSmall]}>
      <LinearGradient colors={feature.color} style={[styles.tileIcon, isSmall && styles.tileIconSmall]}>
        {feature.icon}
      </LinearGradient>
      <Text style={[styles.tileTitle, isSmall && styles.tileTitleSmall]}>{feature.title}</Text>
      <Text style={[styles.tileDescription, isSmall && styles.tileDescriptionSmall]}>{feature.description}</Text>
    </ContainerReveal>
  );
}

function StepCard({ index, title, description, icon, revealDirection = "up", isSmall }: { index: number; title: string; description: string; icon: React.ReactNode; revealDirection?: RevealDirection; isSmall?: boolean }) {
  return (
    <ContainerReveal direction={revealDirection} distance={32} style={[styles.stepCard, isSmall && styles.stepCardSmall]}>
      <LinearGradient colors={index === 2 ? ["#ff7a00", "#ff4d00"] : index === 3 ? ["#ff0062", "#ff2f75"] : ["#ff0019", "#ff2848"]} style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{index}</Text>
      </LinearGradient>
      <View style={styles.stepIconBox}>{icon}</View>
      <Text style={[styles.stepTitle, isSmall && styles.stepTitleSmall]}>{title}</Text>
      <Text style={[styles.stepText, isSmall && styles.stepTextSmall]}>{description}</Text>
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
  const { width } = useWindowDimensions();
  const isSmall = width < 430;
  const direction: RevealDirection = index % 2 === 0 ? "left" : "right";
  return (
    <ContainerReveal direction={direction} distance={32} style={[styles.cardBase, isSmall && styles.cardBaseSmall]}>
      <LinearGradient colors={module.color} style={[styles.moduleIcon, isSmall && styles.moduleIconSmall]}>
        {module.icon}
      </LinearGradient>
      <Text style={[styles.tileTitle, isSmall && styles.tileTitleSmall]}>{module.title}</Text>
      <Text style={[styles.tileDescription, isSmall && styles.tileDescriptionSmall]}>{module.description}</Text>
      <View style={[styles.bulletStack, isSmall && styles.bulletStackSmall]}>
        {module.bullets.map((bullet) => (
          <Text key={bullet} style={[styles.moduleBullet, isSmall && styles.moduleBulletSmall]}>{bullet}</Text>
        ))}
      </View>
    </ContainerReveal>
  );
}

function UserTile({ card, index, isSmall }: { card: UserCard; index: number; isSmall?: boolean }) {
  const direction: RevealDirection = index % 2 === 0 ? "left" : "right";
  return (
    <ContainerReveal direction={direction} distance={34} style={[styles.userCard, isSmall && styles.userCardSmall]}>
      <LinearGradient colors={card.color} style={[styles.userIcon, isSmall && styles.userIconSmall]}>
        {card.icon}
      </LinearGradient>
      <Text style={[styles.userEyebrow, isSmall && styles.userEyebrowSmall]}>{card.eyebrow}</Text>
      <Text style={[styles.userTitle, isSmall && styles.userTitleSmall]}>{card.title}</Text>
      <Text style={[styles.userDescription, isSmall && styles.userDescriptionSmall]}>{card.description}</Text>
      <View style={[styles.checkStack, isSmall && styles.checkStackSmall]}>
        {card.bullets.map((bullet) => (
          <View key={bullet} style={[styles.checkRow, isSmall && styles.checkRowSmall]}>
            <Feather name="check-circle" size={isSmall ? 16 : 22} color="#00f58a" />
            <Text style={[styles.checkText, isSmall && styles.checkTextSmall]}>{bullet}</Text>
          </View>
        ))}
      </View>
    </ContainerReveal>
  );
}

function AnalyticsMini({ icon, title, text, index }: { icon: React.ReactNode; title: string; text: string; index: number }) {
  const { width } = useWindowDimensions();
  const isSmall = width < 430;
  const direction: RevealDirection = index % 2 === 0 ? "left" : "right";
  return (
    <ContainerReveal direction={direction} distance={30} style={[styles.analyticsMini, isSmall && styles.analyticsMiniSmall]}>
      {icon}
      <Text style={[styles.analyticsMiniTitle, isSmall && styles.analyticsMiniTitleSmall]}>{title}</Text>
      <Text style={[styles.analyticsMiniText, isSmall && styles.analyticsMiniTextSmall]}>{text}</Text>
    </ContainerReveal>
  );
}

function PerformanceChart({ revealDirection = "left", isSmall }: { revealDirection?: RevealDirection; isSmall?: boolean }) {
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
    <ContainerReveal direction={revealDirection} distance={34} style={[styles.chartCard, isSmall && styles.chartCardSmall]}>
      <View style={styles.chartHeader}>
        <LinearGradient colors={["#ff3b30", "#ff7a00"]} style={styles.chartIconSmall}>
          <Feather name="trending-up" size={22} color="#fff" />
        </LinearGradient>
        {/* FIX: Added flex: 1 and flexShrink: 1 to prevent text overflow on small screens */}
        <View style={{ flex: 1, flexShrink: 1 }}>
          <Text style={[styles.chartTitle, isSmall && styles.chartTitleSmall]}>Assignment Score Trend</Text>
          <Text style={[styles.chartSubtitle, isSmall && styles.chartSubtitleSmall]}>Assignment scores over time</Text>
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

      <View style={[styles.legendRow, isSmall && styles.legendRowSmall]}>
        <View style={[styles.legendDot, { backgroundColor: "#ff3344" }]} />
        <Text style={styles.legendText}>Score</Text>
        <View style={[styles.legendDot, { backgroundColor: "#ff7a00" }]} />
        <Text style={styles.legendText}>Engagement</Text>
      </View>
    </ContainerReveal>
  );
}

function SkillsRadar({ revealDirection = "right", isSmall }: { revealDirection?: RevealDirection; isSmall?: boolean }) {
  return (
    <ContainerReveal direction={revealDirection} distance={34} style={[styles.chartCard, isSmall && styles.chartCardSmall]}>
      <View style={styles.chartHeader}>
        <LinearGradient colors={["#ff3b30", "#ff2d7a"]} style={styles.chartIconSmall}>
          <Feather name="bar-chart-2" size={22} color="#fff" />
        </LinearGradient>
        {/* FIX: Added flex: 1 and flexShrink: 1 to prevent text overflow on small screens */}
        <View style={{ flex: 1, flexShrink: 1 }}>
          <Text style={[styles.chartTitle, isSmall && styles.chartTitleSmall]}>Subject Grade Comparison</Text>
          <Text style={[styles.chartSubtitle, isSmall && styles.chartSubtitleSmall]}>Average assignment grades by subject</Text>
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

          <SvgText x="195" y="27" fill="#a8b4cc" fontSize="20" textAnchor="middle">Functional English</SvgText>
          <SvgText x="298" y="105" fill="#a8b4cc" fontSize="20" textAnchor="start">Discrete Mathematics</SvgText>
          <SvgText x="250" y="224" fill="#a8b4cc" fontSize="20" textAnchor="middle">Data Structures</SvgText>
          <SvgText x="135" y="224" fill="#a8b4cc" fontSize="20" textAnchor="middle">Networking</SvgText>
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
    { icon: <MaterialCommunityIcons name="brain" size={26} color="#fff" />, title: "AI + Analytics", text: "AI tutor and analytics dashboard provide guidance and learning insights." },
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

// --- Contact Us section --------------------------------------------------
// Three cards only, per design: Email (opens compose), Studio (info only),
// Social (Facebook only — update FACEBOOK_URL near the top of this file).
function ContactSection({ isSmall }: { isSmall?: boolean }) {
  const handleEmailPress = () => {
    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_EMAIL}`;
    const mailtoUrl = `mailto:${CONTACT_EMAIL}`;
    const preferredUrl = Platform.OS === "web" ? gmailComposeUrl : mailtoUrl;

    Linking.openURL(preferredUrl).catch(() => {
      // Fallback in case the Gmail web compose link can't be opened
      Linking.openURL(mailtoUrl).catch(() => {});
    });
  };

  const handleFacebookPress = () => {
    // ⚠️ FACEBOOK_URL is a placeholder — update it near the top of this file
    // with the real ParseIT Hub Facebook page before shipping.
    Linking.openURL(FACEBOOK_URL).catch(() => {});
  };

  return (
    <View style={[styles.contactGrid, isSmall && styles.contactGridSmall]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleEmailPress}
        style={[styles.contactCard, isSmall && styles.contactCardSmall]}
        accessibilityRole="button"
        accessibilityLabel="Email us"
      >
        <LinearGradient colors={["#ff3b30", "#ff7a00"]} style={[styles.contactIcon, isSmall && styles.contactIconSmall]}>
          <Feather name="mail" size={isSmall ? 22 : 26} color="#fff" />
        </LinearGradient>
        <View style={styles.contactTextWrap}>
          <Text style={[styles.contactTitle, isSmall && styles.contactTitleSmall]}>Email</Text>
          <Text style={[styles.contactValue, isSmall && styles.contactValueSmall]}>{CONTACT_EMAIL}</Text>
          <Text style={styles.contactNote}>Usually respond within 24 hours</Text>
          <Text style={styles.contactTapHint}>Tap to Compose</Text>
        </View>
      </TouchableOpacity>

      <View style={[styles.contactCard, isSmall && styles.contactCardSmall]}>
        <LinearGradient colors={["#ff3b30", "#ff7a00"]} style={[styles.contactIcon, isSmall && styles.contactIconSmall]}>
          <Ionicons name="location-outline" size={isSmall ? 22 : 26} color="#fff" />
        </LinearGradient>
        <View style={styles.contactTextWrap}>
          <Text style={[styles.contactTitle, isSmall && styles.contactTitleSmall]}>Location</Text>
          <Text style={[styles.contactValue, isSmall && styles.contactValueSmall]}>
             Ed, Isidro Kintanar St, Argao, 6021 Cebu{"\n"}COTE Building - 3rd Floor, BSIT Department
          </Text>
          <Text style={styles.contactNote}>Visit Our Department Office</Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleFacebookPress}
        style={[styles.contactCard, isSmall && styles.contactCardSmall]}
        accessibilityRole="button"
        accessibilityLabel="Visit our Facebook page"
      >
        <LinearGradient colors={["#ff3b30", "#ff7a00"]} style={[styles.contactIcon, isSmall && styles.contactIconSmall]}>
          <Ionicons name="logo-facebook" size={isSmall ? 22 : 26} color="#fff" />
        </LinearGradient>
        <View style={styles.contactTextWrap}>
          <Text style={[styles.contactTitle, isSmall && styles.contactTitleSmall]}>Social</Text>
          <Text style={[styles.contactValue, isSmall && styles.contactValueSmall]}>
            Stay updated with the latest department news, announcements, and events.
          </Text>
          <Text style={styles.contactTapHint}>Tap to Follow BSIT Facebook Page</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
// -------------------------------------------------------------------------

function SmallTag({ text, orange }: { text: string; orange?: boolean }) {
  return (
    <View style={[styles.smallTag, orange && styles.smallTagOrange]}>
      <Ionicons name="sparkles-outline" size={16} color={orange ? "#ffb000" : "#ff83a0"} />
      <Text style={styles.smallTagText}>{text}</Text>
    </View>
  );
}

function Footer() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isSmall = width < 430;
  return (
    <View style={[styles.footerOuter, isMobile && styles.footerOuterMobile]}>
      <View style={[styles.footerGrid, isMobile && styles.footerGridMobile]}>
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
          <Text style={[styles.footerDescription, isSmall && styles.footerDescriptionSmall]}>
           An intelligent academic platform designed for BSIT students and faculty at Cebu Technological University,combining AI-powered tutoring with assignment performance analytics for smarter teaching and learning.
          </Text>
        </View>
        
        {/* University section moved to its own column */}
        <View style={styles.universityColumn}>
          <LinearGradient colors={["#2563eb", "#1d4ed8"]} style={styles.universityIcon}>
            <Ionicons name="school-outline" size={27} color="#fff" />
          </LinearGradient>
          <View style={styles.universityTextWrap}>
            <Text style={styles.universityTitle}>Cebu Technological University - Argao Campus</Text>
            <Text style={styles.universitySub}>College of Technology and Engineering</Text>
          </View>
        </View>

      </View>
      <View style={styles.footerBottom}>
        <Text style={styles.copyright}>© 2026 ParseIT Hub  - Cebu Technological University. All rights reserved.</Text>
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
  containerSmall: { paddingHorizontal: 16 },

  header: { paddingVertical: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 20 },
  headerMobile: { flexDirection: "column", alignItems: "stretch", gap: 12 },
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
  
  // Mobile header styles
  mobileHeaderRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  signInButtonMobile: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.07)" },
  hamburgerButton: { padding: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  mobileMenu: { 
    marginTop: 12, 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 16, 
    backgroundColor: "rgba(26,30,48,0.95)", 
    borderWidth: 1, 
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  mobileMenuItem: { paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  mobileMenuText: { color: "#ccd4e4", fontSize: 16, fontWeight: "700" },

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
  heroStatsSmall: { marginTop: 40, gap: 24 },
  statMini: { minWidth: 180 },
  statMiniSmall: { minWidth: 130 },
  statMiniValue: { color: "#ff6688", fontSize: 36, lineHeight: 44, fontWeight: "900" },
  statMiniValueSmall: { fontSize: 26, lineHeight: 32 },
  orangeText: { color: "#ff9900" },
  statMiniLabel: { color: "#aeb8ce", fontSize: 16, marginTop: 7 },

  mockupWrap: { position: "relative", width: "100%", maxWidth: 650, alignSelf: "center" },
  mockupWrapCompact: { maxWidth: 760 },
  sparkFloat: { position: "absolute", top: -26, right: -20, width: 60, height: 60, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#ff1028", zIndex: 5, shadowColor: "#ff1028", shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  sparkFloatSmall: { top: -16, right: -12, width: 44, height: 44, borderRadius: 10 },
  mockupCard: { borderRadius: 22, padding: 30, backgroundColor: "rgba(26,26,44,0.82)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 16 }, elevation: 12 },
  mockupCardSmall: { padding: 18, borderRadius: 18 },
  mockupHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  mockupBrandRow: { flexDirection: "row", alignItems: "center", gap: 16, flexShrink: 1 },
  mockupIcon: { width: 50, height: 50, borderRadius: 13, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#fff" },
  mockupIconSmall: { width: 38, height: 38, borderRadius: 10 },
  mockupLogoImage: { width: "78%", height: "78%" },
  mockupTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  mockupTitleSmall: { fontSize: 15 },
  mockupSubtitle: { color: "#aeb8ce", fontSize: 14, marginTop: 4 },
  dotsRow: { flexDirection: "row", gap: 10 },
  dot: { width: 15, height: 15, borderRadius: 999 },
  mockupStats: { flexDirection: "row", gap: 16, marginTop: 30 },
  mockupStatsCompact: { flexDirection: "column" },
  mockupStatCard: { flex: 1, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: "rgba(255,51,68,0.25)", backgroundColor: "rgba(255,40,70,0.15)" },
  mockupStatCardOrange: { flex: 1, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: "rgba(255,122,0,0.25)", backgroundColor: "rgba(255,122,0,0.14)" },
  mockupStatCardSmall: { padding: 14, borderRadius: 10 },
  mockupStatValue: { color: "#ff6676", fontSize: 31, fontWeight: "900" },
  mockupStatValueSmall: { fontSize: 24 },
  orangeStatValue: { color: "#ff9800", fontSize: 31, fontWeight: "900" },
  mockupStatLabel: { color: "#aeb8ce", fontSize: 14, marginTop: 6 },
  aiBox: { marginTop: 20, borderRadius: 12, padding: 20, backgroundColor: "rgba(17,22,40,0.82)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  aiBoxSmall: { marginTop: 14, padding: 14, borderRadius: 10 },
  aiBoxHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  aiBoxTitle: { color: "#fff", fontSize: 17, fontWeight: "900", flex: 1 },
  onlineDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: "#1ecb6b" },
  questionBubble: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 12, backgroundColor: "rgba(126,25,46,0.72)", marginBottom: 10 },
  questionText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  answerBubble: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 12, backgroundColor: "rgba(31,38,60,0.9)" },
  answerText: { color: "#cbd5e1", fontSize: 14 },

  sectionOuter: { paddingVertical: 86 },
  sectionOuterSmall: { paddingVertical: 40 },
  sectionHeader: { alignItems: "center", marginBottom: 72 },
  sectionHeaderSmall: { marginBottom: 32 },
  sectionTitle: { color: "#fff", textAlign: "center", fontSize: 58, lineHeight: 68, fontWeight: "900", letterSpacing: -1.2 },
  sectionTitleMobile: { fontSize: 42, lineHeight: 52 },
  sectionTitleSmall: { fontSize: 28, lineHeight: 36 },
  sectionSubtitle: { color: "#a9b5cb", textAlign: "center", marginTop: 16, fontSize: 25, lineHeight: 34, maxWidth: 960 },
  sectionSubtitleMobile: { fontSize: 18, lineHeight: 28 },
  sectionSubtitleSmall: { fontSize: 15, lineHeight: 24 },
  
  // UPDATED GRID STYLES FOR RESPONSIVE LAYOUT
  grid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 30,
    justifyContent: "center" 
  },
  gridDesktop: {},
  gridTablet: {},
  gridMobile: { 
    flexDirection: "column",
    alignItems: "stretch"
  },
  gridSmall: { gap: 16 },
  
  // UPDATED CARD BASE FOR BETTER MOBILE RESPONSIVENESS
  cardBase: { 
    flexGrow: 1, 
    flexBasis: Platform.OS === "web" ? "30%" : undefined,
    minWidth: 280, 
    maxWidth: "100%",
    borderRadius: 16, 
    padding: 30, 
    minHeight: 320, 
    backgroundColor: "rgba(24,27,45,0.72)", 
    borderWidth: 1, 
    borderColor: "rgba(255,255,255,0.12)" 
  },
  cardBaseSmall: { padding: 16, minHeight: undefined, minWidth: "100%", flexBasis: "auto" },
  
  tileIcon: { width: 61, height: 61, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 25 },
  tileIconSmall: { width: 48, height: 48, borderRadius: 10, marginBottom: 16 },
  moduleIcon: { width: 70, height: 70, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 26 },
  moduleIconSmall: { width: 54, height: 54, borderRadius: 12, marginBottom: 18 },
  tileTitle: { color: "#fff", fontSize: 25, lineHeight: 34, fontWeight: "900" },
  tileTitleSmall: { fontSize: 20, lineHeight: 28 },
  tileDescription: { color: "#a8b4cc", fontSize: 20, lineHeight: 33, marginTop: 15 },
  tileDescriptionSmall: { fontSize: 15, lineHeight: 24, marginTop: 10 },
  bulletStack: { marginTop: 24, gap: 15 },
  bulletStackSmall: { marginTop: 16, gap: 10 },
  moduleBullet: { color: "#e5e7eb", fontSize: 17, paddingLeft: 17 },
  moduleBulletSmall: { fontSize: 14, lineHeight: 20 },

  stepsGrid: { flexDirection: "row", alignItems: "center", gap: 0 },
  stepsGridMobile: { flexDirection: "column", gap: 22 },
  stepCard: { flex: 1, minHeight: 300, borderRadius: 16, padding: 38, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(26,30,48,0.82)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  stepCardSmall: { padding: 24, minHeight: undefined },
  stepNumber: { position: "absolute", top: -19, left: -19, width: 50, height: 50, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  stepNumberText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  stepIconBox: { width: 80, height: 80, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,80,100,0.25)", backgroundColor: "rgba(255,255,255,0.03)", marginBottom: 32 },
  stepTitle: { color: "#fff", textAlign: "center", fontSize: 29, lineHeight: 39, fontWeight: "900" },
  stepTitleSmall: { fontSize: 22, lineHeight: 30 },
  stepText: { color: "#a8b4cc", textAlign: "center", fontSize: 19, lineHeight: 32, marginTop: 18 },
  stepTextSmall: { fontSize: 15, lineHeight: 24 },
  stepArrow: { width: 40, alignItems: "center", justifyContent: "center", zIndex: 3 },
  arrowLine: { position: "absolute", height: 3, width: 40, backgroundColor: "#ff5b00" },

  userGrid: { flexDirection: "row", gap: 40 },
  userGridMobile: { flexDirection: "column" },
  userGridSmall: { gap: 16 },
  userCard: { flex: 1, borderRadius: 16, padding: 40, backgroundColor: "rgba(26,30,48,0.82)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  userCardSmall: { padding: 16 },
  userIcon: { width: 80, height: 80, borderRadius: 17, alignItems: "center", justifyContent: "center", marginBottom: 36 },
  userIconSmall: { width: 52, height: 52, borderRadius: 12, marginBottom: 16 },
  userEyebrow: { color: "#95a3bb", fontSize: 16, fontWeight: "900", letterSpacing: 1.2, marginBottom: 17 },
  userEyebrowSmall: { fontSize: 12, letterSpacing: 0.8, marginBottom: 8 },
  userTitle: { color: "#fff", fontSize: 29, lineHeight: 41, fontWeight: "900" },
  userTitleSmall: { fontSize: 18, lineHeight: 24 },
  userDescription: { color: "#a8b4cc", fontSize: 20, lineHeight: 34, marginTop: 22 },
  userDescriptionSmall: { fontSize: 14, lineHeight: 22, marginTop: 12 },
  checkStack: { gap: 18, marginTop: 34 },
  checkStackSmall: { gap: 10, marginTop: 16 },
  checkRow: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  checkRowSmall: { gap: 10 },
  checkText: { color: "#d9deea", fontSize: 17, lineHeight: 24, flex: 1 },
  checkTextSmall: { fontSize: 13, lineHeight: 18 },

  analyticsTopGrid: { flexDirection: "row", gap: 30, marginBottom: 80 },
  analyticsTopGridMobile: { flexDirection: "column" },
  analyticsTopGridSmall: { gap: 20, marginBottom: 60 },
  analyticsMini: { flex: 1, borderRadius: 16, padding: 31, minHeight: 220, justifyContent: "center", backgroundColor: "rgba(112,20,16,0.58)", borderWidth: 1, borderColor: "rgba(255,80,80,0.18)" },
  analyticsMiniSmall: { padding: 20, minHeight: undefined },
  analyticsMiniTitle: { color: "#fff", fontSize: 23, fontWeight: "900", marginTop: 23 },
  analyticsMiniTitleSmall: { fontSize: 19, marginTop: 16 },
  analyticsMiniText: { color: "#cbd5e1", fontSize: 17, lineHeight: 25, marginTop: 16 },
  analyticsMiniTextSmall: { fontSize: 15, lineHeight: 22 },
  chartGrid: { flexDirection: "row", gap: 40 },
  chartGridMobile: { flexDirection: "column" },
  chartCard: { flex: 1, borderRadius: 16, padding: 30, backgroundColor: "rgba(26,30,48,0.82)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", minHeight: 460 },
  chartCardSmall: { padding: 20, minHeight: 380 },
  chartHeader: { flexDirection: "row", alignItems: "center", gap: 15, marginBottom: 30 },
  chartIconSmall: { width: 48, height: 48, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  chartTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },
  chartTitleSmall: { fontSize: 18 },
  chartSubtitle: { color: "#a8b4cc", fontSize: 16, marginTop: 5 },
  chartSubtitleSmall: { fontSize: 14 },
  
  // FIX: Changed fixed height to aspectRatio so the chart scales proportionally on small screens
  lineChartArea: { width: "100%", aspectRatio: 560 / 285, marginTop: 4, position: "relative" },
  chartSvg: { overflow: "visible" },
  gridLine: { position: "absolute", left: 0, right: 0, borderTopWidth: 1, borderStyle: "dashed", borderColor: "rgba(148,163,184,0.28)" },
  verticalGridLine: { position: "absolute", top: 0, bottom: 0, borderLeftWidth: 1, borderStyle: "dashed", borderColor: "rgba(148,163,184,0.24)" },
  chartFill: { position: "absolute", left: 0, right: 0, bottom: 0, height: "76%", backgroundColor: "rgba(255,105,0,0.22)" },
  chartLine: { position: "absolute", left: 0, right: 0, bottom: "58%", height: 3, backgroundColor: "#ff7a00", transform: [{ rotate: "-7deg" }] },
  yLabels: { position: "absolute", left: -42, top: -11, bottom: -13, justifyContent: "space-between" },
  xLabels: { position: "absolute", left: -10, right: -10, bottom: -34, flexDirection: "row", justifyContent: "space-between" },
  axisLabel: { color: "#9ca8bf", fontSize: 20 },
  
  // FIX: Added flexWrap: "wrap" so legend items stack nicely if they run out of horizontal space
  legendRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 56, flexWrap: "wrap" },
  legendRowSmall: { marginTop: 20 },
  legendDot: { width: 15, height: 15, borderRadius: 999, marginLeft: 18 },
  legendText: { color: "#a8b4cc", fontSize: 16 },
  
  // FIX: Changed fixed height to aspectRatio so the radar chart scales proportionally on small screens
  radarBox: { width: "100%", aspectRatio: 390 / 270, alignItems: "center", justifyContent: "center", position: "relative" },
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
  metricStripSmall: { paddingVertical: 24, paddingHorizontal: 16 },
  metricBig: { alignItems: "center", minWidth: 150 },
  metricBigValue: { color: "#ff6688", fontSize: 36, fontWeight: "900" },
  metricBigLabel: { color: "#a8b4cc", fontSize: 16, marginTop: 8 },

  archGrid: { flexDirection: "row", flexWrap: "wrap", gap: 22 },
  archItem: { flexGrow: 1, flexBasis: Platform.OS === "web" ? "18%" : 0, minWidth: 220, borderRadius: 18, padding: 24, backgroundColor: "rgba(26,30,48,0.82)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  archIcon: { width: 54, height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  archIndex: { color: "#ff7a00", fontSize: 13, fontWeight: "900", marginBottom: 8 },
  archTitle: { color: "#fff", fontSize: 21, fontWeight: "900" },
  archText: { color: "#a8b4cc", fontSize: 15, lineHeight: 23, marginTop: 12 },

  // --- Contact Us styles ---
  contactGrid: { flexDirection: "row", flexWrap: "wrap", gap: 24, justifyContent: "center" },
  contactGridSmall: { flexDirection: "column", gap: 16 },
  contactCard: {
    flexGrow: 1,
    flexBasis: Platform.OS === "web" ? "30%" : undefined,
    minWidth: 280,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 18,
    borderRadius: 16,
    padding: 26,
    backgroundColor: "rgba(26,30,48,0.82)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  contactCardSmall: { padding: 18, minWidth: "100%", flexBasis: "auto" },
  contactIcon: { width: 54, height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  contactIconSmall: { width: 44, height: 44, borderRadius: 12 },
  contactTextWrap: { flex: 1 },
  contactTitle: { color: "#fff", fontSize: 20, fontWeight: "900" },
  contactTitleSmall: { fontSize: 17 },
  contactValue: { color: "#c7cfe0", fontSize: 16, lineHeight: 24, marginTop: 8 },
  contactValueSmall: { fontSize: 14, lineHeight: 21 },
  contactNote: { color: "#8b96ad", fontSize: 13, marginTop: 8 },
  contactTapHint: { color: "#f9a876", fontSize: 13, fontWeight: "600", marginTop: 10 },

  ctaOuter: { paddingVertical: 90, paddingHorizontal: 38 },
  ctaOuterSmall: { paddingVertical: 60, paddingHorizontal: 16 },
  ctaCard: { width: "100%", maxWidth: 1280, alignSelf: "center", borderRadius: 28, paddingVertical: 56, paddingHorizontal: 34, alignItems: "center", backgroundColor: "rgba(70,32,40,0.68)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" },
  ctaCardMobile: { paddingVertical: 40, paddingHorizontal: 24 },
  ctaCardSmall: { paddingVertical: 30, paddingHorizontal: 16, borderRadius: 20 },
  ctaTitle: { marginTop: 38, color: "#ff7a4a", textAlign: "center", fontSize: 72, lineHeight: 78, fontWeight: "900", letterSpacing: -1.8, maxWidth: 840 },
  ctaTitleMobile: { fontSize: 48, lineHeight: 56 },
  ctaTitleSmall: { fontSize: 36, lineHeight: 44 },
  ctaText: { color: "#e2e8f0", textAlign: "center", fontSize: 26, lineHeight: 42, maxWidth: 980, marginTop: 32 },
  ctaTextMobile: { fontSize: 19, lineHeight: 32 },
  ctaTextSmall: { fontSize: 16, lineHeight: 26 },
  ctaActions: { flexDirection: "row", gap: 20, marginTop: 52, alignItems: "center" },
  ctaActionsSmall: { flexDirection: "column", alignItems: "stretch", width: "100%", marginTop: 32 },
  ctaPrimary: { borderRadius: 14, overflow: "hidden" },
  ctaPrimaryGradient: { minHeight: 86, paddingHorizontal: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
  ctaPrimaryGradientSmall: { minHeight: 56, paddingHorizontal: 20 },
  ctaPrimaryText: { color: "#fff", fontSize: 22, fontWeight: "900" },
  ctaPrimaryTextSmall: { fontSize: 16 },
  ctaSecondary: { minHeight: 86, paddingHorizontal: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.12)" },
  ctaSecondaryText: { color: "#fff", fontSize: 22, fontWeight: "900" },
  ctaTags: { flexDirection: "row", gap: 14, flexWrap: "wrap", justifyContent: "center", marginTop: 60 },
  ctaTagsSmall: { marginTop: 24, gap: 10 },
  smallTag: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 18, backgroundColor: "rgba(255,40,70,0.16)", borderWidth: 1, borderColor: "rgba(255,80,120,0.25)" },
  smallTagOrange: { backgroundColor: "rgba(255,122,0,0.13)", borderColor: "rgba(255,122,0,0.25)" },
  smallTagText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  footerOuter: { paddingHorizontal: 40, paddingTop: 82, paddingBottom: 38, backgroundColor: "rgba(12,18,37,0.78)" },
  footerOuterMobile: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 30 },
  footerGrid: { maxWidth: MAX_WIDTH, alignSelf: "center", width: "100%", flexDirection: "row", gap: 70, flexWrap: "wrap" },
  footerGridMobile: { flexDirection: "column", gap: 40 },
  footerMain: { flex: 1.2, minWidth: 280 },
  universityColumn: { 
  minWidth: 280, 
  flexDirection: "row", 
  gap: 16,
  paddingHorizontal: 20,
  borderLeftWidth: 1,
  borderLeftColor: "rgba(255,255,255,0.1)",
  marginLeft: 20,
},
  footerBrandRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  footerLogo: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "rgb(255, 255, 255)" },
  footerLogoImage: { width: "78%", height: "78%" },
  footerBrandTitle: { color: "#fff", fontSize: 25, fontWeight: "900" },
  footerBrandSub: { color: "#a8b4cc", fontSize: 16, marginTop: 4 },
  footerDescription: { color: "#a8b4cc", fontSize: 19, lineHeight: 32, marginTop: 24, maxWidth: 610 },
  footerDescriptionSmall: { fontSize: 16, lineHeight: 26 },
 universityRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  universityRowSmall: { flexDirection: "column", alignItems: "flex-start", gap: 12 },
  universityIcon: { width: 50, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  universityTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  universitySub: { color: "#a8b4cc", fontSize: 16, marginTop: 4 },
  universityTextWrap: { flex: 1 },
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