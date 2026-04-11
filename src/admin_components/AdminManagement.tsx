import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface Admin {
  id: string;
  name: string;
  email: string;
  img: string;
}

export const AdminManagement = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const [admins, setAdmins] = useState<Admin[]>([
    { id: 'ADM-9921', name: 'Jonathan Vercetti', email: 'jvercetti@pasershub.com', img: 'https://i.pravatar.cc/150?u=jonathan' },
    { id: 'ADM-8842', name: 'Sarah Montgomery', email: 's.montgomery@pasershub.com', img: 'https://i.pravatar.cc/150?u=sarah' },
    { id: 'ADM-7731', name: 'Marcus Thorne', email: 'm.thorne@pasershub.com', img: 'https://i.pravatar.cc/150?u=marcus' },
    { id: 'ADM-6621', name: 'Elena Rodriguez', email: 'e.rodriguez@pasershub.com', img: 'https://i.pravatar.cc/150?u=elena' },
    { id: 'ADM-5542', name: 'David Chen', email: 'd.chen@pasershub.com', img: 'https://i.pravatar.cc/150?u=david' },
    { id: 'ADM-4431', name: 'Sophia Williams', email: 's.williams@pasershub.com', img: 'https://i.pravatar.cc/150?u=sophia' },
    { id: 'ADM-3321', name: 'Liam Anderson', email: 'l.anderson@pasershub.com', img: 'https://i.pravatar.cc/150?u=liam' },
  ]);

  // Edit Modal States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentEditingAdmin, setCurrentEditingAdmin] = useState<Admin | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const filteredAdmins = admins.filter(admin =>
    admin.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ====================== FIXED DELETE FUNCTION ======================
  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "Remove Admin",
      `Are you sure you want to permanently delete ${name}?\n\nThis action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setAdmins((prevAdmins) => {
              return prevAdmins.filter(admin => admin.id !== id);
            });

            // Success message (no timeout needed)
            Alert.alert("Success", `${name} has been deleted successfully.`);
          }
        }
      ]
    );
  };

  // Open Edit Modal
  const handleEdit = (admin: Admin) => {
    setCurrentEditingAdmin(admin);
    setEditName(admin.name);
    setEditEmail(admin.email);
    setEditModalVisible(true);
  };

  // Save Edited Admin
  const handleSaveEdit = () => {
    if (!editName.trim() || !editEmail.trim()) {
      Alert.alert("Error", "Full Name and Email cannot be empty.");
      return;
    }

    if (currentEditingAdmin) {
      setAdmins(prev =>
        prev.map(admin =>
          admin.id === currentEditingAdmin.id
            ? { ...admin, name: editName.trim(), email: editEmail.trim() }
            : admin
        )
      );

      Alert.alert("Success", "Admin information has been updated.");
      setEditModalVisible(false);
      setCurrentEditingAdmin(null);
    }
  };

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
        <View style={styles.tableHeader}>
          <Text style={[styles.headerLabel, { flex: 1.2 }]}>ADMIN ID</Text>
          <Text style={[styles.headerLabel, { flex: 3.3 }]}>FULL NAME</Text>
          <Text style={[styles.headerLabel, { width: 100, textAlign: 'center' }]}>ACTIONS</Text>
        </View>

        <ScrollView style={styles.rowsScrollArea} showsVerticalScrollIndicator={true}>
          {filteredAdmins.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={{ flex: 1.2 }}>
                <Text style={styles.idText}>{item.id}</Text>
              </View>

              <View style={[styles.userInfo, { flex: 3.3 }]}>
                <Image source={{ uri: item.img }} style={styles.avatar} />
                <View style={styles.nameContainer}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                </View>
              </View>

              <View style={styles.actionCell}>
                <TouchableOpacity style={styles.actionIcon} onPress={() => handleEdit(item)}>
                  <Feather name="edit-2" size={20} color="#64748B" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionIcon}
                  onPress={() => handleDelete(item.id, item.name)}
                >
                  <Feather name="trash-2" size={20} color="#F87171" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {filteredAdmins.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No admins found</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* ====================== EDIT MODAL ====================== */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Admin</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Feather name="x" size={26} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ADMIN ID (READ ONLY)</Text>
              <TextInput
                style={[styles.input, styles.readOnlyInput]}
                value={currentEditingAdmin?.id || ''}
                editable={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter full name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
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
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20 },
  headerRow: { marginBottom: 20 },
  title: { color: '#1E293B', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#64748B', fontSize: 14, marginTop: 4 },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1E293B', marginLeft: 12 },

  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    elevation: 3
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center'
  },
  headerLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1
  },

  rowsScrollArea: { maxHeight: 520 },

  row: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  idText: { color: '#FF4D4D', fontWeight: '700', fontSize: 14.5 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 23, marginRight: 14 },
  nameContainer: { justifyContent: 'center' },
  userName: { color: '#1E293B', fontWeight: '600', fontSize: 15.5 },
  userEmail: { color: '#64748B', fontSize: 12.5, marginTop: 2 },

  actionCell: {
    width: 100,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  actionIcon: { padding: 8 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#1E293B' },

  inputGroup: { marginBottom: 18 },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1E293B'
  },
  readOnlyInput: {
    backgroundColor: '#F1F5F9',
    color: '#64748B'
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20
  },
  cancelBtn: {
    paddingVertical: 13,
    paddingHorizontal: 24
  },
  cancelText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 15
  },
  saveBtn: {
    backgroundColor: '#FF4D4D',
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 10
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15
  },

  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 16 },
});

export default AdminManagement;