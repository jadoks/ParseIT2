import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Components
import { DashboardCards } from './DashboardCards';
import { PerformanceChart } from './PerformanceChart';
import { Sidebar } from './Sidebar';
import { StudentTable } from './StudentTable';
import { TopBar } from './TopBar';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [logoutVisible, setLogoutVisible] = useState(false);
  
  // --- ADD ADMIN MODAL STATE ---
  const [addAdminVisible, setAddAdminVisible] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ 
    id: '', 
    name: '', 
    email: '', 
    role: '' 
  });

  const confirmLogout = () => {
    setLogoutVisible(false);
    console.log("Logging out...");
  };

  const handleSaveAdmin = () => {
    console.log("Recording New Admin:", newAdmin);
    setAddAdminVisible(false);
    setNewAdmin({ id: '', name: '', email: '', role: '' }); 
  };

  return (
    <View style={styles.wrapper}>
      {/* 1. SIDEBAR */}
      <Sidebar 
        onLogout={() => setLogoutVisible(true)} 
        onTabChange={setActiveTab} 
        activeTab={activeTab} 
      />

      <View style={styles.main}>
        {/* 2. TOPBAR */}
        <TopBar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          onLogout={() => setLogoutVisible(true)} 
        />
        
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {activeTab === 'Dashboard' ? (
            <View style={styles.contentContainer}>
              
              {/* HERO BANNER SECTION */}
              <View style={styles.banner}>
                <View style={styles.bannerContent}>
                  <Text style={styles.bannerTitle}>Set Up Academic Year</Text>
                  <Text style={styles.bannerSub}>SESSION YEAR: 2025 - 2026</Text>
                  
                  <View style={styles.bannerActions}>
                    <TouchableOpacity style={styles.btnEnd}>
                      <Text style={styles.btnTextWhite}>End Semester ›</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnCreateContainer}>
                      <Text style={styles.btnCreateText}>+ Create Semester</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* 3. DASHBOARD CARDS (Manage Admin, Create Class, etc.) */}
              <DashboardCards onOpenAddAdmin={() => setAddAdminVisible(true)} />

              <View style={styles.sectionHeaderWrapper}>
                <View style={styles.diamond} />
                <Text style={styles.sectionHeader}>Academic Performance Analytics</Text>
              </View>

              <View style={styles.cardShadow}><StudentTable /></View>
              <View style={{ height: 40 }} />
              <View style={styles.cardShadow}><PerformanceChart /></View>
            </View>
          ) : (
             <View style={styles.placeholder}>
                <Text style={{color: '#94A3B8'}}>Section: {activeTab}</Text>
             </View>
          )}
        </ScrollView>
      </View>

      {/* MODAL: ADD ADMIN */}
      <Modal visible={addAdminVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalHeaderTitle}>Register New Admin</Text>
            <Text style={styles.modalSubText}>Assign credentials for a new system administrator.</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ADMIN ID</Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. ADM-770" 
                placeholderTextColor="#CBD5E1"
                value={newAdmin.id} 
                onChangeText={(v) => setNewAdmin({...newAdmin, id: v})} 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Enter complete name" 
                placeholderTextColor="#CBD5E1"
                value={newAdmin.name} 
                onChangeText={(v) => setNewAdmin({...newAdmin, name: v})} 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>GMAIL ADDRESS</Text>
              <TextInput 
                style={styles.input} 
                placeholder="admin@pasershub.com" 
                placeholderTextColor="#CBD5E1"
                keyboardType="email-address"
                value={newAdmin.email} 
                onChangeText={(v) => setNewAdmin({...newAdmin, email: v})} 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SYSTEM ROLE</Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. Regional Admin" 
                placeholderTextColor="#CBD5E1"
                value={newAdmin.role} 
                onChangeText={(v) => setNewAdmin({...newAdmin, role: v})} 
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setAddAdminVisible(false)}>
                <Text style={styles.cancelText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveAdminBtn} onPress={handleSaveAdmin}>
                <Text style={styles.saveAdminText}>Save Admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: LOGOUT */}
      <Modal visible={logoutVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, {alignItems: 'center'}]}>
            <Text style={styles.modalHeaderTitle}>Sign Out</Text>
            <Text style={styles.modalSubText}>Are you sure you want to log out?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setLogoutVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveAdminBtn} onPress={confirmLogout}>
                <Text style={styles.saveAdminText}>Logout</Text>
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
  scrollContent: { padding: 25, paddingBottom: 100 },
  contentContainer: { maxWidth: 1400, alignSelf: 'center', width: '100%' },
  
  // HERO BANNER (Top Section of Image)
  banner: { 
    backgroundColor: '#1B2431', // Specific dark blue from your screenshot
    borderRadius: 20, 
    paddingHorizontal: 40,
    paddingVertical: 45, 
    marginBottom: 30, 
    justifyContent: 'center',
  },
  bannerContent: { width: '100%' },
  bannerTitle: { 
    fontSize: 34, 
    fontWeight: '700', 
    color: '#FFF',
    letterSpacing: 0.5 
  },
  bannerSub: { 
    fontSize: 14, 
    color: '#94A3B8', 
    marginTop: 8, 
    marginBottom: 30, 
    fontWeight: '500',
    textTransform: 'uppercase'
  },
  bannerActions: { flexDirection: 'row', alignItems: 'center' },
  btnEnd: { 
    backgroundColor: '#FF4D4D', 
    paddingHorizontal: 30, 
    paddingVertical: 14, 
    borderRadius: 10, 
    marginRight: 25 
  },
  btnTextWhite: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  btnCreateContainer: { paddingVertical: 10 },
  btnCreateText: { color: '#FF4D4D', fontWeight: '700', fontSize: 16 },

  // SECTION HEADERS
  sectionHeaderWrapper: { flexDirection: 'row', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  diamond: { width: 10, height: 10, backgroundColor: '#FF4D4D', transform: [{ rotate: '45deg' }], marginRight: 15 },
  sectionHeader: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  
  // GENERAL UTILITY
  cardShadow: { backgroundColor: '#FFF', borderRadius: 20, padding: 10, elevation: 3, borderWidth: 1, borderColor: '#F1F5F9' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', height: 400 },

  // MODAL STYLING
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: 450, backgroundColor: '#FFF', borderRadius: 24, padding: 35 },
  modalHeaderTitle: { fontSize: 24, fontWeight: 'bold', color: '#1E293B', marginBottom: 6 },
  modalSubText: { fontSize: 14, color: '#64748B', marginBottom: 30 },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  cancelText: { color: '#94A3B8', fontWeight: '700', fontSize: 15 },
  saveAdminBtn: { backgroundColor: '#FF4D4D', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12 },
  saveAdminText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  inputGroup: { width: '100%', marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '800', color: '#94A3B8', marginBottom: 10, letterSpacing: 0.5 },
  input: { width: '100%', height: 55, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, color: '#1E293B', fontSize: 15 }
});