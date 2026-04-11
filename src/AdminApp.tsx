import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// --- IMPORTS ---
import { AdminManagement } from './admin_components/AdminManagement';
import { ChangeEmail } from './admin_components/ChangeEmail';
import { ChangePassword } from './admin_components/ChangePassword';
import { DashboardCards } from './admin_components/DashboardCards';
import { PerformanceAnalytics } from './admin_components/PerformanceAnalytics';
import PerformanceChart from './admin_components/PerformanceChart';
import { SettingsApp } from './admin_components/SettingsApp';
import { Sidebar } from './admin_components/Sidebar';
import StudentManagement from './admin_components/StudentManagement';
import { TeacherManagement } from './admin_components/TeacherManagement';
import { TopBar } from './admin_components/TopBar';

interface AdminAppProps {
  onLogout: () => void;
}

export type AdminStudentScore = {
  name: string;
  score: number;
};

export type AdminSubjectRecord = {
  id: number;
  title: string;
  progress: string;
  students: AdminStudentScore[];
};

export type AdminSectionRecord = {
  [sectionName: string]: AdminSubjectRecord[];
};

export type AdminAcademicData = {
  [yearLevel: string]: AdminSectionRecord;
};

// Shared admin analytics data source
const adminAcademicData: AdminAcademicData = {
  '1st Year': {
    '1A - Microsoft': [
      {
        id: 101,
        title: 'Introduction to Computing',
        progress: '95%',
        students: [
          { name: 'Alice Tan', score: 95 },
          { name: 'Bob Reyes', score: 92 },
          { name: 'Charlie Day', score: 88 },
          { name: 'Daisy Go', score: 91 },
          { name: 'Ethan Sy', score: 94 },
        ],
      },
      {
        id: 102,
        title: 'Computer Programming 1',
        progress: '88%',
        students: [
          { name: 'Alice Tan', score: 82 },
          { name: 'Bob Reyes', score: 78 },
          { name: 'Charlie Day', score: 80 },
          { name: 'Daisy Go', score: 75 },
          { name: 'Ethan Sy', score: 70 },
        ],
      },
      {
        id: 103,
        title: 'Discrete Mathematics',
        progress: '90%',
        students: [
          { name: 'Alice Tan', score: 88 },
          { name: 'Bob Reyes', score: 85 },
          { name: 'Charlie Day', score: 82 },
          { name: 'Daisy Go', score: 80 },
          { name: 'Ethan Sy', score: 77 },
        ],
      },
    ],
    '1B - Apple': [
      {
        id: 104,
        title: 'Introduction to Computing',
        progress: '92%',
        students: [
          { name: 'Liam N.', score: 90 },
          { name: 'Emma W.', score: 88 },
          { name: 'Noah S.', score: 85 },
          { name: 'Olivia H.', score: 82 },
          { name: 'James B.', score: 85 },
        ],
      },
      {
        id: 105,
        title: 'Computer Programming 1',
        progress: '80%',
        students: [
          { name: 'Liam N.', score: 75 },
          { name: 'Emma W.', score: 72 },
          { name: 'Noah S.', score: 78 },
          { name: 'Olivia H.', score: 70 },
          { name: 'James B.', score: 74 },
        ],
      },
      {
        id: 106,
        title: 'Discrete Mathematics',
        progress: '85%',
        students: [
          { name: 'Liam N.', score: 80 },
          { name: 'Emma W.', score: 82 },
          { name: 'Noah S.', score: 84 },
          { name: 'Olivia H.', score: 78 },
          { name: 'James B.', score: 81 },
        ],
      },
    ],
  },
  '2nd Year': {
    '2A - Google': [
      {
        id: 201,
        title: 'Data Structures',
        progress: '75%',
        students: [
          { name: 'Ben J.', score: 98 },
          { name: 'Clara M.', score: 96 },
          { name: 'Dan K.', score: 95 },
          { name: 'Eva L.', score: 94 },
          { name: 'Fred P.', score: 97 },
        ],
      },
      {
        id: 202,
        title: 'Networking 1',
        progress: '70%',
        students: [
          { name: 'Ben J.', score: 85 },
          { name: 'Clara M.', score: 82 },
          { name: 'Dan K.', score: 88 },
          { name: 'Eva L.', score: 84 },
          { name: 'Fred P.', score: 86 },
        ],
      },
      {
        id: 203,
        title: 'Object Oriented Prog',
        progress: '82%',
        students: [
          { name: 'Ben J.', score: 90 },
          { name: 'Clara M.', score: 91 },
          { name: 'Dan K.', score: 89 },
          { name: 'Eva L.', score: 92 },
          { name: 'Fred P.', score: 88 },
        ],
      },
    ],
    '2B - Meta': [
      {
        id: 204,
        title: 'Data Structures',
        progress: '72%',
        students: [
          { name: 'Quinn S.', score: 75 },
          { name: 'Rose T.', score: 78 },
          { name: 'Seth U.', score: 72 },
          { name: 'Tara V.', score: 74 },
          { name: 'Ugo W.', score: 70 },
        ],
      },
      {
        id: 205,
        title: 'Networking 1',
        progress: '65%',
        students: [
          { name: 'Quinn S.', score: 80 },
          { name: 'Rose T.', score: 82 },
          { name: 'Seth U.', score: 79 },
          { name: 'Tara V.', score: 81 },
          { name: 'Ugo W.', score: 78 },
        ],
      },
      {
        id: 206,
        title: 'Object Oriented Prog',
        progress: '78%',
        students: [
          { name: 'Quinn S.', score: 85 },
          { name: 'Rose T.', score: 84 },
          { name: 'Seth U.', score: 86 },
          { name: 'Tara V.', score: 83 },
          { name: 'Ugo W.', score: 87 },
        ],
      },
    ],
  },
  '3rd Year': {
    '3A - Amazon': [
      {
        id: 301,
        title: 'Information Assurance',
        progress: '60%',
        students: [
          { name: 'Flo H.', score: 92 },
          { name: 'Gus I.', score: 94 },
          { name: 'Hope J.', score: 91 },
          { name: 'Ian K.', score: 93 },
          { name: 'Joy L.', score: 90 },
        ],
      },
      {
        id: 302,
        title: 'System Integration',
        progress: '55%',
        students: [
          { name: 'Flo H.', score: 88 },
          { name: 'Gus I.', score: 86 },
          { name: 'Hope J.', score: 87 },
          { name: 'Ian K.', score: 89 },
          { name: 'Joy L.', score: 85 },
        ],
      },
      {
        id: 303,
        title: 'Database Management 2',
        progress: '65%',
        students: [
          { name: 'Flo H.', score: 95 },
          { name: 'Gus I.', score: 92 },
          { name: 'Hope J.', score: 94 },
          { name: 'Ian K.', score: 91 },
          { name: 'Joy L.', score: 93 },
        ],
      },
    ],
    '3B - Oracle': [
      {
        id: 304,
        title: 'Information Assurance',
        progress: '58%',
        students: [
          { name: 'Uma W.', score: 80 },
          { name: 'Val X.', score: 82 },
          { name: 'Wes Y.', score: 78 },
          { name: 'Xander Z.', score: 79 },
          { name: 'Yolanda A.', score: 81 },
        ],
      },
      {
        id: 305,
        title: 'System Integration',
        progress: '50%',
        students: [
          { name: 'Uma W.', score: 75 },
          { name: 'Val X.', score: 77 },
          { name: 'Wes Y.', score: 74 },
          { name: 'Xander Z.', score: 76 },
          { name: 'Yolanda A.', score: 73 },
        ],
      },
      {
        id: 306,
        title: 'Database Management 2',
        progress: '62%',
        students: [
          { name: 'Uma W.', score: 85 },
          { name: 'Val X.', score: 83 },
          { name: 'Wes Y.', score: 86 },
          { name: 'Xander Z.', score: 84 },
          { name: 'Yolanda A.', score: 87 },
        ],
      },
    ],
  },
  '4th Year': {
    '4A - Tesla': [
      {
        id: 401,
        title: 'Capstone Project 2',
        progress: '100%',
        students: [
          { name: 'Jon L.', score: 99 },
          { name: 'Kai M.', score: 98 },
          { name: 'Leo N.', score: 100 },
          { name: 'Mia O.', score: 97 },
          { name: 'Noel P.', score: 99 },
        ],
      },
      {
        id: 402,
        title: 'Social & Prof. Issues',
        progress: '95%',
        students: [
          { name: 'Jon L.', score: 92 },
          { name: 'Kai M.', score: 94 },
          { name: 'Leo N.', score: 91 },
          { name: 'Mia O.', score: 93 },
          { name: 'Noel P.', score: 90 },
        ],
      },
      {
        id: 403,
        title: 'Emerging Technologies',
        progress: '90%',
        students: [
          { name: 'Jon L.', score: 96 },
          { name: 'Kai M.', score: 95 },
          { name: 'Leo N.', score: 97 },
          { name: 'Mia O.', score: 94 },
          { name: 'Noel P.', score: 95 },
        ],
      },
    ],
    '4B - NVIDIA': [
      {
        id: 404,
        title: 'Capstone Project 2',
        progress: '95%',
        students: [
          { name: 'Abe R.', score: 88 },
          { name: 'Bea S.', score: 85 },
          { name: 'Cal T.', score: 87 },
          { name: 'Dan U.', score: 89 },
          { name: 'Eve V.', score: 86 },
        ],
      },
      {
        id: 405,
        title: 'Social & Prof. Issues',
        progress: '90%',
        students: [
          { name: 'Abe R.', score: 82 },
          { name: 'Bea S.', score: 80 },
          { name: 'Cal T.', score: 84 },
          { name: 'Dan U.', score: 81 },
          { name: 'Eve V.', score: 83 },
        ],
      },
      {
        id: 406,
        title: 'Emerging Technologies',
        progress: '85%',
        students: [
          { name: 'Abe R.', score: 90 },
          { name: 'Bea S.', score: 88 },
          { name: 'Cal T.', score: 89 },
          { name: 'Dan U.', score: 87 },
          { name: 'Eve V.', score: 91 },
        ],
      },
    ],
  },
};

