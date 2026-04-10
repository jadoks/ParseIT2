import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useMemo, useState } from 'react';
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
  View
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Components
import AnnouncementBanner from './TeacherAnnouncementBanner';
import AnnouncementModal, { Announcement } from './TeacherAnnouncementModal';

// Local Asset path
const DEFAULT_COURSE_IMAGE = require('../../assets/parseclass/AP1.jpg');

export type TeacherCourseData = {
  id: string;
  name: string;
  courseCode: string;
  classCode: string;
  instructor: string;
  section?: string;
  bannerUri?: string;
};

export interface DashboardAssignment {
  id: string;
  title: string;
  dueDate?: string;
  status?: 'pending' | 'submitted' | 'graded';
  points?: number;
  maxPoints?: number;
  topic?: string;
  materialIds?: string[];
}

interface DashboardProps {
  announcements?: Announcement[];
  courses?: TeacherCourseData[];
  onOpenCourse?: (course: TeacherCourseData) => void;
  onCreateClass?: (course: TeacherCourseData) => void;
  onDeleteCourse?: (id: string) => void;
  onEditCourse?: (course: TeacherCourseData) => void;
}

const DEFAULT_INSTRUCTOR = 'Ramcee Jade L. Munoz';

const generateClassCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const Dashboard2 = ({
  announcements = [],
  courses = [],
  onOpenCourse,
  onCreateClass,
  onDeleteCourse,
  onEditCourse,
}: DashboardProps) => {
  const { width } = useWindowDimensions();

  const [localCourses, setLocalCourses] = useState<TeacherCourseData[]>(courses);

  const [isAnnouncementModalVisible, setAnnouncementModalVisible] = useState(false);
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [isMenuVisible, setMenuVisible] = useState(false);

  const [menuCourse, setMenuCourse] = useState<TeacherCourseData | null>(null);
  const [editingCourse, setEditingCourse] = useState<TeacherCourseData | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const [className, setClassName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [classSection, setClassSection] = useState('');
  const [classBanner, setClassBanner] = useState('');

  const [editClassName, setEditClassName] = useState('');
  const [editCourseCode, setEditCourseCode] = useState('');
  const [editClassSection, setEditClassSection] = useState('');
  const [editClassBanner, setEditClassBanner] = useState('');

  const isMobile = width < 768;
  const isLargeScreen = width >= 1200;

  useEffect(() => {
    setLocalCourses(courses);
  }, [courses]);

  const processedCourses = useMemo(() => {
    return localCourses.map((course) => ({
      ...course,
      themeColor: '#2E7D32',
    }));
  }, [localCourses]);

  const cardWidth = isMobile ? '100%' : isLargeScreen ? '31.5%' : '48%';

  const resetCreateForm = () => {
    setClassName('');
    setCourseCode('');
    setClassSection('');
    setClassBanner('');
  };

  const resetEditForm = () => {
    setEditClassName('');
    setEditCourseCode('');
    setEditClassSection('');
    setEditClassBanner('');
    setEditingCourse(null);
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

  const handlePickEditBanner = async () => {
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
      setEditClassBanner(uri);
    }
  };

  const handleCreateClass = () => {
    if (!className.trim() || !courseCode.trim()) {
      Alert.alert('Missing fields', 'Please fill in class name and course code.');
      return;
    }

    const newCourse: TeacherCourseData = {
      id: Date.now().toString(),
      name: className.trim(),
      courseCode: courseCode.trim().toUpperCase(),
      classCode: generateClassCode(),
      section: classSection.trim(),
      instructor: DEFAULT_INSTRUCTOR,
      bannerUri: classBanner || undefined,
    };

    setLocalCourses((prev) => [newCourse, ...prev]);
    onCreateClass?.(newCourse);

    resetCreateForm();
    setCreateModalVisible(false);
  };

  const openEditModal = () => {
    if (!menuCourse) return;

    setEditingCourse(menuCourse);
    setEditClassName(menuCourse.name);
    setEditCourseCode(menuCourse.courseCode);
    setEditClassSection(menuCourse.section || '');
    setEditClassBanner(menuCourse.bannerUri || '');

    closeMenu();
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (!editingCourse) return;

    if (!editClassName.trim() || !editCourseCode.trim()) {
      Alert.alert('Missing fields', 'Please fill in class name and course code.');
      return;
    }

    const updatedCourse: TeacherCourseData = {
      ...editingCourse,
      name: editClassName.trim(),
      courseCode: editCourseCode.trim().toUpperCase(),
      section: editClassSection.trim(),
      bannerUri: editClassBanner || undefined,
    };

    setLocalCourses((prev) =>
      prev.map((course) => (course.id === updatedCourse.id ? updatedCourse : course))
    );

    onEditCourse?.(updatedCourse);

    resetEditForm();
    setEditModalVisible(false);
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setMenuCourse(null);
  };

  const handleCopyLink = () => {
    if (!menuCourse) return;

    const link = `https://yourapp.com/join/${menuCourse.classCode}`;
    Clipboard.setString(link);
    Alert.alert('Copied', 'Class link copied to clipboard.');
    closeMenu();
  };

  const handleDeleteCourse = () => {
    if (!menuCourse) return;

    Alert.alert(
      'Delete Class',
      `Are you sure you want to delete "${menuCourse.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setLocalCourses((prev) => prev.filter((course) => course.id !== menuCourse.id));
            onDeleteCourse?.(menuCourse.id);
            closeMenu();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.safeArea}>
      <AnnouncementModal
        visible={isAnnouncementModalVisible}
        onClose={() => setAnnouncementModalVisible(false)}
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
              <TouchableOpacity
                onPress={() => {
                  resetCreateForm();
                  setCreateModalVisible(false);
                }}
              >
                <MaterialCommunityIcons name="close" size={24} color="#202124" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Enter class name"
              placeholderTextColor="#999"
              value={className}
              onChangeText={setClassName}
            />

            <TextInput
              style={styles.input}
              placeholder="Enter course code (example: CS-101)"
              placeholderTextColor="#999"
              value={courseCode}
              onChangeText={setCourseCode}
              autoCapitalize="characters"
            />

            <TextInput
              style={styles.input}
              placeholder="Enter section"
              placeholderTextColor="#999"
              value={classSection}
              onChangeText={setClassSection}
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

            <View style={styles.codeNoticeBox}>
              <MaterialCommunityIcons name="shuffle-variant" size={18} color="#2E7D32" />
              <Text style={styles.codeNoticeText}>
                A class code will be automatically generated when you create the class.
              </Text>
            </View>

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

      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.createModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Class</Text>
              <TouchableOpacity
                onPress={() => {
                  resetEditForm();
                  setEditModalVisible(false);
                }}
              >
                <MaterialCommunityIcons name="close" size={24} color="#202124" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Enter class name"
              placeholderTextColor="#999"
              value={editClassName}
              onChangeText={setEditClassName}
            />

            <TextInput
              style={styles.input}
              placeholder="Enter course code (example: CS-101)"
              placeholderTextColor="#999"
              value={editCourseCode}
              onChangeText={setEditCourseCode}
              autoCapitalize="characters"
            />

            <TextInput
              style={styles.input}
              placeholder="Enter section"
              placeholderTextColor="#999"
              value={editClassSection}
              onChangeText={setEditClassSection}
            />

            <Text style={styles.inputLabel}>Class Banner / Background Photo</Text>
            <TouchableOpacity style={styles.uploadBtn} onPress={handlePickEditBanner}>
              <MaterialCommunityIcons name="image-edit-outline" size={20} color="#D32F2F" />
              <Text style={styles.uploadBtnText}>
                {editClassBanner ? 'Change Banner Photo' : 'Upload Banner Photo'}
              </Text>
            </TouchableOpacity>

            {editClassBanner ? (
              <ImageBackground
                source={{ uri: editClassBanner }}
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
                  resetEditForm();
                  setEditModalVisible(false);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <TouchableOpacity activeOpacity={1} style={styles.menuOverlay} onPress={closeMenu}>
          <View
            style={[
              styles.menuBox,
              {
                position: 'absolute',
                top: menuPosition.y - 2,
                left: menuPosition.x - 190,
              },
            ]}
          >
            <TouchableOpacity style={styles.menuItem} onPress={handleCopyLink}>
              <MaterialCommunityIcons name="content-copy" size={20} color="#202124" />
              <Text style={styles.menuText}>Copy Link</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={openEditModal}>
              <MaterialCommunityIcons name="pencil-outline" size={20} color="#1565C0" />
              <Text style={[styles.menuText, { color: '#1565C0' }]}>Edit Class</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteCourse}>
              <MaterialCommunityIcons name="delete-outline" size={20} color="#D32F2F" />
              <Text style={[styles.menuText, { color: '#D32F2F' }]}>Delete Class</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollPadding,
          { paddingHorizontal: isMobile ? 14 : 20 },
        ]}
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
            {processedCourses.map((item) => (
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
                        {item.courseCode}
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
                  <TouchableOpacity
                    onPress={(event) => {
                      event.stopPropagation?.();

                      const { pageX, pageY } = event.nativeEvent;

                      setMenuPosition({
                        x: pageX,
                        y: pageY,
                      });

                      setMenuCourse(item);
                      setMenuVisible(true);
                    }}
                    style={styles.dotButton}
                  >
                    <MaterialCommunityIcons
                      name="dots-vertical"
                      size={22}
                      color="#5f6368"
                    />
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.bottomBorder,
                      { backgroundColor: item.themeColor || '#2E7D32' },
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

export default Dashboard2;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },

  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  scrollPadding: {
    paddingTop: 16,
    paddingBottom: 40,
  },

  mainWrapper: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionHeader: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },

  classesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
    gap: 12,
  },

  classesTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111',
  },

  createBtn: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  createBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },

  courseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
    width: '100%',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderTopWidth: 5,
    borderTopColor: '#2E7D32',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },

  bannerWrapper: {
    height: 140,
    width: '100%',
  },

  banner: {
    flex: 1,
  },

  cardBannerImage: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },

  bannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    padding: 16,
    justifyContent: 'flex-end',
  },

  bannerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  bannerCode: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },

  cardContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },

  instructorLabel: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    fontWeight: '700',
  },

  instructorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#202124',
    marginTop: 4,
  },

  cardFooter: {
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 12,
    alignItems: 'flex-end',
  },

  dotButton: {
    padding: 6,
    borderRadius: 10,
    zIndex: 2,
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
    backgroundColor: 'rgba(15,23,42,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  createModalContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 18,
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
    fontWeight: '700',
    color: '#202124',
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },

  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: '#202124',
    backgroundColor: '#fff',
    marginTop: 10,
  },

  uploadBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#D32F2F',
    borderStyle: 'dashed',
    borderRadius: 12,
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
    borderRadius: 12,
  },

  previewImage: {
    borderRadius: 12,
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

  codeNoticeBox: {
    marginTop: 14,
    backgroundColor: '#F1F8F2',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  codeNoticeText: {
    marginLeft: 8,
    flex: 1,
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '600',
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
    borderRadius: 10,
    backgroundColor: '#F3F3F3',
  },

  cancelBtnText: {
    color: '#202124',
    fontWeight: '600',
  },

  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#D32F2F',
  },

  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
  },

  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },

  menuBox: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    width: 190,
    paddingVertical: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },

  menuText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
});