import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { Member } from './TeacherCourseDetail2';

type Props = {
  members: Member[];
  memberIdInput: string;
  setMemberIdInput: (value: string) => void;
  onBack: () => void;
  onAddMember: () => void;
  onRemoveMember: () => void;
  onOpenSubmission: () => void;
};

const TeacherMembersSection = ({
  members,
  memberIdInput,
  setMemberIdInput,
  onBack,
  onAddMember,
  onRemoveMember,
  onOpenSubmission,
}: Props) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.membersHeader}>
        <TouchableOpacity onPress={onBack}>
          <MaterialCommunityIcons name="chevron-left" size={35} color="#000" />
        </TouchableOpacity>
        <Text style={styles.membersTitle}>Members</Text>
      </View>

      <View style={styles.membersActionRow}>
        <TextInput
          style={styles.idInput}
          placeholder="Enter Student ID"
          value={memberIdInput}
          onChangeText={setMemberIdInput}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.plusBtn} onPress={onAddMember}>
          <Text style={styles.btnText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.minusBtn} onPress={onRemoveMember}>
          <Text style={styles.btnText}>-</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {members.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={styles.studentCardWide}
            onPress={onOpenSubmission}
          >
            <View style={styles.studentRedAccent} />
            <View style={styles.studentInfo}>
              <View style={styles.studentTopRow}>
                <Text style={styles.studentId}>{m.id}</Text>
                <Text style={styles.studentHandle}>{m.handle}</Text>
              </View>
              <Text style={styles.studentName}>{m.name}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default TeacherMembersSection;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    justifyContent: 'space-between',
  },
  membersTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    marginLeft: 10,
  },
  membersActionRow: {
    flexDirection: 'row',
    paddingHorizontal: 25,
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  idInput: {
    width: 220,
    height: 45,
    borderWidth: 1.5,
    borderColor: '#666',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  plusBtn: {
    backgroundColor: '#C62828',
    width: 45,
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  minusBtn: {
    backgroundColor: '#C62828',
    width: 45,
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  scrollContent: {
    padding: 25,
    alignItems: 'flex-start',
  },
  studentCardWide: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    minHeight: 95,
    flexDirection: 'row',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 15,
    width: '48%',
    alignSelf: 'flex-start',
  },
  studentRedAccent: {
    width: 4,
    height: '100%',
    backgroundColor: '#C62828',
    alignSelf: 'center',
    borderRadius: 5,
    marginLeft: 3,
  },
  studentInfo: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  studentTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  studentId: { fontSize: 14, color: '#999' },
  studentHandle: { fontSize: 12, color: '#BBB' },
  studentName: { fontSize: 18, fontWeight: 'bold', color: '#444', marginTop: 5 },
});