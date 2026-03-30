import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Components
import { AdminManagement } from './AdminManagement';
import { DashboardCards } from './DashboardCards';
import { PerformanceChart } from './PerformanceChart';
import { Sidebar } from './Sidebar';
import { StudentTable } from './StudentTable';
import { TopBar } from './TopBar';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [logoutVisible, setLogoutVisible] = useState(false);

  const confirmLogout = () => {
    setLogoutVisible(false);
    console.log("Logging out...");
  };

  return (
    <View style={styles.wrapper}>
      {/* SIDEBAR */}
      <Sidebar 
        onLogout={() => setLogoutVisible(true)} 
        onTabChange={setActiveTab} 
        activeTab={activeTab} 
      />

      <View style={styles.main}>
        <TopBar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          onLogout={() => setLogoutVisible(true)} 
        />
        
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {activeTab === 'Dashboard' ? (
            <View style={styles.contentContainer}>
              
              {/* BANNER SECTION */}
              <View style={styles.banner}>
                <View style={styles.bannerContent}>
                  <Text style={styles.bannerTitle}>Set Up Academic Year</Text>
                  <Text style={styles.bannerSub}>SESSION YEAR: 2025 - 2026</Text>
                  <View style={styles.bannerActions}>
                    <TouchableOpacity style={styles.btnEnd}>
                      <Text style={styles.btnTextWhite}>End Semester ›</Text>
                    </TouchableOpacity>
                    <TouchableOpacity>
                      <Text style={styles.btnCreateText}>+ Create Semester</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.paginationLine} />
              </View>

              <DashboardCards />

              <View style={styles.sectionHeaderWrapper}>
                <View style={styles.diamond} />
                <Text style={styles.sectionHeader}>Academic Performance Analytics</Text>
              </View>

              <View style={styles.cardShadow}><StudentTable /></View>
              <View style={{ height: 40 }} />
              <View style={styles.cardShadow}><PerformanceChart /></View>
            </View>
          ) : activeTab === 'Admin' ? (
            <View style={styles.contentContainer}>
               <AdminManagement /> 
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* MODAL */}
      <Modal visible={logoutVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalSub}>Are you sure you want to log out?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setLogoutVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
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
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, flexDirection: 'row', backgroundColor: '#F8FAFC' }, 
  main: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 30, paddingBottom: 100 },
  contentContainer: { maxWidth: 1300, alignSelf: 'center', width: '100%' },
  
  // BANNER STYLES
  banner: { 
    backgroundColor: '#1E293B', 
    borderRadius: 20, 
    padding: 40, 
    marginBottom: 40, 
    position: 'relative',
    overflow: 'hidden' 
  },
  bannerContent: { 
    zIndex: 2 
  },
  bannerTitle: { 
    fontSize: 30, 
    fontWeight: 'bold', 
    color: '#FFF' 
  },
  bannerSub: { 
    fontSize: 14, 
    color: '#94A3B8', 
    marginTop: 8, 
    marginBottom: 25 
  },
  bannerActions: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  btnEnd: { 
    backgroundColor: '#ff4d4d', 
    paddingHorizontal: 25, 
    paddingVertical: 12, 
    borderRadius: 10, 
    marginRight: 20 
  },
  btnTextWhite: { 
    color: '#FFF', 
    fontWeight: 'bold' 
  },
  btnCreateText: { 
    color: '#ff4d4d', 
    fontWeight: 'bold' 
  },
  paginationLine: { 
    position: 'absolute', 
    bottom: 20, 
    width: 40, 
    height: 4, 
    backgroundColor: '#ff4d4d', 
    borderRadius: 2, 
    alignSelf: 'center' 
  },

  // ANALYTICS STYLES
  sectionHeaderWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 50, 
    marginBottom: 25 
  },
  diamond: { 
    width: 10, 
    height: 10, 
    backgroundColor: '#ff4d4d', 
    transform: [{ rotate: '45deg' }], 
    marginRight: 15 
  },
  sectionHeader: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#1A1A1A' 
  },
  
  cardShadow: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },

  // MODAL STYLES
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalBox: { 
    width: 350, 
    backgroundColor: '#FFF', 
    borderRadius: 20, 
    padding: 30, 
    alignItems: 'center' 
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 10 
  },
  modalSub: { 
    color: '#64748B', 
    marginBottom: 30,
    textAlign: 'center' 
  },
  modalButtons: { 
    flexDirection: 'row', 
    width: '100%', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  cancelText: { 
    color: '#94A3B8', 
    fontWeight: '700' 
  },
  confirmBtn: { 
    backgroundColor: '#ff4d4d', 
    paddingHorizontal: 25, 
    paddingVertical: 12, 
    borderRadius: 12 
  },
  confirmBtnText: { 
    color: '#FFF', 
    fontWeight: 'bold' 
  }
});