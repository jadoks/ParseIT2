import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
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
  const [selectedBg, setSelectedBg] = useState(4);
  const [header, setHeader] = useState('');
  const [description, setDescription] = useState('');
  const [isHeaderFocused, setIsHeaderFocused] = useState(false);
  const [isDescFocused, setIsDescFocused] = useState(false);

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

  Alert.alert(
    'Success',
    'Announcement shared successfully!',
  );

  // ✅ clear inputs after sharing
  setHeader('');
  setDescription('');
  setSelectedBg(4);
};
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSpacer} />

        <Text style={styles.formTitle}>Share an Announcement.</Text>
        <Text style={styles.formSubTitle}>
          Announcement will be available to all students.
        </Text>

        <View
          style={[
            styles.inputOutlineBox,
            isHeaderFocused && { borderColor: '#000' }
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
            isDescFocused && { borderColor: '#000' }
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
                  selectedBg === bg.id && styles.bgOptionSelected
                ]}
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
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF'
  },

  container: {
    flex: 1,
    paddingLeft: 25,
    paddingRight: 500,
    paddingTop: 10
  },

  headerSpacer: {
    height: 10,
    marginBottom: 20
  },

  formTitle: {
  fontSize: 40,          // bigger like the image
  fontWeight: '800',     // extra bold
  color: '#000',
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'sans-serif',
  }),
  letterSpacing: -0.5,   // tighter look like "Honors"
},

  formSubTitle: {
    fontSize: 14,
    color: '#444',
    marginBottom: 30,
    fontFamily
  },

  inputOutlineBox: {
    borderWidth: 1.5,
    borderColor: '#718096',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    backgroundColor: '#FFF'
  },

  selectorOutlineBox: {
    borderWidth: 1.5,
    borderColor: '#718096',
    borderRadius: 8,
    padding: 15,
    marginBottom: 35,
    backgroundColor: '#FFF'
  },

  innerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 5,
    fontFamily
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
      web: { outlineStyle: 'none' } as any
    })
  },

  descriptionInput: {
    height: 80
  },

  bgGrid: {
    marginTop: 10
  },

  bgOption: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },

  bgOptionSelected: {
    borderColor: '#B71C1C',
    borderWidth: 3
  },

  bgImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },

  checkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(183, 28, 28, 0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },

  submitBtn: {
    backgroundColor: '#B71C1C',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40
  },

  submitBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    fontFamily
  }
});