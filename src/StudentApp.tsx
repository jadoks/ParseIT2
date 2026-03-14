import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AnnouncementModal, { Announcement } from './components/AnnouncementModal';
import DrawerMenu from './components/DrawerMenu';
import GeminiFloatingModal from './components/GeminiFloatingModal';
import Header from './components/Header';

import Assignments, {
  AssignmentComment,
  AssignmentCourse,
  AssignmentFileUpload,
  AssignmentItem,
} from './screens/Assignments';
import ClassesScreen from './screens/ClassesScreen';
import Community from './screens/Community';
import CourseDetail, {
  CourseAssignment,
  CourseAssignmentComment,
  CourseDetailData,
} from './screens/CourseDetail';
import Dashboard, { DashboardAssignment } from './screens/Dashboard';
import Game from './screens/Game';
import GenerateActivity, { GenerateActivityData } from './screens/GenerateActivity';
import Messenger from './screens/Messenger';
import MyJourney from './screens/MyJourney';
import Profile from './screens/Profile';
import Videos from './screens/Videos';

interface Props {
  onLogout: () => void;
}

type ScreenType =
  | 'home'
  | 'classes'
  | 'game'
  | 'videos'
  | 'myjourney'
  | 'profile'
  | 'messenger'
  | 'assignments'
  | 'coursedetail'
  | 'community'
  | 'generateactivity';

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    title: 'Welcome Back!',
    message: 'Check out the latest updates and announcements from your courses.',
    bannerImage: require('../assets/announcement/1.png'),
  },
  {
    id: '2',
    title: 'New Course Available!',
    message: 'Check out the new course on advanced programming techniques.',
    bannerImage: require('../assets/announcement/2.png'),
  },
  {
    id: '3',
    title: 'New Assignment Available!',
    message: 'Check out the new assignment for your current course.',
    bannerImage: require('../assets/announcement/3.png'),
  },
];

