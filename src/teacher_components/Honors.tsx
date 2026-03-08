import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const Honors = () => {
  const [activeTab, setActiveTab] = useState('My Clusters');
  const [clusterName, setClusterName] = useState('');
  const [showGenerateView, setShowGenerateView] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  const students = [
    { id: '7210699', name: 'Abello, Hanne', unit: 25, gpa: '1.752' },
    { id: '7210698', name: 'Albacite, Ezra Cyril', unit: 25, gpa: '1.732' },
    { id: '7210706', name: 'Basilisco, Raquel', unit: 25, gpa: '1.680' },
    { id: '7210714', name: 'Lagoy, Stephanie Jane', unit: 25, gpa: '1.756' },
  ];

  return (
    <View style={styles.screen}>
      {/* Header Area */}
      <View style={styles.headerRow}>
        <Ionicons name="menu-outline" size={30} color="#333" />
        <Text style={styles.headerTitle}>Honors</Text>
      </View>

      <View style={styles.introSection}>
        <Text style={styles.mainTitle}>Generate Honor Roll.</Text>
        <Text style={styles.subText}>Create Dean's listers for your class.</Text>
      </View>

      {/* Tabs - Styled with Theme Colors */}
      <View style={styles.tabContainer}>
        {['My Clusters', 'Draft'].map((tab) => (
          <TouchableOpacity 
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabButton, activeTab === tab && styles.activeTabBorder]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!showGenerateView ? (
          /* Initial View: Cluster Management */
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderText}>New Cluster</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.inputRow}>
                <TextInput
                  placeholder="Enter Cluster Name"
                  value={clusterName}
                  onChangeText={setClusterName}
                  style={styles.input}
                />
                <TouchableOpacity style={styles.primaryButton}>
                  <Text style={styles.buttonText}>Add</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.actionRow}>
                {['Rename', 'Delete', 'Lock'].map((action) => (
                  <TouchableOpacity key={action} style={styles.outlineButton}>
                    <Text style={styles.outlineButtonText}>{action}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                onPress={() => setShowGenerateView(true)}
                style={styles.listItem}
              >
                <View style={styles.radioOuter}>
                  <View style={styles.radioInner} />
                </View>
                <Text style={styles.listItemText}>4B-Laravel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Generate View: Student List */
          <View style={styles.card}>
             <View style={styles.cardHeader}>
                <Text style={styles.cardHeaderText}>S.Y. 2022 - 2023 | First Semester</Text>
             </View>
             
             <View style={styles.cardContent}>
               <View style={styles.inputRow}>
                  <TouchableOpacity 
                      onPress={() => setShowThemeModal(true)}
                      style={[styles.input, { justifyContent: 'center' }]}
                  >
                      <Text style={styles.contentText}>Theme: Ember Glow</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                      onPress={() => setShowResultModal(true)}
                      style={styles.primaryButton}
                  >
                      <Text style={styles.buttonText}>Generate</Text>
                  </TouchableOpacity>
               </View>

               {/* Table Header */}
               <View style={styles.tableHeader}>
                  <Text style={[styles.subText, { flex: 1 }]}>Student Name</Text>
                  <Text style={[styles.subText, { width: 40, textAlign: 'center' }]}>Unit</Text>
                  <Text style={[styles.subText, { width: 50, textAlign: 'right' }]}>GPA</Text>
               </View>

               {students.map((student) => (
                 <View key={student.id} style={styles.tableRow}>
                   <View style={{ flex: 1 }}>
                      <Text style={styles.titleText}>{student.name}</Text>
                      <Text style={styles.subText}>{student.id}</Text>
                   </View>
                   <Text style={[styles.contentText, { width: 40, textAlign: 'center' }]}>{student.unit}</Text>
                   <Text style={[styles.contentText, { width: 50, textAlign: 'right', fontWeight: '700' }]}>{student.gpa}</Text>
                 </View>
               ))}
             </View>
          </View>
        )}
      </ScrollView>

      {/* Result Modal - Using the Soft Red/Pink Theme */}
      <Modal visible={showResultModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={[styles.card, { width: '90%', padding: 0 }]}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardHeaderText}>Preview Certificate</Text>
                </View>
                
                <View style={styles.certificateContainer}>
                    <Text style={styles.certSchool}>CEBU TECHNOLOGICAL UNIVERSITY</Text>
                    <Text style={styles.certTitle}>Congratulations</Text>
                    <View style={styles.certDivider} />
                    
                    <View style={styles.certBody}>
                      <Text style={styles.certInfo}>Course Year / Section: 4B-Laravel</Text>
                      <Text style={styles.certInfo}>Total Students: 4</Text>
                      
                      <View style={styles.certTable}>
                          <View style={styles.certTableHeader}>
                              <Text style={styles.certHeaderText}>STUDENT NAME</Text>
                              <Text style={styles.certHeaderText}>GPA</Text>
                          </View>
                          {students.slice(0, 3).map(s => (
                              <View key={s.id} style={styles.certTableRow}>
                                  <Text style={styles.certCell}>{s.name}</Text>
                                  <Text style={[styles.certCell, { textAlign: 'right' }]}>{s.gpa}</Text>
                              </View>
                          ))}
                      </View>
                    </View>
                </View>

                <View style={styles.cardContent}>
                  <TouchableOpacity style={styles.primaryButton}>
                      <Text style={styles.buttonText}>Get Link</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowResultModal(false)} style={styles.closeBtn}>
                      <Text style={styles.outlineButtonText}>Close Preview</Text>
                  </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginLeft: 10,
  },
  introSection: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTabBorder: {
    borderBottomWidth: 2,
    borderBottomColor: '#D32F2F',
  },
  tabText: {
    fontSize: 15,
    color: '#666',
  },
  activeTabText: {
    color: '#D32F2F',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    marginBottom: 20,
    ...Platform.select({
      web: { boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
      default: { elevation: 2 },
    }),
  },
  cardHeader: {
    backgroundColor: '#fff2f2', // Theme color from ShareAnnouncement
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cardHeaderText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#D32F2F',
  },
  cardContent: {
    padding: 15,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 45,
    backgroundColor: '#fafafa',
  },
  primaryButton: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 20,
    height: 45,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#D32F2F',
    borderRadius: 6,
    paddingVertical: 6,
    width: '30%',
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#D32F2F',
    fontSize: 13,
    fontWeight: '600',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  listItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D32F2F',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
    marginBottom: 5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  contentText: {
    fontSize: 14,
    color: '#444',
  },
  subText: {
    color: '#777',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  certificateContainer: {
    backgroundColor: '#fffaf0',
    margin: 15,
    padding: 20,
    borderWidth: 2,
    borderColor: '#D32F2F',
    alignItems: 'center',
  },
  certSchool: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D32F2F',
    letterSpacing: 1,
  },
  certTitle: {
    fontSize: 24,
    fontStyle: 'italic',
    marginVertical: 10,
    color: '#333',
  },
  certDivider: {
    width: '100%',
    height: 2,
    backgroundColor: '#D32F2F',
    marginBottom: 15,
  },
  certBody: {
    width: '100%',
  },
  certInfo: {
    fontSize: 11,
    color: '#444',
    marginBottom: 2,
  },
  certTable: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#D32F2F',
  },
  certTableHeader: {
    backgroundColor: '#D32F2F',
    flexDirection: 'row',
    padding: 4,
  },
  certHeaderText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    flex: 1,
  },
  certTableRow: {
    flexDirection: 'row',
    padding: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#D32F2F',
  },
  certCell: {
    fontSize: 10,
    flex: 1,
  },
  closeBtn: {
    marginTop: 15,
    alignItems: 'center',
  },
});

export default Honors;