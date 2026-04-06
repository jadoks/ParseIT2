import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface SettingsAppProps {
  onNavigateEmail: () => void;
  onNavigatePassword: () => void;
}

export const SettingsApp = ({ onNavigateEmail, onNavigatePassword }: SettingsAppProps) => {
  return (
    <View style={styles.mainContainer}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <Text style={styles.title}>Account Settings</Text>
          <Text style={styles.subTitle}>Manage your security and profile preferences</Text>
        </View>

        {/* MAIN SETTINGS CONTAINER - Pure White with Visible Red Border */}
        <View style={styles.mainSettingsCard}>
          
          {/* SECURITY BANNER */}
          <View style={styles.securityBanner}>
            <View style={styles.infoIconWrapper}>
                <Icon name="shield-check" size={22} color="#10B981" />
            </View>
            <Text style={styles.securityText}>
              Your account security is our priority. Keep your credentials updated.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>SECURITY & ACCESS</Text>

          <View style={styles.optionsContainer}>
            {/* Change Email Card */}
            <TouchableOpacity 
              style={styles.card} 
              activeOpacity={0.7}
              onPress={onNavigateEmail}
            >
              <View style={[styles.iconBackground, { backgroundColor: '#EEF2FF' }]}>
                <Icon name="email-fast-outline" size={26} color="#4F46E5" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Change Email Address</Text>
                <Text style={styles.cardDescription}>inuadajohnlyndo@gmail.com</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Change Password Card */}
            <TouchableOpacity 
              style={styles.card} 
              activeOpacity={0.7}
              onPress={onNavigatePassword}
            >
              <View style={[styles.iconBackground, { backgroundColor: '#FFF7ED' }]}>
                <Icon name="shield-lock-outline" size={26} color="#EA580C" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Change Password</Text>
                <Text style={styles.cardDescription}>Update your security key regularly</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#CBD5E1" />
            </TouchableOpacity>
          </View>

          {/* FOOTER BRANDING */}
          <View style={styles.footerBranding}>
             <Icon name="pulse" size={18} color="#FF4D4D" />
             <Text style={styles.footerText}>PasersHub Security Protocol</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, marginTop: 40, width: '100%' },
  scrollContent: { alignItems: 'center', paddingBottom: 80 },
  
  header: { width: '92%', maxWidth: 800, marginBottom: 35, alignItems: 'flex-start' },
  title: { fontSize: 34, fontWeight: 'bold', color: '#1E293B' },
  subTitle: { fontSize: 16, color: '#64748B', marginTop: 5 },

  // --- UPDATED: PURE WHITE WITH VISIBLE RED BORDER LINE ---
  mainSettingsCard: {
    width: '92%', 
    maxWidth: 800,
    backgroundColor: '#FFFFFF', // PURE WHITE BACKGROUND
    padding: 40, 
    borderRadius: 30,
    borderWidth: 2,           // Thicker line for visibility
    borderColor: '#FFCACA',   // VIBRANT LIGHT RED LINE
    elevation: 5, 
    shadowColor: '#FF4D4D', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 20
  },

  securityBanner: { 
    flexDirection: 'row', 
    backgroundColor: '#F8FAFC', 
    padding: 18, 
    borderRadius: 16, 
    marginBottom: 30, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  infoIconWrapper: {
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 10,
    marginRight: 15
  },
  securityText: { color: '#065F46', fontSize: 14, flex: 1, fontWeight: '500' },

  sectionLabel: { fontSize: 12, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 20, marginLeft: 5 },
  
  optionsContainer: { gap: 15 },
  card: { 
    backgroundColor: '#FFFFFF', 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 22, 
    borderRadius: 18, 
    borderWidth: 1, 
    borderColor: '#F1F5F9', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.02, 
    shadowRadius: 5 
  },
  iconBackground: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  cardDescription: { fontSize: 14, color: '#94A3B8', marginTop: 4 },

  footerBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 35,
    opacity: 0.4
  },
  footerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
    marginLeft: 10,
    textTransform: 'uppercase',
    letterSpacing: 1
  }
});