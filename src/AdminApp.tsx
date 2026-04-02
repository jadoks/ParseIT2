import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// --- IMPORTS ---
import { AdminManagement } from './admin_components/AdminManagement';
import { DashboardCards } from './admin_components/DashboardCards';
import { PerformanceChart } from './admin_components/PerformanceChart';
import { Sidebar } from './admin_components/Sidebar';
import StudentManagement from './admin_components/StudentManagement';
import { StudentTable } from './admin_components/StudentTable';
import { TeacherManagement } from './admin_components/TeacherManagement';
import { TopBar } from './admin_components/TopBar';

import { ChangeEmail } from './admin_components/ChangeEmail';
import { ChangePassword } from './admin_components/ChangePassword';
import { SettingsApp } from './admin_components/SettingsApp';

interface Cluster {
  id: string;
  title: string;
  studentId: string;
  icon: string;
  year: number;
}

interface AdminAppProps {
  onLogout: () => void;
}

export default function AdminApp({ onLogout }: AdminAppProps) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [settingsView, setSettingsView] = useState('Main'); 

  const [addAdminVisible, setAddAdminVisible] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ id: '', name: '', email: '', role: '' });

  // Default Clusters (6 existing ones)
  const [clusters, setClusters] = useState<Cluster[]>([
    { id: '1', title: '1A-WebDev',     studentId: '2021-00123', icon: 'folder-outline', year: 1 },
    { id: '2', title: '1B-Python',     studentId: '2021-00456', icon: 'folder-outline', year: 1 },
    { id: '3', title: '2A-React',      studentId: '2022-00789', icon: 'folder-outline', year: 2 },
    { id: '4', title: '2B-NodeJS',     studentId: '2022-01234', icon: 'folder-outline', year: 2 },
    { id: '5', title: '3A-Laravel',    studentId: '2023-01567', icon: 'folder-outline', year: 3 },
    { id: '6', title: '4B-Mobile',     studentId: '2024-01890', icon: 'folder-outline', year: 4 },
  ]);

  // ====================== ADD NEW CLUSTER ======================
  const handleAddCluster = (newClusterName: string, studentId: string) => {
    const trimmedTitle = newClusterName.trim();
    const trimmedStudentId = studentId.trim();

    if (!trimmedTitle || !trimmedStudentId) {
      Alert.alert("Error", "Both Cluster Identifier and Student ID are required.");
      return;
    }

    // Auto-detect year from first character (e.g. "1C-Flutter" → year 1)
    const detectedYear = parseInt(trimmedTitle.charAt(0));
    const finalYear = isNaN(detectedYear) ? 1 : detectedYear;

    const newEntry: Cluster = {
      id: String(Date.now()),
      title: trimmedTitle,
      studentId: trimmedStudentId,
      icon: 'folder-outline',
      year: finalYear,
    };

    setClusters((prevClusters) => {
      const updatedList = [...prevClusters, newEntry];
      // Sort by year so new 1st year cluster appears correctly under 1ST YEAR
      return updatedList.sort((a, b) => a.year - b.year);
    });

    // Switch to the newly added cluster
    setActiveTab(trimmedTitle);

    // Optional: Show success message
    Alert.alert("Success", `"${trimmedTitle}" has been added successfully!`);
  };
  // ============================================================

  const handleLogout = () => setLogoutVisible(true);

  const confirmLogout = () => {
    setLogoutVisible(false);
    onLogout(); 
  };

  const handleSaveAdmin = () => {
    setAddAdminVisible(false);
    setNewAdmin({ id: '', name: '', email: '', role: '' }); 
  };

  return (
    <View style={styles.container}>
      <Sidebar 
        onLogout={handleLogout} 
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSettingsView('Main'); 
        }} 
        activeTab={activeTab}
        clusters={clusters} 
        onAddCluster={handleAddCluster} 
      />

      <View style={styles.content}>
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
          {activeTab === 'Dashboard' ? (
            <View style={styles.maxWidthContainer}>
              <View style={styles.banner}>
                <View style={styles.bannerContent}>
                  <Text style={styles.bannerTitle}>Set Up Academic Year</Text>
                  <Text style={styles.bannerSub}>SESSION YEAR: 2025 - 2026</Text>
                  <View style={styles.bannerActions}>
                    <TouchableOpacity style={styles.btnEnd}><Text style={styles.btnTextEnd}>End Semester ›</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.btnCreate}><Text style={styles.btnTextCreate}>+ Create Semester</Text></TouchableOpacity>
                  </View>
                </View>
              </View>

              <DashboardCards onOpenAddAdmin={() => setAddAdminVisible(true)} />
              
              <View style={styles.analyticsHeader}>
                <View style={styles.diamond} />
                <Text style={styles.analyticsTitle}>Academic Performance Analytics</Text>
              </View>

              <View style={styles.cardShadow}><StudentTable /></View>
              <View style={{ height: 40 }} />
              <View style={styles.cardShadow}><PerformanceChart /></View>
            </View>
          ) : activeTab === 'Students' ? ( 
            <View style={styles.maxWidthContainer}><StudentManagement /></View>
          ) : activeTab === 'Teacher' ? ( 
            <View style={styles.maxWidthContainer}><TeacherManagement /></View>
          ) : activeTab === 'Admin' ? (
            <View style={styles.maxWidthContainer}><AdminManagement /></View>
          ) : activeTab === 'Settings' ? (
            <View style={styles.maxWidthContainer}>
              {settingsView === 'Main' && (
                <SettingsApp 
                  onNavigateEmail={() => setSettingsView('Email')} 
                  onNavigatePassword={() => setSettingsView('Password')} 
                />
              )}
              {settingsView === 'Email' && <ChangeEmail onBack={() => setSettingsView('Main')} />}
              {settingsView === 'Password' && <ChangePassword onBack={() => setSettingsView('Main')} />}
            </View>
          ) : (
            <View style={styles.placeholder}>
              <Text style={{color: '#1E293B', fontSize: 24, fontWeight: 'bold'}}>{activeTab}</Text>
              <Text style={{color: '#94A3B8', fontSize: 16, marginTop: 10}}>
                Management view for student cluster data.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Add Admin Modal */}
      <Modal visible={addAdminVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBoxLarge}>
            <Text style={styles.modalTitle}>Register New Admin</Text>
            <Text style={styles.modalSubText}>Assign credentials for a new system administrator.</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ADMIN ID</Text>
              <TextInput style={styles.input} placeholder="e.g. ADM-770" value={newAdmin.id} onChangeText={(v) => setNewAdmin({...newAdmin, id: v})} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <TextInput style={styles.input} placeholder="Enter complete name" value={newAdmin.name} onChangeText={(v) => setNewAdmin({...newAdmin, name: v})} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>GMAIL ADDRESS</Text>
              <TextInput style={styles.input} placeholder="admin@gmail.com" value={newAdmin.email} onChangeText={(v) => setNewAdmin({...newAdmin, email: v})} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SYSTEM ROLE</Text>
              <TextInput style={styles.input} placeholder="e.g. Regional Admin" value={newAdmin.role} onChangeText={(v) => setNewAdmin({...newAdmin, role: v})} />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setAddAdminVisible(false)}>
                <Text style={styles.cancelBtnText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveAdmin}>
                <Text style={styles.confirmBtnText}>Save Admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Modal */}
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
  banner: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 40, marginBottom: 40, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2 },
  bannerContent: { zIndex: 2 },
  bannerTitle: { fontSize: 30, fontWeight: 'bold', color: '#1E293B' },
  bannerSub: { fontSize: 14, color: '#64748B', marginTop: 8, marginBottom: 25, fontWeight: '600' },
  bannerActions: { flexDirection: 'row', alignItems: 'center' },
  btnEnd: { backgroundColor: '#FEF2F2', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 10, marginRight: 20 },
  btnTextEnd: { color: '#FF4D4D', fontWeight: 'bold' },
  btnCreate: { paddingVertical: 12 },
  btnTextCreate: { color: '#FF4D4D', fontWeight: 'bold', fontSize: 15 },
  analyticsHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 50, marginBottom: 25 },
  diamond: { width: 10, height: 10, backgroundColor: '#FF4D4D', transform: [{ rotate: '45deg' }], marginRight: 15 },
  analyticsTitle: { color: '#1E293B', fontSize: 24, fontWeight: 'bold' },
  cardShadow: { backgroundColor: '#FFF', borderRadius: 16, padding: 10, elevation: 3, borderWidth: 1, borderColor: '#F1F5F9' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: 350, backgroundColor: '#FFF', borderRadius: 20, padding: 30, alignItems: 'center' },
  modalBoxLarge: { width: 420, backgroundColor: '#FFF', borderRadius: 28, padding: 35 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginBottom: 10 },
  modalSub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 30 },
  modalSubText: { fontSize: 14, color: '#64748B', marginBottom: 25 },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center' },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  cancelBtnText: { color: '#94A3B8', fontWeight: '700' },
  confirmBtn: { backgroundColor: '#FF4D4D', borderRadius: 12, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 25 },
  confirmBtnText: { color: '#FFF', fontWeight: 'bold' },
  inputGroup: { width: '100%', marginBottom: 15 },
  inputLabel: { fontSize: 11, fontWeight: '900', color: '#94A3B8', marginBottom: 8 },
  input: { width: '100%', height: 48, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 15, color: '#1E293B' }
});