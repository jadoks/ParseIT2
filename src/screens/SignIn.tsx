import React, { useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

interface SignInProps {
  onLogIn?: (role: 'student' | 'teacher' | 'admin') => void;
}

const SignIn = ({ onLogIn }: SignInProps) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher' | 'admin' | null>(null);

  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  // Demo accounts (hardcoded for development/demo)
  const demoAccounts = {
    student: { id: 'STU12345', password: 'student123', role: 'student' },
    teacher: { id: 'TCH67890', password: 'teacher456', role: 'teacher' },
    admin: { id: 'ADM00001', password: 'admin789', role: 'admin' },
  };

  const handleDemoLogin = (role: 'student' | 'teacher' | 'admin') => {
    const account = demoAccounts[role];
    setId(account.id);
    setPassword(account.password);
    setSelectedRole(role);
  };

  const handleLogIn = () => {
    if (!id.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your ID and password.');
      return;
    }

    const enteredId = id.trim().toUpperCase();
    const enteredPass = password.trim();

    let valid = false;
    let role: 'student' | 'teacher' | 'admin' | null = null;

    if (enteredId === demoAccounts.student.id && enteredPass === demoAccounts.student.password) {
      valid = true;
      role = 'student';
    } else if (enteredId === demoAccounts.teacher.id && enteredPass === demoAccounts.teacher.password) {
      valid = true;
      role = 'teacher';
    } else if (enteredId === demoAccounts.admin.id && enteredPass === demoAccounts.admin.password) {
      valid = true;
      role = 'admin';
    }

    if (valid && role) {
      console.log(`Login successful as ${role} - ID: ${enteredId}`);
      onLogIn?.(role);
    } else {
      Alert.alert(
        'Login Failed',
        'Invalid ID or password.\n\nTry one of the demo accounts:\n' +
          'Student: STU12345 / student123\n' +
          'Teacher:  TCH67890 / teacher456\n' +
          'Admin:    ADM00001 / admin789'
      );
    }
  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'Please contact your system administrator.');
  };

  return (
    <ImageBackground
      source={
        isLargeScreen
          ? require('../../assets/images/ctu_argao_banner_LargeScreen.jpg')
          : require('../../assets/images/ctu_argao_banner.jpg')
      }
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { width: isLargeScreen ? '30%' : '100%' }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Sign In Heading */}
          <Text style={styles.heading}>Sign In</Text>

          {/* Welcome Message */}
          <Text style={styles.subheading}>Welcome, Parsers!</Text>

          {/* Demo Account Buttons */}
          <View style={styles.demoContainer}>
            <Text style={styles.demoTitle}>Demo Accounts (for testing):</Text>

            <TouchableOpacity
              style={[
                styles.demoButton,
                selectedRole === 'student' && styles.demoButtonActive,
              ]}
              onPress={() => handleDemoLogin('student')}
            >
              <Text style={styles.demoButtonText}>Student</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.demoButton,
                selectedRole === 'teacher' && styles.demoButtonActive,
              ]}
              onPress={() => handleDemoLogin('teacher')}
            >
              <Text style={styles.demoButtonText}>Teacher</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.demoButton,
                selectedRole === 'admin' && styles.demoButtonActive,
              ]}
              onPress={() => handleDemoLogin('admin')}
            >
              <Text style={styles.demoButtonText}>Admin</Text>
            </TouchableOpacity>
          </View>

          {/* ID Input */}
          <TextInput
            style={styles.input}
            placeholder="Enter ID"
            placeholderTextColor="#C62828"
            value={id}
            onChangeText={setId}
            autoCapitalize="characters"
          />

          {/* Password Input */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter Password"
              placeholderTextColor="#C62828"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.showPasswordBtn}
            >
              <Text style={styles.showPasswordText}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Log In Button */}
          <TouchableOpacity
            style={styles.logInButton}
            onPress={handleLogIn}
            activeOpacity={0.8}
          >
            <Text style={styles.logInText}>Log In</Text>
          </TouchableOpacity>

          {/* Forgot Password Link */}
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    alignSelf: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  logoContainer: {
    marginBottom: 32,
    width: wp('20'),
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  heading: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 16,
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  demoContainer: {
    width: '100%',
    marginBottom: 24,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  demoTitle: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  demoButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingVertical: 10,
    marginVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  demoButtonActive: {
    backgroundColor: '#D32F2F',
    borderColor: '#D32F2F',
  },
  demoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEE',
    marginBottom: 24,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
  },
  showPasswordBtn: {
    paddingHorizontal: 16,
  },
  showPasswordText: {
    color: '#D32F2F',
    fontWeight: '600',
  },
  logInButton: {
    width: '100%',
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  logInText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  forgotPassword: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    textDecorationLine: 'none',
  },
});

export default SignIn;