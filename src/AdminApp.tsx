import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Import All Components
import { AdminManagement } from './admin_components/AdminManagement';
import { DashboardCards } from './admin_components/DashboardCards';
import { PerformanceChart } from './admin_components/PerformanceChart';
import { Sidebar } from './admin_components/Sidebar';
import StudentManagement from './admin_components/StudentManagement';
import { StudentTable } from './admin_components/StudentTable';
import { TopBar } from './admin_components/TopBar';

// Named Import matches the 'export const' in TeacherManagement.tsx
import { TeacherManagement } from './admin_components/TeacherManagement';

interface AdminAppProps {
  onLogout: () => void;
}

export default function AdminApp({ onLogout }: AdminAppProps) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [logoutVisible, setLogoutVisible] = useState(false);

  const handleLogout = () => setLogoutVisible(true);

  const confirmLogout = () => {
    setLogoutVisible(false);
    onLogout(); 
  };

  return (
    <View style={styles.container}>
      {/* 1. SIDEBAR */}
      <Sidebar 
        onLogout={handleLogout} 
        onTabChange={setActiveTab} 
        activeTab={activeTab}
      />

      <View style={styles.content}>
        {/* 2. TOPBAR */}
        <TopBar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          onLogout={handleLogout} 
        />
        
        <ScrollView 
          style={styles.scroll} 
          contentContainerStyle={styles.scrollPadding}
          showsVerticalScrollIndicator={false}
        >
          {/* TAB LOGIC */}
          {activeTab === 'Dashboard' ? (
            <View style={styles.maxWidthContainer}>
              
              {/* CLEAN WHITE THEME BANNER (Red Line Removed) */}
              <View style={styles.banner}>
                <View style={styles.bannerContent}>
                  <Text style={styles.bannerTitle}>Set Up Academic Year</Text>
                  <Text style={styles.bannerSub}>SESSION YEAR: 2025 - 2026</Text>
                  
                  <View style={styles.bannerActions}>
                    <TouchableOpacity style={styles.btnEnd}>
                      <Text style={styles.btnTextEnd}>End Semester ›</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.btnCreate}>
                      <Text style={styles.btnTextCreate}>+ Create Semester</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <DashboardCards />
              
              <View style={styles.analyticsHeader}>
                <View style={styles.diamond} />
                <Text style={styles.analyticsTitle}>Academic Performance Analytics</Text>
              </View>

              <View style={styles.cardShadow}><StudentTable /></View>
              <View style={{ height: 40 }} />
              <View style={styles.cardShadow}><PerformanceChart /></View>
            </View>
          ) : activeTab === 'Students' ? ( 
            <View style={styles.maxWidthContainer}>
                <StudentManagement />
            </View>
          ) : activeTab === 'Teacher' ? ( 
            <View style={styles.maxWidthContainer}>
                <TeacherManagement />
            </View>
          ) : activeTab === 'Admin' ? (
            <View style={styles.maxWidthContainer}>
                <AdminManagement />
            </View>
          ) : (
            <View style={styles.placeholder}>
              <Text style={{color: '#94A3B8', fontSize: 18}}>Section: {activeTab}</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* LOGOUT MODAL */}
      <Modal visible={logoutVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalSub}>Are you sure you want to log out of PasersHub 2.0?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setLogoutVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmLogout}>
                <Text style={styles.confirmBtnText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#F8FAFC' },
  content: { flex: 1 },
  scroll: { flex: 1 },
  scrollPadding: { padding: 40, paddingBottom: 100 },
  maxWidthContainer: { maxWidth: 1300, alignSelf: 'center', width: '100%' },

  // BANNER STYLES
  banner: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 40, 
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  bannerContent: { zIndex: 2 },
  bannerTitle: { fontSize: 30, fontWeight: 'bold', color: '#1E293B' },
  bannerSub: { fontSize: 14, color: '#64748B', marginTop: 8, marginBottom: 25, fontWeight: '600' },
  
  bannerActions: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },

  btnEnd: { 
    backgroundColor: '#FEF2F2', 
    paddingHorizontal: 25, 
    paddingVertical: 12, 
    borderRadius: 10, 
    marginRight: 20 
  },
  btnTextEnd: { color: '#FF4D4D', fontWeight: 'bold' },

  btnCreate: { paddingVertical: 12 },
  btnTextCreate: { color: '#FF4D4D', fontWeight: 'bold', fontSize: 15 },

  analyticsHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 50, marginBottom: 25 },
  diamond: { width: 10, height: 10, backgroundColor: '#FF4D4D', transform: [{ rotate: '45deg' }], marginRight: 15 },
  analyticsTitle: { color: '#1E293B', fontSize: 24, fontWeight: 'bold' },
  
  cardShadow: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },

  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: 350, backgroundColor: '#FFF', borderRadius: 20, padding: 30, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginBottom: 10 },
  modalSub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 30, lineHeight: 20 },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  cancelBtnText: { color: '#94A3B8', fontWeight: '700' },
  confirmBtn: { flex: 1, backgroundColor: '#FF4D4D', borderRadius: 12, alignItems: 'center', paddingVertical: 12, marginLeft: 10 },
  confirmBtnText: { color: '#FFF', fontWeight: 'bold' }
});