import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import CourseCard, { CourseCardCourse } from '../components/CourseCard';

interface ClassesScreenProps {
  courses?: CourseCardCourse[];
  onCoursePress?: (course: CourseCardCourse) => void;
  onAssignmentPress?: (course: CourseCardCourse) => void;
  onMaterialsPress?: (course: CourseCardCourse) => void;
  onGeneratePress?: (course: CourseCardCourse) => void;
  onJoinClass?: (classCode: string) => void;
}

const DEFAULT_COURSES: CourseCardCourse[] = [
  {
    id: '1',
    name: 'Web Development',
    code: 'CS-101',
    instructor: 'Prof. John Smith',
    semester: '2nd Semester',
    schoolYear: '2025-2026',
    section: '3A - Python',
    description:
      'Learn the fundamentals of web development including HTML, CSS, JavaScript, and introductory React concepts.',
    materials: [
      { id: 'm1', title: 'HTML Basics Tutorial', type: 'video', uploadedDate: '2026-02-01' },
      { id: 'm2', title: 'CSS Styling Guide', type: 'pdf', uploadedDate: '2026-02-03' },
      { id: 'm3', title: 'JavaScript Fundamentals', type: 'video', uploadedDate: '2026-02-05' },
      { id: 'm4', title: 'React Components Introduction', type: 'document', uploadedDate: '2026-02-07' },
    ],
    assignments: [
      {
        id: 'a1',
        title: 'React Fundamentals Quiz',
        dueDate: '2026-02-15',
        status: 'graded',
        points: 8,
        maxPoints: 20,
        topic: 'React Fundamentals',
        materialIds: ['m4'],
      },
      {
        id: 'a2',
        title: 'Build a Simple Website',
        dueDate: '2026-02-20',
        status: 'graded',
        points: 42,
        maxPoints: 50,
        topic: 'HTML and CSS Layout',
        materialIds: ['m1', 'm2'],
      },
    ],
  },
  {
    id: '2',
    name: 'Programming Logic',
    code: 'CS-102',
    instructor: 'Prof. Maria Santos',
    semester: '2nd Semester',
    schoolYear: '2025-2026',
    section: '2A - Algorithm',
    description: 'Understand variables, conditions, loops, and basic program flow.',
    materials: [
      { id: 'm5', title: 'Variables and Data Types', type: 'pdf', uploadedDate: '2026-02-02' },
      { id: 'm6', title: 'Conditional Statements', type: 'video', uploadedDate: '2026-02-04' },
      { id: 'm7', title: 'Looping Concepts', type: 'document', uploadedDate: '2026-02-06' },
    ],
    assignments: [
      {
        id: 'a3',
        title: 'Conditional Statements Quiz',
        dueDate: '2026-02-16',
        status: 'graded',
        points: 14,
        maxPoints: 20,
        topic: 'Conditional Statements',
        materialIds: ['m6'],
      },
      {
        id: 'a4',
        title: 'Loops Practice Set',
        dueDate: '2026-02-21',
        status: 'graded',
        points: 10,
        maxPoints: 20,
        topic: 'Loops',
        materialIds: ['m7'],
      },
    ],
  },
  {
    id: '3',
    name: 'Computer Fundamentals',
    code: 'IT-100',
    instructor: 'Prof. Allan Reyes',
    semester: '2nd Semester',
    schoolYear: '2025-2026',
    section: '1A - Microsoft',
    description: 'Explore basic computing concepts, hardware, software, and digital systems.',
    materials: [
      { id: 'm8', title: 'Hardware Overview', type: 'pdf', uploadedDate: '2026-02-01' },
      { id: 'm9', title: 'Software Systems', type: 'document', uploadedDate: '2026-02-05' },
    ],
    assignments: [
      {
        id: 'a5',
        title: 'Computer Basics Assessment',
        dueDate: '2026-02-18',
        status: 'graded',
        points: 18,
        maxPoints: 20,
        topic: 'Computer Architecture',
        materialIds: ['m8'],
      },
    ],
  },
  {
    id: '4',
    name: 'Discrete Mathematics',
    code: 'PC-121',
    instructor: 'Prof. Carla Mendoza',
    semester: '2nd Semester',
    schoolYear: '2025-2026',
    section: '4A - Mathematics',
    description: 'Study logic, sets, relations, functions, and proof techniques.',
    materials: [
      { id: 'm10', title: 'Set Theory Basics', type: 'pdf', uploadedDate: '2026-02-03' },
      { id: 'm11', title: 'Functions and Relations', type: 'video', uploadedDate: '2026-02-06' },
    ],
    assignments: [
      {
        id: 'a6',
        title: 'Functions Quiz',
        dueDate: '2026-02-17',
        status: 'graded',
        points: 12,
        maxPoints: 20,
        topic: 'Functions',
        materialIds: ['m11'],
      },
    ],
  },
  {
    id: '5',
    name: 'Understanding the Self',
    code: 'GEC-US',
    instructor: 'Prof. Elena Cruz',
    semester: '2nd Semester',
    schoolYear: '2025-2026',
    section: '5A - Humanities',
    description: 'Reflect on identity, personal development, and self-awareness.',
    materials: [
      { id: 'm12', title: 'Identity and Culture', type: 'document', uploadedDate: '2026-02-07' },
      { id: 'm13', title: 'The Self in Society', type: 'pdf', uploadedDate: '2026-02-10' },
    ],
    assignments: [
      {
        id: 'a7',
        title: 'Reflection Paper',
        dueDate: '2026-02-22',
        status: 'submitted',
        points: 0,
        maxPoints: 30,
        topic: 'Identity',
        materialIds: ['m12', 'm13'],
      },
    ],
  },
  {
    id: '6',
    name: 'Exercise-Based Fitness Activities',
    code: 'PATHFIT2',
    instructor: 'Prof. Kevin Lim',
    semester: '2nd Semester',
    schoolYear: '2025-2026',
    section: '6A - Fitness',
    description: 'Develop fitness habits through guided exercise-based activities.',
    materials: [
      { id: 'm14', title: 'Warm-Up Routine', type: 'video', uploadedDate: '2026-02-01' },
      { id: 'm15', title: 'Training Guidelines', type: 'document', uploadedDate: '2026-02-04' },
    ],
    assignments: [
      {
        id: 'a8',
        title: 'Fitness Log Submission',
        dueDate: '2026-02-25',
        status: 'pending',
        points: 0,
        maxPoints: 25,
        topic: 'Workout Routine',
        materialIds: ['m14', 'm15'],
      },
    ],
  },
];

