import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type ScreenType =
  | 'home'
  | 'honors'
  | 'grades'
  | 'announcement'
  | 'profile'
  | 'messenger'
  | 'coursedetail'
  | 'community'
  | 'notification'
  | 'analytics';

// 👇 GLOBAL SEARCH CONFIGURATION FOR TEACHERS
interface SearchFeature {
  id: string;
  title: string;
  screen: ScreenType;
  icon: string;
  keywords: string[];
}

const GLOBAL_SEARCH_FEATURES: SearchFeature[] = [
  { id: 'home', title: 'Teacher Dashboard', screen: 'home', icon: 'view-dashboard-outline', keywords: ['home', 'dash', 'main', 'overview'] },
  { id: 'honors', title: 'Student Honors', screen: 'honors', icon: 'medal', keywords: ['honor', 'award', 'achievement', 'star'] },
  { id: 'grades', title: 'Gradebook', screen: 'grades', icon: 'school', keywords: ['grade', 'score', 'mark', 'result', 'exam'] },
  { id: 'announcement', title: 'Share Announcement', screen: 'announcement', icon: 'bullhorn', keywords: ['announce', 'post', 'news', 'alert', 'share'] },
  { id: 'community', title: 'Teacher Community', screen: 'community', icon: 'forum-outline', keywords: ['comm', 'post', 'feed', 'social', 'forum'] },
  { id: 'messenger', title: 'Messenger', screen: 'messenger', icon: 'facebook-messenger', keywords: ['mess', 'chat', 'talk', 'dm', 'pc', 'message'] },
  { id: 'analytics', title: 'Class Analytics', screen: 'analytics', icon: 'chart-bar', keywords: ['ana', 'stats', 'data', 'progress', 'performance'] },
  { id: 'profile', title: 'My Profile', screen: 'profile', icon: 'account-circle-outline', keywords: ['prof', 'user', 'me', 'settings', 'account'] },
  { id: 'notifications', title: 'Notifications', screen: 'notification', icon: 'bell-outline', keywords: ['notif', 'alert', 'bell', 'update'] },
];

interface HeaderProps {
  isLargeScreen: boolean;
  activeScreen?: ScreenType;
  onNavigate?: (screen: ScreenType) => void;
  onSearchChange?: (query: string) => void;
  onMenuPress?: () => void;
  notificationCount?: number;
  onNotificationPress?: () => void;
  // ✅ NEW PROP: Unread conversation count
  messengerUnreadCount?: number;
  searchValue?: string;
}

