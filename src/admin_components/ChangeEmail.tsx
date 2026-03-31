import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ChangeEmailProps {
  onBack: () => void;
}

export const ChangeEmail = ({ onBack }: ChangeEmailProps) => {
  const [password, setPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const handleVerificationRequest = () => {
    Alert.alert("Verification Sent", "Please check your new email for a verification code.");
  };

  return (
    <View style={styles.mainContainer}>
      <View style={styles.maxWidthWrapper}>
        
        {/* HEADER SECTION */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#1E293B" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Email Settings</Text>
            <Text style={styles.headerSub}>Update your primary contact address</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* MAIN FORM CARD - With Visible Red Border Line */}
          <View style={styles.formCard}>
            
            {/* INFO BANNER */}
            <View style={styles.infoBanner}>
              <Icon name="information-outline" size={20} color="#3B82F6" />
              <Text style={styles.infoText}>
                We will send a security code to your new email to verify ownership.
              </Text>
            </View>

            {/* NEW EMAIL INPUT */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NEW EMAIL ADDRESS</Text>
              <View style={styles.inputWrapper}>
                <Icon name="email-fast-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="name@example.com" 
                  placeholderTextColor="#A0AEC0"
                  value={newEmail}
                  onChangeText={setNewEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TouchableOpacity style={styles.verifyBadge} onPress={handleVerificationRequest}>
                  <Text style={styles.verifyBadgeText}>Verify</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* VERIFICATION CODE */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>VERIFICATION CODE</Text>
              <View style={styles.inputWrapper}>
                <Icon name="shield-check-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter 6-digit code" 
                  placeholderTextColor="#A0AEC0"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                />
              </View>
            </View>

            {/* PASSWORD CONFIRMATION */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Icon name="lock-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter current password" 
                  secureTextEntry={true}
                  placeholderTextColor="#A0AEC0"
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            {/* SUBMIT BUTTON */}
            <TouchableOpacity style={styles.mainButton} activeOpacity={0.8}>
              <Icon name="check-circle" size={20} color="#FFF" style={{marginRight: 8}} />
              <Text style={styles.mainButtonText}>Update Email Address</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center' },
  maxWidthWrapper: { width: '90%', maxWidth: 650, height: '100%', marginTop: 50 },
  
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  backButton: { width: 45, height: 45, backgroundColor: '#FFF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#1E293B' },
  headerSub: { fontSize: 14, color: '#64748B', marginTop: 2 },

  scrollContent: { paddingBottom: 50 },

  // --- UPDATED: PURE WHITE WITH VISIBLE RED BORDER LINE ---
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 35,
    borderWidth: 2,           // Thicker line for visibility
    borderColor: '#FFCACA',   // VIBRANT LIGHT RED LINE
    elevation: 5,
    shadowColor: '#FF4D4D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
  },

  infoBanner: { flexDirection: 'row', backgroundColor: '#EFF6FF', padding: 15, borderRadius: 12, marginBottom: 25, alignItems: 'center' },
  infoText: { color: '#1E40AF', fontSize: 13, marginLeft: 10, flex: 1, fontWeight: '500' },

  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 11, fontWeight: '900', color: '#94A3B8', marginBottom: 8, letterSpacing: 1 },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 14, 
    height: 55 
  },
  inputIcon: { marginLeft: 15 },
  input: { flex: 1, height: '100%', paddingHorizontal: 12, fontSize: 15, color: '#1E293B', fontWeight: '500' },
  
  verifyBadge: { backgroundColor: '#FF4D4D', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 8, marginRight: 10 },
  verifyBadgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

  mainButton: { 
    backgroundColor: '#FF4D4D', 
    height: 55, 
    borderRadius: 14, 
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 15,
    shadowColor: '#FF4D4D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  mainButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});