import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
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

export type DrawerScreenType =
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

interface DrawerMenuProps {
  isFixed: boolean;
  onClose?: () => void;
  onNavigate?: (screen: DrawerScreenType | string) => void;
  activeScreen?: DrawerScreenType | string;
  userName?: string;
  userEmail?: string;
  userAvatar?: any;
  onAvatarPress?: () => void;
  setIsLoggedIn: (val: boolean) => void;
}

const DEFAULT_AVATAR = require('../../assets/images/avatar.jpg');
const ACTIVE_RED = '#D32F2F';
const ACTIVE_BG = '#FCEAEA';

const normalizeImageSource = (img: any) => {
  if (!img) return DEFAULT_AVATAR;
  if (typeof img === 'number') return img;
  if (img?.uri) return { uri: img.uri };
  return DEFAULT_AVATAR;
};

const MenuItem = ({
  iconName,
  label,
  onPress,
  active,
}: {
  iconName: string;
  label: string;
  onPress?: () => void;
  active?: boolean;
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const iconSize = isMobile ? 24 : 26;

  return (
    <Pressable
      onPress={onPress}
      style={(state) => {
        const base: StyleProp<ViewStyle> = [styles.menuItem];

        if (active) {
          base.push(styles.menuItemActive);
        }

        if (Platform.OS === 'web' && (state as any).hovered && !active) {
          base.push(styles.menuItemHover);
        }

        return base;
      }}
    >
<<<<<<< HEAD
      <MaterialCommunityIcons
        name={iconName}
        size={22}
        color={active ? '#D32F2F' : '#444'}
        style={styles.menuIcon}
=======
      <Image
        source={iconSource}
        style={[
          styles.menuIcon,
          {
            width: iconSize,
            height: iconSize,
            tintColor: active ? ACTIVE_RED : '#000',
          },
        ]}
>>>>>>> 98d439a675c9e7f45c4eb56c8896935b039c18b4
      />

      <Text
        style={[
          styles.menuLabel,
          active && styles.menuLabelActive,
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
  userName = 'Ramcee Jade L. Munoz',
  userEmail = 'student@email.com',
  userAvatar,
  onAvatarPress,
  setIsLoggedIn,
}: DrawerMenuProps) => {
  const { width } = useWindowDimensions();
  const avatarSource = useMemo(() => normalizeImageSource(userAvatar), [userAvatar]);

  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isChangeEmailModalVisible, setChangeEmailModalVisible] = useState(false);
  const [isChangePasswordModalVisible, setChangePasswordModalVisible] = useState(false);

  const [activeMenu, setActiveMenu] = useState<string | null>(
    activeScreen === 'profile'
      ? 'profile'
      : activeScreen === 'community'
      ? 'community'
      : activeScreen === 'analytics'
      ? 'analytics'
      : null
  );

  const [email, setEmail] = useState(userEmail);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isMobile = width < 768;

  useEffect(() => {
    setEmail(userEmail);
  }, [userEmail]);

  useEffect(() => {
    if (activeScreen === 'profile') {
      setActiveMenu('profile');
    } else if (activeScreen === 'community') {
      setActiveMenu('community');
    } else if (activeScreen === 'analytics') {
      setActiveMenu('analytics');
    } else {
      setActiveMenu(null);
    }
  }, [activeScreen]);

  const resetActiveMenuFromScreen = () => {
    if (activeScreen === 'profile') {
      setActiveMenu('profile');
    } else if (activeScreen === 'community') {
      setActiveMenu('community');
    } else if (activeScreen === 'analytics') {
      setActiveMenu('analytics');
    } else {
      setActiveMenu(null);
    }
  };

  const modalButtonHover = {
    backgroundColor: 'rgba(130,129,129,0.08)',
    borderRadius: 8,
  };

  const pressableWebHover = (state: any) =>
    Platform.OS === 'web' && state.hovered ? modalButtonHover : {};

  return (
    <View style={styles.drawerContainer}>
      <View style={styles.topSection}>
        <Pressable style={styles.profileSection} onPress={onAvatarPress}>
          <Image
            source={avatarSource}
            style={[
              styles.avatar,
              {
                width: isMobile ? 54 : 56,
                height: isMobile ? 54 : 56,
                borderRadius: isMobile ? 27 : 28,
              },
            ]}
<<<<<<< HEAD
          >
            {userName}
          </Text>
          <Text style={styles.userEmail} numberOfLines={1}>
            {userEmail}
          </Text>
        </View>
=======
            resizeMode="cover"
          />
>>>>>>> 98d439a675c9e7f45c4eb56c8896935b039c18b4

          <View style={styles.profileTextContainer}>
            <Text style={styles.userName} numberOfLines={2}>
              {userName}
            </Text>
          </View>
        </Pressable>

<<<<<<< HEAD
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={shouldShowScrollBar}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleScrollViewLayout}
      >
        <MenuItem
          iconName="account-circle-outline"
          label="Profile"
          onPress={() => {
            setActiveMenu('profile');
            onNavigate?.('profile');
            if (!isFixed) onClose?.();
          }}
          active={activeMenu === 'profile'}
        />

        <MenuItem
          iconName="account-group-outline"
          label="Community"
          onPress={() => {
            setActiveMenu('community');
            onNavigate?.('community');
            if (!isFixed) onClose?.();
          }}
          active={activeMenu === 'community'}
        />

        <MenuItem
          iconName="chart-box-outline"
          label="Academic Analytics"
          onPress={() => {
            setActiveMenu('analytics');
            onNavigate?.('analytics');
            if (!isFixed) onClose?.();
          }}
          active={activeMenu === 'analytics'}
        />

        <MenuItem
          iconName="cog-outline"
          label="Settings"
          onPress={() => {
            setActiveMenu('settings');
            setSettingsModalVisible(true);
          }}
          active={activeMenu === 'settings'}
        />
      </ScrollView>
=======
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          <MenuItem
            iconSource={require('../../assets/images/person.png')}
            label="Profile"
            onPress={() => {
              setActiveMenu('profile');
              onNavigate?.('profile');
              if (!isFixed) onClose?.();
            }}
            active={activeMenu === 'profile'}
          />

          <MenuItem
            iconSource={require('../../assets/images/users-solid.png')}
            label="Community"
            onPress={() => {
              setActiveMenu('community');
              onNavigate?.('community');
              if (!isFixed) onClose?.();
            }}
            active={activeMenu === 'community'}
          />

          <MenuItem
            iconSource={require('../../assets/images/gear-solid.png')}
            label="Settings"
            onPress={() => {
              setActiveMenu('settings');
              setSettingsModalVisible(true);
            }}
            active={activeMenu === 'settings'}
          />
        </ScrollView>
      </View>
>>>>>>> 98d439a675c9e7f45c4eb56c8896935b039c18b4

      <View style={styles.logoutSection}>
        <Pressable
          style={styles.logoutMenuItem}
          onPress={() => setLogoutModalVisible(true)}
        >
          <MaterialCommunityIcons
            name="logout"
            size={30}
            color={ACTIVE_RED}
            style={styles.logoutIcon}
          />
          <Text style={styles.logoutLabel}>Logout</Text>
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={isSettingsModalVisible}
        onRequestClose={() => {
          setSettingsModalVisible(false);
          resetActiveMenuFromScreen();
        }}
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
                    color={ACTIVE_RED}
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
                    color={ACTIVE_RED}
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
              onPress={() => {
                setSettingsModalVisible(false);
                resetActiveMenuFromScreen();
              }}
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
                  setActiveMenu('settings');
                }}
              >
                <Text style={styles.formCancelText}>Back</Text>
              </Pressable>

              <Pressable
                style={styles.formSaveBtn}
                onPress={() => {
                  alert('Email updated');
                  setChangeEmailModalVisible(false);
                  resetActiveMenuFromScreen();
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
                  setActiveMenu('settings');
                }}
              >
                <Text style={styles.formCancelText}>Back</Text>
              </Pressable>

              <Pressable
                style={styles.formSaveBtn}
                onPress={() => {
                  alert('Password updated');
                  setChangePasswordModalVisible(false);
                  resetActiveMenuFromScreen();
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
                  if (!isFixed) onClose?.();
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
    flex: 1,
    backgroundColor: '#FFF',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },

  topSection: {
    flex: 1,
    minHeight: 0,
  },

  profileSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 34,
    paddingHorizontal: 14,
  },

  profileTextContainer: {
    flex: 1,
    paddingTop: 2,
  },

  avatar: {
    marginRight: 16,
    overflow: 'hidden',
    aspectRatio: 1,
    backgroundColor: '#f0f0f0',
  },

  userName: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '700',
    color: '#111',
  },

  scrollView: {
    flex: 1,
  },

  scrollContentContainer: {
    paddingBottom: 8,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginBottom: 16,
    marginTop: 16,
  },

  menuItemActive: {
    backgroundColor: ACTIVE_BG,
  },

  menuItemHover: {
    opacity: 0.8,
  },

  menuIcon: {
<<<<<<< HEAD
    marginRight: 20,
=======
    marginRight: 16,
    resizeMode: 'contain',
>>>>>>> 98d439a675c9e7f45c4eb56c8896935b039c18b4
  },

  menuLabel: {
    fontSize: 16,
    color: '#444',
    fontWeight: '600',
  },

  menuLabelActive: {
    color: ACTIVE_RED,
    fontWeight: '700',
  },

  logoutSection: {
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 16,
    marginTop: 12,
    paddingHorizontal: 14,
  },

  logoutMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },

  logoutIcon: {
    marginRight: 16,
  },

  logoutLabel: {
    fontSize: 16,
    color: ACTIVE_RED,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
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
    backgroundColor: ACTIVE_RED,
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
    backgroundColor: ACTIVE_RED,
  },

  logoutConfirmText: {
    color: '#FFF',
    fontWeight: '700',
  },
});

export default DrawerMenu;