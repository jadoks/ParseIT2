import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface SidebarProps {
  onLogout: () => void;
  onTabChange: (tab: string) => void;
  activeTab: string;
}

export const Sidebar = ({ onLogout, onTabChange, activeTab }: SidebarProps) => {
  const [clusterModalVisible, setClusterModalVisible] = useState(false);
  const [clusterTitleInput, setClusterTitleInput] = useState('4B-Laravel');
  const [activeCluster, setActiveCluster] = useState<string | null>('4B - Laravel');

  // --- DYNAMIC CLUSTER STATE ---
  const [clusters, setClusters] = useState([
    { id: 1, title: '4B - Laravel', icon: 'view-grid', year: 4 },
    { id: 2, title: '3B - Java', icon: 'xml', year: 3 },
    { id: 3, title: '2A - Algorithm', icon: 'chart-timeline-variant', year: 2 },
    { id: 4, title: '1A - Microsoft', icon: 'microsoft-windows', year: 1 },
    { id: 5, title: '3C - Python', icon: 'language-python', year: 3 },
    { id: 6, title: '4A - React Native', icon: 'react', year: 4 },
    { id: 7, title: '1B - Networking', icon: 'lan', year: 1 },
  ]);

  const sortedClusters = [...clusters].sort((a, b) => a.year - b.year);

  // --- FIXED CONFIRMATION & ADD LOGIC ---
  const handleConfirmAddCluster = () => {
    const trimmedTitle = clusterTitleInput.trim();

    if (!trimmedTitle) {
      Alert.alert("Error", "Please enter a Cluster Identifier.");
      return;
    }

    // 1. Close Modal immediately to allow Alert to show on top/cleanly
    setClusterModalVisible(false);

    // 2. Wrap Alert in a tiny timeout to ensure Modal is dismissed first
    setTimeout(() => {
      Alert.alert(
        "Confirm Action",
        `Are you sure you want to add "${trimmedTitle}" to the cluster list?`,
        [
          { 
            text: "Cancel", 
            style: "cancel", 
            onPress: () => setClusterModalVisible(true) // Re-open modal if they cancel
          },
          { 
            text: "Yes, Add It", 
            onPress: () => {
              // Extract year from input (e.g., '1A' -> 1)
              const firstChar = trimmedTitle.charAt(0);
              const detectedYear = parseInt(firstChar);
              const finalYear = isNaN(detectedYear) ? 1 : detectedYear;

              const newEntry = {
                id: Date.now(), // Unique ID
                title: trimmedTitle,
                icon: 'folder-outline',
                year: finalYear 
              };

              // Update the list correctly using prev state
              setClusters((prevClusters) => [...prevClusters, newEntry]);
              
              // Reset input field
              setClusterTitleInput('');
              
              // Highlight the newly added cluster
              setActiveCluster(trimmedTitle);
              
              console.log("Cluster successfully added to Year:", finalYear);
            } 
          }
        ]
      );
    }, 150);
  };

  const handleSettingsPress = () => {
    setActiveCluster(null); 
    onTabChange('Settings');
  };

  const handleClusterPress = (title: string) => {
    setActiveCluster(title);
    onTabChange('Clusters'); 
  };

  const [enrolledStudents] = useState([
    { id: '7210698', name: 'Ezra Cyril Albacite', email: 'ezra.albacite@university.edu', status: 'ACTIVE' },
    { id: '7210699', name: 'Hanne Abello', email: 'hanne.abello@university.edu', status: 'ACTIVE' },
    { id: '7210706', name: 'Raquel Basilisco', email: 'raquel.basilisco@university.edu', status: 'ACTIVE' },
    { id: '7210714', name: 'Stephanie Jane Lagoy', email: 'stephanie.lagoy@university.edu', status: 'PENDING' },
    { id: '7210822', name: 'Marcus Aurelius', email: 'marcus.aurelius@university.edu', status: 'ACTIVE' },
  ]);

  return (
    <View style={styles.container}>
      {/* LOGO SECTION */}
      <View style={styles.header}>
        <Icon name="pulse" size={28} color="#ff4d4d" />
        <Text style={styles.logo}>PasersHub 2.0</Text>
      </View>

      {/* CLUSTERS SECTION HEADER */}
      <View style={styles.labelContainer}>
        <Text style={styles.label}>MY CLUSTERS</Text>
        <TouchableOpacity onPress={() => setClusterModalVisible(true)}>
          <Icon name="plus" size={20} color="#ff4d4d" />
        </TouchableOpacity>
      </View>

      {/* SCROLLABLE CLUSTER LIST */}
      <View style={styles.clusterListWrapper}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
          {sortedClusters.map((cluster, index) => {
            const isActive = activeCluster === cluster.title && activeTab !== 'Settings';
            const showYearLabel = index === 0 || sortedClusters[index - 1].year !== cluster.year;

            return (
              <View key={cluster.id}>
                {showYearLabel && (
                  <Text style={styles.yearDivider}>
                    {cluster.year}{cluster.year === 1 ? 'ST' : cluster.year === 2 ? 'ND' : cluster.year === 3 ? 'RD' : 'TH'} YEAR
                  </Text>
                )}
                <TouchableOpacity 
                  style={[styles.clusterItem, isActive && styles.clusterActive]}
                  onPress={() => handleClusterPress(cluster.title)}
                >
                  <Icon 
                    name={cluster.icon as any} 
                    size={18} 
                    color={isActive ? "#fff" : "#94A3B8"} 
                  />
                  <Text style={[styles.clusterText, isActive && styles.clusterActiveText]}>
                    {cluster.title}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* SYSTEM SECTION */}
      <View style={styles.systemSection}>
        <View style={styles.separator} /> 
        <Text style={styles.label}>SYSTEM</Text>
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'Settings' && styles.activeNavItem]} 
          onPress={handleSettingsPress}
        >
          <Icon 
            name="cog-outline" 
            size={20} 
            color={activeTab === 'Settings' ? "#ff4d4d" : "#94A3B8"} 
          />
          <Text style={[styles.navText, activeTab === 'Settings' && styles.activeNavText]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOut} onPress={onLogout} activeOpacity={0.7}>
        <Icon name="logout" size={22} color="#ff4d4d" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Modal visible={clusterModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="account-group-outline" size={24} color="#ff4d4d" />
                <Text style={styles.modalTitle}>Create Student Cluster</Text>
              </View>
              <TouchableOpacity onPress={() => setClusterModalVisible(false)}>
                <Icon name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>CLUSTER IDENTIFIER</Text>
              <View style={styles.row}>
                <TextInput 
                  style={[styles.input, { flex: 1 }]} 
                  value={clusterTitleInput}
                  onChangeText={setClusterTitleInput}
                />
                <TouchableOpacity style={styles.btnDelete}>
                  <Icon name="trash-can-outline" size={18} color="#fff" />
                  <Text style={styles.btnTextWhite}>Delete Cluster</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.row, { justifyContent: 'space-between', marginTop: 20 }]}>
                <Text style={styles.inputLabel}>ENROLLMENT CONTROL</Text>
                <Text style={styles.subHint}>Enter student ID to verify and add to list</Text>
              </View>
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Enter Student ID (e.g. 7210XXX)" />
                <TouchableOpacity style={styles.btnAdd}><Icon name="plus" size={20} color="#fff" /></TouchableOpacity>
                <TouchableOpacity style={styles.btnMinus}><Icon name="minus" size={20} color="#fff" /></TouchableOpacity>
              </View>

              <View style={styles.tableContainer}>
                <View style={styles.tableHeaderRow}>
                   <Icon name="check-circle-outline" size={18} color="#64748B" />
                   <Text style={styles.tableHeaderText}>Enrolled Students</Text>
                </View>
                <View style={[styles.row, styles.tableHead]}>
                  <Text style={[styles.columnHeader, { flex: 1 }]}>STUDENT ID</Text>
                  <Text style={[styles.columnHeader, { flex: 1.5 }]}>FULL NAME</Text>
                  <Text style={[styles.columnHeader, { flex: 2 }]}>EMAIL ADDRESS</Text>
                  <Text style={[styles.columnHeader, { flex: 0.8 }]}>STATUS</Text>
                </View>
                {enrolledStudents.map((item, index) => (
                  <View key={index} style={[styles.row, styles.tableRow]}>
                    <Text style={[styles.idText, { flex: 1 }]}>{item.id}</Text>
                    <Text style={[styles.nameText, { flex: 1.5 }]}>{item.name}</Text>
                    <Text style={[styles.emailText, { flex: 2 }]}>{item.email}</Text>
                    <View style={{ flex: 0.8 }}>
                      <View style={[styles.statusBadge, item.status === 'PENDING' && { backgroundColor: '#F1F5F9' }]}>
                        <Text style={[styles.statusText, item.status === 'PENDING' && { color: '#64748B' }]}>{item.status}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.confirmClusterBtn} onPress={handleConfirmAddCluster}>
                  <Text style={styles.btnTextWhite}>Confirm and Add Cluster</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: 260, backgroundColor: '#FFFFFF', padding: 25, height: '100%', borderRightWidth: 1, borderRightColor: '#F1F5F9', zIndex: 100 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 40, marginTop: 10 },
  logo: { color: '#1E293B', fontSize: 20, fontWeight: 'bold', marginLeft: 12 },
  labelContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  label: { color: '#CBD5E1', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15 },
  clusterListWrapper: { maxHeight: 350 }, 
  yearDivider: { fontSize: 10, fontWeight: '800', color: '#94A3B8', marginTop: 15, marginBottom: 10, marginLeft: 5 },
  clusterItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 4 },
  clusterActive: { backgroundColor: '#ff4d4d', elevation: 4, shadowColor: '#ff4d4d', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
  clusterText: { color: '#64748B', fontWeight: '500', marginLeft: 12, fontSize: 14 },
  clusterActiveText: { color: '#fff', fontWeight: '700' },
  systemSection: { marginTop: 20 },
  separator: { 
    height: 2,                
    backgroundColor: '#FFCACA', 
    marginBottom: 20, 
    width: '100%', 
    borderRadius: 2,
    shadowColor: '#FF4D4D',   
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3
  },
  navItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10 },
  activeNavItem: { backgroundColor: '#FFF5F5' },
  navText: { color: '#64748B', marginLeft: 12, fontSize: 14, fontWeight: '500' },
  activeNavText: { color: '#ff4d4d', fontWeight: '700' },
  signOut: { position: 'absolute', bottom: 50, left: 25, flexDirection: 'row', alignItems: 'center', padding: 10 },
  signOutText: { color: '#ff4d4d', fontSize: 15, fontWeight: '600', marginLeft: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: 900, backgroundColor: '#FFF', borderRadius: 20, padding: 30, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginLeft: 10 },
  inputLabel: { fontSize: 12, fontWeight: '800', color: '#64748B', marginBottom: 10 },
  subHint: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'center' },
  input: { height: 45, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 15, color: '#1E293B' },
  btnDelete: { backgroundColor: '#ff4d4d', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 45, borderRadius: 8, marginLeft: 15 },
  btnAdd: { backgroundColor: '#ff4d4d', width: 45, height: 45, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  btnMinus: { backgroundColor: '#1E293B', width: 45, height: 45, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  btnTextWhite: { color: '#FFF', fontWeight: '700', marginLeft: 8 },
  confirmClusterBtn: { backgroundColor: '#1E293B', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginTop: 30, marginBottom: 10 },
  tableContainer: { marginTop: 30, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  tableHeaderRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  tableHeaderText: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginLeft: 10 },
  tableHead: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10 },
  columnHeader: { fontSize: 11, fontWeight: '800', color: '#94A3B8' },
  tableRow: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  idText: { color: '#ff4d4d', fontWeight: '600', fontSize: 13 },
  nameText: { color: '#1E293B', fontWeight: '700', fontSize: 13 },
  emailText: { color: '#64748B', fontSize: 13 },
  statusBadge: { backgroundColor: '#E2E8F0', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, alignSelf: 'flex-start' },
  statusText: { fontSize: 10, fontWeight: '800', color: '#1E293B' }
});