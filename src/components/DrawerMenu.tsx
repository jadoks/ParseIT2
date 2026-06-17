import * as DocumentPicker from 'expo-document-picker';
// UPDATED: Import legacy API to fix deprecation error in newer Expo versions
import * as FileSystem from 'expo-file-system/legacy';
import { EmailAuthProvider, reauthenticateWithCredential, signOut } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
  Alert,
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
import { auth } from '../../firebaseConfig';

const apiFetch = (url: string, options: any = {}) =>
  fetch(url, {
    credentials: 'include',
    ...options,
  });

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

interface DrawerMenuProps {
  isFixed: boolean;
  onClose?: () => void;
  onNavigate?: (screen: ScreenType) => void;
  activeScreen?: ScreenType;
  userName?: string;
  userEmail?: string;
  userAvatar?: any;
  userId: string;
  userRole: 'student' | 'teacher' | 'admin';
  apiBaseUrl: string;
  onAvatarPress?: () => void;
  onEmailUpdated?: (email: string) => void;
  onFilePickerOpen?: () => void;
  // NEW PROP: Callback for verification failures
  onVerificationFailed?: (errorMessage: string) => void;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
}

const DEFAULT_AVATAR = require('../../assets/images/default_profile.png');

const normalizeImageSource = (img: any) => {
  if (!img) return DEFAULT_AVATAR;
  if (typeof img === 'number') return img;
  if (img?.uri) return { uri: img.uri };
  return DEFAULT_AVATAR;
};

