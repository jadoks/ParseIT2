import React from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const adminData = [
  { id: 'ADM-9921', name: 'Jonathan Vercetti', email: 'jvercetti@pasershub.com', role: 'Super Admin', img: 'https://i.pravatar.cc/150?u=jonathan' },
  { id: 'ADM-8842', name: 'Sarah Montgomery', email: 's.montgomery@pasershub.com', role: 'Regional Admin', img: 'https://i.pravatar.cc/150?u=sarah' },
  { id: 'ADM-7731', name: 'Marcus Thorne', email: 'm.thorne@pasershub.com', role: 'Technical Lead', img: 'https://i.pravatar.cc/150?u=marcus' },
];

export const AdminManagement = () => {
  return (
    <View style={styles.container}>
      {/* HEADER SECTION */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Admin Management</Text>
          <Text style={styles.subtitle}>Manage system administrators, permissions, and access levels.</Text>
        </View>
        <TouchableOpacity style={styles.addBtn}>
          <Icon name="plus" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add Admin</Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH AND FILTER BAR */}
      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={20} color="#999" />
          <TextInput 
            placeholder="Search by ID, name, or email..." 
            placeholderTextColor="#999"
            style={styles.input}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Icon name="filter-variant" size={18} color="#666" />
          <Text style={styles.filterBtnText}>Filter by Year</Text>
          <Icon name="chevron-down" size={18} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterBtn}>
          <Icon name="sort" size={18} color="#666" />
          <Text style={styles.filterBtnText}>Sort: Newest</Text>
          <Icon name="chevron-down" size={18} color="#999" />
        </TouchableOpacity>
      </View>

      {/* TABLE DATA */}
      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
           <Text style={[styles.headerLabel, { flex: 1 }]}>ADMIN ID</Text>
           <Text style={[styles.headerLabel, { flex: 2.5 }]}>FULL NAME</Text>
           <Text style={[styles.headerLabel, { flex: 1.2 }]}>ACTIONS</Text>
        </View>

        {adminData.map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={[styles.idText, { flex: 1 }]}>{item.id}</Text>
            
            <View style={[styles.userInfo, { flex: 2.5 }]}>
               <Image source={{ uri: item.img }} style={styles.avatar} />
               <View>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
               </View>
               <Text style={styles.roleTag}>{item.role}</Text>
            </View>

            <View style={[styles.actionCell, { flex: 1.2 }]}>
               <TouchableOpacity style={styles.actionBtn}>
                 <Icon name="pencil-outline" size={14} color="#666" />
                 <Text style={styles.actionText}>EDIT</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.actionBtn}>
                 <Icon name="delete-outline" size={14} color="#ff4d4d" />
                 <Text style={[styles.actionText, { color: '#ff4d4d' }]}>DELETE</Text>
               </TouchableOpacity>
               <Icon name="dots-vertical" size={20} color="#CCC" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  title: { color: '#1A1A1A', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#888', fontSize: 14, marginTop: 5 },
  addBtn: { backgroundColor: '#ff4d4d', flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  
  filterBar: { flexDirection: 'row', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 8, paddingHorizontal: 15, height: 45, marginRight: 15, borderWidth: 1, borderColor: '#DDD' },
  input: { flex: 1, color: '#000', marginLeft: 10, fontSize: 14 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, height: 45, borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: '#DDD' },
  filterBtnText: { color: '#444', marginHorizontal: 8, fontSize: 13, fontWeight: '500' },

  tableCard: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#EEE', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  tableHeader: { flexDirection: 'row', padding: 20, backgroundColor: '#1A1A1A' },
  headerLabel: { color: '#AAA', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  row: { flexDirection: 'row', padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  idText: { color: '#ff4d4d', fontWeight: 'bold', fontSize: 14 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 15, backgroundColor: '#F0F0F0' },
  userName: { color: '#1A1A1A', fontWeight: 'bold', fontSize: 15 },
  userEmail: { color: '#999', fontSize: 12 },
  roleTag: { color: '#777', marginLeft: 30, fontSize: 13, fontWeight: '500' },
  actionCell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, marginLeft: 8 },
  actionText: { color: '#444', fontSize: 11, fontWeight: 'bold', marginLeft: 5 }
});