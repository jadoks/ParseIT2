import React from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

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
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { width: isBigScreen ? '40%' : '86%' }]}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Profile</Text>
          </View>

          <View style={styles.content}>
            <TouchableOpacity onPress={onAvatarPress} style={{ alignItems: 'center' }}>
              <Image
                source={avatarSource ?? require('../../assets/images/default_profile.png')}
                style={styles.avatar}
              />
              <View style={styles.editBadge}>
                <Text style={styles.editBadgeText}>✎</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.name}>{userName ?? 'Jade M. Lisondra'}</Text>
            <View style={styles.emailRow}>
              <Text style={styles.emailIcon}>✉️</Text>
              <Text style={styles.email}>{userEmail ?? 'jade.lisondra@gmail.com'}</Text>
            </View>

            {/* OK Button */}
            <TouchableOpacity
              style={[styles.okButton, { width: isBigScreen ? '30%' : '60%' }]}
              onPress={onClose}
            >
              <Text style={styles.okButtonText}>OK</Text>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    alignItems: 'center',
    marginTop: 14,
    width: '100%',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f0f0f0',
  },
  editBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  editBadgeText: {
    color: '#D32F2F',
    fontSize: 12,
  },
  name: {
    marginTop: 12,
    fontWeight: '700',
    fontSize: 16,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  emailIcon: {
    marginRight: 8,
  },
  email: {
    color: '#666',
  },
  okButton: {
    marginTop: 24,
    backgroundColor: '#D32F2F',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  okButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default ProfileModal;