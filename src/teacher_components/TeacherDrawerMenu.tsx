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
  onNavigate?: (screen: any) => void;
  activeScreen?: 'home' | 'game' | 'videos' | 'grades' | 'myjourney' | 'profile' | 'messenger' | 'assignments' | 'coursedetail' | 'community' | 'notification';
  userName?: string;
  userEmail?: string;
  onAvatarPress?: () => void;
  setIsLoggedIn: (val: boolean) => void;
}

const MenuItem = ({ iconSource, label, onPress, active }: { iconSource: any; label: string; onPress?: () => void; active?: boolean; }) => {
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
      <Text style={[styles.menuLabel, { fontSize: menuLabelFontSize }, active && { color: '#D32F2F', fontWeight: '700' }]}>
        {label}
      </Text>
    </Pressable>
  );
};

const DrawerMenu = ({ isFixed, onClose, onNavigate, activeScreen, userName, userEmail, onAvatarPress, setIsLoggedIn }: DrawerMenuProps) => {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isLargeScreen = width >= 1024;
  const isOnMobileOrTablet = isMobile || isTablet;

  const hasOverflow = contentHeight > scrollViewHeight && scrollViewHeight > 0;
  const shouldShowScrollBar = isOnMobileOrTablet && hasOverflow;
  const drawerWidth = isMobile ? (width < 380 ? '85%' : 280) : isTablet ? 300 : 260;

  const handleContentSizeChange = (_contentW: number, contentH: number) => setContentHeight(contentH);
  const handleScrollViewLayout = (e: LayoutChangeEvent) => setScrollViewHeight(e.nativeEvent.layout.height);

  return (
    <View style={[styles.drawerContainer, { width: drawerWidth }, !isFixed && styles.mobileDrawer]}>
      {!isFixed && (
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕ Close</Text>
        </Pressable>
      )}

      <View style={[styles.profileSection, { marginBottom: isMobile ? 20 : 40 }]}>
        <Pressable onPress={onAvatarPress}>
          <Image
            source={require('../../assets/images/avatar.jpg')}
            style={[styles.avatar, { width: isMobile ? 45 : 50, height: isMobile ? 45 : 50, borderRadius: 25 }]}
          />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.userName, { fontSize: isMobile ? 16 : 18, marginLeft: 10 }]}>{userName ?? 'Ramcee Jade L. Munoz'}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={shouldShowScrollBar} style={{ flex: 1 }} onContentSizeChange={handleContentSizeChange} onLayout={handleScrollViewLayout}>
        <MenuItem iconSource={require('../../assets/images/person.png')} label="Profile" onPress={() => { onNavigate?.('profile'); if (!isFixed) onClose?.(); }} active={activeScreen === 'profile'} />
        <MenuItem iconSource={require('../../assets/images/users-solid.png')} label="Community" onPress={() => { onNavigate?.('community'); if (!isFixed) onClose?.(); }} active={activeScreen === 'community'} />
        <MenuItem iconSource={require('../../assets/images/gear-solid.png')} label="Settings" onPress={() => setSettingsModalVisible(true)} />
      </ScrollView>

      <Pressable style={styles.logoutMenuItem} onPress={() => setLogoutModalVisible(true)}>
        <MaterialCommunityIcons name="logout" size={28} color="#D32F2F" style={{ marginRight: 20 }} />
        <Text style={styles.logoutLabel}>Logout</Text>
      </Pressable>

      {/* Settings Modal */}
      <Modal animationType="slide" transparent visible={isSettingsModalVisible} onRequestClose={() => setSettingsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { width: width >= 1024 ? width * 0.3 : '80%' }]}>
            <Text style={styles.modalTitle}>Settings</Text>
            <Pressable style={styles.modalButton} onPress={() => alert('Email')}><Text style={styles.modalButtonText}>Change Email</Text></Pressable>
            <Pressable style={styles.modalButton} onPress={() => alert('Pass')}><Text style={styles.modalButtonText}>Change Password</Text></Pressable>
            <Pressable onPress={() => setSettingsModalVisible(false)}><Text style={styles.modalCloseText}>Close</Text></Pressable>
          </View>
        </View>
      </Modal>

      {/* Logout Modal */}
      <Modal animationType="fade" transparent visible={isLogoutModalVisible} onRequestClose={() => setLogoutModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { width: width >= 1024 ? width * 0.3 : '80%' }]}>
            <Text style={styles.modalTitle}>Are you sure?</Text>
            <View style={{ flexDirection: 'row', gap: 20 }}>
              <Pressable onPress={() => setLogoutModalVisible(false)}><Text style={styles.modalCloseText}>Cancel</Text></Pressable>
              <Pressable style={styles.modalButton} onPress={() => { setLogoutModalVisible(false); setIsLoggedIn(false); }}><Text style={styles.modalButtonText}>Logout</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  drawerContainer: { height: '100%', borderRightWidth: 1, borderRightColor: '#EEE', padding: 25, backgroundColor: '#FFF' },
  mobileDrawer: { elevation: 10, shadowColor: '#000', shadowOffset: { width: 5, height: 0 }, shadowOpacity: 0.1, shadowRadius: 10 },
  closeBtn: { marginBottom: 20, alignSelf: 'flex-end', padding: 5 },
  closeText: { color: '#D32F2F', fontWeight: 'bold' },
  profileSection: { flexDirection: 'row', alignItems: 'center' },
  avatar: { backgroundColor: '#f0f0f0' },
  userName: { fontWeight: '700', color: '#333' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10 },
  menuIcon: { width: 22, height: 22, marginRight: 20, resizeMode: 'contain' },
  menuLabel: { color: '#444', fontWeight: '500' },
  logoutMenuItem: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#EEE' },
  logoutLabel: { fontSize: 16, color: '#D32F2F', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  modalButton: { padding: 12, backgroundColor: 'rgba(211,47,47,0.08)', borderRadius: 8, marginBottom: 10 },
  modalButtonText: { color: '#D32F2F', fontWeight: '600' },
  modalCloseText: { color: '#888', padding: 10 },
});

export default DrawerMenu;