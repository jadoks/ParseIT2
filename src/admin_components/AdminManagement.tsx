import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export const AdminManagement = () => {
  const [searchQuery, setSearchQuery] = useState(''); 
  const [admins, setAdmins] = useState([
    { id: 'ADM-9921', name: 'Jonathan Vercetti', email: 'jvercetti@pasershub.com', img: 'https://i.pravatar.cc/150?u=jonathan' },
    { id: 'ADM-8842', name: 'Sarah Montgomery', email: 's.montgomery@pasershub.com', img: 'https://i.pravatar.cc/150?u=sarah' },
    { id: 'ADM-7731', name: 'Marcus Thorne', email: 'm.thorne@pasershub.com', img: 'https://i.pravatar.cc/150?u=marcus' },
    { id: 'ADM-6621', name: 'Elena Rodriguez', email: 'e.rodriguez@pasershub.com', img: 'https://i.pravatar.cc/150?u=elena' },
    { id: 'ADM-5542', name: 'David Chen', email: 'd.chen@pasershub.com', img: 'https://i.pravatar.cc/150?u=david' },
    { id: 'ADM-4431', name: 'Sophia Williams', email: 's.williams@pasershub.com', img: 'https://i.pravatar.cc/150?u=sophia' },
    { id: 'ADM-3321', name: 'Liam Anderson', email: 'l.anderson@pasershub.com', img: 'https://i.pravatar.cc/150?u=liam' }, // 7th Admin
  ]);

  const filteredAdmins = admins.filter(admin => 
    admin.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    admin.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Admin Management</Text>
          <Text style={styles.subtitle}>System administrators and system access control.</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search admin identifier..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.tableCard}>
        {/* BALANCED & ALIGNED HEADER */}
        <View style={styles.tableHeader}>
           <Text style={[styles.headerLabel, { flex: 1 }]}>ADMIN ID</Text>
           <Text style={[styles.headerLabel, { flex: 3 }]}>FULL NAME</Text>
           <Text style={[styles.headerLabel, { width: 90, textAlign: 'center' }]}>ACTIONS</Text>
        </View>

        <ScrollView 
          style={styles.rowsScrollArea} 
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {filteredAdmins.map((item) => (
            <View key={item.id} style={styles.row}>
              {/* ID COLUMN */}
              <View style={{ flex: 1 }}>
                <Text style={styles.idText}>{item.id}</Text>
              </View>
              
              {/* ALIGNED NAME COLUMN */}
              <View style={[styles.userInfo, { flex: 3 }]}>
                 <Image source={{ uri: item.img }} style={styles.avatar} />
                 <View style={styles.nameContainer}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                 </View>
              </View>

              {/* CENTERED ACTIONS */}
              <View style={styles.actionCell}>
                 <TouchableOpacity style={styles.actionIcon}>
                    <Feather name="edit-2" size={18} color="#64748B" />
                 </TouchableOpacity>
                 <TouchableOpacity style={styles.actionIcon}>
                    <Feather name="trash-2" size={18} color="#F87171" />
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
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 25 },
  headerRow: { marginBottom: 20 },
  title: { color: '#1E293B', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#64748B', fontSize: 14, marginTop: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 15, height: 48, marginBottom: 25, borderWidth: 1, borderColor: '#E2E8F0', maxWidth: 400 },
  searchInput: { flex: 1, fontSize: 14, color: '#1E293B', marginLeft: 10 },
  
  tableCard: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', elevation: 2 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 25, paddingVertical: 18, backgroundColor: '#1E293B', alignItems: 'center' },
  headerLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  
  // Adjusted height to trigger scroll after 5 admins (approx 365px)
  rowsScrollArea: { maxHeight: 365 },
  
  row: { flexDirection: 'row', paddingHorizontal: 25, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  idText: { color: '#F87171', fontWeight: 'bold', fontSize: 13 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 21, marginRight: 15, backgroundColor: '#F1F5F9' },
  nameContainer: { justifyContent: 'center' }, 
  userName: { color: '#1E293B', fontWeight: 'bold', fontSize: 15, lineHeight: 18 },
  userEmail: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  actionCell: { 
    flexDirection: 'row', 
    width: 90, 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  actionIcon: { padding: 5 }
});