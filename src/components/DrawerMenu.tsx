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
  ViewStyle
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
          base.push({ backgroundColor: 'rgba(130,129,129,0.08)', borderRadius: 14 });
        }

        return base;
      }}
    >
      <Image
        source={iconSource}
        style={[styles.menuIcon, active && { tintColor: '#D32F2F' }]}
      />
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

  const hasOverflow = contentHeight > scrollViewHeight && scrollViewHeight > 0;
  const shouldShowScrollBar = (isMobile || isTablet) && hasOverflow;

  const drawerWidth = isMobile ? (isSmallMobile ? '85%' : 280) : isTablet ? 300 : 260;

  const handleContentSizeChange = (_contentW: number, contentH: number) => {
    setContentHeight(contentH);
  };

  const handleScrollViewLayout = (e: LayoutChangeEvent) => {
    setScrollViewHeight(e.nativeEvent.layout.height);
  };

  const modalButtonHover = { backgroundColor: 'rgba(130,129,129,0.08)', borderRadius: 8 };
  const pressableWebHover = (state: any) =>
    Platform.OS === 'web' && state.hovered ? modalButtonHover : {};

  return (
    <View style={[styles.drawerContainer, { width: drawerWidth }, !isFixed && styles.mobileDrawer]}>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <Image
          source={require('../../assets/images/default_profile.png')}
          style={styles.avatar}
        />

        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>
            {userName ?? 'Jade M. Lisondra'}
          </Text>
          <Text style={styles.userEmail}>
            {userEmail ?? 'student@email.com'}
          </Text>
        </View>
      </View>

      {/* Menu Items */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={shouldShowScrollBar}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleScrollViewLayout}
      >

        {/* PROFILE */}
        <MenuItem
          iconSource={require('../../assets/images/person.png')}
          label="Profile"
          onPress={() => {
            navigation.navigate('Profile');

            onNavigate?.('profile');

            if (!isFixed) {
              onClose?.(); // hides drawer
            }
          }}
          active={activeScreen === 'profile'}
        />

        <MenuItem
          iconSource={require('../../assets/images/clipboard.png')}
          label="Assignments"
          onPress={() => {
            onNavigate?.('assignments');
            if (!isFixed) onClose?.();
          }}
          active={activeScreen === 'assignments'}
        />

        <MenuItem
          iconSource={require('../../assets/images/calendar.png')}
          label="My Journey"
          onPress={() => {
            onNavigate?.('myjourney');
            if (!isFixed) onClose?.();
          }}
          active={activeScreen === 'myjourney'}
        />

        <MenuItem
          iconSource={require('../../assets/images/users-solid.png')}
          label="Community"
          onPress={() => {
            onNavigate?.('community');
            if (!isFixed) onClose?.();
          }}
          active={activeScreen === 'community'}
        />

        <MenuItem
          iconSource={require('../../assets/images/gear-solid.png')}
          label="Settings"
          onPress={() => setSettingsModalVisible(true)}
        />

      </ScrollView>

      {/* Logout */}
      <Pressable
        style={styles.logoutMenuItem}
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
          <View style={[styles.modalContainer, { width: width >= 1024 ? width * 0.3 : '80%' }]}>
            <Text style={styles.modalTitle}>Settings</Text>

            <Pressable
              style={(state) => [styles.modalButton, pressableWebHover(state)]}
              onPress={() => alert('Change Email clicked')}
            >
              <MaterialCommunityIcons name="email" size={24} color="#D32F2F" />
              <Text style={styles.modalButtonText}>Change Email</Text>
            </Pressable>

            <Pressable
              style={(state) => [styles.modalButton, pressableWebHover(state)]}
              onPress={() => alert('Change Password clicked')}
            >
              <MaterialCommunityIcons name="lock" size={24} color="#D32F2F" />
              <Text style={styles.modalButtonText}>Change Password</Text>
            </Pressable>

            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => setSettingsModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>

          </View>
        </View>
      </Modal>

      {/* Logout Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={isLogoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>

            <Text style={styles.modalTitle}>
              Are you sure you want to logout?
            </Text>

            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => setLogoutModalVisible(false)}
            >
              <Text>Cancel</Text>
            </Pressable>

            <Pressable
              style={styles.modalButton}
              onPress={() => {
                setLogoutModalVisible(false);
                if (!isFixed) onClose?.();
                setIsLoggedIn(false);
              }}
            >
              <Text style={styles.modalButtonText}>Logout</Text>
            </Pressable>

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
  },

  mobileDrawer: {
    elevation: 10,
  },

  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },

  userName: {
    fontWeight: '700',
    fontSize: 18,
  },

  userEmail: {
    fontSize: 14,
    color: '#555',
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },

  menuIcon: {
    width: 22,
    height: 22,
    marginRight: 20,
    resizeMode: 'contain',
  },

  menuLabel: {
    color: '#444',
    fontWeight: '500',
  },

  logoutMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 15,
  },

  logoutLabel: {
    fontSize: 16,
    color: '#D32F2F',
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },

  modalButton: {
    padding: 12,
    backgroundColor: 'rgba(211,47,47,0.08)',
    borderRadius: 8,
    marginTop: 10,
  },

  modalButtonText: {
    color: '#D32F2F',
    fontWeight: '600',
  },

  modalCloseBtn: {
    padding: 10,
    marginTop: 10,
  },

  modalCloseText: {
    color: '#888',
  },
});

export default DrawerMenu;