const COURSES: CourseDetailData[] = [
  {
    id: '1',
    name: 'Web Development 101',
    code: 'CS-101',
    instructor: 'Prof. John Smith',
    description:
      'Learn the fundamentals of web development including HTML, CSS, JavaScript, and introductory React concepts.',
    materials: [
      { id: 'm1', title: 'HTML Basics Tutorial', type: 'video', uploadedDate: '2026-02-01' },
      { id: 'm2', title: 'CSS Styling Guide', type: 'pdf', uploadedDate: '2026-02-03' },
      { id: 'm3', title: 'JavaScript Fundamentals', type: 'video', uploadedDate: '2026-02-05' },
      { id: 'm4', title: 'React Components Introduction', type: 'document', uploadedDate: '2026-02-07' },
      { id: 'm5', title: 'Project Guidelines', type: 'document', uploadedDate: '2026-02-10' },
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
        files: [
          {
            id: 'f-a1-1',
            name: 'React_Fundamentals_Quiz_submission.pdf',
            uploadedAt: '2026-02-15 08:30 AM',
          },
        ],
        comments: [
          {
            id: 'c-a1-1',
            author: 'Prof. John Smith',
            content: 'Please review the related materials before attempting the next activity.',
            timestamp: '2026-02-15 09:00 AM',
            isInstructor: true,
          },
        ],
      },
      {
        id: 'a2',
        title: 'Build a Simple Website',
        dueDate: '2026-02-20',
        status: 'graded',
        points: 42,
        maxPoints: 50,
        topic: 'HTML and CSS Layout',
        materialIds: ['m1', 'm2', 'm5'],
        files: [
          {
            id: 'f-a2-1',
            name: 'Simple_Website_Project.zip',
            uploadedAt: '2026-02-20 09:10 AM',
          },
          {
            id: 'f-a2-2',
            name: 'Project_Screenshots.pdf',
            uploadedAt: '2026-02-20 09:12 AM',
          },
        ],
        comments: [
          {
            id: 'c-a2-1',
            author: 'Prof. John Smith',
            content: 'Good work. Continue practicing to strengthen your understanding.',
            timestamp: '2026-02-20 09:30 AM',
            isInstructor: true,
          },
        ],
      },
      {
        id: 'a3',
        title: 'JavaScript Basics Checkpoint',
        dueDate: '2026-02-24',
        status: 'submitted',
        points: 0,
        maxPoints: 25,
        topic: 'JavaScript Fundamentals',
        materialIds: ['m3'],
        files: [
          {
            id: 'f-a3-1',
            name: 'JS_Basics_Checkpoint.docx',
            uploadedAt: '2026-02-24 07:50 AM',
          },
        ],
        comments: [],
      },
      {
        id: 'a4',
        title: 'Responsive Design Exercise',
        dueDate: '2026-02-28',
        status: 'pending',
        points: 0,
        maxPoints: 30,
        topic: 'Responsive Design',
        materialIds: ['m2', 'm5'],
        files: [],
        comments: [],
      },
    ],
  },
  {
    id: '2',
    name: 'Programming Logic',
    code: 'CS-102',
    instructor: 'Prof. Maria Santos',
    description: 'Understand variables, conditions, loops, and basic program flow.',
    materials: [
      { id: 'm6', title: 'Variables and Data Types', type: 'pdf', uploadedDate: '2026-02-02' },
      { id: 'm7', title: 'Conditional Statements', type: 'video', uploadedDate: '2026-02-04' },
      { id: 'm8', title: 'Looping Concepts', type: 'document', uploadedDate: '2026-02-06' },
    ],
    assignments: [
      {
        id: 'a5',
        title: 'Conditional Statements Quiz',
        dueDate: '2026-02-16',
        status: 'graded',
        points: 14,
        maxPoints: 20,
        topic: 'Conditional Statements',
        materialIds: ['m7'],
        files: [
          {
            id: 'f-a5-1',
            name: 'Conditional_Statements_Quiz.pdf',
            uploadedAt: '2026-02-16 08:05 AM',
          },
        ],
        comments: [
          {
            id: 'c-a5-1',
            author: 'Prof. Maria Santos',
            content: 'Good work. Continue practicing to strengthen your understanding.',
            timestamp: '2026-02-16 08:40 AM',
            isInstructor: true,
          },
        ],
      },
      {
        id: 'a6',
        title: 'Loops Practice Set',
        dueDate: '2026-02-21',
        status: 'graded',
        points: 10,
        maxPoints: 20,
        topic: 'Loops',
        materialIds: ['m8'],
        files: [
          {
            id: 'f-a6-1',
            name: 'Loops_Practice_Set.docx',
            uploadedAt: '2026-02-21 07:55 AM',
          },
        ],
        comments: [
          {
            id: 'c-a6-1',
            author: 'Prof. Maria Santos',
            content: 'Please review the related materials before attempting the next activity.',
            timestamp: '2026-02-21 08:15 AM',
            isInstructor: true,
          },
        ],
      },
    ],
  },
  {
    id: '3',
    name: 'Computer Fundamentals',
    code: 'IT-100',
    instructor: 'Prof. Allan Reyes',
    description: 'Explore basic computing concepts, hardware, software, and digital systems.',
    materials: [
      { id: 'm9', title: 'Hardware Overview', type: 'pdf', uploadedDate: '2026-02-01' },
      { id: 'm10', title: 'Software Systems', type: 'document', uploadedDate: '2026-02-05' },
    ],
    assignments: [
      {
        id: 'a7',
        title: 'Computer Basics Assessment',
        dueDate: '2026-02-18',
        status: 'graded',
        points: 18,
        maxPoints: 20,
        topic: 'Computer Architecture',
        materialIds: ['m9'],
        files: [
          {
            id: 'f-a7-1',
            name: 'Computer_Basics_Assessment.pdf',
            uploadedAt: '2026-02-18 08:20 AM',
          },
        ],
        comments: [
          {
            id: 'c-a7-1',
            author: 'Prof. Allan Reyes',
            content: 'Good work. Continue practicing to strengthen your understanding.',
            timestamp: '2026-02-18 08:45 AM',
            isInstructor: true,
          },
        ],
      },
    ],
  },
];

const mapCourseCommentsToAssignmentComments = (
  comments?: CourseAssignmentComment[]
): AssignmentComment[] => {
  return (comments || []).map((comment) => ({
    id: comment.id,
    author: comment.author,
    content: comment.content,
    timestamp: comment.timestamp,
    isInstructor: comment.isInstructor,
  }));
};

const mapCourseFilesToAssignmentFiles = (files?: CourseAssignment['files']): AssignmentFileUpload[] => {
  return (files || []).map((file) => ({
    id: file.id,
    fileName: file.name,
    fileSize: '1.2 MB',
    uploadedDate: file.uploadedAt,
  }));
};

