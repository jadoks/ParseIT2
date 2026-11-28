import React from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface Props {
  visible: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
  avatarSource?: any;
  onAvatarPress?: () => void;
}

const ProfileModal: React.FC<Props> = ({ visible, onClose, userName, userEmail, avatarSource, onAvatarPress }) => {
  const { width } = useWindowDimensions();
  const isBigScreen = width >= 1024; // big screen threshold

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { width: isBigScreen ? 420 : '88%' }]}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Profile</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close profile"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="close" size={18} color="#7A4A4A" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <TouchableOpacity
              onPress={onAvatarPress}
              disabled={!onAvatarPress}
              activeOpacity={0.85}
              style={styles.avatarWrap}
              accessibilityLabel="Change profile photo"
            >
              <Image
                source={avatarSource ?? require('../../assets/images/default_profile.png')}
                style={styles.avatar}
              />
              {!!onAvatarPress && (
                <View style={styles.editBadge}>
                  <MaterialCommunityIcons name="pencil" size={14} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.name} numberOfLines={2}>{userName || 'Student'}</Text>

            {!!userEmail && (
              <View style={styles.emailPill}>
                <MaterialCommunityIcons name="email-outline" size={16} color="#8B0000" />
                <Text style={styles.email} numberOfLines={1}>{userEmail}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.okButton} onPress={onClose} activeOpacity={0.88}>
              <Text style={styles.okButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(43,17,17,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#EBD4D4',
    padding: 22,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2B1111',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#FAF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    marginTop: 18,
    width: '100%',
  },
  avatarWrap: {
    alignItems: 'center',
  },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#F1E0E0',
    borderWidth: 3,
    borderColor: '#F1E0E0',
  },
  editBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B0000',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    marginTop: 14,
    fontWeight: '800',
    fontSize: 20,
    color: '#2B1111',
    textAlign: 'center',
  },
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FAF5F5',
    borderWidth: 1,
    borderColor: '#EBD4D4',
  },
  email: {
    color: '#6B4A4A',
    fontSize: 13.5,
    fontWeight: '600',
    flexShrink: 1,
  },
  okButton: {
    marginTop: 26,
    width: '100%',
    backgroundColor: '#8B0000',
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B0000',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  okButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});

export default ProfileModal;