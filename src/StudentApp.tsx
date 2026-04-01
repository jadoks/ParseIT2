import * as NavigationBar from 'expo-navigation-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
import Community, { CommunityPost } from './screens/Community';
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
import Notification, { NotificationItem } from './screens/Notification';
import Profile from './screens/Profile';
import Videos from './screens/Videos';

import FlipIt from './screens/games/flip-it';
import FruitMania from './screens/games/fruit-mania';
import QuizMasters from './screens/games/quiz-masters';

interface Props {
  onLogout: () => void;
}

type ScreenType =
  | 'home'
  | 'classes'
  | 'game'
  | 'flipit'
  | 'fruitmania'
  | 'quizmasters'
  | 'videos'
  | 'myjourney'
  | 'profile'
  | 'messenger'
  | 'assignments'
  | 'coursedetail'
  | 'community'
  | 'generateactivity'
  | 'notification';

const CURRENT_USER_NAME = 'Jade Lisondra';
const CURRENT_USER_EMAIL = 'jadelisondra101@gmail.com';

const CURRENT_USER_PROFILE_IMAGE = require('../assets/images/pogi.jpg');
const OTHER_USERS_PROFILE_IMAGE = require('../assets/images/default_profile.png');
const DEFAULT_BANNER_IMAGE = require('../assets/images/venti_bg.png');

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

