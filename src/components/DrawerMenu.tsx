import React, { useState } from 'react';

import {
  Image,
  LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';

interface DrawerMenuProps {
  isFixed: boolean;
  onClose?: () => void;
  onNavigate?: (screen: 'home' | 'game' | 'videos'  | 'myjourney' | 'profile' | 'messenger' | 'assignments' | 'coursedetail' | 'community') => void;
  activeScreen?: 'home' | 'game' | 'videos'  | 'myjourney' | 'profile' | 'messenger' | 'assignments' | 'coursedetail' | 'community';
  userName?: string;
  userEmail?: string;
  onAvatarPress?: () => void;
}

const MenuItem = ({ iconSource, label, onPress, active }: { iconSource: any, label: string, onPress?: () => void, active?: boolean }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const menuItemVerticalMargin = isMobile ? 12 : 18;
  const menuLabelFontSize = isMobile ? 15 : 17;
  
  return (
    <TouchableOpacity style={[styles.menuItem, { marginVertical: menuItemVerticalMargin }]} onPress={onPress}>
      <Image source={iconSource} style={[styles.menuIcon, active && { tintColor: '#D32F2F' }]} />
      <Text style={[styles.menuLabel, { fontSize: menuLabelFontSize }, active && { color: '#D32F2F', fontWeight: '700' }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const DrawerMenu = ({ isFixed, onClose, onNavigate, activeScreen, userName, userEmail, onAvatarPress }: DrawerMenuProps) => {
  const { width, height } = useWindowDimensions();
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  
  // Detect device type
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isSmallMobile = width < 380;
  const isOnMobileOrTablet = isMobile || isTablet;
  
  // Calculate if content overflows
  const hasOverflow = contentHeight > scrollViewHeight && scrollViewHeight > 0;
  const shouldShowScrollBar = isOnMobileOrTablet && hasOverflow;
  
  // Responsive sizing
  const drawerWidth = isMobile ? (isSmallMobile ? '85%' : 280) : isTablet ? 300 : 260;
  const profileSectionMargin = isMobile ? 20 : 40;
  const menuItemVerticalMargin = isMobile ? 12 : 18;
  const profileFontSize = isMobile ? 16 : 18;
  const menuLabelFontSize = isMobile ? 15 : 17;
  const avatarSize = isMobile ? 45 : 50;

  const handleContentSizeChange = (contentW: number, contentH: number) => {
    setContentHeight(contentH);
  };

  const handleScrollViewLayout = (e: LayoutChangeEvent) => {
    setScrollViewHeight(e.nativeEvent.layout.height);
  };

  return (
    <View style={[
      styles.drawerContainer, 
      { width: drawerWidth },
      !isFixed && styles.mobileDrawer
    ]}>
      
      {/* Close Button for Mobile Overlay */}
      {!isFixed && (
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕ Close</Text>
        </TouchableOpacity>
      )}

      {/* User Profile Section */}
      <View style={[styles.profileSection, { marginBottom: profileSectionMargin }]}>
        <TouchableOpacity onPress={onAvatarPress} style={{ position: 'relative' }}>
          <Image 
            source={require('../../assets/images/default_profile.png')} 
            style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]} 
          />
         
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.userName, { fontSize: profileFontSize }]}>{userName ?? 'Jade M. Lisondra'}</Text>
        
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={shouldShowScrollBar}
        style={{ flex: 1 }}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleScrollViewLayout}
        scrollIndicatorInsets={isMobile ? { right: 4 } : { right: 0 }}
      >
        <MenuItem 
          iconSource={require('../../assets/images/person.png')} 
          label="Profile" 
          onPress={() => { onNavigate?.('profile'); if (!isFixed) onClose?.(); }}
          active={activeScreen === 'profile'}
        />
        <MenuItem 
          iconSource={require('../../assets/images/clipboard.png')} 
          label="Assignments" 
          onPress={() => { onNavigate?.('assignments'); if (!isFixed) onClose?.(); }}
          active={activeScreen === 'assignments'}
        />
        <MenuItem 
          iconSource={require('../../assets/images/calendar.png')} 
          label="My Journey" 
          onPress={() => { onNavigate?.('myjourney'); if (!isFixed) onClose?.(); }}
          active={activeScreen === 'myjourney'}
        />
        <MenuItem 
          iconSource={require('../../assets/images/users-solid.png')} 
          label="Community" 
          onPress={() => { onNavigate?.('community'); if (!isFixed) onClose?.(); }}
          active={activeScreen === 'community'}
        />
      
        <MenuItem 
          iconSource={require('../../assets/images/gear-solid.png')} 
          label="Settings" 
        />
      </ScrollView>

      {/* Logout Button at Bottom */}
      <TouchableOpacity style={styles.logoutMenuItem}>
        <Image 
          source={require('../../assets/images/log-out-outline.png')} 
          style={styles.logoutIcon}
        />
        <Text style={styles.logoutLabel}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  drawerContainer: { 
    height: '100%',
    borderRightWidth: 1, 
    borderRightColor: '#EEE', 
    padding: 25, 
    backgroundColor: '#FFF',
    ...Platform.select({
      web: {
        paddingHorizontal: 20,
      },
      ios: {
        paddingTop: 50,
      },
    }),
  },
  mobileDrawer: { 
    elevation: 10, 
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10
  },
  closeBtn: { 
    marginBottom: 20, 
    alignSelf: 'flex-end',
    padding: 5 
  },
  closeText: { 
    color: '#D32F2F', 
    fontWeight: 'bold',
    fontSize: 14
  },
  profileSection: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  avatar: { 
    borderRadius: 25, 
    marginRight: 15,
    backgroundColor: '#f0f0f0' 
  },
  userName: { 
    fontWeight: '700',
    color: '#333' 
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  menuIcon: { 
    width: 22, 
    height: 22, 
    marginRight: 20, 
    resizeMode: 'contain' 
  },
  menuLabel: { 
    color: '#444',
    fontWeight: '500'
  },
  emailRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 4 
  },
  emailIcon: { 
    marginRight: 8 
  },
  userEmail: { 
    color: '#666',
    fontSize: 12
  },
  editBadge: { 
    position: 'absolute', 
    right: -4, 
    bottom: -4, 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 4, 
    borderWidth: 1, 
    borderColor: '#eee' 
  },
  editBadgeText: { 
    fontSize: 12, 
    color: '#D32F2F' 
  },
  logoutMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  logoutIcon: {
    width: 28,
    height: 28,
    marginRight: 20,
    resizeMode: 'contain',
    tintColor: '#D32F2F',
  },
  logoutLabel: {
    fontSize: 16,
    color: '#D32F2F',
    fontWeight: '600',
  },
});
export default DrawerMenu;