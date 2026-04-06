import { MaterialCommunityIcons } from '@expo/vector-icons';
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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type ScreenType =
  | 'home'
  | 'game'
  | 'grades'
  | 'videos'
  | 'myjourney'
  | 'profile'
  | 'messenger'
  | 'assignments'
  | 'coursedetail'
  | 'community'
  | 'notification';

interface HeaderProps {
  isLargeScreen: boolean;
  activeScreen?: ScreenType;
  onNavigate?: (screen: ScreenType) => void;
  onSearchChange?: (query: string) => void;
}

const TeacherHeader: React.FC<HeaderProps> = ({
  isLargeScreen,
  activeScreen = 'home',
  onNavigate,
  onSearchChange,
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

  const getIconColor = (screen: ScreenType) =>
    activeScreen === screen ? '#D32F2F' : '#000000';

  const isActive = (screen: ScreenType) => activeScreen === screen;

  const navScreens: Array<'home' | 'game' | 'grades' | 'videos' | 'messenger'> = [
    'home',
    'game',
    'grades',
    'videos',
    'messenger',
  ];

  const renderNavIcon = (screen: ScreenType, size: number, mobile = false) => {
    const color = getIconColor(screen);

    switch (screen) {
      case 'home':
        return <MaterialCommunityIcons name="home" size={size} color={color} />;
      case 'game':
        return <MaterialCommunityIcons name="medal" size={size} color={color} />;
      case 'grades':
        return <MaterialCommunityIcons name="school" size={size} color={color} />;
      case 'videos':
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
                paddingLeft: paddingHorizontal,
                paddingRight: 0,
                height: isVerySmall ? 64 : 72,
              },
            ]}
          >
            <Image
              source={require('../../assets/images/logo.png')}
              style={{
                width: logoSize,
                height: logoSize,
                resizeMode: 'contain',
                marginRight: isVerySmall ? 8 : 10,
              }}
            />

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
                    alignItems: 'center',
                    gap: 8,
                  },
                ]}
                onPress={() => toggleSearch(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="magnify"
                  size={searchIconSize}
                  color="#888"
                />
                <Text
                  style={{
                    color: '#888',
                    fontSize: isVerySmall ? 12 : 14,
                    flex: 1,
                    fontWeight: '400',
                  }}
                >
                  {activeScreen === 'messenger' ? 'Search Message' : 'Search ParseClass'}
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
                    placeholder="Search ParseClass"
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
              style={styles.notificationBtnCorner}
              onPress={() => onNavigate?.('notification')}
            >
              <View style={{ position: 'relative' }}>
                <MaterialCommunityIcons
                  name="bell"
                  size={navIconSize}
                  color={getIconColor('notification')}
                />
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>17</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.mobileNavRow,
              {
                paddingHorizontal,
                gap: isVerySmall ? 12 : 20,
                justifyContent: 'center',
              },
            ]}
          >
            {navScreens.map((screen) => (
              <Pressable
                key={screen}
                style={(state: any) => [
                  styles.navBtn,
                  isActive(screen) && styles.navBtnActive,
                  state.hovered && !isActive(screen) && styles.navBtnHover,
                  { padding: 12 },
                ]}
                onPress={() => {
                  toggleSearch(false);
                  onNavigate?.(screen);
                }}
              >
                {renderNavIcon(screen, mobileNavIconSize, true)}
              </Pressable>
            ))}
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  return (
    <View
      style={[
        styles.headerContainer,
        {
          paddingLeft: paddingHorizontal,
          paddingRight: 0,
          height: isTablet ? 72 : 80,
        },
      ]}
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
            placeholder="Search ParseClass"
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

      <View style={[styles.centerSection, { flex: 1, gap: isTablet ? 32 : 40 }]}>
        {navScreens.map((screen) => (
          <Pressable
            key={screen}
            style={(state: any) => [
              styles.navBtn,
              isActive(screen) && styles.navBtnActive,
              state.hovered && !isActive(screen) && styles.navBtnHover,
            ]}
            onPress={() => onNavigate?.(screen)}
          >
            {renderNavIcon(screen, navIconSize)}
          </Pressable>
        ))}
      </View>

      <View style={styles.rightCornerSection}>
        <TouchableOpacity
          style={styles.notificationBtnCorner}
          onPress={() => onNavigate?.('notification')}
        >
          <View style={{ position: 'relative' }}>
            <MaterialCommunityIcons
              name="bell"
              size={navIconSize}
              color={getIconColor('notification')}
            />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>2</Text>
            </View>
          </View>
        </TouchableOpacity>
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
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: -1,
  },
  rightCornerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 80,
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
  notificationBtnCorner: {
    paddingVertical: 8,
    paddingLeft: 24,
    paddingRight: 24,
  },
  mobileNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  notificationBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: '#D32F2F',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
});

export default TeacherHeader;