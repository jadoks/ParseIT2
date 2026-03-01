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

  const [activeScreen, setActiveScreen] = useState<'home' | 'game' | 'videos' | 'myjourney' | 'profile' | 'messenger' | 'assignments' | 'coursedetail' | 'community'>('home');
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
            activeScreen={activeScreen}
            onNavigate={(s) => setActiveScreen(s as any)}
            userName="Teachers Name"
            userEmail="teacher@email.com"
            onAvatarPress={() => {}}
            setIsLoggedIn={onLogout}
          />
        )}

        <View style={{ flex: 1 }}>
          {activeScreen === 'home' && <Dashboard announcements={ANNOUNCEMENTS} />}
          {activeScreen === 'game' }
          {activeScreen === 'videos'}
          {activeScreen === 'myjourney' && <MyJourney />}
          {activeScreen === 'assignments' && <Assignments />}
          {activeScreen === 'community' && <Community />}
          {activeScreen === 'messenger' && <Messenger searchQuery="" onConversationActiveChange={() => {}} />}
          {activeScreen === 'coursedetail' && <CourseDetail initialTab="materials" onBack={() => setActiveScreen('home')} />}
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