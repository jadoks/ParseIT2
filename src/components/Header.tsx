import React, { useState } from 'react';
import {
  Image,
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Gamepad from '../../assets/images/gamepad-solid.svg';
import House from '../../assets/images/house-solid.svg';
import VideosIcon from '../../assets/images/youtube-brands-solid.svg';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ScreenType =
  | 'home'
  | 'classes'
  | 'game'
  | 'flipit'
  | 'fruitmania'
  | 'quizmasters'
  | 'videos'
  | 'myjourney'
  | 'analytics'
  | 'profile'
  | 'messenger'
  | 'assignments'
  | 'coursedetail'
  | 'community'
  | 'generateactivity'
  | 'notification';

interface HeaderProps {
  isLargeScreen: boolean;
  activeScreen?: ScreenType;
  onNavigate?: (screen: ScreenType) => void;
  onSearchChange?: (query: string) => void;
  notificationCount?: number;
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  isLargeScreen: propIsLargeScreen,
  activeScreen = 'home',
  onNavigate,
  onSearchChange,
  notificationCount = 0,
  onMenuPress,
  onNotificationPress,
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

  const responsiveSize = (mobile: number, tablet: number, desktopMax: number) => {
    if (isVerySmall) return mobile * 0.9;
    if (isSmallPhone) return mobile;
    if (isPhone) return mobile + ((tablet - mobile) * (width - 420)) / (768 - 420);
    if (isTablet) return tablet;
    return Math.min(tablet + ((desktopMax - tablet) * (width - 1024)) / 1000, desktopMax);
  };

  const logoSize = responsiveSize(28, 38, 48);
  const navIconSize = responsiveSize(22, 28, 34);
  const mobileNavIconSize = responsiveSize(28, 32, 34);
  const searchIconSize = responsiveSize(18, 22, 26);
  const fontSizeSearch = responsiveSize(14, 16, 17);
  const paddingHorizontal = isVerySmall ? 12 : isPhone ? 16 : isTablet ? 24 : 32;

  const toggleSearch = (expand: boolean) => {
    if (Platform.OS === 'android') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setIsSearchExpanded(expand);
  };

  const getIconColor = (
    screen:
      | 'home'
      | 'classes'
      | 'game'
      | 'videos'
      | 'myjourney'
      | 'analytics'
      | 'profile'
      | 'messenger'
      | 'community'
      | 'generateactivity'
      | 'notification'
  ) => {
    const isGameGroupActive =
      screen === 'game' &&
      (activeScreen === 'game' ||
        activeScreen === 'flipit' ||
        activeScreen === 'fruitmania' ||
        activeScreen === 'quizmasters');

    return activeScreen === screen || isGameGroupActive ? '#D32F2F' : '#000000';
  };

  const isActive = (
    screen:
      | 'home'
      | 'classes'
      | 'game'
      | 'videos'
      | 'myjourney'
      | 'analytics'
      | 'profile'
      | 'messenger'
      | 'community'
      | 'generateactivity'
      | 'notification'
  ) => {
    if (screen === 'game') {
      return (
        activeScreen === 'game' ||
        activeScreen === 'flipit' ||
        activeScreen === 'fruitmania' ||
        activeScreen === 'quizmasters'
      );
    }

    return activeScreen === screen;
  };

  const navScreens: Array<'home' | 'classes' | 'game' | 'videos' | 'messenger'> = [
    'home',
    'classes',
    'game',
    'videos',
    'messenger',
  ];

  const getSearchPlaceholder = () => {
    if (isPhone) return 'Search';

    if (
      activeScreen === 'game' ||
      activeScreen === 'flipit' ||
      activeScreen === 'fruitmania' ||
      activeScreen === 'quizmasters'
    ) {
      return 'Search Game';
    }

    if (activeScreen === 'videos') return 'Search Videos';
    if (activeScreen === 'messenger') return 'Search Messages';
    if (activeScreen === 'classes') return 'Search Classes';
    if (activeScreen === 'analytics') return 'Search Analytics';

    return 'Search ParseClass';
  };

  const getNavLabel = (screen: ScreenType) => {
    switch (screen) {
      case 'home':
        return 'Home';
      case 'classes':
        return 'Classes';
      case 'game':
        return 'Game';
      case 'videos':
        return 'Videos';
      case 'messenger':
        return 'Messages';
      case 'notification':
        return 'Notifications';
      case 'analytics':
        return 'Analytics';
      default:
        return screen;
    }
  };

  const renderNavIcon = (
    screen: 'home' | 'classes' | 'game' | 'videos' | 'messenger',
    size: number
  ) => {
    if (screen === 'classes') {
      return (
        <MaterialCommunityIcons
          name="google-classroom"
          size={size}
          color={isActive(screen) ? '#D32F2F' : '#000000'}
        />
      );
    }

    if (screen === 'messenger') {
      return (
        <MaterialCommunityIcons
          name="facebook-messenger"
          size={size}
          color={getIconColor(screen)}
        />
      );
    }

    if (Platform.OS === 'web') {
      return (
        <Image
          source={
            screen === 'home'
              ? require('../../assets/images/house-solid.png')
              : screen === 'game'
              ? require('../../assets/images/gamepad-solid.png')
              : require('../../assets/images/youtube-brands-solid.png')
          }
          style={{
            width: size,
            height: size,
            resizeMode: 'contain',
            tintColor: isActive(screen) ? '#D32F2F' : '#000000',
          }}
        />
      );
    }

    if (screen === 'home') {
      return (
        <House
          width={size}
          height={size}
          stroke={getIconColor(screen)}
          fill={getIconColor(screen)}
        />
      );
    }

    if (screen === 'game') {
      return (
        <Gamepad
          width={size}
          height={size}
          stroke={getIconColor(screen)}
          fill={getIconColor(screen)}
        />
      );
    }

    if (screen === 'videos') {
      return (
        <VideosIcon
          width={size}
          height={size}
          stroke={getIconColor(screen)}
          fill={getIconColor(screen)}
        />
      );
    }

    return null;
  };

  const renderNavButton = (
    screen: 'home' | 'classes' | 'game' | 'videos' | 'messenger',
    size: number,
    extraStyle?: object
  ) => (
    <View key={screen} style={styles.navItemWrapper}>
      <Pressable
        style={(state: any) => [
          styles.navBtn,
          isActive(screen) && styles.navBtnActive,
          state.hovered && !isActive(screen) && styles.navBtnHover,
          extraStyle,
        ]}
        onPress={() => {
          toggleSearch(false);
          onNavigate?.(screen);
        }}
        onHoverIn={() => {
          if (Platform.OS === 'web') {
            setHoveredNav(screen);
          }
        }}
        onHoverOut={() => {
          if (Platform.OS === 'web') {
            setHoveredNav(null);
          }
        }}
      >
        {renderNavIcon(screen, size)}
      </Pressable>

      {Platform.OS === 'web' && hoveredNav === screen && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>{getNavLabel(screen)}</Text>
        </View>
      )}
    </View>
  );

  const displayNotificationCount = notificationCount > 99 ? '99+' : `${notificationCount}`;

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
        <View style={{ backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
          <View
            style={[
              styles.headerContainer,
              { paddingHorizontal, height: isVerySmall ? 64 : 72 },
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
              <TouchableOpacity
                style={[
                  styles.searchIconOnly,
                  {
                    padding: isVerySmall ? 8 : 10,
                    flex: 1,
                    marginHorizontal: 8,
                    flexDirection: 'row',
                    paddingHorizontal: 12,
                    gap: 8,
                    alignItems: 'center',
                  },
                ]}
                onPress={() => toggleSearch(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="magnify" size={searchIconSize} color="#888" />
                <Text
                  style={{
                    color: '#888',
                    fontSize: isVerySmall ? 12 : 14,
                    flex: 1,
                    fontWeight: '400',
                  }}
                >
                  {getSearchPlaceholder()}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableWithoutFeedback onPress={() => {}}>
                <View
                  style={[
                    styles.searchBar,
                    {
                      flex: 1,
                      marginHorizontal: 8,
                      height: isVerySmall ? 42 : 46,
                      paddingHorizontal: 16,
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
                    autoFocus
                    placeholder={getSearchPlaceholder()}
                    placeholderTextColor="#888"
                    value={searchQuery}
                    onChangeText={(text) => {
                      setSearchQuery(text);
                      onSearchChange?.(text);
                    }}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    style={[styles.searchInput, { fontSize: fontSizeSearch }]}
                    returnKeyType="search"
                  />
                </View>
              </TouchableWithoutFeedback>
            )}

            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => {
                toggleSearch(false);
                onNavigate?.('messenger');
              }}
            >
              <MaterialCommunityIcons
                name="facebook-messenger"
                size={navIconSize}
                color={getIconColor('messenger')}
              />
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

          <View
            style={[
              styles.mobileNavRow,
              { paddingHorizontal, gap: isVerySmall ? 10 : 16, justifyContent: 'center' },
            ]}
          >
            {navScreens.slice(0, 4).map((screen) =>
              renderNavButton(screen, mobileNavIconSize, { padding: 12 })
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  return (
    <View
      style={[styles.headerContainer, { paddingHorizontal, height: isTablet ? 72 : 80 }]}
    >
      <View style={[styles.leftSection, { flex: isLargeScreenLocal ? 0.3 : 0.4 }]}>
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
            placeholder={getSearchPlaceholder()}
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              onSearchChange?.(text);
            }}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            style={[styles.searchInput, { fontSize: fontSizeSearch }]}
            returnKeyType="search"
          />
        </View>
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
        {navScreens.map((screen) => renderNavButton(screen, navIconSize))}
      </View>

      <View style={[styles.navItemWrapper, { marginLeft: 'auto' }]}>
        <Pressable
          style={(state: any) => [
            styles.navBtn,
            isActive('notification') && styles.navBtnActive,
            state.hovered && !isActive('notification') && styles.navBtnHover,
          ]}
          onPress={() => {
            toggleSearch(false);
            onNotificationPress?.();
          }}
          onHoverIn={() => {
            if (Platform.OS === 'web') {
              setIsBellHovered(true);
            }
          }}
          onHoverOut={() => {
            if (Platform.OS === 'web') {
              setIsBellHovered(false);
            }
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
    justifyContent: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
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
});

export default Header;