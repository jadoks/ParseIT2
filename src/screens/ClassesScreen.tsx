import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';
import CourseCard, { CourseCardCourse } from '../components/CourseCard';

interface ClassesScreenProps {
  courses?: CourseCardCourse[];
  onCoursePress?: (course: CourseCardCourse) => void;
  onAssignmentPress?: (course: CourseCardCourse) => void;
  onMaterialsPress?: (course: CourseCardCourse) => void;
  onGeneratePress?: (course: CourseCardCourse) => void;
}

const DEFAULT_COURSES: CourseCardCourse[] = [
  {
    id: '1',
    name: 'Web Development 101',
    code: 'CS-101',
    instructor: 'Prof. John Smith',
    section: 'Section A',
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
    section: 'Section B',
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
    section: 'Section C',
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
    section: 'Section A',
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
    section: 'Section D',
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
    section: 'Section E',
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
}: ClassesScreenProps) => {
  const { width } = useWindowDimensions();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1200;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.contentWrap}>
        <Text style={styles.pageTitle}>My Classes</Text>
        <Text style={styles.pageSubtitle}>
          Access all your enrolled courses in one place.
        </Text>

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

  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
  },

  pageSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
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
});

export default ClassesScreen;