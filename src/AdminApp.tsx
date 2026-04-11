import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// --- IMPORTS ---
import { AdminManagement } from './admin_components/AdminManagement';
import { ChangeEmail } from './admin_components/ChangeEmail';
import { ChangePassword } from './admin_components/ChangePassword';
import { DashboardCards } from './admin_components/DashboardCards';
import { PerformanceAnalytics } from './admin_components/PerformanceAnalytics';
import { PerformanceChart } from './admin_components/PerformanceChart';
import { SettingsApp } from './admin_components/SettingsApp';
import { Sidebar } from './admin_components/Sidebar';
import StudentManagement from './admin_components/StudentManagement';
import { TeacherManagement } from './admin_components/TeacherManagement';
import { TopBar } from './admin_components/TopBar';

interface AdminAppProps {
  onLogout: () => void;
}

export default function AdminApp({ onLogout }: AdminAppProps) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [settingsView, setSettingsView] = useState('Main'); 

  const [addAdminVisible, setAddAdminVisible] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ id: '', name: '', email: '', role: '' });

  const handleLogout = () => setLogoutVisible(true);

  const confirmLogout = () => {
    setLogoutVisible(false);
    onLogout(); 
  };

  const handleSaveAdmin = () => {
    console.log("New Admin Saved:", newAdmin);
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
              
              {/* Dashboard Cards - Clean grid without duplicate academic year card */}
              <DashboardCards onOpenAddAdmin={() => setAddAdminVisible(true)} />
              
              <View style={styles.analyticsHeader}>
                <View style={styles.diamond} />
                <Text style={styles.analyticsTitle}>Academic Performance Analytics</Text>
              </View>

              {/* Performance Analytics */}
              <PerformanceAnalytics />

              <View style={{ height: 40 }} />
              
              {/* Performance Chart */}
              <View style={styles.cardShadow}>
                <PerformanceChart />
              </View>
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
                Section data view.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* MODAL: ADD ADMIN */}
      <Modal visible={addAdminVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBoxLarge}>
            <Text style={styles.modalTitle}>Register New Admin</Text>
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
                placeholder="admin@gmail.com" 
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
                <Text style={styles.cancelBtnText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveAdmin}>
                <Text style={styles.confirmBtnText}>Save Admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: LOGOUT */}
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
  
  analyticsHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 50, marginBottom: 25 },
  diamond: { width: 10, height: 10, backgroundColor: '#FF4D4D', transform: [{ rotate: '45deg' }], marginRight: 15 },
  analyticsTitle: { color: '#1E293B', fontSize: 24, fontWeight: 'bold' },
  cardShadow: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, elevation: 3, borderWidth: 1, borderColor: '#F1F5F9' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },

  // MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: 350, backgroundColor: '#FFF', borderRadius: 20, padding: 30, alignItems: 'center' },
  modalBoxLarge: { width: 450, backgroundColor: '#FFF', borderRadius: 24, padding: 35 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginBottom: 10 },
  modalSub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 30 },
  modalSubText: { fontSize: 14, color: '#64748B', marginBottom: 25 },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  cancelBtnText: { color: '#94A3B8', fontWeight: '700' },
  confirmBtn: { backgroundColor: '#FF4D4D', borderRadius: 12, alignItems: 'center', paddingVertical: 15, paddingHorizontal: 30 },
  confirmBtnText: { color: '#FFF', fontWeight: 'bold' },
  inputGroup: { width: '100%', marginBottom: 20 },
  inputLabel: { fontSize: 11, fontWeight: '900', color: '#94A3B8', marginBottom: 8, letterSpacing: 0.5 },
  input: { width: '100%', height: 55, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, color: '#1E293B' }
});