const MenuItem = ({
  iconSource,
  iconName,
  label,
  onPress,
  active,
  highlighted,
}: {
  iconSource?: any;
  iconName?: string;
  label: string;
  onPress?: () => void;
  active?: boolean;
  highlighted?: boolean;
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isLargeScreen = width >= 1024;
  const menuItemVerticalMargin = isMobile ? 12 : isLargeScreen ? 14.5 : 16;
  const menuLabelFontSize = isMobile ? 15 : 17;

  return (
    <Pressable
      onPress={onPress}
      style={(state) => {
        const base: StyleProp<ViewStyle> = [
          styles.menuItem,
          { 
            marginVertical: menuItemVerticalMargin, 
            borderRadius: 14, 
          },
          highlighted && {
            backgroundColor: '#D32F2F',
          },
          active && !highlighted && {
            backgroundColor: 'rgba(211,47,47,0.08)',
          },
        ];

        if (Platform.OS === 'web' && (state as any).hovered) {
          if (highlighted) {
            base.push({ backgroundColor: '#B71C1C' });
          } else if (!active) {
            base.push({ backgroundColor: 'rgba(130,129,129,0.08)' });
          }
        }

        return base;
      }}
    >
      {iconName ? (
        <MaterialCommunityIcons
          name={iconName as any}
          size={22}
          color={highlighted ? '#FFF' : active ? '#D32F2F' : '#444'}
          style={styles.vectorMenuIcon}
        />
      ) : (
        <Image
          source={iconSource}
          style={[
            styles.menuIcon, 
            highlighted && { tintColor: '#FFF' },
            active && !highlighted && { tintColor: '#D32F2F' }
          ]}
        />
      )}

      <Text
        style={[
          styles.menuLabel,
          { fontSize: menuLabelFontSize },
          highlighted && { color: '#FFF', fontWeight: '700' },
          active && !highlighted && { color: '#D32F2F', fontWeight: '700' },
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
  userName = 'Student',
  userEmail = '',
  userAvatar,
  userId,
  userRole,
  apiBaseUrl,
  onAvatarPress,
  onEmailUpdated,
  onFilePickerOpen,
  onVerificationFailed, // DESTRUCTURED
  setIsLoggedIn,
}: DrawerMenuProps) => {
  const { width } = useWindowDimensions();

  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isChangeEmailModalVisible, setChangeEmailModalVisible] = useState(false);
  const [isChangePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  
  // REMOVED: Verification Error Modal State (Handled by Parent)

  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [isUploadingGrade, setIsUploadingGrade] = useState(false);

  const [email, setEmail] = useState(userEmail || '');
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    setEmail(userEmail || '');
  }, [userEmail]);

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isSmallMobile = width < 380;

  const hasOverflow = contentHeight > scrollViewHeight && scrollViewHeight > 0;
  const shouldShowScrollBar = (isMobile || isTablet) && hasOverflow;
  const drawerWidth = isMobile ? (isSmallMobile ? '85%' : 280) : isTablet ? 300 : 260;

  const handleContentSizeChange = (_contentW: number, contentH: number) => {
    setContentHeight(contentH);
  };

  const handleScrollViewLayout = (e: LayoutChangeEvent) => {
    setScrollViewHeight(e.nativeEvent.layout.height);
  };

  const modalButtonHover = {
    backgroundColor: 'rgba(130,129,129,0.08)',
    borderRadius: 8,
  };

  const pressableWebHover = (state: any) =>
    Platform.OS === 'web' && state.hovered ? modalButtonHover : {};

  const reauthenticateCurrentUser = async (emailValue: string, passwordValue: string) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error('No authenticated user found. Please sign in again.');

    const credential = EmailAuthProvider.credential(emailValue.trim(), passwordValue);
    await reauthenticateWithCredential(firebaseUser, credential);
  };

  const handleChangeEmail = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = emailPassword.trim();

    if (!trimmedEmail) {
      Alert.alert('Required', 'Please enter a new email address.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (!trimmedPassword) {
      Alert.alert('Required', 'Please enter your current password.');
      return;
    }

    try {
      setSavingEmail(true);
      await reauthenticateCurrentUser(userEmail, trimmedPassword);

      const response = await apiFetch(`${apiBaseUrl}/auth/change-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          role: userRole,
          newEmail: trimmedEmail,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to update email.');

      onEmailUpdated?.(trimmedEmail);
      setEmailPassword('');
      setChangeEmailModalVisible(false);
      Alert.alert('Success', 'Your email has been updated successfully.');
    } catch (error: any) {
      Alert.alert('Update Failed', error?.message || 'Unable to update email.');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    const trimmedCurrentPassword = currentPassword.trim();
    const trimmedNewPassword = newPassword.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedCurrentPassword || !trimmedNewPassword || !trimmedConfirmPassword) {
      Alert.alert('Required', 'Please fill in all password fields.');
      return;
    }

    if (trimmedNewPassword.length < 8) {
      Alert.alert('Weak Password', 'Your new password must be at least 8 characters long.');
      return;
    }

    if (trimmedNewPassword !== trimmedConfirmPassword) {
      Alert.alert('Mismatch', 'New password and confirm password do not match.');
      return;
    }

    try {
      setSavingPassword(true);
      await reauthenticateCurrentUser(userEmail, trimmedCurrentPassword);

      const response = await apiFetch(`${apiBaseUrl}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          role: userRole,
          newPassword: trimmedNewPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to update password.');

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangePasswordModalVisible(false);
      Alert.alert('Success', 'Your password has been updated successfully.');
    } catch (error: any) {
      Alert.alert('Update Failed', error?.message || 'Unable to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch(`${apiBaseUrl}/auth/session-logout`, {
        method: 'POST',
      });
    } catch {}

    try {
      await signOut(auth);
    } catch {}

    setLogoutModalVisible(false);
    if (!isFixed) onClose?.();
    setIsLoggedIn(false);
  };

  const handleUploadGrade = async () => {
    try {
      onFilePickerOpen?.(); 
      
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/*',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if (asset.size && asset.size > 10 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please select a file smaller than 10MB.');
        return;
      }

      setIsUploadingGrade(true);
      
      let base64Data = '';
      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result;
            if (typeof res !== 'string') { reject(new Error('Failed to read file.')); return; }
            resolve(res.includes(',') ? res.split(',')[1] : res);
          };
          reader.onerror = () => reject(new Error('Failed to convert blob to base64.'));
          reader.readAsDataURL(blob);
        });
      } else {
        // Using legacy import to avoid deprecation error in Expo Go / Mobile
        base64Data = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
      }

      if (!base64Data || base64Data.length < 100) {
        throw new Error('File content is empty or too small.');
      }

      const response = await apiFetch(`${apiBaseUrl}/upload-student-grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: base64Data,
          fileName: asset.name,
          fileType: asset.mimeType || 'application/octet-stream',
          studentId: userId,
        }),
      });

      const data = await response.json();
      
      // CHECK FOR VERIFICATION FAILURE (403 Status)
      if (!response.ok) {
        if (response.status === 403) {
          // Call the parent handler to show the modal in StudentApp
          onVerificationFailed?.(data?.error || 'Identity verification failed.');
        } else {
          throw new Error(data?.error || 'Failed to upload grade file.');
        }
        return;
      }

      Alert.alert('Success', 'Your grade file has been uploaded successfully.');
    } catch (error: any) {
      console.error('Upload grade error:', error);
      Alert.alert('Upload Failed', error?.message || 'Unable to upload grade file.');
    } finally {
      setIsUploadingGrade(false);
    }
  };

  return (
    <View style={[styles.drawerContainer, { width: drawerWidth }]}> 
      <Pressable style={styles.profileSection} onPress={onAvatarPress}>
        <Image source={normalizeImageSource(userAvatar)} style={styles.avatar} resizeMode="cover" />
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{userName}</Text>
          {!!userEmail && <Text style={styles.userEmail}>{userEmail}</Text>}
        </View>
      </Pressable>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={shouldShowScrollBar}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleScrollViewLayout}
      >
        <MenuItem iconSource={require('../../assets/images/person.png')} label="Profile" onPress={() => { onNavigate?.('profile'); if (!isFixed) onClose?.(); }} active={activeScreen === 'profile'} />
        <MenuItem iconSource={require('../../assets/images/clipboard.png')} label="Assignments" onPress={() => { onNavigate?.('assignments'); if (!isFixed) onClose?.(); }} active={activeScreen === 'assignments'} />
        <MenuItem iconSource={require('../../assets/images/calendar.png')} label="My Journey" onPress={() => { onNavigate?.('myjourney'); if (!isFixed) onClose?.(); }} active={activeScreen === 'myjourney'} />
        <MenuItem iconName="chart-line" label="Analytics" onPress={() => { onNavigate?.('analytics'); if (!isFixed) onClose?.(); }} active={activeScreen === 'analytics'} />
        <MenuItem iconSource={require('../../assets/images/users-solid.png')} label="Community" onPress={() => { onNavigate?.('community'); if (!isFixed) onClose?.(); }} active={activeScreen === 'community'} />
        <MenuItem iconSource={require('../../assets/images/gear-solid.png')} label="Settings" onPress={() => setSettingsModalVisible(true)} />
        
        <MenuItem 
          iconName="file-upload-outline" 
          label={isUploadingGrade ? "Uploading..." : "Upload Grade"} 
          onPress={handleUploadGrade} 
          highlighted
        />
      </ScrollView>

      <Pressable style={styles.logoutMenuItem} onPress={() => setLogoutModalVisible(true)}>
        <MaterialCommunityIcons name="logout" size={28} color="#D32F2F" style={{ marginRight: 20 }} />
        <Text style={styles.logoutLabel}>Logout</Text>
      </Pressable>

      {/* REMOVED: Verification Error Modal */}

      <Modal animationType="fade" transparent visible={isSettingsModalVisible} onRequestClose={() => setSettingsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModalContainer}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Settings</Text>
              <Text style={styles.settingsSubtitle}>Manage your account preferences</Text>
            </View>

            <Pressable style={(state) => [styles.settingsOptionButton, pressableWebHover(state)]} onPress={() => { setSettingsModalVisible(false); setEmail(userEmail || ''); setChangeEmailModalVisible(true); }}>
              <View style={styles.settingsOptionContent}>
                <View style={styles.settingsOptionIconWrap}><MaterialCommunityIcons name="email-outline" size={22} color="#D32F2F" /></View>
                <View style={styles.settingsOptionTextWrap}>
                  <Text style={styles.settingsOptionTitle}>Change Email</Text>
                  <Text style={styles.settingsOptionSubtitle}>Update your registered email address</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
              </View>
            </Pressable>

            <Pressable style={(state) => [styles.settingsOptionButton, pressableWebHover(state)]} onPress={() => { setSettingsModalVisible(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setChangePasswordModalVisible(true); }}>
              <View style={styles.settingsOptionContent}>
                <View style={styles.settingsOptionIconWrap}><MaterialCommunityIcons name="lock-outline" size={22} color="#D32F2F" /></View>
                <View style={styles.settingsOptionTextWrap}>
                  <Text style={styles.settingsOptionTitle}>Change Password</Text>
                  <Text style={styles.settingsOptionSubtitle}>Create a new secure password</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
              </View>
            </Pressable>

            <Pressable style={styles.settingsCloseBtn} onPress={() => setSettingsModalVisible(false)}><Text style={styles.settingsCloseText}>Close</Text></Pressable>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={isChangeEmailModalVisible} onRequestClose={() => setChangeEmailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.formModalContainer}>
            <Text style={styles.formModalTitle}>Change Email</Text>
            <Text style={styles.formModalSubtitle}>Enter your new email and your current password.</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Email Address</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="Enter new email" placeholderTextColor="#999" style={styles.textInput} keyboardType="email-address" autoCapitalize="none" editable={!savingEmail} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput value={emailPassword} onChangeText={setEmailPassword} placeholder="Enter current password" placeholderTextColor="#999" style={styles.textInput} secureTextEntry editable={!savingEmail} />
            </View>
            <View style={styles.formButtonsRow}>
              <Pressable style={styles.formCancelBtn} onPress={() => { setChangeEmailModalVisible(false); setSettingsModalVisible(true); }} disabled={savingEmail}><Text style={styles.formCancelText}>Back</Text></Pressable>
              <Pressable style={styles.formSaveBtn} onPress={handleChangeEmail} disabled={savingEmail}><Text style={styles.formSaveText}>{savingEmail ? 'Saving...' : 'Save'}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={isChangePasswordModalVisible} onRequestClose={() => setChangePasswordModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.formModalContainer}>
            <Text style={styles.formModalTitle}>Change Password</Text>
            <Text style={styles.formModalSubtitle}>Update your password to keep your account secure.</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput value={currentPassword} onChangeText={setCurrentPassword} placeholder="Enter current password" placeholderTextColor="#999" style={styles.textInput} secureTextEntry editable={!savingPassword} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput value={newPassword} onChangeText={setNewPassword} placeholder="Enter new password" placeholderTextColor="#999" style={styles.textInput} secureTextEntry editable={!savingPassword} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" placeholderTextColor="#999" style={styles.textInput} secureTextEntry editable={!savingPassword} />
            </View>
            <View style={styles.formButtonsRow}>
              <Pressable style={styles.formCancelBtn} onPress={() => { setChangePasswordModalVisible(false); setSettingsModalVisible(true); }} disabled={savingPassword}><Text style={styles.formCancelText}>Back</Text></Pressable>
              <Pressable style={styles.formSaveBtn} onPress={handleChangePassword} disabled={savingPassword}><Text style={styles.formSaveText}>{savingPassword ? 'Saving...' : 'Save'}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={isLogoutModalVisible} onRequestClose={() => setLogoutModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.logoutModalContainer}>
            <Text style={styles.logoutModalTitle}>Are you sure you want to logout?</Text>
            <Text style={styles.logoutModalSubtitle}>You will need to sign in again to continue using your account.</Text>
            <View style={styles.logoutButtonsRow}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setLogoutModalVisible(false)}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
              <Pressable style={styles.logoutConfirmBtn} onPress={handleLogout}><Text style={styles.logoutConfirmText}>Logout</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DrawerMenu;

const styles = StyleSheet.create({
  drawerContainer: { height: '100%', padding: 25, backgroundColor: '#FFF', borderColor: 'transparent' },
  profileSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15, overflow: 'hidden', aspectRatio: 1 },
  userName: { fontWeight: '700', fontSize: 18 },
  userEmail: { marginTop: 2, fontSize: 12, color: '#777' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10 },
  menuIcon: { width: 22, height: 22, marginRight: 20, resizeMode: 'contain' },
  vectorMenuIcon: { width: 22, marginRight: 20, textAlign: 'center' },
  menuLabel: { color: '#444', fontWeight: '500' },
  logoutMenuItem: { flexDirection: 'row', alignItems: 'center', marginTop: 20, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 15 },
  logoutLabel: { fontSize: 16, color: '#D32F2F', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  settingsModalContainer: { backgroundColor: '#FFF', borderRadius: 18, padding: 20, width: '88%', maxWidth: 380 },
  settingsHeader: { marginBottom: 18 },
  settingsTitle: { fontSize: 22, fontWeight: '700', color: '#222', textAlign: 'center' },
  settingsSubtitle: { fontSize: 14, color: '#777', textAlign: 'center', marginTop: 6 },
  settingsOptionButton: { backgroundColor: '#FAFAFA', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14, marginTop: 12, borderWidth: 1, borderColor: '#EEE' },
  settingsOptionContent: { flexDirection: 'row', alignItems: 'center' },
  settingsOptionIconWrap: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(211,47,47,0.10)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingsOptionTextWrap: { flex: 1 },
  settingsOptionTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  settingsOptionSubtitle: { fontSize: 13, color: '#777', marginTop: 2 },
  settingsCloseBtn: { alignSelf: 'center', marginTop: 18, paddingVertical: 10, paddingHorizontal: 18 },
  settingsCloseText: { color: '#888', fontWeight: '600', fontSize: 15 },
  formModalContainer: { backgroundColor: '#FFF', borderRadius: 18, padding: 20, width: '88%', maxWidth: 380 },
  formModalTitle: { fontSize: 22, fontWeight: '700', color: '#222', textAlign: 'center' },
  formModalSubtitle: { fontSize: 14, color: '#777', textAlign: 'center', marginTop: 6, marginBottom: 20 },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },
  textInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111', backgroundColor: '#FFF' },
  formButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  formCancelBtn: { paddingVertical: 12, paddingHorizontal: 16, marginRight: 10, borderRadius: 10, backgroundColor: '#F3F4F6' },
  formCancelText: { color: '#444', fontWeight: '600' },
  formSaveBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#D32F2F' },
  formSaveText: { color: '#FFF', fontWeight: '700' },
  logoutModalContainer: { backgroundColor: '#FFF', borderRadius: 18, padding: 20, width: '88%', maxWidth: 360 },
  logoutModalTitle: { fontSize: 20, fontWeight: '700', color: '#222', textAlign: 'center' },
  logoutModalSubtitle: { fontSize: 14, color: '#777', textAlign: 'center', marginTop: 8 },
  logoutButtonsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  modalCancelBtn: { paddingVertical: 12, paddingHorizontal: 16, marginRight: 10, borderRadius: 10, backgroundColor: '#F3F4F6' },
  modalCancelText: { color: '#444', fontWeight: '600' },
  logoutConfirmBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#D32F2F' },
  logoutConfirmText: { color: '#FFF', fontWeight: '700' },
});