import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import AdminApp from './src/AdminApp';
import LandingPage from './src/screens/LandingPage';
import SignIn from './src/screens/SignIn';
import StudentApp from './src/StudentApp';
import TeacherApp from './src/TeacherApp';

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'student' | 'teacher' | 'admin' | null>(null);

  const handleLogin = (role: 'student' | 'teacher' | 'admin') => {
    setUserRole(role);
    setIsLoggedIn(true);
    setShowLanding(false);
  };

  const handleLogout = () => {
    setUserRole(null);
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

  if (userRole === 'teacher') {
    return <TeacherApp onLogout={handleLogout} />;
  }

  if (userRole === 'student') {
    return <StudentApp onLogout={handleLogout} />;
  }

  if (userRole === 'admin') {
    return <AdminApp onLogout={handleLogout} />;
  }

  return null;
}