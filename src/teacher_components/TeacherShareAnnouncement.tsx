import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

const BACKGROUNDS = [
  { id: 1, image: require('../../assets/images/Banner1.png') },
  { id: 2, image: require('../../assets/images/Banner2.png') },
  { id: 3, image: require('../../assets/images/Banner3.png') },
  { id: 4, image: require('../../assets/images/Banner4.png') },
];

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'sans-serif',
});

export default function ShareAnnouncement() {
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS !== 'web' || width < 768;

  const [selectedBg, setSelectedBg] = useState(4);
  const [header, setHeader] = useState('');
  const [description, setDescription] = useState('');
  const [isHeaderFocused, setIsHeaderFocused] = useState(false);
  const [isDescFocused, setIsDescFocused] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleShare = () => {
    const trimmedHeader = header.trim();
    const trimmedDesc = description.trim();

    if (!trimmedHeader && !trimmedDesc) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (!trimmedHeader) {
      Alert.alert('Missing Header', 'Please enter the announcement header.');
      return;
    }

    if (!trimmedDesc) {
      Alert.alert('Missing Description', 'Please enter the announcement description.');
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmShare = () => {
    setShowConfirmModal(false);
    Alert.alert('Success', 'Announcement shared successfully!');

    setHeader('');
    setDescription('');
    setSelectedBg(4);
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={
            isMobile ? styles.mobileContentContainer : styles.webContentContainer
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerSpacer} />

          <Text
            style={[
              styles.formTitle,
              { fontSize: isMobile ? 28 : 40 },
            ]}
          >
            Share an Announcement.
          </Text>

          <Text style={styles.formSubTitle}>
            Announcement will be available to all students.
          </Text>

          <View
            style={[
              styles.inputOutlineBox,
              isHeaderFocused && styles.inputOutlineBoxFocused,
            ]}
          >
            <Text style={styles.innerLabel}>Header</Text>
            <TextInput
              style={styles.nakedInput}
              value={header}
              onChangeText={setHeader}
              onFocus={() => setIsHeaderFocused(true)}
              onBlur={() => setIsHeaderFocused(false)}
              underlineColorAndroid="transparent"
              placeholder="Enter announcement header"
              placeholderTextColor="#999"
            />
          </View>

          <View
            style={[
              styles.inputOutlineBox,
              isDescFocused && styles.inputOutlineBoxFocused,
            ]}
          >
            <Text style={styles.innerLabel}>Description</Text>
            <TextInput
              style={[styles.nakedInput, styles.descriptionInput]}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              onFocus={() => setIsDescFocused(true)}
              onBlur={() => setIsDescFocused(false)}
              underlineColorAndroid="transparent"
              placeholder="Enter announcement description"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.selectorOutlineBox}>
            <Text style={styles.innerLabel}>Select Background Banner</Text>

            <View style={styles.bgGrid}>
              {BACKGROUNDS.map((bg) => (
                <TouchableOpacity
                  key={bg.id}
                  onPress={() => setSelectedBg(bg.id)}
                  style={[
                    styles.bgOption,
                    selectedBg === bg.id && styles.bgOptionSelected,
                  ]}
                  activeOpacity={0.85}
                >
                  <Image source={bg.image} style={styles.bgImage} />
                  {selectedBg === bg.id && (
                    <View style={styles.checkOverlay}>
                      <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            activeOpacity={0.8}
            onPress={handleShare}
          >
            <Text style={styles.submitBtnText}>Share</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <Modal
        animationType="fade"
        transparent
        visible={showConfirmModal}
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Share</Text>
            <Text style={styles.modalMessage}>
              Do you want to share this announcement?
            </Text>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.8}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                activeOpacity={0.8}
                onPress={confirmShare}
              >
                <Text style={styles.confirmBtnText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#FFF',
  },

  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },

  container: {
    flex: 1,
  },

  mobileContentContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
  },

  webContentContainer: {
    flexGrow: 1,
    paddingLeft: 25,
    paddingRight: 500,
    paddingTop: 10,
    paddingBottom: 32,
  },

  headerSpacer: {
    height: 10,
    marginBottom: 20,
  },

  formTitle: {
    fontWeight: 'bold',
    color: '#000',
    fontFamily,
    letterSpacing: -0.5,
  },

  formSubTitle: {
    fontSize: 14,
    color: '#444',
    marginBottom: 30,
    fontFamily,
  },

  inputOutlineBox: {
    borderWidth: 1.5,
    borderColor: '#718096',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    backgroundColor: '#FFF',
  },

  inputOutlineBoxFocused: {
    borderColor: '#000',
  },

  selectorOutlineBox: {
    borderWidth: 1.5,
    borderColor: '#718096',
    borderRadius: 8,
    padding: 15,
    marginBottom: 35,
    backgroundColor: '#FFF',
  },

  innerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 5,
    fontFamily,
  },

  nakedInput: {
    fontSize: 14,
    color: '#222',
    borderWidth: 0,
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
    fontFamily,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },

  descriptionInput: {
    height: 80,
  },

  bgGrid: {
    marginTop: 10,
  },

  bgOption: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  bgOptionSelected: {
    borderColor: '#B71C1C',
    borderWidth: 3,
  },

  bgImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  checkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(183, 28, 28, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  submitBtn: {
    backgroundColor: '#B71C1C',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40,
  },

  submitBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    fontFamily,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 22,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily,
  },

  modalMessage: {
    fontSize: 14,
    color: '#777',
    lineHeight: 22,
    marginBottom: 22,
    textAlign: 'center',
    fontFamily,
  },

  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },

  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F3F3',
  },

  cancelBtnText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    fontFamily,
  },

  confirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
  },

  confirmBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily,
  },
});