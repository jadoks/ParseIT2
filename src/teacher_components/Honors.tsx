import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function HonorsScreen() {
  const [activeTab, setActiveTab] = useState('My Cluster');
  const [studentId, setStudentId] = useState('');

  const clusters = ['3A - PYTHON', '3A - PYTHON', '3A - PYTHON', '3A - PYTHON'];

  // Mock data based on your screenshot
  const studentData = [
    { name: 'Munoz, Ramcee Jade L.', id: '7230479', unit: '25', gpa: '1.752' },
    { name: 'Munoz, Ramcee Jade L.', id: '7230479', unit: '25', gpa: '1.752' },
    { name: 'Munoz, Ramcee Jade L.', id: '7230479', unit: '25', gpa: '1.752' },
    { name: 'Munoz, Ramcee Jade L.', id: '7230479', unit: '25', gpa: '1.752' },
    { name: 'Munoz, Ramcee Jade L.', id: '7230479', unit: '25', gpa: '1.752' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Honors</Text>
          <Text style={styles.infoIcon}>i</Text>
        </View>

        <View style={styles.subHeader}>
          <Text style={styles.mainHeading}>Generate Honor Roll</Text>
          <Text style={styles.subHeadingText}>Create Dean's listers for your class</Text>
        </View>

        {/* --- TABS SECTION --- */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabItem, activeTab === 'My Cluster' && styles.tabActive]} 
            onPress={() => setActiveTab('My Cluster')}
          >
            <View style={styles.tabLabelRow}>
                <Ionicons name="checkmark" size={18} color={activeTab === 'My Cluster' ? "#B71C1C" : "#333"} />
                <Text style={[styles.tabText, activeTab === 'My Cluster' && styles.tabTextActive]}>My Cluster</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabItem, activeTab === 'Draft' && styles.tabActive]} 
            onPress={() => setActiveTab('Draft')}
          >
            <View style={styles.tabLabelRow}>
                <Ionicons name="document-text-outline" size={16} color={activeTab === 'Draft' ? "#B71C1C" : "#333"} />
                <Text style={[styles.tabText, activeTab === 'Draft' && styles.tabTextActive]}>Draft</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* --- DYNAMIC CONTENT --- */}
        {activeTab === 'My Cluster' ? (
          <View>
            <View style={styles.actionRow}>
              <TextInput style={styles.input} placeholder="Enter Cluster Name" placeholderTextColor="#A9A9A9" />
              <TouchableOpacity style={styles.addBtn}><Text style={styles.addBtnText}>Add</Text></TouchableOpacity>
              <TouchableOpacity style={styles.outlineBtn}><Text style={styles.outlineBtnText}>Rename</Text></TouchableOpacity>
              <TouchableOpacity style={styles.outlineBtn}><Text style={styles.outlineBtnText}>Delete</Text></TouchableOpacity>
              <TouchableOpacity style={styles.outlineBtn}><Text style={styles.outlineBtnText}>Lock</Text></TouchableOpacity>
            </View>

            <View style={styles.clusterGrid}>
              {clusters.map((item, index) => (
                <View key={index} style={styles.clusterItem}>
                  <View style={styles.radioOuter}><View style={styles.radioInner} /></View>
                  <Text style={styles.clusterText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          /* --- DRAFT UI (Based on your new screenshot) --- */
          <View>
            {/* Top Row: Selectors and Generate */}
            <View style={styles.draftControlsRow}>
              <View style={styles.pickerFake}>
                <Text style={styles.pickerText}>S.Y 2025 - 2026</Text>
                <Ionicons name="chevron-down" size={14} color="black" />
              </View>

              <View style={[styles.pickerFake, { width: 150 }]}>
                <Text style={styles.pickerText}>First Semester</Text>
                <Ionicons name="chevron-down" size={14} color="black" />
              </View>

              <TouchableOpacity style={styles.generateBtn}>
                <Text style={styles.generateBtnText}>Generate</Text>
              </TouchableOpacity>
            </View>

            {/* Middle Row: ID Input + - */}
            <View style={styles.idInputRow}>
              <TextInput 
                style={styles.idInput} 
                placeholder="Enter Student ID" 
                value={studentId}
                onChangeText={setStudentId}
              />
              <Text style={styles.mathSymbol}>+</Text>
              <Text style={styles.mathSymbol}>-</Text>
            </View>

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, { flex: 2 }]}>Student Name</Text>
              <Text style={[styles.headerCell, { flex: 1 }]}>Student ID</Text>
              <Text style={[styles.headerCell, { flex: 0.5 }]}>Unit</Text>
              <Text style={[styles.headerCell, { flex: 0.5 }]}>GPA</Text>
            </View>

            {/* Table Rows */}
            {studentData.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.cellText, { flex: 2 }]}>{item.name}</Text>
                <Text style={[styles.cellText, { flex: 1 }]}>{item.id}</Text>
                <Text style={[styles.cellText, { flex: 0.5 }]}>{item.unit}</Text>
                <Text style={[styles.cellText, { flex: 0.5 }]}>{item.gpa}</Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 40, paddingTop: 30 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 36, fontWeight: '800', color: '#000' },
  infoIcon: { color: '#B71C1C', fontSize: 18, fontWeight: 'bold', fontStyle: 'italic' },
  subHeader: { marginTop: 15, marginBottom: 35 },
  mainHeading: { fontSize: 22, fontWeight: '700', color: '#000' },
  subHeadingText: { fontSize: 14, color: '#444', marginTop: 2 },
  
  // Tab Styling
  tabContainer: { flexDirection: 'row', marginBottom: 30, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  tabItem: { paddingBottom: 12, alignItems: 'center', justifyContent: 'center', width: 350 },
  tabLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#B71C1C' },
  tabText: { fontSize: 14, color: '#333', fontWeight: '500' },
  tabTextActive: { color: '#B71C1C', fontWeight: 'bold' },

  // Cluster Styles
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 25 },
  input: { width: 280, height: 40, borderWidth: 1, borderColor: '#444', borderRadius: 8, paddingHorizontal: 15 },
  addBtn: { backgroundColor: '#B71C1C', height: 40, paddingHorizontal: 25, borderRadius: 8, justifyContent: 'center' },
  addBtnText: { color: '#FFF', fontWeight: 'bold' },
  outlineBtn: { height: 40, paddingHorizontal: 15, borderWidth: 1, borderColor: '#B71C1C', borderRadius: 8, justifyContent: 'center' },
  outlineBtnText: { color: '#B71C1C', fontSize: 12 },
  clusterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 30 },
  clusterItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#B71C1C', alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#B71C1C' },
  clusterText: { fontSize: 14, fontWeight: '800', color: '#000' },

  /* --- DRAFT UI STYLES --- */
  draftControlsRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 20 },
  pickerFake: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    width: 130, 
    height: 35, 
    borderWidth: 1, 
    borderColor: '#333', 
    borderRadius: 5, 
    paddingHorizontal: 8 
  },
  pickerText: { fontSize: 11, color: '#000' },
  generateBtn: { 
    backgroundColor: '#B71C1C', 
    width: 130, 
    height: 35, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  generateBtnText: { color: '#FFF', fontSize: 12, fontWeight: '500' },
  
  idInputRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 30 },
  idInput: { width: 210, height: 45, borderWidth: 1, borderColor: '#888', borderRadius: 8, paddingHorizontal: 15 },
  mathSymbol: { fontSize: 20, color: '#333', fontWeight: '400' },

  tableHeader: { flexDirection: 'row', paddingBottom: 10, borderBottomWidth: 0, marginTop: 10 },
  headerCell: { fontSize: 13, color: '#555', fontWeight: '400' },
  tableRow: { flexDirection: 'row', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  cellText: { fontSize: 14, color: '#000', fontWeight: '400' },
});