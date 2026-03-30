import React, { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const AdminManagement = () => {
  const [searchQuery, setSearchQuery] = useState(''); 
  const [admins, setAdmins] = useState([
    { id: 'ADM-9921', name: 'Jonathan Vercetti', email: 'jvercetti@pasershub.com', role: 'Super Admin', status: 'Active', img: 'https://i.pravatar.cc/150?u=jonathan' },
    { id: 'ADM-8842', name: 'Sarah Montgomery', email: 's.montgomery@pasershub.com', role: 'Regional Admin', status: 'Active', img: 'https://i.pravatar.cc/150?u=sarah' },
    { id: 'ADM-7731', name: 'Marcus Thorne', email: 'm.thorne@pasershub.com', role: 'Technical Lead', status: 'Inactive', img: 'https://i.pravatar.cc/150?u=marcus' },
    { id: 'ADM-6621', name: 'Elena Rodriguez', email: 'e.rodriguez@pasershub.com', role: 'Super Admin', status: 'Active', img: 'https://i.pravatar.cc/150?u=elena' },
    { id: 'ADM-5542', name: 'David Chen', email: 'd.chen@pasershub.com', role: 'Regional Admin', status: 'Active', img: 'https://i.pravatar.cc/150?u=david' },
    { id: 'ADM-4431', name: 'Sophia Williams', email: 's.williams@pasershub.com', role: 'Technical Lead', status: 'Active', img: 'https://i.pravatar.cc/150?u=sophia' },
  ]);

  const [isModalVisible, setModalVisible] = useState(false);
  const [tempAdmin, setTempAdmin] = useState<any>(null);
  const [originalId, setOriginalId] = useState<string>("");

  // SEARCH LOGIC
  const filteredAdmins = admins.filter(admin => 
    admin.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    admin.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string) => {
    setAdmins(admins.filter(admin => admin.id !== id));
  };

  const handleEdit = (admin: any) => {
    setOriginalId(admin.id); 
    setTempAdmin({ ...admin });
    setModalVisible(true);
  };

  const handleSave = () => {
    setAdmins(prevAdmins => 
      prevAdmins.map(admin => 
        admin.id === originalId ? { ...tempAdmin } : admin
      )
    );
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Admin Management</Text>
          <Text style={styles.subtitle}>System administrators, permissions, and access levels.</Text>
        </View>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={22} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Admin ID or Name..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tableCard}>
        {/* HEADER */}
        <View style={styles.tableHeader}>
           <Text style={[styles.headerLabel, { flex: 1 }]}>ADMIN ID</Text>
           <Text style={[styles.headerLabel, { flex: 2 }]}>FULL NAME</Text>
           <Text style={[styles.headerLabel, { flex: 1.2 }]}>ROLE</Text>
           <Text style={[styles.headerLabel, { flex: 1, textAlign: 'center' }]}>STATUS</Text>
           <Text style={[styles.headerLabel, { flex: 1.5, textAlign: 'right', paddingRight: 20 }]}>ACTIONS</Text>
        </View>

        {/* ROWS */}
        <ScrollView style={styles.rowsScrollArea} showsVerticalScrollIndicator={true}>
          {filteredAdmins.length > 0 ? (
            filteredAdmins.map((item) => (
              <View key={item.id} style={styles.row}>
                <Text style={[styles.idText, { flex: 1 }]}>{item.id}</Text>
                
                <View style={[styles.userInfo, { flex: 2 }]}>
                   <Image source={{ uri: item.img }} style={styles.avatar} />
                   <View>
                      <Text style={styles.userName}>{item.name}</Text>
                      <Text style={styles.userEmail}>{item.email}</Text>
                   </View>
                </View>

                <View style={{ flex: 1.2 }}>
                  <Text style={styles.roleTag}>{item.role}</Text>
                </View>

                <View style={[styles.statusCell, { flex: 1 }]}>
                   <View style={[styles.statusPill, item.status === 'Active' ? styles.pillActive : styles.pillInactive]}>
                      <View style={[styles.dot, { backgroundColor: item.status === 'Active' ? '#10B981' : '#94A3B8' }]} />
                      <Text style={styles.statusText}>{item.status}</Text>
                   </View>
                </View>

                <View style={[styles.actionCell, { flex: 1.5 }]}>
                   <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(item)}>
                     <Icon name="pencil-outline" size={16} color="#64748B" />
                     <Text style={styles.editText}>EDIT</Text>
                   </TouchableOpacity>

                   <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                     <Icon name="delete-outline" size={18} color="#FF4D4D" />
                   </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.noResult}>
              <Icon name="account-search-outline" size={40} color="#CBD5E1" />
              <Text style={styles.noResultText}>No admin found matching "{searchQuery}"</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* UPDATE MODAL */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Update Administrator</Text>
            
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Admin ID</Text>
                <TextInput style={styles.input} value={tempAdmin?.id} onChangeText={(txt) => setTempAdmin({...tempAdmin, id: txt})} />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput style={styles.input} value={tempAdmin?.name} onChangeText={(txt) => setTempAdmin({...tempAdmin, name: txt})} />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gmail Address</Text>
                <TextInput style={styles.input} value={tempAdmin?.email} onChangeText={(txt) => setTempAdmin({...tempAdmin, email: txt})} />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>System Role</Text>
                <TextInput style={styles.input} value={tempAdmin?.role} onChangeText={(txt) => setTempAdmin({...tempAdmin, role: txt})} />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  headerRow: { marginBottom: 20 },
  title: { color: '#1E293B', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#64748B', fontSize: 14, marginTop: 4 },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: 400, 
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#1E293B' },

  tableCard: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', elevation: 2 },
  tableHeader: { flexDirection: 'row', padding: 20, backgroundColor: '#1E293B' },
  headerLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  rowsScrollArea: { maxHeight: 500 }, // Triggers scroll after ~6 rows
  row: { flexDirection: 'row', padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  idText: { color: '#FF4D4D', fontWeight: 'bold', fontSize: 14 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 15, backgroundColor: '#F1F5F9' },
  userName: { color: '#1E293B', fontWeight: 'bold', fontSize: 15 },
  userEmail: { color: '#94A3B8', fontSize: 12 },
  roleTag: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  statusCell: { alignItems: 'center', justifyContent: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  pillActive: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  pillInactive: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  actionCell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  editText: { color: '#1E293B', fontSize: 11, fontWeight: '800', marginLeft: 6 },
  deleteBtn: { padding: 8, backgroundColor: '#FFF5F5', borderRadius: 8, borderWidth: 1, borderColor: '#FEE2E2' },
  noResult: { padding: 60, alignItems: 'center' },
  noResultText: { color: '#94A3B8', fontSize: 16, marginTop: 10 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: 420, backgroundColor: '#FFF', borderRadius: 24, padding: 35 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginBottom: 25 },
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '900', marginBottom: 8, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1E293B', backgroundColor: '#F8FAFC' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25, alignItems: 'center' },
  cancelBtn: { padding: 12 },
  cancelText: { color: '#94A3B8', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#FF4D4D', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 12 },
  saveText: { color: '#FFF', fontWeight: 'bold' },
});