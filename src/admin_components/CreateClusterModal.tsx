import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export const CreateClusterModal = ({ visible, onClose }: { visible: boolean, onClose: () => void }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Feather name="chevron-left" size={24} color="#64748B" />
            </TouchableOpacity>
            <View style={styles.titleRow}>
              <Feather name="users" size={24} color="#FF4D4D" style={{ marginRight: 10 }} />
              <Text style={styles.title}>Create Student Cluster</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* CLUSTER IDENTIFIER */}
            <Text style={styles.label}>CLUSTER IDENTIFIER</Text>
            <View style={styles.inputRow}>
              <TextInput style={styles.input} placeholder="e.g. 4B-Laravel" placeholderTextColor="#CBD5E1" />
              <TouchableOpacity style={styles.deleteBtn}>
                <Feather name="trash-2" size={16} color="#FFF" />
                <Text style={styles.deleteBtnText}>Delete Cluster</Text>
              </TouchableOpacity>
            </View>

            {/* ENROLLMENT CONTROL */}
            <Text style={styles.label}>ENROLLMENT CONTROL</Text>
            <Text style={styles.helperText}>Enter student ID to verify and add to list</Text>
            <View style={styles.inputRow}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Enter Student ID (e.g. 7210XXX)" placeholderTextColor="#CBD5E1" />
              <TouchableOpacity style={styles.plusBtn}>
                <Feather name="plus" size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.minusBtn}>
                <Feather name="minus" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* ENROLLED STUDENTS TABLE */}
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Feather name="check-circle" size={16} color="#64748B" />
                <Text style={styles.tableTitle}>Enrolled Students</Text>
              </View>

              {/* TABLE HEADINGS */}
              <View style={styles.columnHeaders}>
                <Text style={[styles.colText, { flex: 1 }]}>STUDENT ID</Text>
                <Text style={[styles.colText, { flex: 1.5 }]}>FULL NAME</Text>
                <Text style={[styles.colText, { flex: 1.5 }]}>EMAIL ADDRESS</Text>
                <Text style={[styles.colText, { flex: 0.8, textAlign: 'center' }]}>STATUS</Text>
              </View>

              {/* DUMMY ROW EXAMPLE */}
              <View style={styles.row}>
                <Text style={[styles.idText, { flex: 1 }]}>7210698</Text>
                <Text style={[styles.nameText, { flex: 1.5 }]}>Ezra Cyril Albacite</Text>
                <Text style={[styles.emailText, { flex: 1.5 }]}>ezra.albacite@university.edu</Text>
                <View style={[styles.statusTag, { flex: 0.8 }]}><Text style={styles.statusText}>ACTIVE</Text></View>
              </View>
            </View>
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', height: '90%', backgroundColor: '#FFF', borderRadius: 20, padding: 30 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  label: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 1, marginBottom: 10 },
  helperText: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic', textAlign: 'right', marginBottom: 5 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 30, alignItems: 'center' },
  input: { flex: 2, height: 45, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 15, color: '#1E293B' },
  deleteBtn: { backgroundColor: '#FF4D4D', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 45, borderRadius: 8 },
  deleteBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8 },
  plusBtn: { backgroundColor: '#FF4D4D', width: 45, height: 45, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  minusBtn: { backgroundColor: '#F1F5F9', width: 45, height: 45, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  tableCard: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', gap: 10 },
  tableTitle: { fontWeight: 'bold', color: '#1E293B' },
  columnHeaders: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  colText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  row: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  idText: { color: '#FF4D4D', fontWeight: 'bold' },
  nameText: { color: '#1E293B', fontWeight: '600' },
  emailText: { color: '#64748B', fontSize: 12 },
  statusTag: { backgroundColor: '#F1F5F9', paddingVertical: 4, borderRadius: 20, alignItems: 'center' },
  statusText: { fontSize: 9, fontWeight: 'bold', color: '#64748B' },
});