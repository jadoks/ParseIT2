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
import Gamepad from '../../assets/images/gamepad-solid.svg';
import House from '../../assets/images/house-solid.svg';
import MessengerIcon from '../../assets/images/messenger.svg';
import VideosIcon from '../../assets/images/youtube-brands-solid.svg';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface HeaderProps {
  isLargeScreen: boolean;
  activeScreen?: 'home' | 'game' | 'videos' | 'analytics' | 'myjourney' | 'profile' | 'messenger' | 'assignments' | 'coursedetail';
  onNavigate?: (screen: 'home' | 'game' | 'videos' | 'analytics' | 'myjourney' | 'profile' | 'messenger' | 'assignments' | 'coursedetail') => void;
}

const Header: React.FC<HeaderProps> = ({ isLargeScreen: propIsLargeScreen, activeScreen = 'home', onNavigate }) => {
  const { width } = useWindowDimensions();
  
  // Breakpoints
  const isVerySmall     = width < 360;
  const isSmallPhone    = width < 420;
  const isPhone         = width < 768;
  const isTablet        = width >= 768 && width < 1024;
  const isLargeScreenLocal   = width >= 1024;

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Helper: scale value between min and max with soft cap on big screens
  const responsiveSize = (mobile: number, tablet: number, desktopMax: number) => {
    if (isVerySmall)      return mobile * 0.9;
    if (isSmallPhone)     return mobile;
    if (isPhone)          return mobile + (tablet - mobile) * (width - 420) / (768 - 420);
    if (isTablet)         return tablet;
    return Math.min(tablet + (desktopMax - tablet) * (width - 1024) / 1000, desktopMax);
  };

  // Sizes with sensible caps
  const logoSize        = responsiveSize(28, 38, 48);
  const navIconSize     = responsiveSize(22, 28, 34);
  const mobileNavIconSize = responsiveSize(28, 32, 34);
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

  const getIconColor = (screen: 'home' | 'game' | 'videos' | 'analytics' | 'myjourney' | 'profile' | 'messenger') => (activeScreen === screen ? '#D32F2F' : '#000000');

  const isActive = (screen: 'home' | 'game' | 'videos' | 'analytics' | 'myjourney' | 'profile' | 'messenger') => activeScreen === screen;


  // Mobile Layout (Phone)
  if (isPhone) {
    return (
      <View style={{ backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
        {/* ROW 1: Logo + Search + Messenger */}
        <View
          style={[
            styles.headerContainer,
            {
              paddingHorizontal,
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
                { padding: isVerySmall ? 8 : 10, flex: 1, marginHorizontal: 8, flexDirection: 'row', paddingHorizontal: 12, gap: 8, alignItems: 'center' },
              ]}
              onPress={() => toggleSearch(true)}
              onPressIn={() => toggleSearch(true)}
              activeOpacity={0.7}
            >
              <Image
                source={require('../../assets/images/magnifying-glass-solid.png')}
                style={{ width: searchIconSize, height: searchIconSize, tintColor: '#888' }}
              />
              <Text style={{ color: '#888', fontSize: isVerySmall ? 12 : 14, flex: 1, fontWeight: '400' }}>
                {activeScreen === 'videos' ? 'Search Videos' : activeScreen === 'game' ? 'Search Game' : activeScreen === 'messenger' ? 'Search Messages' : 'Search ParseClass'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.searchBar,
                {
                  flex: 1,
                  marginHorizontal: 8,
                  height: isVerySmall ? 42 : 46,
                  paddingHorizontal: 16,
                },
              ]}
            >
              <Image
                source={require('../../assets/images/magnifying-glass-solid.png')}
                style={{ width: searchIconSize, height: searchIconSize, marginRight: 12, tintColor: '#888' }}
              />
              <TextInput
                autoFocus={true}
                placeholder={activeScreen === 'videos' ? 'Search Videos' : activeScreen === 'game' ? 'Search Game' : activeScreen === 'messenger' ? 'Search Messages' : 'Search ParseClass'}
                placeholderTextColor="#888"
                style={[
                  styles.searchInput,
                  { fontSize: fontSizeSearch },
                ]}
                onFocus={() => toggleSearch(true)}
                onBlur={() => toggleSearch(false)}
                returnKeyType="search"
              />
              <TouchableOpacity
                onPress={() => toggleSearch(false)}
                hitSlop={{ top: 12, bottom: 12, left: 20, right: 20 }}
              >
                <Text style={[styles.closeText, { fontSize: fontSizeSearch + 2 }]}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.navBtn} onPress={() => onNavigate?.('messenger')}>
            {Platform.OS === 'web' ? (
              <Image source={require('../../assets/images/messenger.png')} style={{ width: navIconSize, height: navIconSize, resizeMode: 'contain', tintColor: isActive('messenger') ? '#D32F2F' : undefined }} />
            ) : (
              <MessengerIcon width={navIconSize} height={navIconSize} stroke={getIconColor('messenger')} />
            )}
          </TouchableOpacity>
        </View>

        {/* ROW 2: Navigation buttons (hidden while searching) */}
        <View
          style={[
            styles.mobileNavRow,
            {
              paddingHorizontal,
              gap: isVerySmall ? 12 : 20,
              justifyContent: 'center',
              display: isSearchExpanded ? 'flex' : 'flex',
            },
          ]}
        >
          <TouchableOpacity 
            style={[styles.navBtn, { padding: 12 }, isActive('home') && styles.navBtnActive]}
            onPress={() => onNavigate?.('home')}
          >
            {Platform.OS === 'web' ? (
              <Image source={require('../../assets/images/house-solid.png')} style={{ width: mobileNavIconSize, height: mobileNavIconSize, resizeMode: 'contain', tintColor: activeScreen === 'home' ? '#D32F2F' : '#000000' }} />
            ) : (
              <House width={mobileNavIconSize} height={mobileNavIconSize} fill={getIconColor('home')} />
            )}
          </TouchableOpacity>

  <TouchableOpacity style={[styles.navBtn, { padding: 12 }, isActive('game') && styles.navBtnActive]} onPress={() => onNavigate?.('game')}>
    {Platform.OS === 'web' ? (
      <Image source={require('../../assets/images/gamepad-solid.png')} style={{ width: mobileNavIconSize, height: mobileNavIconSize, resizeMode: 'contain', tintColor: activeScreen === 'game' ? '#D32F2F' : '#000000' }} />
    ) : (
      <Gamepad width={mobileNavIconSize} height={mobileNavIconSize} fill={getIconColor('game')} />
    )}
</TouchableOpacity>

          <TouchableOpacity style={[styles.navBtn, { padding: 12 }, isActive('videos') && styles.navBtnActive]} onPress={() => onNavigate?.('videos')}>
            {Platform.OS === 'web' ? (
              <Image source={require('../../assets/images/youtube-brands-solid.png')} style={{ width: mobileNavIconSize, height: mobileNavIconSize, resizeMode: 'contain', tintColor: activeScreen === 'videos' ? '#D32F2F' : '#000000' }} />
            ) : (
              <VideosIcon width={mobileNavIconSize} height={mobileNavIconSize} fill={getIconColor('videos')}/>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Desktop/Tablet Layout
  return (
    <View
      style={[
        styles.headerContainer,
        {
          paddingHorizontal,
          height: isTablet ? 72 : 80,
        },
      ]}
    >
      {/* LEFT – Logo + Search */}
      <View
        style={[
          styles.leftSection,
          { flex: isLargeScreenLocal ? 0.3 : 0.4 },
        ]}
      >
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
            },
          ]}
        >
          <Image
            source={require('../../assets/images/magnifying-glass-solid.png')}
            style={{ width: searchIconSize, height: searchIconSize, marginRight: 12, tintColor: '#888' }}
          />
          <TextInput
            placeholder={activeScreen === 'videos' ? 'Search Videos' : activeScreen === 'game' ? 'Search Game' : 'Search ParseClass'}
            placeholderTextColor="#888"
            style={[
              styles.searchInput,
              { fontSize: fontSizeSearch },
            ]}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* CENTER */}
      <View
        style={[
          styles.centerSection,
          {
            flex: isLargeScreenLocal ? 1.2 : isTablet ? 1 : 0.8,
            gap: isTablet ? 32 : 40,
            maxWidth: isLargeScreenLocal ? 600 : undefined,
          },
        ]}
      >
        <TouchableOpacity style={[styles.navBtn, isActive('home') && styles.navBtnActive]} onPress={() => onNavigate?.('home')}>
          {Platform.OS === 'web' ? (
            <Image source={require('../../assets/images/house-solid.png')} style={{ width: navIconSize, height: navIconSize, resizeMode: 'contain', tintColor: activeScreen === 'home' ? '#D32F2F' : '#000000' }} />
          ) : (
            <House width={navIconSize} height={navIconSize} stroke={activeScreen === 'home' ? '#D32F2F' : '#000000'} />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navBtn, isActive('game') && styles.navBtnActive]} onPress={() => onNavigate?.('game')}>
          {Platform.OS === 'web' ? (
            <Image source={require('../../assets/images/gamepad-solid.png')} style={{ width: navIconSize, height: navIconSize, resizeMode: 'contain', tintColor: activeScreen === 'game' ? '#D32F2F' : '#000000' }} />
          ) : (
            <Gamepad width={navIconSize} height={navIconSize} stroke={activeScreen === 'game' ? '#D32F2F' : '#000000'} />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navBtn, isActive('videos') && styles.navBtnActive]} onPress={() => onNavigate?.('videos')}>
          {Platform.OS === 'web' ? (
            <Image source={require('../../assets/images/youtube-brands-solid.png')} style={{ width: navIconSize, height: navIconSize, resizeMode: 'contain', tintColor: activeScreen === 'videos' ? '#D32F2F' : '#000000' }} />
          ) : (
            <VideosIcon width={navIconSize} height={navIconSize} stroke={activeScreen === 'videos' ? '#D32F2F' : '#000000'} />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navBtn, isActive('messenger') && styles.navBtnActive]} onPress={() => onNavigate?.('messenger')}>
          {Platform.OS === 'web' ? (
            <Image source={require('../../assets/images/messenger.png')} style={{ width: navIconSize, height: navIconSize, resizeMode: 'contain', tintColor: isActive('messenger') ? '#D32F2F' : undefined }} />
          ) : (
            <MessengerIcon width={navIconSize} height={navIconSize} stroke={getIconColor('messenger')} />
          )}
        </TouchableOpacity>
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

  navBtnActive: {
    backgroundColor: 'rgba(211,47,47,0.08)'
  },

  rightSection: {
    alignItems: 'flex-end',
  },

  logoutBtn: {
    padding: 8,
    borderRadius: 12,
  },

  mobileNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
});

export default Header;