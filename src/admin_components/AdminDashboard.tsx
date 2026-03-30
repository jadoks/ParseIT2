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
    // Logic to update your AdminManagement list would go here
    console.log("Recording New Admin:", newAdmin);
    
    // Close and Reset
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

              {/* 3. DASHBOARD CARDS (Triggers the Add Admin Modal) */}
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
  scrollContent: { padding: 30, paddingBottom: 100 },
  contentContainer: { maxWidth: 1300, alignSelf: 'center', width: '100%' },
  
  banner: { backgroundColor: '#1E293B', borderRadius: 24, padding: 40, marginBottom: 40, position: 'relative' },
  bannerContent: { zIndex: 2 },
  bannerTitle: { fontSize: 32, fontWeight: 'bold', color: '#FFF' },
  bannerSub: { fontSize: 14, color: '#94A3B8', marginTop: 8, marginBottom: 25, fontWeight: '600' },
  bannerActions: { flexDirection: 'row', alignItems: 'center' },
  btnEnd: { backgroundColor: '#FF4D4D', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 12, marginRight: 20 },
  btnTextWhite: { color: '#FFF', fontWeight: 'bold' },
  btnCreateText: { color: '#FF4D4D', fontWeight: 'bold' },
  paginationLine: { position: 'absolute', bottom: 20, width: 40, height: 4, backgroundColor: '#FF4D4D', borderRadius: 2, alignSelf: 'center' },

  sectionHeaderWrapper: { flexDirection: 'row', alignItems: 'center', marginTop: 50, marginBottom: 25 },
  diamond: { width: 10, height: 10, backgroundColor: '#FF4D4D', transform: [{ rotate: '45deg' }], marginRight: 15 },
  sectionHeader: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  cardShadow: { backgroundColor: '#FFF', borderRadius: 20, padding: 10, elevation: 3, borderWidth: 1, borderColor: '#F1F5F9' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', height: 400 },

  // --- MODAL STYLES ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: 420, backgroundColor: '#FFF', borderRadius: 28, padding: 35, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalHeaderTitle: { fontSize: 24, fontWeight: 'bold', color: '#1E293B', marginBottom: 6 },
  modalSubText: { fontSize: 14, color: '#64748B', marginBottom: 30 },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  cancelText: { color: '#94A3B8', fontWeight: '700', fontSize: 15 },
  saveAdminBtn: { backgroundColor: '#FF4D4D', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  saveAdminText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },

  // --- INPUT STYLES ---
  inputGroup: { width: '100%', marginBottom: 20 },
  inputLabel: { fontSize: 11, fontWeight: '900', color: '#94A3B8', marginBottom: 8, letterSpacing: 1 },
  input: { width: '100%', height: 50, backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, color: '#1E293B', fontSize: 15 }
});