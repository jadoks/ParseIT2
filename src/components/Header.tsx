import React, { useState } from 'react';
import {
  Image,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface HeaderProps {
  isLargeScreen: boolean;
  activeScreen?: 'home' | 'game' | 'videos';
  onNavigate?: (screen: 'home' | 'game' | 'videos') => void;
}

const Header: React.FC<HeaderProps> = ({ isLargeScreen: propIsLargeScreen, activeScreen = 'home', onNavigate }) => {
  const { width } = useWindowDimensions();
  
  // Breakpoints
  const isVerySmall     = width < 360;
  const isSmallPhone    = width < 420;
  const isPhone         = width < 768;
  const isTablet        = width >= 768 && width < 1024;
  const isLargeScreenLocal   = width >= 1024;   // your 1536px case + desktops

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Helper: scale value between min and max with soft cap on big screens
  const responsiveSize = (mobile: number, tablet: number, desktopMax: number) => {
    if (isVerySmall)      return mobile * 0.9;
    if (isSmallPhone)     return mobile;
    if (isPhone)          return mobile + (tablet - mobile) * (width - 420) / (768 - 420);
    if (isTablet)         return tablet;
    // Large screens: grow very little or cap
    return Math.min(tablet + (desktopMax - tablet) * (width - 1024) / 1000, desktopMax);
  };

  // Sizes with sensible caps
  const logoSize        = responsiveSize(28, 38, 48);          // never bigger than ~48
  const navIconSize     = responsiveSize(22, 28, 34);          // cap ~34px
  const logoutIconSize  = responsiveSize(24, 32, 40);
  const searchIconSize  = responsiveSize(18, 22, 26);

  const fontSizeSearch  = responsiveSize(14, 16, 17);

  const paddingHorizontal = isVerySmall ? 12 : isPhone ? 16 : isTablet ? 24 : 32;

  const toggleSearch = (expand: boolean) => {
    if (Platform.OS === 'android') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setIsSearchExpanded(expand);
  };

  const shouldShowFullHeader = !isSearchExpanded || !isPhone;

  return (
    <View
      style={[
        styles.headerContainer,
        {
          paddingHorizontal,
          height: isVerySmall ? 64 : isPhone ? 72 : 80,
        },
      ]}
    >
      {/* LEFT – Logo + Search */}
      <View
        style={[
          styles.leftSection,
          { flex: isSearchExpanded && isPhone ? 1 : isLargeScreenLocal ? 0.3 : 0.4 },
        ]}
      >
        {shouldShowFullHeader && (
          <Image
            source={require('../../assets/images/logo.png')}
            style={{
              width: logoSize,
              height: logoSize,
              resizeMode: 'contain',
              marginRight: isVerySmall ? 10 : isPhone ? 14 : 18,
            }}
          />
        )}

        {isPhone && !isSearchExpanded ? (
          <TouchableOpacity
            style={[
              styles.searchIconOnly,
              { padding: isVerySmall ? 8 : 10 },
            ]}
            onPress={() => toggleSearch(true)}
            activeOpacity={0.7}
          >
            <Image
              source={require('../../assets/images/magnifying-glass-solid.png')}
              style={{ width: searchIconSize, height: searchIconSize, tintColor: '#888' }}
            />
          </TouchableOpacity>
        ) :  (
          <View
            style={[
              styles.searchBar,
              {
                flex: 1,
                maxWidth: isLargeScreenLocal ? 420 : isTablet ? 340 : '100%',
                height: isVerySmall ? 42 : isPhone ? 46 : 50,
                paddingHorizontal: isLargeScreenLocal ? 20 : 16,
              },
            ]}
          >
            <Image
              source={require('../../assets/images/magnifying-glass-solid.png')}
              style={{ width: searchIconSize, height: searchIconSize, marginRight: 12, tintColor: '#888' }}
            />
            <TextInput
              autoFocus={isPhone && isSearchExpanded}
              placeholder={activeScreen === 'videos' ? 'Search Videos' : 'Search ParseClass'}
              placeholderTextColor="#888"
              style={[
                styles.searchInput,
                { fontSize: fontSizeSearch },
              ]}
              onBlur={() => isPhone && toggleSearch(false)}
              returnKeyType="search"
            />
            {isPhone && (
              <TouchableOpacity
                onPress={() => toggleSearch(false)}
                hitSlop={{ top: 12, bottom: 12, left: 20, right: 20 }}
              >
                <Text style={[styles.closeText, { fontSize: fontSizeSearch + 2 }]}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )} 
      </View>

      {/* CENTER + RIGHT — hidden on mobile when search expanded */}
      {shouldShowFullHeader && (
        <>
          <View
            style={[
              styles.centerSection,
              {
                flex: isLargeScreenLocal ? 1.2 : isTablet ? 1 : 0.8,
                gap: isVerySmall ? 16 : isPhone ? 20 : isTablet ? 32 : 40,
                maxWidth: isLargeScreenLocal ? 600 : undefined,
              },
            ]}
          >
            <TouchableOpacity 
              style={styles.navBtn}
              onPress={() => onNavigate?.('home')}
            >
              <Image
                source={require('../../assets/images/house-solid.png')}
                style={{ width: navIconSize, height: navIconSize, resizeMode: 'contain', tintColor: activeScreen === 'home' ? '#D32F2F' : '#000000' }}
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.navBtn}
              onPress={() => onNavigate?.('game')}
            >
              <Image
                source={require('../../assets/images/gamepad-solid.png')}
                style={{ width: navIconSize, height: navIconSize, resizeMode: 'contain', tintColor: activeScreen === 'game' ? '#D32F2F' : '#000000' }}
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.navBtn}
              onPress={() => onNavigate?.('videos')}
            >
              <Image
                source={require('../../assets/images/youtube-brands-solid.png')}
                style={{ width: navIconSize, height: navIconSize, resizeMode: 'contain', tintColor: activeScreen === 'videos' ? '#D32F2F' : '#000000' }}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.navBtn}>
              <Image
                source={require('../../assets/images/ChatGPT.png')}
                style={{ width: navIconSize, height: navIconSize, resizeMode: 'contain', tintColor: '#000' }}
              />
            </TouchableOpacity>
          </View>

          <View style={[styles.rightSection, { flex: isLargeScreenLocal ? 0.3 : 0.25 }]}>
            <TouchableOpacity style={styles.logoutBtn}>
              <Image
                source={require('../../assets/images/log-out-outline.png')}
                style={{
                  width: logoutIconSize,
                  height: logoutIconSize,
                  resizeMode: 'contain',
                }}
              />
            </TouchableOpacity>
          </View>
        </>
      )}
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
  },

  closeText: {
    color: '#888',
    fontWeight: '500',
    marginLeft: 8,
  },

  centerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  navBtn: {
    padding: 8,
    borderRadius: 12,
  },

  rightSection: {
    alignItems: 'flex-end',
  },

  logoutBtn: {
    padding: 8,
    borderRadius: 12,
  },
});

export default Header;