import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// Data remains consistent with your management view
const studentData = [
  { id: '#102931', name: 'Alexander Wright', email: 'a.wright@univ.edu', program: 'BSCS - 4B', sessions: 42, status: 'Active', progress: 0.88, img: 'https://i.pravatar.cc/150?u=1' },
  { id: '#102945', name: 'Elena Rodriguez', email: 'e.rodriguez@univ.edu', program: 'BSIT - 3B', sessions: 28, status: 'Active', progress: 0.72, img: 'https://i.pravatar.cc/150?u=2' },
  { id: '#102958', name: 'Marcus Thorne', email: 'm.thorne@univ.edu', program: 'BSDS - 2A', sessions: 56, status: 'Away', progress: 0.91, img: 'https://i.pravatar.cc/150?u=3' },
];

export const StudentManagement = () => {
  const [search, setSearch] = useState('');

  // Filtering logic for the search bar
  const filteredStudents = studentData.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.id.includes(search)
  );

  return (
    <View style={styles.outerContainer}>
      {/* TITLE SECTION */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Student Management</Text>
          <Text style={styles.subtitle}>Manage system administrators, permissions, and access levels.</Text>
        </View>
        <TouchableOpacity style={styles.newStudentBtn} activeOpacity={0.7}>
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.newStudentText}>NEW STUDENT</Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH & FILTERS SECTION */}
      <View style={styles.filterBar}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color="#4B5563" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search by ID, name, or email..."
            placeholderTextColor="#4B5563"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.filterGroup}>
          <FilterButton label="Filter by Year" />
          <FilterButton label="Program: All" />
          <FilterButton label="Status: Active" />
        </View>
      </View>

      {/* DATA TABLE */}
      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.hText, { flex: 1 }]}>STUDENT ID</Text>
          <Text style={[styles.hText, { flex: 2.5 }]}>FULL NAME</Text>
          <Text style={[styles.hText, { flex: 1.5 }]}>PROGRAM/YEAR</Text>
          <Text style={[styles.hText, { flex: 0.8, textAlign: 'center' }]}>SESSIONS</Text>
          <Text style={[styles.hText, { flex: 1, textAlign: 'center' }]}>STATUS</Text>
          <Text style={[styles.hText, { flex: 2.2 }]}>PROGRESS & ACTIONS</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {filteredStudents.map((item) => (
            <View key={item.id} style={styles.row}>
              <Text style={[styles.idText, { flex: 1 }]}>{item.id}</Text>
              
              <View style={[styles.userInfo, { flex: 2.5 }]}>
                <Image source={{ uri: item.img }} style={styles.avatar} />
                <View>
                  <Text style={styles.uName}>{item.name}</Text>
                  <Text style={styles.uEmail}>{item.email}</Text>
                </View>
              </View>
              
              <Text style={[styles.cellText, { flex: 1.5 }]}>{item.program}</Text>
              <Text style={[styles.cellText, { flex: 0.8, textAlign: 'center' }]}>{item.sessions}</Text>
              
              <View style={[styles.statusCell, { flex: 1 }]}>
                 <Text style={[styles.statusTag, item.status === 'Active' ? styles.active : styles.away]}>
                  {item.status}
                </Text>
              </View>

              <View style={[styles.actionCell, { flex: 2.2 }]}>
                <View style={styles.progressBox}>
                  <Text style={styles.progLabel}>PROGRESS <Text style={{color:'#fff'}}>{Math.round(item.progress*100)}%</Text></Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${item.progress * 100}%` }]} />
                  </View>
                </View>
                <View style={styles.iconRow}>
                  <Feather name="edit-2" size={14} color="#94A3B8" style={styles.icon} />
                  <Feather name="trash-2" size={14} color="#F87171" style={styles.icon} />
                  <Feather name="more-vertical" size={14} color="#94A3B8" />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

// Reusable Filter Button Component
const FilterButton = ({ label }: { label: string }) => (
  <TouchableOpacity style={styles.fBtn} activeOpacity={0.6}>
    <Text style={styles.fBtnText}>{label}</Text>
    <Feather name="chevron-down" size={14} color="#4B5563" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#000', padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#6B7280', fontSize: 14, marginTop: 4 },
  newStudentBtn: { backgroundColor: '#F87171', flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  newStudentText: { color: '#fff', fontWeight: 'bold', fontSize: 13, marginLeft: 8 },

  filterBar: { flexDirection: 'row', marginBottom: 20, gap: 10, alignItems: 'center' },
  searchContainer: { flex: 1, backgroundColor: '#0A0A0A', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 45, borderRadius: 8, borderWidth: 1, borderColor: '#1F2937' },
  searchInput: { color: '#fff', marginLeft: 10, flex: 1 },
  filterGroup: { flexDirection: 'row', gap: 8 },
  fBtn: { 
    backgroundColor: '#0A0A0A', 
    borderWidth: 1, // FIXED FROM borderLineWidth
    borderColor: '#1F2937', 
    paddingHorizontal: 12, 
    height: 45, 
    borderRadius: 8, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  fBtnText: { color: '#fff', fontSize: 12 },

  tableCard: { backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#1F2937', overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', padding: 18, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  hText: { color: '#4B5563', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  
  row: { flexDirection: 'row', padding: 18, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  idText: { color: '#9CA3AF', fontSize: 13 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12, backgroundColor: '#374151' },
  uName: { color: '#fff', fontWeight: '600', fontSize: 14 },
  uEmail: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  cellText: { color: '#D1D5DB', fontSize: 13 },
  statusCell: { alignItems: 'center' },
  statusTag: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  active: { color: '#10B981' },
  away: { color: '#F59E0B' },

  actionCell: { flexDirection: 'row', alignItems: 'center' },
  progressBox: { flex: 1, marginRight: 15 },
  progLabel: { color: '#6B7280', fontSize: 9, fontWeight: 'bold', marginBottom: 6 },
  barBg: { height: 4, backgroundColor: '#1F2937', borderRadius: 2 },
  barFill: { height: '100%', backgroundColor: '#F87171', borderRadius: 2 },
  iconRow: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 12 }
});