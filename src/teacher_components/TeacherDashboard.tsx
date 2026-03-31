import React, { useMemo, useState } from 'react';
import {
  Alert,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Components
import AnnouncementBanner from './TeacherAnnouncementBanner';
import AnnouncementModal from './TeacherAnnouncementModal';

// Local Asset path
const DEFAULT_COURSE_IMAGE = require('../../assets/parseclass/AP1.jpg');

interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  section?: string;
  themeColor?: string;
  bannerUri?: string;
}

interface DashboardProps {
  announcements?: any[];
  courses?: Course[];
  onOpenCourse?: (course: Course) => void;
  onCreateClass?: (course: Course) => void;
}

const Dashboard = ({
  announcements = [],
  courses: initialCourses = [
    {
      id: '1',
      name: 'Programming 1',
      code: 'CC123',
      instructor: 'Ramcee Jade L. Munoz',
      section: 'A',
    },
    {
      id: '2',
      name: 'Programming 2',
      code: 'CC124',
      instructor: 'Ramcee Jade L. Munoz',
      section: 'B',
    },
    {
      id: '3',
      name: 'Data Structures',
      code: 'CC201',
      instructor: 'Ramcee Jade L. Munoz',
      section: 'A',
    },
  ],
  onOpenCourse,
  onCreateClass,
}: DashboardProps) => {
  const { width } = useWindowDimensions();

  const [isModalVisible, setModalVisible] = useState(false);
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [courses, setCourses] = useState<Course[]>(initialCourses);

  const [className, setClassName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [classSection, setClassSection] = useState('');
  const [classInstructor, setClassInstructor] = useState('');
  const [classBanner, setClassBanner] = useState('');

  const isMobile = width < 768;
  const isLargeScreen = width >= 1200;

  const processedCourses = useMemo(() => {
    return courses.map((course: Course) => ({
      ...course,
      themeColor: '#2E7D32',
    }));
  }, [courses]);

  const cardWidth = isMobile ? '100%' : isLargeScreen ? '31.5%' : '48%';

  const resetCreateForm = () => {
    setClassName('');
    setClassCode('');
    setClassSection('');
    setClassInstructor('');
    setClassBanner('');
  };

  const handlePickBanner = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
    });

    if (result.didCancel) return;

    if (result.errorCode) {
      Alert.alert('Upload failed', result.errorMessage || 'Unable to pick image.');
      return;
    }

    const uri = result.assets?.[0]?.uri;
    if (uri) {
      setClassBanner(uri);
    }
  };

  const handleCreateClass = () => {
    if (!className.trim() || !classCode.trim() || !classInstructor.trim()) {
      Alert.alert('Missing fields', 'Please fill in class name, class code, and instructor.');
      return;
    }

    const newCourse: Course = {
      id: Date.now().toString(),
      name: className.trim(),
      code: classCode.trim(),
      section: classSection.trim(),
      instructor: classInstructor.trim(),
      bannerUri: classBanner,
    };

    setCourses((prev) => [newCourse, ...prev]);
    onCreateClass?.(newCourse);

    resetCreateForm();
    setCreateModalVisible(false);
  };

  return (
    <View style={styles.safeArea}>
      <AnnouncementModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        announcements={announcements}
      />

      <Modal
        visible={isCreateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.createModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Class</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#202124" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Class Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter class name"
              value={className}
              onChangeText={setClassName}
            />

            <Text style={styles.inputLabel}>Class Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter class code"
              value={classCode}
              onChangeText={setClassCode}
            />

            <Text style={styles.inputLabel}>Section</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter section"
              value={classSection}
              onChangeText={setClassSection}
            />

            <Text style={styles.inputLabel}>Instructor</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter instructor name"
              value={classInstructor}
              onChangeText={setClassInstructor}
            />

            <Text style={styles.inputLabel}>Class Banner / Background Photo</Text>
            <TouchableOpacity style={styles.uploadBtn} onPress={handlePickBanner}>
              <MaterialCommunityIcons name="image-plus" size={20} color="#D32F2F" />
              <Text style={styles.uploadBtnText}>
                {classBanner ? 'Change Banner Photo' : 'Upload Banner Photo'}
              </Text>
            </TouchableOpacity>

            {classBanner ? (
              <ImageBackground
                source={{ uri: classBanner }}
                style={styles.bannerPreview}
                imageStyle={styles.previewImage}
              >
                <View style={styles.previewOverlay}>
                  <Text style={styles.previewText}>Banner Preview</Text>
                </View>
              </ImageBackground>
            ) : null}

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  resetCreateForm();
                  setCreateModalVisible(false);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateClass}>
                <Text style={styles.saveBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollPadding}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainWrapper}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionHeader}>Announcements</Text>
          </View>

          <AnnouncementBanner announcements={announcements} />

          <View style={styles.classesHeaderRow}>
            <Text style={styles.classesTitle}>Classes</Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => setCreateModalVisible(true)}
            >
              <Text style={styles.createBtnText}>+ Create Class</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.courseGrid}>
            {processedCourses.map((item: Course) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, { width: cardWidth }]}
                onPress={() => onOpenCourse?.(item)}
                activeOpacity={0.9}
              >
                <View style={styles.bannerWrapper}>
                  <ImageBackground
                    source={item.bannerUri ? { uri: item.bannerUri } : DEFAULT_COURSE_IMAGE}
                    style={styles.banner}
                    imageStyle={styles.cardBannerImage}
                  >
                    <View style={styles.bannerOverlay}>
                      <Text style={styles.bannerName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.bannerCode}>
                        {item.code}
                        {item.section ? ` • ${item.section}` : ''}
                      </Text>
                    </View>
                  </ImageBackground>
                </View>

                <View style={styles.cardContent}>
                  <Text style={styles.instructorLabel}>Instructor</Text>
                  <Text style={styles.instructorName}>{item.instructor}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <MaterialCommunityIcons
                    name="dots-vertical"
                    size={22}
                    color="#5f6368"
                  />
                  <View
                    style={[
                      styles.bottomBorder,
                      { backgroundColor: item.themeColor },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  scrollPadding: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 60,
  },
  mainWrapper: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#202124',
  },
  classesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  classesTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  createBtn: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  courseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 16,
    width: '100%',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    overflow: 'hidden',
    marginBottom: 10,
  },
  bannerWrapper: {
    height: 120,
    width: '100%',
  },
  banner: {
    flex: 1,
  },
  cardBannerImage: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  bannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 16,
    justifyContent: 'flex-end',
  },
  bannerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bannerCode: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  cardContent: {
    padding: 16,
  },
  instructorLabel: {
    fontSize: 10,
    color: '#888',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  instructorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#202124',
    marginTop: 2,
  },
  cardFooter: {
    padding: 8,
    alignItems: 'flex-end',
  },
  bottomBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  createModalContainer: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#202124',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#202124',
    backgroundColor: '#fff',
  },
  uploadBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#D32F2F',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF5F5',
  },
  uploadBtnText: {
    color: '#D32F2F',
    fontWeight: '700',
    fontSize: 14,
  },
  bannerPreview: {
    marginTop: 12,
    height: 120,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 10,
  },
  previewImage: {
    borderRadius: 10,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
    padding: 12,
  },
  previewText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 22,
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  cancelBtnText: {
    color: '#202124',
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#D32F2F',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default Dashboard;