const ClassesScreen = ({
  courses = DEFAULT_COURSES,
  onCoursePress,
  onAssignmentPress,
  onMaterialsPress,
  onGeneratePress,
  onJoinClass,
}: ClassesScreenProps) => {
  const { width } = useWindowDimensions();
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [classCode, setClassCode] = useState('');

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1200;
  const pagePadding = isMobile ? 14 : isTablet ? 20 : 20;

  const handleJoinClass = () => {
    const trimmedCode = classCode.trim();

    if (!trimmedCode) return;

    onJoinClass?.(trimmedCode);
    setClassCode('');
    setJoinModalVisible(false);
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.contentWrap}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.pageTitle}>My Classes</Text>
              <Text style={styles.pageSubtitle}>
                Access all your enrolled courses in one place.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.joinClassButton}
              onPress={() => setJoinModalVisible(true)}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.joinClassButtonText}>Join Class</Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.grid,
              isMobile && styles.gridMobile,
              isTablet && styles.gridTablet,
              !isMobile && !isTablet && styles.gridDesktop,
            ]}
          >
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onPress={(selectedCourse) => onCoursePress?.(selectedCourse)}
                onAssignmentPress={(selectedCourse) => onAssignmentPress?.(selectedCourse)}
                onMaterialsPress={(selectedCourse) => onMaterialsPress?.(selectedCourse)}
                onGeneratePress={(selectedCourse) => onGeneratePress?.(selectedCourse)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={joinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setJoinModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.joinDropdownModal,
                  {
                    top: isMobile ? 70 : 80,
                    right: isMobile ? 14 : pagePadding,
                    width: isMobile ? Math.min(width - 28, 320) : 340,
                  },
                ]}
              >
                <View style={styles.joinDropdownHeader}>
                  <View style={styles.joinDropdownIconWrap}>
                    <Ionicons name="school-outline" size={18} color="#D32F2F" />
                  </View>

                  <View style={styles.joinDropdownHeaderText}>
                    <Text style={styles.joinDropdownTitle}>Join Class</Text>
                    <Text style={styles.joinDropdownSubtitle}>
                      Enter your class code to join a course.
                    </Text>
                  </View>
                </View>

                <Text style={styles.inputLabel}>Class Code</Text>
                <TextInput
                  value={classCode}
                  onChangeText={setClassCode}
                  placeholder="Enter class code"
                  placeholderTextColor="#999"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={styles.classCodeInput}
                />

                <View style={styles.joinDropdownActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setClassCode('');
                      setJoinModalVisible(false);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      !classCode.trim() && styles.confirmButtonDisabled,
                    ]}
                    onPress={handleJoinClass}
                    disabled={!classCode.trim()}
                  >
                    <Text style={styles.confirmButtonText}>Join Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  contentContainer: {
    padding: 20,
    paddingBottom: 30,
  },

  contentWrap: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },

  headerTextWrap: {
    flex: 1,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
  },

  pageSubtitle: {
    fontSize: 14,
    color: '#666',
  },

  joinClassButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  joinClassButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },

  gridMobile: {
    justifyContent: 'center',
  },

  gridTablet: {
    justifyContent: 'center',
  },

  gridDesktop: {
    justifyContent: 'flex-start',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
  },

  joinDropdownModal: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ECECEC',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },

  joinDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },

  joinDropdownHeaderText: {
    flex: 1,
  },

  joinDropdownIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF1F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  joinDropdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },

  joinDropdownSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },

  classCodeInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#DADDE2',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
  },

  joinDropdownActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },

  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },

  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13,
  },

  confirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#D32F2F',
  },

  confirmButtonDisabled: {
    backgroundColor: '#F0A7A7',
  },

  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default ClassesScreen;