const mapCourseAssignmentsToAssignmentItems = (
  assignments: CourseAssignment[]
): AssignmentItem[] => {
  return assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    dueDate: assignment.dueDate,
    status: assignment.status,
    points: assignment.points,
    maxPoints: assignment.maxPoints,
    topic: assignment.topic,
    materialIds: assignment.materialIds,
    comments: mapCourseCommentsToAssignmentComments(assignment.comments),
    files: mapCourseFilesToAssignmentFiles(assignment.files),
  }));
};

const mapCoursesToAssignmentCourses = (courses: CourseDetailData[]): AssignmentCourse[] => {
  return courses.map((course) => ({
    id: course.id,
    name: course.name,
    code: course.code,
    instructor: course.instructor,
    description: course.description,
    materials: course.materials.map((material) => ({
      id: material.id,
      title: material.title,
      type: material.type,
      uploadedDate: material.uploadedDate,
    })),
    assignments: mapCourseAssignmentsToAssignmentItems(course.assignments),
  }));
};

export default function StudentApp({ onLogout }: Props) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const [activeScreen, setActiveScreen] = useState<ScreenType>('home');
  const [lastScreen, setLastScreen] = useState<ScreenType>('home');
  const [selectedCourse, setSelectedCourse] = useState<CourseDetailData>(COURSES[0]);
  const [selectedCourseIdForAssignments, setSelectedCourseIdForAssignments] = useState<string | null>(null);
  const [generatedActivity, setGeneratedActivity] = useState<GenerateActivityData | null>(null);

  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);

  const [activeCourseTab, setActiveCourseTab] = useState<'materials' | 'assignments'>('materials');

  const sharedCourses = useMemo(() => mapCoursesToAssignmentCourses(COURSES), []);

  const [sharedAssignmentComments, setSharedAssignmentComments] = useState<Record<string, AssignmentComment[]>>(
    () =>
      Object.fromEntries(
        sharedCourses.flatMap((course) =>
          course.assignments.map((assignment) => [
            assignment.id,
            assignment.comments || [],
          ])
        )
      )
  );

  const [sharedAssignmentFiles, setSharedAssignmentFiles] = useState<Record<string, AssignmentFileUpload[]>>(
    () =>
      Object.fromEntries(
        sharedCourses.flatMap((course) =>
          course.assignments.map((assignment) => [
            assignment.id,
            assignment.files || [],
          ])
        )
      )
  );

  const hydratedSharedCourses = useMemo<AssignmentCourse[]>(() => {
    return sharedCourses.map((course) => ({
      ...course,
      assignments: course.assignments.map((assignment) => ({
        ...assignment,
        comments: sharedAssignmentComments[assignment.id] || [],
        files: sharedAssignmentFiles[assignment.id] || [],
      })),
    }));
  }, [sharedCourses, sharedAssignmentComments, sharedAssignmentFiles]);

  const selectedAssignmentCourse = useMemo(() => {
    return hydratedSharedCourses.find((course) => course.id === selectedCourse.id) || hydratedSharedCourses[0];
  }, [hydratedSharedCourses, selectedCourse.id]);

  const handleAddAssignmentComment = (assignmentId: string, content: string) => {
    if (!content.trim()) return;

    setSharedAssignmentComments((prev) => ({
      ...prev,
      [assignmentId]: [
        ...(prev[assignmentId] || []),
        {
          id: `c${Date.now()}`,
          author: 'You',
          content,
          timestamp: new Date().toLocaleString(),
          isInstructor: false,
        },
      ],
    }));
  };

  const handleAddAssignmentFile = (assignmentId: string, file: AssignmentFileUpload) => {
    setSharedAssignmentFiles((prev) => ({
      ...prev,
      [assignmentId]: [...(prev[assignmentId] || []), file],
    }));
  };

  const handleRemoveAssignmentFile = (assignmentId: string, fileId: string) => {
    setSharedAssignmentFiles((prev) => ({
      ...prev,
      [assignmentId]: (prev[assignmentId] || []).filter((file) => file.id !== fileId),
    }));
  };

  const getScorePercent = (assignment: {
    status: 'pending' | 'submitted' | 'graded';
    points?: number;
    maxPoints?: number;
  }) => {
    if (
      assignment.status !== 'graded' ||
      assignment.points === undefined ||
      assignment.maxPoints === undefined ||
      assignment.maxPoints === 0
    ) {
      return null;
    }
    return Math.round((assignment.points / assignment.maxPoints) * 100);
  };

  const buildGeneratedActivity = (
    course: CourseDetailData,
    assignment: DashboardAssignment | CourseAssignment | AssignmentItem
  ): GenerateActivityData | null => {
    const score = getScorePercent(assignment);
    if (score === null) return null;

    const recommendationType: GenerateActivityData['recommendationType'] =
      score < 60 ? 'review' : score < 75 ? 'practice' : 'advanced';

    const difficulty: GenerateActivityData['difficulty'] =
      recommendationType === 'review'
        ? 'easy'
        : recommendationType === 'practice'
        ? 'medium'
        : 'hard';

    const instructions =
      recommendationType === 'review'
        ? 'Review the concept explanation, answer the quick check, and complete the short response to strengthen your foundation.'
        : recommendationType === 'practice'
        ? 'Complete this guided practice to improve your understanding and become more confident with the topic.'
        : 'Take on this advanced follow-up activity to deepen your mastery of the topic.';

    return {
      courseId: course.id,
      courseName: course.name,
      courseCode: course.code,
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      topic: assignment.topic || assignment.title,
      score,
      recommendationType,
      difficulty,
      instructions,
      basedOnMaterials: course.materials
        .filter((material) => assignment.materialIds?.includes(material.id))
        .map((material) => material.title),
    };
  };

  const handleNavigate = (screen: ScreenType) => {
    if (activeScreen !== screen) {
      setLastScreen(activeScreen);
    }

    if (screen === 'assignments') {
      setSelectedCourseIdForAssignments(null);
    }

    if (screen !== 'generateactivity') {
      setGeneratedActivity(null);
    }

    setActiveScreen(screen);
    setMobileDrawerOpen(false);
  };

  const openCourse = (course: CourseDetailData) => {
    setSelectedCourse(course);
    setGeneratedActivity(null);
    setLastScreen(activeScreen);
    setActiveScreen('coursedetail');
    setActiveCourseTab('materials');
  };

  const openAssignments = (course: CourseDetailData) => {
    setSelectedCourse(course);
    setGeneratedActivity(null);
    setSelectedCourseIdForAssignments(course.id);
    setLastScreen(activeScreen);
    setActiveScreen('coursedetail');
    setActiveCourseTab('assignments');
  };

  const openMaterials = (course: CourseDetailData) => {
    setSelectedCourse(course);
    setGeneratedActivity(null);
    setLastScreen(activeScreen);
    setActiveScreen('coursedetail');
    setActiveCourseTab('materials');
  };

  const openGeneratedActivity = (
    course: CourseDetailData,
    assignment: DashboardAssignment | CourseAssignment | AssignmentItem
  ) => {
    const matchedCourse =
      COURSES.find((item) =>
        item.assignments.some((courseAssignment) => courseAssignment.id === assignment.id)
      ) || course;

    const activity = buildGeneratedActivity(matchedCourse, assignment);

    if (!activity) {
      return;
    }

    setSelectedCourse(matchedCourse);
    setSelectedCourseIdForAssignments(matchedCourse.id);
    setGeneratedActivity(activity);
    setLastScreen(activeScreen);
    setActiveScreen('generateactivity');
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'profile':
        return <Profile />;

      case 'home':
        return (
          <Dashboard
            announcements={ANNOUNCEMENTS}
            courses={hydratedSharedCourses}
            onOpenCourse={openCourse}
            onOpenAssignments={openAssignments}
            onOpenMaterials={openMaterials}
            onOpenGeneratedActivity={(course, assignment) =>
              openGeneratedActivity(course as CourseDetailData, assignment)
            }
          />
        );

      case 'classes':
        return (
          <ClassesScreen
            courses={hydratedSharedCourses}
            onCoursePress={(course) => {
              setSelectedCourse(course as unknown as CourseDetailData);
              setGeneratedActivity(null);
              setLastScreen('classes');
              setActiveScreen('coursedetail');
              setActiveCourseTab('materials');
            }}
            onAssignmentPress={(course) => {
              setSelectedCourse(course as unknown as CourseDetailData);
              setSelectedCourseIdForAssignments(course.id);
              setGeneratedActivity(null);
              setLastScreen('classes');
              setActiveScreen('coursedetail');
              setActiveCourseTab('assignments');
            }}
          />
        );

      case 'game':
        return <Game />;

      case 'videos':
        return <Videos onVideoActiveChange={setIsVideoActive} />;

      case 'myjourney':
        return <MyJourney />;

      case 'assignments':
        return (
          <Assignments
            courses={hydratedSharedCourses}
            selectedCourseId={selectedCourseIdForAssignments}
            assignmentComments={sharedAssignmentComments}
            assignmentFiles={sharedAssignmentFiles}
            onAddComment={handleAddAssignmentComment}
            onAddFile={handleAddAssignmentFile}
            onRemoveFile={handleRemoveAssignmentFile}
            onOpenGeneratedActivity={(course, assignment) =>
              openGeneratedActivity(selectedCourse, assignment)
            }
          />
        );

      case 'community':
        return <Community />;

      case 'messenger':
        return (
          <Messenger
            searchQuery=""
            onConversationActiveChange={setIsConversationActive}
          />
        );

      case 'coursedetail':
        return (
          <CourseDetail
            course={selectedAssignmentCourse}
            initialTab={activeCourseTab}
            onBack={() => setActiveScreen(lastScreen)}
            assignmentComments={sharedAssignmentComments}
            assignmentFiles={sharedAssignmentFiles}
            onAddComment={handleAddAssignmentComment}
            onAddFile={handleAddAssignmentFile}
            onRemoveFile={handleRemoveAssignmentFile}
            onGenerateActivity={(assignment) =>
              openGeneratedActivity(selectedCourse, assignment)
            }
          />
        );

      case 'generateactivity':
        return (
          <GenerateActivity
            activity={generatedActivity}
            onBack={() => setActiveScreen(lastScreen)}
          />
        );

      default:
        return (
          <Text style={{ textAlign: 'center', marginTop: 50 }}>
            Screen not found: {activeScreen}
          </Text>
        );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <Header
        isLargeScreen={isLargeScreen}
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        onSearchChange={() => {}}
      />

      {!isLargeScreen && activeScreen !== 'profile' && (
        <TouchableOpacity
          style={styles.floatingMenuBtn}
          onPress={() => setMobileDrawerOpen(!isMobileDrawerOpen)}
          activeOpacity={0.7}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      )}

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {isLargeScreen && activeScreen !== 'profile' && (
          <DrawerMenu
            isFixed={true}
            activeScreen={activeScreen}
            onNavigate={handleNavigate}
            userName="Student Name"
            userEmail="student@email.com"
            onAvatarPress={() => handleNavigate('profile')}
            setIsLoggedIn={() => onLogout()}
          />
        )}

        {!isLargeScreen && isMobileDrawerOpen && activeScreen !== 'profile' && (
          <>
            <TouchableOpacity
              style={styles.mobileBackdrop}
              activeOpacity={1}
              onPress={() => setMobileDrawerOpen(false)}
            />
            <View style={styles.mobileOverlay}>
              <DrawerMenu
                isFixed={false}
                onClose={() => setMobileDrawerOpen(false)}
                activeScreen={activeScreen}
                onNavigate={handleNavigate}
                userName="Student Name"
                userEmail="student@email.com"
                onAvatarPress={() => {
                  setMobileDrawerOpen(false);
                  handleNavigate('profile');
                }}
                setIsLoggedIn={() => onLogout()}
              />
            </View>
          </>
        )}

        <View style={{ flex: 1 }}>{renderScreen()}</View>
      </View>

      <AnnouncementModal
        visible={activeScreen === 'home' && showAnnouncement}
        onClose={() => setShowAnnouncement(false)}
        announcements={ANNOUNCEMENTS}
      />

      {!(activeScreen === 'messenger' && isConversationActive) &&
        !(activeScreen === 'videos' && isVideoActive) && (
          <TouchableOpacity
            style={styles.floatingChatBtn}
            activeOpacity={0.85}
            onPress={() => setIsChatOpen((prev) => !prev)}
          >
            {isChatOpen ? (
              <Text style={[styles.chatClose, { color: '#fff' }]}>✕</Text>
            ) : (
              <>
                <Image
                  source={require('../assets/images/AI.png')}
                  style={styles.chatBtnImage}
                />
                <Text style={styles.chatBtnLabel}>Ask anything</Text>
              </>
            )}
          </TouchableOpacity>
        )}

      <GeminiFloatingModal
        visible={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  floatingMenuBtn: {
    position: 'absolute',
    top: 135,
    left: 16,
    zIndex: 5,
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: '#D32F2F',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },

  menuIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },

  mobileBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9,
  },

  mobileOverlay: {
    position: 'absolute',
    zIndex: 10,
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#FFF',
  },

  floatingChatBtn: {
    position: 'absolute',
    bottom: 44,
    right: 20,
    zIndex: 20,
    width: 140,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#D32F2F',
    borderRadius: 28,
  },

  chatBtnImage: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },

  chatBtnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },

  chatClose: {
    fontSize: 20,
  },
});