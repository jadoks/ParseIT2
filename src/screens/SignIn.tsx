import React, { useState } from 'react';
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
interface SignInProps {
  onLogIn?: () => void;
}

const SignIn = ({ onLogIn }: SignInProps) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogIn = () => {
    console.log('Log In pressed', { id, password });
    onLogIn?.();
  };

  const handleForgotPassword = () => {
    console.log('Forgot Password pressed');
  };

  return (
    <ImageBackground
      source={require('../../assets/images/ctu_argao_banner.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

          {/* ID Input */}
          <TextInput
            style={styles.input}
            placeholder="Enter ID"
            placeholderTextColor="#C62828"
            value={id}
            onChangeText={setId}
            autoCapitalize="none"
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
    gradientOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: wp('20'),           // 35% of width
        height: hp('40'),          // 65% of height
        backgroundColor: 'rgba(230, 180, 180, 0.6)',
        borderBottomRightRadius: wp('100'), // full width = very soft curve
        opacity: 0.95,
        
    },
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'stretch',
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
    // backgroundColor: '#FFF', // ← remove or keep depending on your logo
    // borderRadius: 50,        // ← remove or keep for circle effect
    overflow: 'hidden',        // helpful when using borderRadius
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
    marginBottom: 32,
    textAlign: 'center',
    fontWeight: '500',
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
  togglePasswordBtn: {
    padding: 8,
  },
  passwordIcon: {
    fontSize: 20,
    color: '#D32F2F',
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