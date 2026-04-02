import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface SidebarProps {
  onLogout: () => void;
  onTabChange: (tab: string) => void;
  activeTab: string;
  clusters: any[]; 
  onAddCluster: (name: string, studentId: string) => void;
}

export const Sidebar = ({ onLogout, onTabChange, activeTab, clusters = [], onAddCluster }: SidebarProps) => {
  const [clusterModalVisible, setClusterModalVisible] = useState(false);
  const [clusterTitleInput, setClusterTitleInput] = useState('');
  const [studentIdInput, setStudentIdInput] = useState('');

  const sortedClusters = Array.isArray(clusters) 
    ? [...clusters].sort((a, b) => (a.year || 0) - (b.year || 0)) 
    : [];

  const handleAddClusterConfirm = () => {
    const trimmedTitle = clusterTitleInput.trim();
    const trimmedId = studentIdInput.trim();

    if (!trimmedTitle || !trimmedId) {
      Alert.alert("Missing Information", "Please enter both Cluster Identifier and Student ID.");
      return;
    }

    // Close modal first
    setClusterModalVisible(false);

    // Small delay to let modal close smoothly, then add
    setTimeout(() => {
      Alert.alert(
        "Confirm",
        `Add cluster "${trimmedTitle}" with Student ID ${trimmedId}?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Yes, Add", 
            onPress: () => {
              onAddCluster(trimmedTitle, trimmedId);
              setClusterTitleInput('');
              setStudentIdInput('');
            }
          }
        ]
      );
    }, 300);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="pulse" size={28} color="#ff4d4d" />
        <Text style={styles.logo}>PasersHub 2.0</Text>
      </View>

      <View style={styles.labelContainer}>
        <Text style={styles.label}>MY CLUSTERS</Text>
        <TouchableOpacity onPress={() => setClusterModalVisible(true)}>
          <Icon name="plus" size={20} color="#ff4d4d" />
        </TouchableOpacity>
      </View>

      <View style={styles.clusterListWrapper}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {sortedClusters.length === 0 ? (
            <Text style={{ color: '#94A3B8', fontSize: 12, fontStyle: 'italic', marginLeft: 5 }}>
              No clusters added yet.
            </Text>
          ) : (
            sortedClusters.map((cluster, index) => {
              const isActive = activeTab === cluster.title;
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
                    onPress={() => onTabChange(cluster.title)}
                  >
                    <Icon name={cluster.icon || 'folder'} size={18} color={isActive ? "#fff" : "#94A3B8"} />
                    <Text style={[styles.clusterText, isActive && styles.clusterActiveText]}>
                      {cluster.title}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      <View style={styles.systemSection}>
        <View style={styles.separator} /> 
        <Text style={styles.label}>SYSTEM</Text>
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'Settings' && styles.activeNavItem]} 
          onPress={() => onTabChange('Settings')}
        >
          <Icon name="cog-outline" size={20} color={activeTab === 'Settings' ? "#ff4d4d" : "#94A3B8"} />
          <Text style={[styles.navText, activeTab === 'Settings' && styles.activeNavText]}>Settings</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOut} onPress={onLogout}>
        <Icon name="logout" size={22} color="#ff4d4d" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={clusterModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setClusterModalVisible(false)}>
                <Icon name="chevron-left" size={28} color="#1E293B" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create Student Cluster</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>CLUSTER IDENTIFIER</Text>
              <TextInput 
                style={styles.input} 
                value={clusterTitleInput} 
                onChangeText={setClusterTitleInput} 
                placeholder="e.g. 4B-Laravel" 
                placeholderTextColor="#CBD5E1"
              />

              <Text style={[styles.inputLabel, { marginTop: 20 }]}>STUDENT ID</Text>
              <TextInput 
                style={styles.input} 
                value={studentIdInput} 
                onChangeText={setStudentIdInput} 
                placeholder="e.g. 2021-0001" 
                placeholderTextColor="#CBD5E1"
              />

              <TouchableOpacity style={styles.confirmClusterBtn} onPress={handleAddClusterConfirm}>
                <Text style={styles.btnTextWhite}>Add Cluster</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: 260, backgroundColor: '#FFFFFF', padding: 25, height: '100%', borderRightWidth: 1, borderRightColor: '#F1F5F9' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 40, marginTop: 10 },
  logo: { color: '#1E293B', fontSize: 20, fontWeight: 'bold', marginLeft: 12 },
  labelContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  label: { color: '#CBD5E1', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15 },
  clusterListWrapper: { maxHeight: 350 }, 
  yearDivider: { fontSize: 10, fontWeight: '800', color: '#94A3B8', marginTop: 15, marginBottom: 10, marginLeft: 5 },
  clusterItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 4 },
  clusterActive: { backgroundColor: '#ff4d4d' },
  clusterText: { color: '#64748B', fontWeight: '500', marginLeft: 12, fontSize: 14 },
  clusterActiveText: { color: '#fff', fontWeight: '700' },
  systemSection: { marginTop: 20 },
  separator: { height: 3, backgroundColor: '#FFCACA', marginBottom: 20, width: '100%', borderRadius: 2 },
  navItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10 },
  activeNavItem: { backgroundColor: '#FFF5F5' },
  navText: { color: '#64748B', marginLeft: 12, fontSize: 14, fontWeight: '500' },
  activeNavText: { color: '#ff4d4d', fontWeight: '700' },
  signOut: { position: 'absolute', bottom: 50, left: 25, flexDirection: 'row', alignItems: 'center' },
  signOutText: { color: '#ff4d4d', fontSize: 15, fontWeight: '600', marginLeft: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 500, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 35 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#1E293B', marginLeft: 15 },
  inputLabel: { fontSize: 12, fontWeight: '800', color: '#64748B', marginBottom: 10, letterSpacing: 0.5 },
  input: { height: 55, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 18, fontSize: 16, color: '#1E293B' },
  confirmClusterBtn: { backgroundColor: '#1E293B', paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginTop: 35 },
  btnTextWhite: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});