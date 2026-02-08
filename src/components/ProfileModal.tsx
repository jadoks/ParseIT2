import React from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
  avatarSource?: any;
  onAvatarPress?: () => void;
}

const ProfileModal: React.FC<Props> = ({ visible, onClose, userName, userEmail, avatarSource, onAvatarPress }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <TouchableOpacity onPress={onAvatarPress} style={{ alignItems: 'center' }}>
              <Image source={avatarSource ?? require('../../assets/images/default_profile.png')} style={styles.avatar} />
              <View style={styles.editBadge}><Text style={styles.editBadgeText}>✎</Text></View>
            </TouchableOpacity>

            <Text style={styles.name}>{userName ?? 'Jade M. Lisondra'}</Text>
            <View style={styles.emailRow}>
              <Text style={styles.emailIcon}>✉️</Text>
              <Text style={styles.email}>{userEmail ?? 'jade.lisondra@gmail.com'}</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  sheet: { width: '86%', backgroundColor: '#fff', borderRadius: 12, padding: 18 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  close: { fontSize: 18, color: '#D32F2F' },
  content: { alignItems: 'center', marginTop: 14 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#f0f0f0' },
  editBadge: { position: 'absolute', right: 6, bottom: 6, backgroundColor: '#fff', padding: 6, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  editBadgeText: { color: '#D32F2F', fontSize: 12 },
  name: { marginTop: 12, fontWeight: '700', fontSize: 16 },
  emailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  emailIcon: { marginRight: 8 },
  email: { color: '#666' },
});

export default ProfileModal;
