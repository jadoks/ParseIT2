import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ChangePasswordProps {
  onBack: () => void;
}

export const ChangePassword = ({ onBack }: ChangePasswordProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <View style={styles.mainContainer}>
      <View style={styles.maxWidthWrapper}>
        
        {/* HEADER SECTION */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#1E293B" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Security Settings</Text>
            <Text style={styles.headerSub}>Ensure your account stays protected</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* MAIN FORM CARD - With Visible Red Border Line */}
          <View style={styles.formCard}>
            
            {/* INFO BANNER */}
            <View style={styles.infoBanner}>
              <Icon name="shield-lock-outline" size={20} color="#059669" />
              <Text style={styles.infoText}>
                Strong passwords include a mix of letters, numbers, and symbols.
              </Text>
            </View>

            {/* CURRENT PASSWORD */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CURRENT PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Icon name="lock-open-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="••••••••••••" 
                  secureTextEntry={true}
                  placeholderTextColor="#A0AEC0"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
              </View>
            </View>

            {/* NEW PASSWORD */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NEW PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Icon name="form-textbox-password" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="••••••••••••" 
                  secureTextEntry={true}
                  placeholderTextColor="#A0AEC0"
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
              </View>
            </View>

            {/* CONFIRM NEW PASSWORD */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Icon name="lock-check-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="••••••••••••" 
                  secureTextEntry={true}
                  placeholderTextColor="#A0AEC0"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>

            {/* SUBMIT BUTTON */}
            <TouchableOpacity style={styles.mainButton} activeOpacity={0.8}>
              <Icon name="shield-key" size={20} color="#FFF" style={{marginRight: 8}} />
              <Text style={styles.mainButtonText}>Save New Password</Text>
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
    shadowColor: '#FF4D4D',   // Subtle red-tinted shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
  },

  infoBanner: { flexDirection: 'row', backgroundColor: '#ECFDF5', padding: 15, borderRadius: 12, marginBottom: 25, alignItems: 'center' },
  infoText: { color: '#065F46', fontSize: 13, marginLeft: 10, flex: 1, fontWeight: '500' },

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