const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: '1',
    userName: 'Ramcee Bading',
    userEmail: 'ramcee@email.com',
    avatar: OTHER_USERS_PROFILE_IMAGE,
    dateTime: 'Feb 24, 2026 10:30 AM',
    content: 'How do I solve this programming problem?',
    answers: [
      {
        id: 'a1',
        userName: 'Maria Santos',
        avatar: OTHER_USERS_PROFILE_IMAGE,
        answeredAt: 'Feb 24, 2026 11:00 AM',
        message: 'You can use a loop to repeat the process and make sure your variables are updated correctly.',
      },
      {
        id: 'a2',
        userName: 'John Reyes',
        avatar: OTHER_USERS_PROFILE_IMAGE,
        answeredAt: 'Feb 24, 2026 11:18 AM',
        message: 'Check your variables first, then trace the logic line by line to find where the issue starts.',
      },
    ],
  },
  {
    id: '2',
    userName: CURRENT_USER_NAME,
    userEmail: CURRENT_USER_EMAIL,
    avatar: CURRENT_USER_PROFILE_IMAGE,
    dateTime: 'Feb 23, 2026 11:30 AM',
    content: 'Is anyone attending the workshop tomorrow?',
    answers: [
      {
        id: 'a3',
        userName: 'Abai Clipord',
        avatar: OTHER_USERS_PROFILE_IMAGE,
        answeredAt: 'Feb 23, 2026 02:10 PM',
        message: 'Yes, I will be there tomorrow.',
      },
      {
        id: 'a4',
        userName: 'Ramcee Bading',
        avatar: OTHER_USERS_PROFILE_IMAGE,
        answeredAt: 'Feb 23, 2026 02:40 PM',
        message: 'Count me in. I already registered.',
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

const mapCourseFilesToAssignmentFiles = (
  files?: CourseAssignment['files']
): AssignmentFileUpload[] => {
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
  const insets = useSafeAreaInsets();

  const isLargeScreen = width >= 768;
  const isSmallScreen = width < 768;

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
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(INITIAL_COMMUNITY_POSTS);

  const [currentUserAvatar, setCurrentUserAvatar] = useState<any>(CURRENT_USER_PROFILE_IMAGE);
  const [currentUserBanner, setCurrentUserBanner] = useState<any>(DEFAULT_BANNER_IMAGE);
  const [hasImageChanged, setHasImageChanged] = useState(false);

  const isFullscreenScreen =
    activeScreen === 'flipit' ||
    activeScreen === 'fruitmania' ||
    activeScreen === 'quizmasters';

  const isMobileFullscreenScreen =
    isSmallScreen &&
    (
      activeScreen === 'messenger' ||
      activeScreen === 'notification' ||
      activeScreen === 'coursedetail' ||
      activeScreen === 'generateactivity'
    );

  const shouldShowHeader = !isFullscreenScreen && !isMobileFullscreenScreen;
  const shouldShowDesktopDrawer =
    !isFullscreenScreen &&
    !isMobileFullscreenScreen &&
    isLargeScreen &&
    activeScreen !== 'profile' &&
    activeScreen !== 'notification';

  const safeAreaEdges =
    isFullscreenScreen
      ? []
      : hasImageChanged
      ? ['top', 'right', 'bottom', 'left'] as const
      : ['right', 'left'] as const;

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const setupNavigation = async () => {
      try {
        if (isFullscreenScreen) {
          await NavigationBar.setBehaviorAsync('overlay-swipe');
          await NavigationBar.setVisibilityAsync('hidden');
        } else {
          await NavigationBar.setVisibilityAsync('visible');
        }
      } catch (error) {
        console.log('Navigation bar error:', error);
      }
    };

    setupNavigation();
  }, [isFullscreenScreen]);

  useEffect(() => {
    if (isMobileFullscreenScreen && isMobileDrawerOpen) {
      setMobileDrawerOpen(false);
    }
  }, [isMobileFullscreenScreen, isMobileDrawerOpen]);

  const handleChangeProfileImage = (image: any) => {
    setCurrentUserAvatar(image);
    setHasImageChanged(true);
  };

  const handleChangeBannerImage = (image: any) => {
    setCurrentUserBanner(image);
    setHasImageChanged(true);
  };

  const hydratedCommunityPosts = useMemo<CommunityPost[]>(() => {
    return communityPosts.map((post) => ({
      ...post,
      avatar:
        post.userEmail === CURRENT_USER_EMAIL || post.userName === CURRENT_USER_NAME
          ? currentUserAvatar
          : post.avatar,
      answers: post.answers.map((answer) => ({
        ...answer,
        avatar: answer.userName === CURRENT_USER_NAME ? currentUserAvatar : answer.avatar,
      })),
    }));
  }, [communityPosts, currentUserAvatar]);

  const sharedCourses = useMemo(() => mapCoursesToAssignmentCourses(COURSES), []);

  const [sharedAssignmentComments, setSharedAssignmentComments] = useState<Record<string, AssignmentComment[]>>(
    () =>
      Object.fromEntries(
        sharedCourses.flatMap((course) =>
          course.assignments.map((assignment) => [assignment.id, assignment.comments || []])
        )
      )
  );

  const [sharedAssignmentFiles, setSharedAssignmentFiles] = useState<Record<string, AssignmentFileUpload[]>>(
    () =>
      Object.fromEntries(
        sharedCourses.flatMap((course) =>
          course.assignments.map((assignment) => [assignment.id, assignment.files || []])
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

  const currentUserPosts = useMemo(() => {
    return hydratedCommunityPosts.filter(
      (post) => post.userName === CURRENT_USER_NAME || post.userEmail === CURRENT_USER_EMAIL
    );
  }, [hydratedCommunityPosts]);

  const handleAddAssignmentComment = (assignmentId: string, content: string) => {
    if (!content.trim()) return;

    setSharedAssignmentComments((prev) => ({
      ...prev,
      [assignmentId]: [
        ...(prev[assignmentId] || []),
        {
          id: `c${Date.now()}`,
          author: CURRENT_USER_NAME,
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

  const handleCreateCommunityPost = (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const newPost: CommunityPost = {
      id: `community-post-${Date.now()}`,
      userName: CURRENT_USER_NAME,
      userEmail: CURRENT_USER_EMAIL,
      avatar: currentUserAvatar,
      dateTime: new Date().toLocaleString(),
      content: trimmedQuery,
      answers: [],
    };

    setCommunityPosts((prev) => [newPost, ...prev]);
  };

  const handleAddCommunityAnswer = (postId: string, message: string) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    const newAnswer = {
      id: `community-answer-${Date.now()}`,
      userName: CURRENT_USER_NAME,
      avatar: currentUserAvatar,
      answeredAt: new Date().toLocaleString(),
      message: trimmedMessage,
    };

    setCommunityPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, answers: [...post.answers, newAnswer] }
          : post
      )
    );
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

  const studentNotifications = useMemo<NotificationItem[]>(() => {
    const notifications: NotificationItem[] = [];

    hydratedSharedCourses.forEach((course) => {
      course.materials.forEach((material) => {
        notifications.push({
          id: `material-${course.id}-${material.id}`,
          type: 'material',
          title: 'New Material',
          message: `${course.name}: ${material.title} was added to your learning materials.`,
          time: material.uploadedDate,
          read: false,
        });
      });

      course.assignments.forEach((assignment) => {
        notifications.push({
          id: `assignment-${course.id}-${assignment.id}`,
          type: 'assignment',
          title: 'New Assignment',
          message: `${course.name}: ${assignment.title} is available. Due on ${assignment.dueDate}.`,
          time: assignment.dueDate,
          read: assignment.status === 'graded',
        });

        const score = getScorePercent(assignment);

        if (score !== null && score < 75) {
          notifications.push({
            id: `support-${course.id}-${assignment.id}`,
            type: 'support-activity',
            title: 'Support Activity Recommended',
            message: `You may need extra support for ${assignment.topic || assignment.title} in ${course.name}.`,
            time: assignment.dueDate,
            read: false,
          });
        }
      });
    });

    hydratedCommunityPosts.forEach((post) => {
      const isUsersPost =
        post.userName === CURRENT_USER_NAME || post.userEmail === CURRENT_USER_EMAIL;

      if (isUsersPost && post.answers.length > 0) {
        post.answers.forEach((answer) => {
          if (answer.userName !== CURRENT_USER_NAME) {
            notifications.push({
              id: `community-answer-${post.id}-${answer.id}`,
              type: 'community-answer',
              title: 'New Answer on Your Question',
              message: `${answer.userName} answered your post: "${post.content}"`,
              time: answer.answeredAt,
              read: false,
            });
          }
        });
      }
    });

    if (generatedActivity) {
      notifications.unshift({
        id: `generated-activity-${generatedActivity.assignmentId}`,
        type: 'support-activity',
        title: 'Support Activity Ready',
        message: `A ${generatedActivity.recommendationType} activity is ready for ${generatedActivity.assignmentTitle}.`,
        time: 'Now',
        read: false,
      });
    }

    return notifications.sort((a, b) => (a.id < b.id ? 1 : -1));
  }, [hydratedSharedCourses, generatedActivity, hydratedCommunityPosts]);

  const unreadNotificationCount = useMemo(
    () => studentNotifications.filter((item) => !item.read).length,
    [studentNotifications]
  );

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
        return (
          <Profile
            userPosts={currentUserPosts}
            onCreatePost={handleCreateCommunityPost}
            onAddAnswer={handleAddCommunityAnswer}
            userName={CURRENT_USER_NAME}
            userEmail={CURRENT_USER_EMAIL}
            profileImage={currentUserAvatar}
            bannerImage={currentUserBanner}
            onChangeProfileImage={handleChangeProfileImage}
            onChangeBannerImage={handleChangeBannerImage}
          />
        );

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
        return <Game onNavigate={handleNavigate} />;

      case 'flipit':
        return <FlipIt onBack={() => setActiveScreen('game')} />;

      case 'fruitmania':
        return <FruitMania onBack={() => setActiveScreen('game')} />;

      case 'quizmasters':
        return <QuizMasters onBack={() => setActiveScreen('game')} />;

      case 'videos':
        return (
          <Videos
            onVideoActiveChange={setIsVideoActive}
            currentUserName={CURRENT_USER_NAME}
            currentUserAvatar={currentUserAvatar}
          />
        );

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
        return (
          <Community
            posts={hydratedCommunityPosts}
            userName={CURRENT_USER_NAME}
            userAvatar={currentUserAvatar}
            onCreatePost={handleCreateCommunityPost}
            onAddAnswer={handleAddCommunityAnswer}
          />
        );

      case 'messenger':
        return (
          <Messenger
            searchQuery=""
            onConversationActiveChange={setIsConversationActive}
            onBack={() => setActiveScreen(lastScreen)}
          />
        );

      case 'notification':
        return (
          <Notification
            onBack={() => setActiveScreen(lastScreen)}
            notifications={studentNotifications}
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
    <>
      <StatusBar
        hidden={isFullscreenScreen}
        translucent={isFullscreenScreen}
        backgroundColor={isFullscreenScreen ? 'transparent' : '#fff'}
        barStyle="dark-content"
      />

      <SafeAreaView
        style={[
          styles.safeArea,
          isFullscreenScreen && styles.safeAreaFullscreen,
          isMobileFullscreenScreen && styles.safeAreaMobileFullscreen,
        ]}
        edges={safeAreaEdges}
      >
        {shouldShowHeader && (
          <View style={styles.headerLayer}>
            <Header
              isLargeScreen={isLargeScreen}
              activeScreen={activeScreen}
              onNavigate={handleNavigate}
              onSearchChange={() => {}}
              notificationCount={unreadNotificationCount}
              onMenuPress={() => setMobileDrawerOpen((prev) => !prev)}
            />
          </View>
        )}

        <View
          style={[
            styles.contentLayer,
            isFullscreenScreen && styles.contentLayerFullscreen,
            isMobileFullscreenScreen && styles.contentLayerMobileFullscreen,
          ]}
        >
          {shouldShowDesktopDrawer && (
            <DrawerMenu
              isFixed={true}
              activeScreen={activeScreen}
              onNavigate={handleNavigate}
              userName={CURRENT_USER_NAME}
              userAvatar={currentUserAvatar}
              onAvatarPress={() => handleNavigate('profile')}
              setIsLoggedIn={() => onLogout()}
            />
          )}

          <View style={{ flex: 1 }}>{renderScreen()}</View>
        </View>

        {!isFullscreenScreen &&
          !isMobileFullscreenScreen &&
          !isLargeScreen &&
          isMobileDrawerOpen && (
            <View style={styles.mobileDrawerPortal}>
              <Pressable
                style={styles.mobileBackdrop}
                onPress={() => setMobileDrawerOpen(false)}
              />
              <View
                style={[
                  styles.mobileOverlay,
                  hasImageChanged && {
                    paddingTop: insets.top,
                    paddingBottom: insets.bottom,
                    paddingLeft: insets.left,
                    paddingRight: insets.right,
                  },
                ]}
              >
                <DrawerMenu
                  isFixed={false}
                  onClose={() => setMobileDrawerOpen(false)}
                  activeScreen={activeScreen}
                  onNavigate={handleNavigate}
                  userName={CURRENT_USER_NAME}
                  userAvatar={currentUserAvatar}
                  onAvatarPress={() => {
                    setMobileDrawerOpen(false);
                    handleNavigate('profile');
                  }}
                  setIsLoggedIn={() => onLogout()}
                />
              </View>
            </View>
          )}

        <AnnouncementModal
          visible={!isFullscreenScreen && activeScreen === 'home' && showAnnouncement}
          onClose={() => setShowAnnouncement(false)}
          announcements={ANNOUNCEMENTS}
        />

        {!isFullscreenScreen &&
          activeScreen !== 'messenger' &&
          activeScreen !== 'notification' &&
          activeScreen !== 'coursedetail' &&
          activeScreen !== 'generateactivity' &&
          !(activeScreen === 'videos' && isVideoActive) && (
            <Pressable
              style={[
                styles.floatingChatBtn,
                !isLargeScreen && styles.floatingChatBtnSmall,
                {
                  bottom: hasImageChanged ? insets.bottom + 12 : 12,
                  right: hasImageChanged ? insets.right + 20 : 20,
                },
              ]}
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
                  {isLargeScreen && (
                    <Text style={styles.chatBtnLabel}>Ask anything</Text>
                  )}
                </>
              )}
            </Pressable>
          )}

        {!isFullscreenScreen && (
          <GeminiFloatingModal
            visible={isChatOpen}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },

  safeAreaFullscreen: {
    backgroundColor: '#000',
  },

  safeAreaMobileFullscreen: {
    backgroundColor: '#fff',
  },

  headerLayer: {
    position: 'relative',
    zIndex: 1000,
    elevation: 1000,
  },

  contentLayer: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
    zIndex: 1,
  },

  contentLayerFullscreen: {
    flexDirection: 'column',
  },

  contentLayerMobileFullscreen: {
    flexDirection: 'column',
  },

  mobileDrawerPortal: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5000,
    elevation: 5000,
    flexDirection: 'row',
  },

  mobileBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  mobileOverlay: {
    width: 250,
    height: '100%',
    backgroundColor: '#FFF',
    zIndex: 5001,
    elevation: 5001,
  },

  floatingChatBtn: {
    position: 'absolute',
    bottom: 12,
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
    paddingHorizontal: 16,
  },

  floatingChatBtnSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },

  chatBtnImage: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },

  chatBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },

  chatClose: {
    fontSize: 20,
  },
});