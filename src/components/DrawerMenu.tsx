import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface DrawerMenuProps {
  isFixed: boolean;
  onClose?: () => void;
  onNavigate?: (
    screen:
      | 'home'
      | 'game'
      | 'videos'
      | 'myjourney'
      | 'profile'
      | 'messenger'
      | 'assignments'
      | 'coursedetail'
      | 'community'
  ) => void;
  activeScreen?: 'home' | 'game' | 'videos' | 'myjourney' | 'profile' | 'messenger' | 'assignments' | 'coursedetail' | 'community';
  userName?: string;
  userEmail?: string;
  onAvatarPress?: () => void;

  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
}

const MenuItem = ({
  iconSource,
  label,
  onPress,
  active,
}: {
  iconSource: any;
  label: string;
  onPress?: () => void;
  active?: boolean;
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const menuItemVerticalMargin = isMobile ? 12 : 18;
  const menuLabelFontSize = isMobile ? 15 : 17;

  return (
    <Pressable
      onPress={onPress}
      style={(state) => {
        const base: StyleProp<ViewStyle> = [
          styles.menuItem,
          { marginVertical: menuItemVerticalMargin },
          active && { backgroundColor: 'rgba(211,47,47,0.08)', borderRadius: 14 },
        ];
        if (Platform.OS === 'web' && (state as any).hovered && !active) {
          base.push({ backgroundColor: 'rgba(130, 129, 129, 0.08)', borderRadius: 14 });
        }
        return base;
      }}
    >
      <Image source={iconSource} style={[styles.menuIcon, active && { tintColor: '#D32F2F' }]} />
      <Text
        style={[
          styles.menuLabel,
          { fontSize: menuLabelFontSize },
          active && { color: '#D32F2F', fontWeight: '700' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const DrawerMenu = ({
  isFixed,
  onClose,
  onNavigate,
  activeScreen,
  userName,
  userEmail,
  onAvatarPress,
  setIsLoggedIn,           
}: DrawerMenuProps) => {

  const navigation = useNavigation<any>();

  const { width } = useWindowDimensions();
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isSmallMobile = width < 380;
  const isLargeScreen = width >= 1024;
  const isOnMobileOrTablet = isMobile || isTablet;

  const hasOverflow = contentHeight > scrollViewHeight && scrollViewHeight > 0;
  const shouldShowScrollBar = isOnMobileOrTablet && hasOverflow;

  const drawerWidth = isMobile ? (isSmallMobile ? '85%' : 280) : isTablet ? 300 : 260;
  const profileSectionMargin = isMobile ? 20 : 40;
  const profileFontSize = isMobile ? 16 : 18;
  const avatarSize = isMobile ? 45 : 50;

  const handleContentSizeChange = (_contentW: number, contentH: number) => {
    setContentHeight(contentH);
  };

  const handleScrollViewLayout = (e: LayoutChangeEvent) => {
    setScrollViewHeight(e.nativeEvent.layout.height);
  };

  const modalButtonHoverStyle = { backgroundColor: 'rgba(130, 129, 129, 0.08)', borderRadius: 8 };

  const pressableWebHover = (state: any) => {
    if (Platform.OS === 'web' && state.hovered) return modalButtonHoverStyle;
    return {};
  };

  return (
    <View style={[styles.drawerContainer, { width: drawerWidth }, !isFixed && styles.mobileDrawer]}>

      {!isFixed && (
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕ Close</Text>
        </Pressable>
      )}

      <View style={[styles.profileSection, { marginBottom: profileSectionMargin }]}>
        <Pressable onPress={onAvatarPress} style={{ position: 'relative' }}>
          <Image
            source={require('../../assets/images/default_profile.png')}
            style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
          />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.userName, { fontSize: profileFontSize }]}>
            {userName ?? 'Jade M. Lisondra'}
          </Text>
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
          onPress={() => setSettingsModalVisible(true)}
        />
      </ScrollView>

      {/* Logout Button */}
      <Pressable
        style={[styles.logoutMenuItem]}
        onPress={() => setLogoutModalVisible(true)}
      >
        <MaterialCommunityIcons
          name="logout"
          size={28}
          color="#D32F2F"
          style={{ marginRight: 20 }}
        />
        <Text style={styles.logoutLabel}>Logout</Text>
      </Pressable>

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={isSettingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { width: width >= 1024 ? width * 0.3 : '80%' },
            ]}
          >
            <Text style={styles.modalTitle}>Settings</Text>

            <Pressable
              style={(state) => [styles.modalButton, pressableWebHover(state), { width:  isLargeScreen ? '60%' : '90%' }]}
              onPress={() => alert('Change Email clicked')}
            >
              <MaterialCommunityIcons name="email" size={24} color="#D32F2F" style={{ marginRight: 12 }} />
              <Text style={styles.modalButtonText}>Change Email</Text>
            </Pressable>

            <Pressable
              style={(state) => [styles.modalButton, pressableWebHover(state),  { width:  isLargeScreen ? '60%' : '90%' }]}
              onPress={() => alert('Change Password clicked')}
            >
              <MaterialCommunityIcons name="lock" size={24} color="#D32F2F" style={{ marginRight: 12 }} />
              <Text style={styles.modalButtonText}>Change Password</Text>
            </Pressable>

            <Pressable
              style={(state) => [styles.modalCloseBtn, pressableWebHover(state)]}
              onPress={() => setSettingsModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={isLogoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { width: width >= 1024 ? width * 0.3 : '80%' },
            ]}
          >
            
            <Text style={styles.modalTitle}>
              Are you sure you want to logout?
            </Text>

            <View style={{ flexDirection: 'row', gap: 40 }}>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </Pressable>

             <Pressable
  style={styles.modalButton}
  onPress={() => {
    setLogoutModalVisible(false);
    if (!isFixed) onClose?.();

    // Optional: clear any saved login data
    // AsyncStorage.removeItem('@user_token');   // example
    // AsyncStorage.removeItem('@user_data');

    // This is what actually shows SignIn screen
    // (because App.tsx checks if (!isLoggedIn) return <SignIn ... />
    setIsLoggedIn(false);
  }}
>
  <Text style={styles.modalButtonText}>Logout</Text>
</Pressable>
            </View>

          </View>
        </View>
      </Modal>

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
    ...Platform.select({ web: { paddingHorizontal: 20 }, ios: { paddingTop: 50 } }),
  },
  mobileDrawer: {
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  closeBtn: { marginBottom: 20, alignSelf: 'flex-end', padding: 5 },
  closeText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 14 },
  profileSection: { flexDirection: 'row', alignItems: 'center' },
  avatar: { borderRadius: 25, marginRight: 15, backgroundColor: '#f0f0f0' },
  userName: { fontWeight: '700', color: '#333' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10 },
  menuIcon: { width: 22, height: 22, marginRight: 20, resizeMode: 'contain' },
  menuLabel: { color: '#444', fontWeight: '500' },
  logoutMenuItem: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#EEE', padding: 8, borderRadius: 12 },
  logoutLabel: { fontSize: 16, color: '#D32F2F', fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: {backgroundColor: '#FFF', borderRadius: 12, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
  modalButton: { flexDirection: 'row', width: '90%', marginBottom: 15, alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: 'rgba(211,47,47,0.08)', borderRadius: 8 },
  modalButtonText: { fontSize: 16, fontWeight: '600', color: '#D32F2F' },
  modalCloseBtn: { padding: 10 },
  modalCloseText: { fontSize: 16, color: '#888' },
});

export default DrawerMenu;