const TeacherHeader: React.FC<HeaderProps> = ({
  isLargeScreen,
  activeScreen = 'home',
  onNavigate,
  onSearchChange,
  onMenuPress,
  notificationCount = 0,
  onNotificationPress,
  messengerUnreadCount = 0,
  searchValue,
}) => {
  const { width } = useWindowDimensions();
  const isVerySmall = width < 360;
  const isSmallPhone = width < 420;
  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isLargeScreenLocal = width >= 1024;

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<ScreenType | null>(null);
  const [isBellHovered, setIsBellHovered] = useState(false);

  // 👇 NEW: focus tracking for the mobile expanded search input, so it gets
  // the same highlighted-border focus behavior as other inputs in the app,
  // consistent with isSearchFocused used on desktop/tablet.
  const [isMobileSearchFocused, setIsMobileSearchFocused] = useState(false);

  useEffect(() => {
    if (searchValue !== undefined && searchValue !== searchQuery) {
      setSearchQuery(searchValue);
      if (!searchValue) setSearchResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);
  
  // 👇 NEW STATE FOR CONTEXTUAL RESULTS
  const [searchResults, setSearchResults] = useState<SearchFeature[]>([]);

  const searchInputRef = useRef<TextInput>(null);

  const responsiveSize = (mobile: number, tablet: number, desktopMax: number) => {
    if (isVerySmall) return mobile * 0.9;
    if (isSmallPhone) return mobile;
    if (isPhone) return mobile + ((tablet - mobile) * (width - 420)) / (768 - 420);
    if (isTablet) return tablet;
    return Math.min(
      tablet + ((desktopMax - tablet) * (width - 1024)) / 1000,
      desktopMax
    );
  };

  const logoSize = responsiveSize(28, 38, 48);
  const navIconSize = responsiveSize(22, 28, 34);
  const mobileNavIconSize = responsiveSize(24, 28, 30);
  const searchIconSize = responsiveSize(18, 22, 26);
  const fontSizeSearch = responsiveSize(14, 16, 17);
  const paddingHorizontal = isVerySmall ? 12 : isPhone ? 16 : isTablet ? 24 : 32;

  const toggleSearch = (expand: boolean) => {
    if (Platform.OS === 'android') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setIsSearchExpanded(expand);
    if (!expand) {
      setSearchQuery('');
      setSearchResults([]);
      Keyboard.dismiss();
    } else {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  // 👇 UNIFIED SEARCH HANDLER
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    // 1. MESSENGER: Pass through for local conversation filtering
    if (activeScreen === 'messenger') {
      onSearchChange?.(text);
      return;
    }

     // Community search
    if (activeScreen === 'community') {
      onSearchChange?.(text);
      return;
    }

    // 2. GLOBAL SEARCH LOGIC (Home, Honors, Grades, etc.)
    const isGlobalSearchScreen = 
        activeScreen === 'home' || 
        activeScreen === 'honors' || 
        activeScreen === 'grades' || 
        activeScreen === 'announcement' ||
        activeScreen === 'profile' ||
        activeScreen === 'analytics' 
     

    if (isGlobalSearchScreen) {
      if (text.trim().length === 0) {
        setSearchResults([]);
        return;
      }
      const lowerText = text.toLowerCase();
      const filtered = GLOBAL_SEARCH_FEATURES.filter((feature) => {
        return (
          feature.title.toLowerCase().includes(lowerText) ||
          feature.keywords.some((k) => k.includes(lowerText))
        );
      });
      setSearchResults(filtered);
    }
  };

  // 👇 HANDLE QUICK ACTION CLICK
  const handleSuggestionPress = (screen: ScreenType) => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchExpanded(false);
    Keyboard.dismiss();
    onNavigate?.(screen);
  };

  const getIconColor = (screen: ScreenType) =>
    activeScreen === screen ? '#D32F2F' : '#000000';

  const isActive = (screen: ScreenType) => activeScreen === screen;

  const mobileNavScreens: Array<'home' | 'honors' | 'grades' | 'announcement'> = [
    'home',
    'honors',
    'grades',
    'announcement',
  ];

  const desktopNavScreens: Array<
    'home' | 'honors' | 'grades' | 'announcement' | 'messenger'
  > = ['home', 'honors', 'grades', 'announcement', 'messenger'];

  const getNavLabel = (screen: ScreenType) => {
    switch (screen) {
      case 'home':
        return 'Home';
      case 'honors':
        return 'Honors';
      case 'grades':
        return 'Grades';
      case 'announcement':
        return 'Announcements';
      case 'messenger':
        return 'Messages';
      case 'notification':
        return 'Notifications';
      default:
        return screen;
    }
  };

  const getSearchPlaceholder = () => {
    if (isPhone) return 'Search';
    if (activeScreen === 'messenger') return 'Filter conversations...';
    if (activeScreen === 'community') return 'Filter posts...';
    
    // Global Search Placeholder
    if (
      activeScreen === 'home' ||
      activeScreen === 'honors' ||
      activeScreen === 'grades' ||
      activeScreen === 'announcement' ||
      activeScreen === 'profile' ||
      activeScreen === 'analytics' 
    ) {
      return 'Search features...';
    }

    return 'Search ParseClass';
  };

  const renderNavIcon = (screen: ScreenType, size: number) => {
    const color = getIconColor(screen);
    switch (screen) {
      case 'home':
        return (
          <Image
            source={require('../../assets/images/house-solid.png')}
            style={{
              width: size,
              height: size,
              tintColor: color,
              resizeMode: 'contain',
            }}
          />
        );
      case 'honors':
        return <MaterialCommunityIcons name="medal" size={size} color={color} />;
      case 'grades':
        return <MaterialCommunityIcons name="school" size={size} color={color} />;
      case 'announcement':
        return <MaterialCommunityIcons name="bullhorn" size={size} color={color} />;
      case 'messenger':
        return (
          <MaterialCommunityIcons
            name="facebook-messenger"
            size={size}
            color={color}
          />
        );
      default:
        return <MaterialCommunityIcons name="circle" size={size} color={color} />;
    }
  };

  const renderDesktopNavButton = (
    screen: 'home' | 'honors' | 'grades' | 'announcement' | 'messenger',
    size: number,
    extraStyle?: object
  ) => (
    <View key={screen} style={styles.navItemWrapper}>
      <Pressable
        style={({ pressed }) => [
          styles.navBtn,
          isActive(screen) && styles.navBtnActive,
          hoveredNav === screen && !isActive(screen) && styles.navBtnHover,
          pressed && styles.navBtnHover,
          extraStyle,
        ]}
        onPress={() => {
          toggleSearch(false);
          onNavigate?.(screen);
        }}
        onHoverIn={() => {
          if (Platform.OS === 'web') setHoveredNav(screen);
        }}
        onHoverOut={() => {
          if (Platform.OS === 'web') setHoveredNav(null);
        }}
      >
        {/* ✅ Render Badge for Messenger Icon */}
        <View>
          {renderNavIcon(screen, size)}
          {screen === 'messenger' && messengerUnreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {messengerUnreadCount > 99 ? '99+' : messengerUnreadCount}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
      {Platform.OS === 'web' && hoveredNav === screen && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>{getNavLabel(screen)}</Text>
        </View>
      )}
    </View>
  );

  const displayNotificationCount =
    notificationCount > 99 ? '99+' : `${notificationCount}`;

  // 👇 RENDER GLOBAL SEARCH RESULTS DROPDOWN
  const renderSearchResults = () => {
    const isGlobalSearchScreen =
      activeScreen === 'home' ||
      activeScreen === 'honors' ||
      activeScreen === 'grades' ||
      activeScreen === 'announcement' ||
      activeScreen === 'profile' ||
      activeScreen === 'analytics' ||
      activeScreen === 'community';

    if (!isGlobalSearchScreen || searchResults.length === 0 || searchQuery.length === 0) return null;

    return (
      <View style={[styles.searchResultsContainer, isPhone && styles.searchResultsMobile]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {searchResults.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.searchResultItem}
              onPress={() => handleSuggestionPress(item.screen)}
              activeOpacity={0.7}
            >
              <View style={styles.resultIconBox}>
                <MaterialCommunityIcons name={item.icon as any} size={20} color="#D32F2F" />
              </View>
              <View style={styles.resultContent}>
                <Text style={styles.resultTitle}>{item.title}</Text>
                <Text style={styles.resultSubtitle}>Quick Action • Go to {item.title}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  if (isPhone) {
    return (
      <TouchableWithoutFeedback
        onPress={() => {
          if (isSearchExpanded) {
            toggleSearch(false);
            Keyboard.dismiss();
          }
        }}
      >
        <View style={styles.mobileWrapper}>
          <View
            style={[
              styles.headerContainer,
              {
                paddingHorizontal,
                height: isVerySmall ? 64 : 72,
              },
            ]}
          >
            <View style={styles.mobileLeftSection}>
              <TouchableOpacity
                style={styles.menuBtn}
                onPress={onMenuPress}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="menu" size={24} color="#000" />
              </TouchableOpacity>
              <Image
                source={require('../../assets/images/logo.png')}
                style={{
                  width: logoSize,
                  height: logoSize,
                  resizeMode: 'contain',
                  marginRight: isVerySmall ? 8 : 10,
                }}
              />
            </View>

            {!isSearchExpanded ? (
              // Search Icon Button (Not Expanded)
              <TouchableOpacity
                style={[
                  styles.navBtn,
                  { padding: 8, marginLeft: 'auto', marginRight: 4 },
                ]}
                onPress={() => toggleSearch(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="magnify"
                  size={navIconSize}
                  color="#000"
                />
              </TouchableOpacity>
            ) : (
              // Expanded Search Bar
              <View
                style={[
                  styles.expandedSearchContainer,
                  {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: '#FFF',
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 8,
                    zIndex: 1000,
                  },
                ]}
              >
                {/* Back Arrow */}
                <TouchableOpacity
                  style={{ padding: 8, marginRight: 8 }}
                  onPress={() => toggleSearch(false)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={24}
                    color="#000"
                  />
                </TouchableOpacity>

                {/* Search Input */}
                <View
                  style={[
                    styles.expandedSearchInput,
                    {
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#F1F1F1',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      height: 40,
                      marginRight: 8,
                    },
                    // 👇 NEW: same highlighted-border focus behavior as other
                    // inputs in the app, consistent with isSearchFocused
                    // used on desktop/tablet.
                    isMobileSearchFocused && styles.expandedSearchInputFocused,
                  ]}
                >
                  <TextInput
                    ref={searchInputRef}
                    autoFocus
                    placeholder="Search"
                    placeholderTextColor="#888"
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    onFocus={() => setIsMobileSearchFocused(true)}
                    onBlur={() => setIsMobileSearchFocused(false)}
                    style={[
                      styles.expandedSearchTextInput,
                      {
                        flex: 1,
                        fontSize: 16,
                        color: '#000',
                        paddingVertical: 8,
                      },
                    ]}
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        searchInputRef.current?.focus();
                      }}
                      style={{ padding: 4 }}
                    >
                      <MaterialCommunityIcons name="close-circle" size={20} color="#888" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Search Button */}
                <TouchableOpacity
                  style={{ padding: 8 }}
                  onPress={() => {
                    if (searchQuery.trim()) {
                      Keyboard.dismiss();
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="magnify"
                    size={24}
                    color={searchQuery.trim() ? '#D32F2F' : '#888'}
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* ✅ MESSENGER ICON WITH BADGE (MOBILE) */}
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => {
                toggleSearch(false);
                onNavigate?.('messenger');
              }}
            >
              <View>
                <MaterialCommunityIcons
                  name="facebook-messenger"
                  size={navIconSize}
                  color={getIconColor('messenger')}
                />
                {messengerUnreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {messengerUnreadCount > 99 ? '99+' : messengerUnreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => {
                toggleSearch(false);
                onNotificationPress?.();
              }}
            >
              <View>
                <MaterialCommunityIcons
                  name="bell"
                  size={navIconSize}
                  color={getIconColor('notification')}
                />
                {notificationCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{displayNotificationCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Mobile Search Results Dropdown */}
          {isSearchExpanded && renderSearchResults()}

          <View style={[styles.mobileNavRow, { paddingHorizontal }]}>
            {mobileNavScreens.map((screen) => {
              const active = isActive(screen);

              return (
                <Pressable
                  key={screen}
                  style={[styles.mobileNavItem, active && styles.mobileNavItemActive]}
                  onPress={() => {
                    toggleSearch(false);
                    onNavigate?.(screen);
                  }}
                >
                  {renderNavIcon(screen, mobileNavIconSize)}
                </Pressable>
              );
            })}
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  return (
    <View
      style={[
        styles.headerContainer,
        { paddingHorizontal, height: isTablet ? 72 : 80 },
      ]}
    >
      <View style={[styles.leftSection, { flex: isLargeScreenLocal ? 0.3 : 0.4, position: 'relative' }]}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={{
            width: logoSize,
            height: logoSize,
            resizeMode: 'contain',
            marginRight: isTablet ? 14 : 18,
          }}
        />
        <View
          style={[
            styles.searchBar,
            {
              flex: 1,
              maxWidth: isLargeScreenLocal ? 420 : isTablet ? 340 : '100%',
              height: isTablet ? 46 : 50,
              paddingHorizontal: isLargeScreenLocal ? 20 : 16,
              borderWidth: 1,
              borderBottomWidth: isSearchFocused ? 2 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="magnify"
            size={searchIconSize}
            color="#888"
            style={{ marginRight: 12 }}
          />
          <TextInput
            ref={searchInputRef}
            placeholder={getSearchPlaceholder()}
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            style={[styles.searchInput, { fontSize: fontSizeSearch }]}
            returnKeyType="search"
          />
        </View>
        {/* Desktop/Tablet Search Results Dropdown */}
        {renderSearchResults()}
      </View>

      <View
        style={[
          styles.centerSection,
          {
            flex: isLargeScreenLocal ? 1.2 : isTablet ? 1 : 0.8,
            gap: isTablet ? 24 : 32,
            maxWidth: isLargeScreenLocal ? 720 : undefined,
          },
        ]}
      >
        {desktopNavScreens.map((screen) =>
          renderDesktopNavButton(screen, navIconSize)
        )}
      </View>

      <View style={[styles.navItemWrapper, { marginLeft: 'auto' }]}>
        <Pressable
          style={({ pressed }) => [
            styles.navBtn,
            isActive('notification') && styles.navBtnActive,
            isBellHovered && !isActive('notification') && styles.navBtnHover,
            pressed && styles.navBtnHover,
          ]}
          onPress={() => {
            toggleSearch(false);
            onNotificationPress?.();
          }}
          onHoverIn={() => {
            if (Platform.OS === 'web') setIsBellHovered(true);
          }}
          onHoverOut={() => {
            if (Platform.OS === 'web') setIsBellHovered(false);
          }}
        >
          <View>
            <MaterialCommunityIcons
              name="bell"
              size={navIconSize}
              color={getIconColor('notification')}
            />
            {notificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{displayNotificationCount}</Text>
              </View>
            )}
          </View>
        </Pressable>

        {Platform.OS === 'web' && isBellHovered && (
          <View style={styles.tooltip}>
            <Text style={styles.tooltipText}>{getNavLabel('notification')}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mobileWrapper: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobileLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuBtn: {
    marginRight: 10,
    padding: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIconOnly: {
    borderWidth: 1,
    borderColor: '#D32F2F',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D32F2F',
    borderRadius: 999,
    backgroundColor: '#FFF',
  },
  searchInput: {
    flex: 1,
    color: '#000',
    paddingVertical: Platform.select({ ios: 12, default: 8 }),
    borderWidth: 0,
    backgroundColor: 'transparent',
    // 👇 disables the browser's default black focus outline in
    // Chrome/Edge on React Native Web (same trick used in Header.tsx)
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  centerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  navBtn: {
    padding: 8,
    borderRadius: 12,
  },
  navBtnActive: {
    backgroundColor: 'rgba(211,47,47,0.08)',
  },
  navBtnHover: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  tooltip: {
    position: 'absolute',
    top: '100%',
    marginTop: 6,
    backgroundColor: '#2222229d',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 999,
    elevation: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  tooltipText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  mobileNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    backgroundColor: '#FFF',
  },
  mobileNavItem: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    position: 'relative',
    overflow: 'visible',
  },
  mobileNavItemActive: {
    backgroundColor: 'rgba(211,47,47,0.10)',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#D32F2F',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  // 👇 STYLES FOR EXPANDED MOBILE SEARCH
  expandedSearchContainer: {
    // Defined inline in component
  },
  expandedSearchInput: {
    // Defined inline in component
  },
  // 👇 NEW: highlighted-border focus state for the mobile expanded search
  // input, matching the desktop/tablet focus behavior (red border on focus).
  expandedSearchInputFocused: {
    borderWidth: 1.5,
    borderColor: '#D32F2F',
  },
  // 👇 NEW: disables the browser's default black focus outline in
  // Chrome/Edge on React Native Web for the mobile expanded search TextInput.
  expandedSearchTextInput: {
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  // 👇 NEW STYLES FOR SEARCH RESULTS
  searchResultsContainer: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#EEE',
    zIndex: 1000,
    maxHeight: 320,
    overflow: 'hidden',
  },
  searchResultsMobile: {
    top: 48,
    left: 8,
    right: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  resultIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF1F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  resultSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
});

export default TeacherHeader;