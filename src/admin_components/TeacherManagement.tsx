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

const teacherData = [
  { id: 'T-88210', name: 'Dr. Elena Rodriguez', email: 'e.rodriguez@univ.edu', subject: 'Advanced Mathematics', classes: 4, status: 'Active', img: 'https://i.pravatar.cc/150?u=elena' },
  { id: 'T-88245', name: 'Prof. Marcus Thorne', email: 'm.thorne@univ.edu', subject: 'Data Structures & Alg', classes: 2, status: 'On Leave', img: 'https://i.pravatar.cc/150?u=marcus' },
  { id: 'T-88262', name: 'Sarah Jenkins', email: 's.jenkins@univ.edu', subject: 'Full-Stack Web Dev', classes: 5, status: 'Active', img: 'https://i.pravatar.cc/150?u=sarah' },
];

// Ensure this is a Named Export
export const TeacherManagement = () => {
  const [search, setSearch] = useState('');

  const filteredTeachers = teacherData.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.id.includes(search) ||
    t.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.outerContainer}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Teacher Management</Text>
          <Text style={styles.subtitle}>Manage system administrators, permissions, and access levels.</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.7}>
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.addBtnText}>ADD TEACHER</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterBar}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color="#94A3B8" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search teachers by name, ID or subject..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.filterGroup}>
          <TouchableOpacity style={styles.fBtn}>
            <Feather name="sliders" size={14} color="#64748B" />
            <Text style={styles.fBtnText}>Filters</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fBtn}>
            <Text style={styles.fBtnText}>Academic Year: 2023-2024</Text>
            <Feather name="chevron-down" size={14} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.hText, { flex: 1 }]}>TEACHER ID</Text>
          <Text style={[styles.hText, { flex: 2.5 }]}>FULL NAME</Text>
          <Text style={[styles.hText, { flex: 2 }]}>SUBJECT</Text>
          <Text style={[styles.hText, { flex: 1, textAlign: 'center' }]}>CLASSES</Text>
          <Text style={[styles.hText, { flex: 1, textAlign: 'center' }]}>STATUS</Text>
          <Text style={[styles.hText, { flex: 1.5, textAlign: 'center' }]}>ACTIONS</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {filteredTeachers.map((item) => (
            <View key={item.id} style={styles.row}>
              <Text style={[styles.idText, { flex: 1 }]}>{item.id}</Text>
              <View style={[styles.userInfo, { flex: 2.5 }]}>
                <Image source={{ uri: item.img }} style={styles.avatar} />
                <View>
                  <Text style={styles.uName}>{item.name}</Text>
                  <Text style={styles.uEmail}>{item.email}</Text>
                </View>
              </View>
              <Text style={[styles.cellText, { flex: 2 }]}>{item.subject}</Text>
              <Text style={[styles.cellText, { flex: 1, textAlign: 'center' }]}>{item.classes}</Text>
              <View style={[styles.statusCell, { flex: 1 }]}>
                 <Text style={[styles.statusTag, item.status === 'Active' ? styles.active : styles.leave]}>
                  {item.status}
                </Text>
              </View>
              <View style={[styles.actionCell, { flex: 1.5 }]}>
                <TouchableOpacity style={styles.actionBtn}>
                  <Feather name="edit-2" size={14} color="#64748B" />
                  <Text style={styles.editText}>EDIT</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <Feather name="trash-2" size={14} color="#F87171" />
                  <Text style={styles.deleteText}>DELETE</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  title: { color: '#1E293B', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#64748B', fontSize: 14, marginTop: 4 },
  addBtn: { backgroundColor: '#F87171', flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13, marginLeft: 8 },
  filterBar: { flexDirection: 'row', marginBottom: 20, gap: 10, alignItems: 'center' },
  searchContainer: { flex: 1, backgroundColor: '#F8FAFC', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 45, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { color: '#1E293B', marginLeft: 10, flex: 1 },
  filterGroup: { flexDirection: 'row', gap: 8 },
  fBtn: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, height: 45, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  fBtnText: { color: '#1E293B', fontSize: 12 },
  tableCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3.84 },
  tableHeader: { flexDirection: 'row', padding: 18, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  hText: { color: '#64748B', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  row: { flexDirection: 'row', padding: 18, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  idText: { color: '#94A3B8', fontSize: 13 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12, backgroundColor: '#E2E8F0' },
  uName: { color: '#1E293B', fontWeight: '600', fontSize: 14 },
  uEmail: { color: '#64748B', fontSize: 11, marginTop: 2 },
  cellText: { color: '#334155', fontSize: 13 },
  statusCell: { alignItems: 'center' },
  statusTag: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  active: { color: '#10B981' },
  leave: { color: '#F59E0B' },
  actionCell: { flexDirection: 'row', justifyContent: 'center', gap: 15 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  editText: { color: '#64748B', fontSize: 11, fontWeight: 'bold' },
  deleteText: { color: '#F87171', fontSize: 11, fontWeight: 'bold' }
});