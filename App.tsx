import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import AdminApp from './src/AdminApp';
import LandingPage from './src/screens/LandingPage';
import SignIn from './src/screens/SignIn';
import StudentApp from './src/StudentApp';
import TeacherApp from './src/TeacherApp';

type UserRole = 'student' | 'teacher' | 'admin';

type SignedInUser = {
  role: UserRole;
  id: string;
  email: string | null;
  authUid?: string | null;
  studentId?: string;
  teacherId?: string;
  adminId?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: any;
  bannerImage?: any;
};

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<SignedInUser | null>(null);

  const handleLogin = (user: SignedInUser) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    setShowLanding(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsLoggedIn(false);
    setShowLanding(true);
  };

  const handleGetStarted = () => {
    setShowLanding(false);
  };

  if (showLanding) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <LandingPage onGetStarted={handleGetStarted} />
      </SafeAreaView>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <SignIn
          onLogIn={handleLogin}
          onGoToLanding={() => setShowLanding(true)}
        />
      </SafeAreaView>
    );
  }

  if (currentUser?.role === 'teacher') {
    return (
      <TeacherApp
        onLogout={handleLogout}
        currentTeacher={{
          teacherId: currentUser.teacherId || currentUser.id,
          authUid: currentUser.authUid || null,
          firstName: currentUser.firstName || '',
          lastName: currentUser.lastName || '',
          email: currentUser.email || '',
          profileImage: currentUser.profileImage || null,
          bannerImage: currentUser.bannerImage || null,
        }}
      />
    );
  }

 if (currentUser?.role === 'student') {
    return (
      <StudentApp
        onLogout={handleLogout}
        currentStudent={{
          studentId: currentUser.studentId || currentUser.id,
          authUid: currentUser.authUid || null,
          firstName: currentUser.firstName || '',
          lastName: currentUser.lastName || '',
          email: currentUser.email || '',
          profileImage: currentUser.profileImage || null,
          bannerImage: currentUser.bannerImage || null,
        }}
      />
    );
}

  if (currentUser?.role === 'admin') {
    return <AdminApp onLogout={handleLogout} />;
  }

  return null;
}