export default function AdminApp({ onLogout }: AdminAppProps) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [settingsView, setSettingsView] = useState('Main');

  const [addAdminVisible, setAddAdminVisible] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    id: '',
    name: '',
    email: '',
    role: '',
  });

  const handleLogout = () => setLogoutVisible(true);

  const confirmLogout = () => {
    setLogoutVisible(false);
    onLogout();
  };

  const handleSaveAdmin = () => {
    console.log('New Admin Saved:', newAdmin);
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
              <DashboardCards onOpenAddAdmin={() => setAddAdminVisible(true)} />

              <View style={styles.analyticsHeader}>
                <View style={styles.diamond} />
                <Text style={styles.analyticsTitle}>
                  Academic Performance Analytics
                </Text>
              </View>

              <PerformanceAnalytics academicData={adminAcademicData} />

              <View style={{ height: 40 }} />

              <View style={styles.cardShadow}>
                <PerformanceChart academicData={adminAcademicData} />
              </View>
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
          ) : activeTab === 'Settings' ? (
            <View style={styles.maxWidthContainer}>
              {settingsView === 'Main' && (
                <SettingsApp
                  onNavigateEmail={() => setSettingsView('Email')}
                  onNavigatePassword={() => setSettingsView('Password')}
                />
              )}
              {settingsView === 'Email' && (
                <ChangeEmail onBack={() => setSettingsView('Main')} />
              )}
              {settingsView === 'Password' && (
                <ChangePassword onBack={() => setSettingsView('Main')} />
              )}
            </View>
          ) : (
            <View style={styles.placeholder}>
              <Text
                style={{
                  color: '#1E293B',
                  fontSize: 24,
                  fontWeight: 'bold',
                }}
              >
                {activeTab}
              </Text>
              <Text
                style={{ color: '#94A3B8', fontSize: 16, marginTop: 10 }}
              >
                Section data view.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      <Modal visible={addAdminVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBoxLarge}>
            <Text style={styles.modalTitle}>Register New Admin</Text>
            <Text style={styles.modalSubText}>
              Assign credentials for a new system administrator.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ADMIN ID</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. ADM-770"
                placeholderTextColor="#CBD5E1"
                value={newAdmin.id}
                onChangeText={(v) => setNewAdmin({ ...newAdmin, id: v })}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter complete name"
                placeholderTextColor="#CBD5E1"
                value={newAdmin.name}
                onChangeText={(v) => setNewAdmin({ ...newAdmin, name: v })}
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
                onChangeText={(v) => setNewAdmin({ ...newAdmin, email: v })}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SYSTEM ROLE</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Regional Admin"
                placeholderTextColor="#CBD5E1"
                value={newAdmin.role}
                onChangeText={(v) => setNewAdmin({ ...newAdmin, role: v })}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setAddAdminVisible(false)}>
                <Text style={styles.cancelBtnText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleSaveAdmin}
              >
                <Text style={styles.confirmBtnText}>Save Admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={logoutVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalSub}>
              Are you sure you want to log out of PasersHub 2.0?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setLogoutVisible(false)}
              >
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

  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 25,
  },
  diamond: {
    width: 10,
    height: 10,
    backgroundColor: '#FF4D4D',
    transform: [{ rotate: '45deg' }],
    marginRight: 15,
  },
  analyticsTitle: { color: '#1E293B', fontSize: 24, fontWeight: 'bold' },
  cardShadow: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: 350,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  modalBoxLarge: {
    width: 450,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 35,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 10,
  },
  modalSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 30,
  },
  modalSubText: { fontSize: 14, color: '#64748B', marginBottom: 25 },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
  },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  cancelBtnText: { color: '#94A3B8', fontWeight: '700' },
  confirmBtn: {
    backgroundColor: '#FF4D4D',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  confirmBtnText: { color: '#FFF', fontWeight: 'bold' },
  inputGroup: { width: '100%', marginBottom: 20 },
  inputLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    width: '100%',
    height: 55,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    color: '#1E293B',
  },
});