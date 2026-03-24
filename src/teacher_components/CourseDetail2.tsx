import React, { useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const Coursedetail2 = ({ onBack }: { onBack?: () => void }) => {
  const [activeTab, setActiveTab] = useState<'Materials' | 'Assignments'>('Materials');
  const [showMembers, setShowMembers] = useState(false);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const assignments = [
    { id: '1', title: 'React Fundamental Quiz', posted: 'Mar 5, 2026 (6:40 PM)', due: '2026-03-10 (11:59 PM)' },
    { id: '2', title: 'Build Simple Website', posted: 'Mar 5, 2026 (8:00 AM)', due: '2026-03-15 (11:59 PM)' },
  ];

  // --- SUBMISSIONS VIEW UI ---
  if (showSubmissions) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.membersHeader}>
          <TouchableOpacity onPress={() => setShowSubmissions(false)}>
            <MaterialCommunityIcons name="chevron-left" size={35} color="#000" />
          </TouchableOpacity>
          <Text style={styles.membersTitle}>Submissions</Text>
          
          <TouchableOpacity style={styles.updateInfoTrigger} onPress={() => setShowUpdateModal(true)}>
            <MaterialCommunityIcons name="information" size={24} color="#C62828" />
            <Text style={styles.updateText}>Update</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.analyticsRow}>
          <Text style={styles.completedText}>0 out of 1 completed</Text>
          <View style={styles.progressCircle}>
            <Text style={styles.percentText}>0 %</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.studentCard}>
            <View style={styles.studentRedAccent} />
            <View style={styles.studentInfo}>
              <View style={styles.studentTopRow}>
                <Text style={styles.studentId}>7230494</Text>
                <View style={styles.lateDot} />
              </View>
              <Text style={styles.studentName}>Lisondra, Jade</Text>
              <Text style={styles.gradeRatio}>0/10</Text>
            </View>
          </View>
        </ScrollView>

        {/* --- UPDATE ASSIGNMENT SIDE PANEL UI --- */}
        <Modal visible={showUpdateModal} transparent animationType="none">
          <View style={styles.modalOverlay}>
            <View style={styles.sidePanel}>
              <View style={styles.panelHeader}>
                <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                  <MaterialCommunityIcons name="chevron-left" size={28} color="#000" />
                </TouchableOpacity>
                <Text style={styles.panelTitle}>Update Assignment</Text>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput style={styles.inputBox} value="React Fundamental Quiz" />
                <TextInput style={styles.inputBox} value="Read and Answer Carefully" />
                
                <View style={styles.dualInputRow}>
                  <TextInput style={[styles.inputBox, { flex: 1 }]} value="10" />
                  <TextInput style={[styles.inputBox, { flex: 1 }]} value="10" />
                </View>

                <TouchableOpacity style={styles.outlineButton}>
                  <Text style={styles.outlineButtonText}>Attach Document</Text>
                </TouchableOpacity>

                <TextInput style={styles.inputBox} value="2026-03-10 (11:59 PM)" />

                <View style={styles.checkboxRow}>
                    <View style={styles.checkbox} />
                    <Text style={styles.checkboxLabel}>Disable Repository after Due</Text>
                </View>

                <TouchableOpacity style={styles.deleteButton}>
                  <Text style={styles.deleteButtonText}>Delete Assignment</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.updateButton}>
                  <Text style={styles.updateButtonText}>Update Assignment</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // --- MEMBERS VIEW UI ---
  if (showMembers) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.membersHeader}>
          <TouchableOpacity onPress={() => setShowMembers(false)}>
            <MaterialCommunityIcons name="chevron-left" size={35} color="#000" />
          </TouchableOpacity>
          <Text style={styles.membersTitle}>Members</Text>
        </View>

        <View style={styles.membersActionRow}>
          <TextInput style={styles.idInput} placeholder="Enter Student ID" placeholderTextColor="#999" />
          <TouchableOpacity style={styles.plusBtn}><Text style={styles.btnText}>+</Text></TouchableOpacity>
          <TouchableOpacity style={styles.minusBtn}><Text style={styles.btnText}>-</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.studentCard} onPress={() => setShowSubmissions(true)}>
            <View style={styles.studentRedAccent} />
            <View style={styles.studentInfo}>
              <View style={styles.studentTopRow}>
                <Text style={styles.studentId}>7230494</Text>
                <Text style={styles.studentHandle}>@jadok</Text>
              </View>
              <Text style={styles.studentName}>Lisondra, Jade</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- MAIN DASHBOARD VIEW UI ---
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.redHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <MaterialCommunityIcons name="chevron-left" size={35} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.courseTitle}>CC123 (3A - Python)</Text>
            <Text style={styles.courseSubText}>Programming 2 (Lecture)  Mon (Lab 3)  8:00 AM - 10:00 AM</Text>
            <Text style={styles.instructorText}>Instructor: Ramcee Bading</Text>
          </View>
          <MaterialCommunityIcons name="information" size={28} color="#FFF" />
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'Materials' && styles.tabActive]} onPress={() => setActiveTab('Materials')}>
          <MaterialCommunityIcons name="book-multiple" size={22} color={activeTab === 'Materials' ? "#C62828" : "#333"} />
          <Text style={[styles.tabLabel, activeTab === 'Materials' && styles.tabLabelActive]}>Materials (4)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'Assignments' && styles.tabActive]} onPress={() => setActiveTab('Assignments')}>
          <MaterialCommunityIcons name="clipboard-list" size={22} color={activeTab === 'Assignments' ? "#C62828" : "#333"} />
          <Text style={[styles.tabLabel, activeTab === 'Assignments' && styles.tabLabelActive]}>Assignments ({assignments.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.createBtn}><Text style={styles.createBtnText}>+ Create</Text></TouchableOpacity>

        {activeTab === 'Materials' ? (
          <View style={styles.moduleCard}>
            <View style={styles.redLeftAccent} />
            <View style={styles.cardContent}>
              <View style={styles.iconBackground}><MaterialCommunityIcons name="book-open-variant" size={32} color="#000" /></View>
              <Text style={styles.weekTitle}>Week 1</Text>
              <View style={styles.postedRow}>
                <Text style={styles.postedLabel}>Posted</Text>
                <Text style={styles.dateText}>Feb 28, 2026 (4:21 PM)</Text>
              </View>
            </View>
          </View>
        ) : (
          assignments.map((item) => (
            <TouchableOpacity key={item.id} style={styles.assignmentCard} onPress={() => setShowMembers(true)}>
              <View style={styles.redLeftAccentAssignment} />
              <View style={styles.assignmentInner}>
                <View style={styles.assignmentTopRow}>
                  <Text style={styles.assignmentTitle}>{item.title}</Text>
                  <Text style={styles.assignmentPostedDate}>{item.posted}</Text>
                </View>
                <View style={styles.separator} />
                <Text style={styles.dueText}>Due: {item.due}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  redHeader: { backgroundColor: '#C62828', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 10 },
  headerInfo: { flex: 1 },
  courseTitle: { color: '#FFF', fontSize: 28, fontWeight: 'bold' },
  courseSubText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 5 },
  instructorText: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#DDD' },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, gap: 10 },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#C62828' },
  tabLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  tabLabelActive: { color: '#C62828' },
  scrollContent: { padding: 25 },
  createBtn: { backgroundColor: '#C62828', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 40 },
  createBtnText: { color: '#FFF', fontWeight: 'bold' },

  // Module Card
  moduleCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 15, height: 100, elevation: 3, borderWidth: 1, borderColor: '#F5F5F5', marginBottom: 15 },
  redLeftAccent: { width: 4, height: '100%', backgroundColor: '#C62828' },
  cardContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  iconBackground: { width: 55, height: 55, backgroundColor: '#E0E0E0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 25 },
  weekTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#333' },
  postedRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  postedLabel: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  dateText: { fontSize: 11, color: '#777' },

  // Assignment Card
  assignmentCard: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 20, flexDirection: 'row', elevation: 3, borderWidth: 1, borderColor: '#F0F0F0', minHeight: 110 },
  redLeftAccentAssignment: { width: 4, backgroundColor: '#C62828', height: '100%' },
  assignmentInner: { flex: 1, padding: 20, justifyContent: 'center' },
  assignmentTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  assignmentTitle: { fontSize: 18, fontWeight: 'bold', color: '#000', flex: 0.7 },
  assignmentPostedDate: { fontSize: 12, color: '#777' },
  separator: { height: 1, backgroundColor: '#EEEEEE', width: '100%', marginVertical: 12 },
  dueText: { fontSize: 14, color: '#666', fontWeight: '500' },

  // Members View
  membersHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, justifyContent: 'space-between' },
  membersTitle: { fontSize: 32, fontWeight: 'bold', color: '#000', flex: 1, marginLeft: 10 },
  membersActionRow: { flexDirection: 'row', paddingHorizontal: 25, alignItems: 'center', gap: 8, marginBottom: 20 },
  idInput: { width: 200, height: 45, borderWidth: 1.5, borderColor: '#666', borderRadius: 10, paddingHorizontal: 15, fontSize: 16 },
  plusBtn: { backgroundColor: '#C62828', width: 45, height: 45, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  minusBtn: { backgroundColor: '#C62828', width: 45, height: 45, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  studentCard: { backgroundColor: '#FFF', borderRadius: 12, height: 90, flexDirection: 'row', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, borderWidth: 1, borderColor: '#F0F0F0', marginBottom: 15 },
  studentRedAccent: { width: 4, height: '100%', backgroundColor: '#C62828', alignSelf: 'center', borderRadius: 5, marginLeft: 3 },
  studentInfo: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  studentTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  studentId: { fontSize: 14, color: '#999' },
  studentHandle: { fontSize: 12, color: '#BBB' },
  studentName: { fontSize: 18, fontWeight: 'bold', color: '#444', marginTop: 5 },

  // Submissions UI
  updateInfoTrigger: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  updateText: { fontSize: 14, fontWeight: '500' },
  analyticsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 40, marginVertical: 15 },
  completedText: { fontSize: 18, color: '#555' },
  progressCircle: { width: 75, height: 75, borderRadius: 40, borderWidth: 10, borderColor: '#DDD', justifyContent: 'center', alignItems: 'center' },
  percentText: { fontSize: 16, fontWeight: 'bold', color: '#4CAF50' },
  lateDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'red' },
  gradeRatio: { position: 'absolute', bottom: -5, right: 0, color: '#888' },

  // Update Side Panel UI
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center', 
    alignItems: 'flex-end', // Sits on the right
    paddingRight: 10,       // Matches the small spacing on the right
  },
  sidePanel: { 
    backgroundColor: '#FFF', 
    width: 320,              // SHORTER FIXED WIDTH (approximate for photo)
    maxHeight: '92%',        // Doesn't touch the bottom or top
    borderRadius: 15, 
    padding: 20, 
    elevation: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  panelHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    marginBottom: 20 
  },
  panelTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#000' 
  },
  inputBox: { 
    borderWidth: 1, 
    borderColor: '#DDD', 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 12, 
    fontSize: 14, // Slightly smaller text inside
    color: '#333' 
  },
  dualInputRow: { 
    flexDirection: 'row', 
    gap: 10, 
    marginBottom: 12 
  },
  outlineButton: { 
    borderWidth: 1, 
    borderColor: '#D32F2F', 
    borderRadius: 8, 
    padding: 10, 
    alignItems: 'center', 
    marginBottom: 15,
  },
  outlineButtonText: { 
    color: '#D32F2F', 
    fontWeight: 'bold', 
    fontSize: 13, // Matches small button text
  },
  checkboxRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 25 
  },
  checkbox: { 
    width: 20, 
    height: 20, 
    borderWidth: 1.5, 
    borderColor: '#999', 
    borderRadius: 5,
    backgroundColor: '#FFF' 
  },
  checkboxLabel: { 
    fontSize: 13, 
    color: '#1565C0', // Blue color like on web/iOS native controls
    textDecorationLine: 'underline', // Matched the underlining
  },
  deleteButton: { 
    borderWidth: 1, 
    borderColor: '#D32F2F', 
    borderRadius: 8, 
    padding: 10, 
    alignItems: 'center', 
    marginBottom: 10 
  },
  deleteButtonText: { 
    color: '#D32F2F', 
    fontSize: 13,
  },
  updateButton: { 
    backgroundColor: '#D32F2F', 
    borderRadius: 8, 
    padding: 12, 
    alignItems: 'center', 
    marginTop: 5,
  },
  updateButtonText: { 
    color: '#FFF', 
    fontWeight: 'bold', 
    fontSize: 15,
  },
});
export default Coursedetail2;