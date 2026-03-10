import React, { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AnnouncementModal, { Announcement } from './components/AnnouncementModal';
import Assignments from './screens/Assignments';
import Community from './screens/Community';
import CourseDetail from './screens/CourseDetail';
import Dashboard from './screens/Dashboard';
import Messenger from './screens/Messenger';
import MyJourney from './screens/MyJourney';
import Grades from './teacher_components/Grades'; // Imported Grades
import Honors from './teacher_components/Honors';
import ShareAnnouncement from './teacher_components/ShareAnnouncement';
import DrawerMenu from './teacher_components/TeacherDrawerMenu';
import Header from './teacher_components/TeacherHeader';

interface Props {
  onLogout: () => void;
}

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    title: 'Welcome Back!',
    message: 'Check out the latest updates and announcements from your courses.',
    bannerImage: require('../assets/announcement/1.png'),
  },
];

export default function TeacherApp({ onLogout }: Props) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  // Updated the type to include 'grades'
  const [activeScreen, setActiveScreen] = useState<
    'home' | 'game' | 'grades' | 'videos' | 'myjourney' | 'profile' | 'messenger' | 'assignments' | 'coursedetail' | 'community'
  >('home');
  
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      
      <Header
        isLargeScreen={isLargeScreen}
        activeScreen={activeScreen}
        onNavigate={(screen) => setActiveScreen(screen as any)}
        onSearchChange={() => {}}
      />

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {isLargeScreen && (
          <DrawerMenu
            isFixed={true}
            activeScreen={activeScreen as any}
            onNavigate={(s) => setActiveScreen(s as any)}
            userName="Ramcee Jade L. Munoz"
            userEmail="teacher@email.com"
            onAvatarPress={() => {}}
            setIsLoggedIn={onLogout}
          />
        )}

        <View style={{ flex: 1 }}>
          {/* Dashboard view */}
          {activeScreen === 'home' && <Dashboard announcements={ANNOUNCEMENTS} />}
          
          {/* Honors view */}
          {activeScreen === 'game' && <Honors />}

          {/* Grades view - Now correctly mapped to its own state */}
          {activeScreen === 'grades' && <Grades />}
          
          {/* Profile view */}
          {activeScreen === 'profile' && <MyJourney />}
          
          {/* Announcement list view */}
          {activeScreen === 'videos' && <ShareAnnouncement />}
          
          {/* Other screens */}
          {activeScreen === 'myjourney' && <MyJourney />}
          {activeScreen === 'assignments' && <Assignments />}
          {activeScreen === 'community' && <Community />}
          {activeScreen === 'messenger' && (
            <Messenger searchQuery="" onConversationActiveChange={() => {}} />
          )}
          {activeScreen === 'coursedetail' && (
            <CourseDetail initialTab="materials" onBack={() => setActiveScreen('home')} />
          )}
        </View>
      </View>

      <AnnouncementModal
        visible={activeScreen === 'home' && showAnnouncement}
        onClose={() => setShowAnnouncement(false)}
        announcements={ANNOUNCEMENTS}
      />

    </SafeAreaView>
  );
}