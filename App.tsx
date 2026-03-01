import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import SignIn from './src/screens/SignIn';
import StudentApp from './src/StudentApp';
import TeacherApp from './src/TeacherApp';

export default function App() {

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'student' | 'teacher' | 'admin' | null>(null);

  const handleLogin = (role: 'student' | 'teacher' | 'admin') => {
    setUserRole(role);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setUserRole(null);
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <SignIn onLogIn={handleLogin} />
      </SafeAreaView>
    );
  }

  if (userRole === 'teacher') {
    return <TeacherApp onLogout={handleLogout} />;
  }

  if (userRole === 'student') {
    return <StudentApp onLogout={handleLogout} />;
  }

  return null;
}