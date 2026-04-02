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
  TextInput,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface DrawerMenuProps {
  isFixed: boolean;
  onClose?: () => void;
  onNavigate?: (screen: any) => void;
  activeScreen?:
    | 'home'
    | 'game'
    | 'videos'
    | 'grades'
    | 'myjourney'
    | 'profile'
    | 'messenger'
    | 'assignments'
    | 'coursedetail'
    | 'community'
    | 'notification';
  userName?: string;
  userEmail?: string;
  onAvatarPress?: () => void;
  setIsLoggedIn: (val: boolean) => void;
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
          active && {
            backgroundColor: 'rgba(211,47,47,0.08)',
            borderRadius: 14,
          },
        ];

        if (Platform.OS === 'web' && (state as any).hovered && !active) {
          base.push({
            backgroundColor: 'rgba(130, 129, 129, 0.08)',
            borderRadius: 14,
          });
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
  onAvatarPress,
  setIsLoggedIn,
}: DrawerMenuProps) => {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();

  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);

  const [isChangeEmailModalVisible, setChangeEmailModalVisible] = useState(false);
  const [isChangePasswordModalVisible, setChangePasswordModalVisible] = useState(false);

  const [email, setEmail] = useState(userEmail ?? 'student@email.com');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isOnMobileOrTablet = isMobile || isTablet;

  const hasOverflow = contentHeight > scrollViewHeight && scrollViewHeight > 0;
  const shouldShowScrollBar = isOnMobileOrTablet && hasOverflow;
  const drawerWidth = isMobile ? (width < 380 ? '85%' : 280) : isTablet ? 300 : 260;

  const handleContentSizeChange = (_contentW: number, contentH: number) =>
    setContentHeight(contentH);

  const handleScrollViewLayout = (e: LayoutChangeEvent) =>
    setScrollViewHeight(e.nativeEvent.layout.height);

  const modalButtonHover = {
    backgroundColor: 'rgba(130,129,129,0.08)',
    borderRadius: 8,
  };

  const pressableWebHover = (state: any) =>
    Platform.OS === 'web' && state.hovered ? modalButtonHover : {};

  return (
    <View
      style={[
        styles.drawerContainer,
        { width: drawerWidth },
        !isFixed && styles.mobileDrawer,
      ]}
    >
      {!isFixed && (
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕ Close</Text>
        </Pressable>
      )}

      <View style={[styles.profileSection, { marginBottom: isMobile ? 20 : 40 }]}>
        <Pressable onPress={onAvatarPress}>
          <Image
            source={require('../../assets/images/avatar.jpg')}
            style={[
              styles.avatar,
              {
                width: isMobile ? 45 : 50,
                height: isMobile ? 45 : 50,
                borderRadius: 25,
              },
            ]}
          />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.userName,
              { fontSize: isMobile ? 16 : 18, marginLeft: 10 },
            ]}
          >
            {userName ?? 'Ramcee Jade L. Munoz'}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={shouldShowScrollBar}
        style={{ flex: 1 }}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleScrollViewLayout}
      >
        <MenuItem
          iconSource={require('../../assets/images/person.png')}
          label="Profile"
          onPress={() => {
            onNavigate?.('profile');
            if (!isFixed) onClose?.();
          }}
          active={activeScreen === 'profile'}
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

      <Pressable style={styles.logoutMenuItem} onPress={() => setLogoutModalVisible(true)}>
        <MaterialCommunityIcons
          name="logout"
          size={28}
          color="#D32F2F"
          style={{ marginRight: 20 }}
        />
        <Text style={styles.logoutLabel}>Logout</Text>
      </Pressable>

      <Modal
        animationType="fade"
        transparent
        visible={isSettingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModalContainer}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Settings</Text>
              <Text style={styles.settingsSubtitle}>
                Manage your account preferences
              </Text>
            </View>

            <Pressable
              style={(state) => [
                styles.settingsOptionButton,
                pressableWebHover(state),
              ]}
              onPress={() => {
                setSettingsModalVisible(false);
                setChangeEmailModalVisible(true);
              }}
            >
              <View style={styles.settingsOptionContent}>
                <View style={styles.settingsOptionIconWrap}>
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={22}
                    color="#D32F2F"
                  />
                </View>

                <View style={styles.settingsOptionTextWrap}>
                  <Text style={styles.settingsOptionTitle}>Change Email</Text>
                  <Text style={styles.settingsOptionSubtitle}>
                    Update your registered email address
                  </Text>
                </View>

                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color="#999"
                />
              </View>
            </Pressable>

            <Pressable
              style={(state) => [
                styles.settingsOptionButton,
                pressableWebHover(state),
              ]}
              onPress={() => {
                setSettingsModalVisible(false);
                setChangePasswordModalVisible(true);
              }}
            >
              <View style={styles.settingsOptionContent}>
                <View style={styles.settingsOptionIconWrap}>
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={22}
                    color="#D32F2F"
                  />
                </View>

                <View style={styles.settingsOptionTextWrap}>
                  <Text style={styles.settingsOptionTitle}>Change Password</Text>
                  <Text style={styles.settingsOptionSubtitle}>
                    Create a new secure password
                  </Text>
                </View>

                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color="#999"
                />
              </View>
            </Pressable>

            <Pressable
              style={styles.settingsCloseBtn}
              onPress={() => setSettingsModalVisible(false)}
            >
              <Text style={styles.settingsCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={isChangeEmailModalVisible}
        onRequestClose={() => setChangeEmailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formModalContainer}>
            <Text style={styles.formModalTitle}>Change Email</Text>
            <Text style={styles.formModalSubtitle}>
              Enter your new email address below.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter new email"
                placeholderTextColor="#999"
                style={styles.textInput}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formButtonsRow}>
              <Pressable
                style={styles.formCancelBtn}
                onPress={() => {
                  setChangeEmailModalVisible(false);
                  setSettingsModalVisible(true);
                }}
              >
                <Text style={styles.formCancelText}>Back</Text>
              </Pressable>

              <Pressable
                style={styles.formSaveBtn}
                onPress={() => {
                  alert('Email updated');
                  setChangeEmailModalVisible(false);
                }}
              >
                <Text style={styles.formSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={isChangePasswordModalVisible}
        onRequestClose={() => setChangePasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formModalContainer}>
            <Text style={styles.formModalTitle}>Change Password</Text>
            <Text style={styles.formModalSubtitle}>
              Update your password to keep your account secure.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor="#999"
                style={styles.textInput}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor="#999"
                style={styles.textInput}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor="#999"
                style={styles.textInput}
                secureTextEntry
              />
            </View>

            <View style={styles.formButtonsRow}>
              <Pressable
                style={styles.formCancelBtn}
                onPress={() => {
                  setChangePasswordModalVisible(false);
                  setSettingsModalVisible(true);
                }}
              >
                <Text style={styles.formCancelText}>Back</Text>
              </Pressable>

              <Pressable
                style={styles.formSaveBtn}
                onPress={() => {
                  alert('Password updated');
                  setChangePasswordModalVisible(false);
                }}
              >
                <Text style={styles.formSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={isLogoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.logoutModalContainer}>
            <Text style={styles.logoutModalTitle}>
              Are you sure you want to logout?
            </Text>

            <Text style={styles.logoutModalSubtitle}>
              You will need to sign in again to continue using your account.
            </Text>

            <View style={styles.logoutButtonsRow}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.logoutConfirmBtn}
                onPress={() => {
                  setLogoutModalVisible(false);
                  setIsLoggedIn(false);
                }}
              >
                <Text style={styles.logoutConfirmText}>Logout</Text>
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
  },

  mobileDrawer: {
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },

  closeBtn: {
    marginBottom: 20,
    alignSelf: 'flex-end',
    padding: 5,
  },

  closeText: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },

  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    backgroundColor: '#f0f0f0',
  },

  userName: {
    fontWeight: '700',
    color: '#333',
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

  settingsModalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 20,
    width: '88%',
    maxWidth: 380,
  },

  settingsHeader: {
    marginBottom: 18,
  },

  settingsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
  },

  settingsSubtitle: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginTop: 6,
  },

  settingsOptionButton: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#EEE',
  },

  settingsOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  settingsOptionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(211,47,47,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  settingsOptionTextWrap: {
    flex: 1,
  },

  settingsOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },

  settingsOptionSubtitle: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },

  settingsCloseBtn: {
    alignSelf: 'center',
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },

  settingsCloseText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 15,
  },

  formModalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 20,
    width: '88%',
    maxWidth: 380,
  },

  formModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
  },

  formModalSubtitle: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },

  inputGroup: {
    marginBottom: 14,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },

  textInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#222',
    backgroundColor: '#FFF',
  },

  formButtonsRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 12,
    width: '100%',
  },

  formCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F3F3',
  },

  formCancelText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 15,
  },

  formSaveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
  },

  formSaveText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },

  logoutModalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    width: '85%',
    maxWidth: 360,
    alignItems: 'center',
  },

  logoutModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
  },

  logoutModalSubtitle: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginTop: 8,
  },

  logoutButtonsRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
    width: '100%',
  },

  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F3F3',
  },

  modalCancelText: {
    color: '#888',
    fontWeight: '600',
  },

  logoutConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
  },

  logoutConfirmText: {
    color: '#FFF',
    fontWeight: '700',
  },
});

export default DrawerMenu;