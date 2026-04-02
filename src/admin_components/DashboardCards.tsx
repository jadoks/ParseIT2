import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableHighlight, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface DashboardCardsProps {
  onOpenAddAdmin: () => void;
}

const adminsList = [
  { id: "ADM-9921", name: "Jonathan Vercetti", email: "jvercetti@pasershub.com" },
  { id: "ADM-8842", name: "Sarah Montgomery", email: "s.montgomery@pasershub.com" },
  { id: "ADM-7731", name: "Marcus Thorne", email: "m.thorne@pasershub.com" },
  { id: "ADM-6621", name: "Elena Rodriguez", email: "e.rodriguez@pasershub.com" },
  { id: "ADM-5542", name: "David Chen", email: "d.chen@pasershub.com" },
  { id: "ADM-4431", name: "Sophia Williams", email: "s.williams@pasershub.com" },
  { id: "ADM-3321", name: "Liam Anderson", email: "l.anderson@pasershub.com" },
];

// ==================== STUDENT LIST DATA ====================
const studentsList = [
  { id: "#102931", name: "Alexander Wright", email: "a.wright@univ.edu", program: "BSCS - 4B" },
  { id: "#102945", name: "Elena Rodriguez", email: "e.rodriguez@univ.edu", program: "BSIT - 3B" },
  { id: "#102958", name: "Marcus Thorne", email: "m.thorne@univ.edu", program: "BSDS - 2A" },
  { id: "#102960", name: "Sarah Jenkins", email: "s.jenkins@univ.edu", program: "BSCS - 1A" },
  { id: "#102965", name: "David Miller", email: "d.miller@univ.edu", program: "BSIT - 2C" },
  { id: "#102970", name: "Sophia Chen", email: "s.chen@univ.edu", program: "BSDS - 4B" },
  { id: "#102975", name: "Liam Wilson", email: "l.wilson@univ.edu", program: "BSCS - 3A" },
  { id: "#102980", name: "Olivia Brown", email: "o.brown@univ.edu", program: "BSIT - 1B" },
  { id: "#102985", name: "Noah Davis", email: "n.davis@univ.edu", program: "BSDS - 3C" },
  { id: "#102990", name: "Emma Garcia", email: "e.garcia@univ.edu", program: "BSCS - 2B" },
];

// ==================== TEACHER LIST DATA ====================
const teachersList = [
  { id: "T-88210", name: "Dr. Elena Rodriguez", email: "e.rodriguez@univ.edu", subject: "Advanced Mathematics" },
  { id: "T-88245", name: "Prof. Marcus Thorne", email: "m.thorne@univ.edu", subject: "Data Structures & Alg" },
  { id: "T-88262", name: "Sarah Jenkins", email: "s.jenkins@univ.edu", subject: "Full-Stack Web Dev" },
  { id: "T-88270", name: "Dr. James Wilson", email: "j.wilson@univ.edu", subject: "Cybersecurity" },
  { id: "T-88285", name: "Prof. Linda Chen", email: "l.chen@univ.edu", subject: "Artificial Intelligence" },
  { id: "T-88290", name: "Robert Miller", email: "r.miller@univ.edu", subject: "Database Systems" },
  { id: "T-88310", name: "Dr. Sophia Varga", email: "s.varga@univ.edu", subject: "Cloud Computing" },
  { id: "T-88325", name: "Michael Scott", email: "m.scott@univ.edu", subject: "Management Info Systems" },
  { id: "T-88340", name: "Laura Palmer", email: "l.palmer@univ.edu", subject: "Human Computer Interaction" },
  { id: "T-88355", name: "David Lynch", email: "d.lynch@univ.edu", subject: "Network Engineering" },
];

export const DashboardCards = ({ onOpenAddAdmin }: DashboardCardsProps) => {
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [teacherModalVisible, setTeacherModalVisible] = useState(false);   // ← Added

  return (
    <View style={styles.grid}>
      <ManageCard 
        title="Manage Admin" 
        sub="34 Active Administrators" 
        icon="account-cog-outline" 
        onAddPress={onOpenAddAdmin}
        onViewPress={() => setAdminModalVisible(true)}
      />
      
      <ManageCard 
        title="Create Class" 
        sub="Create and manage student classes" 
        icon="school-outline" 
      />
      
      <ManageCard 
        title="Manage Chatbot" 
        sub="AI Tutor Training & Configuration" 
        icon="robot-outline" 
        isSpecial 
      />
      
      <ManageCard 
        title="Manage Student" 
        sub="1,248 Undergraduate students" 
        icon="account-multiple" 
        onViewPress={() => setStudentModalVisible(true)}
      />
      
      <ManageCard 
        title="Manage Teacher" 
        sub="86 Registered Faculty members" 
        icon="account-tie-outline" 
        onViewPress={() => setTeacherModalVisible(true)}   // ← Added
      />
      
      <TouchableOpacity style={styles.addCard} activeOpacity={0.6}>
        <Icon name="plus" size={30} color="#CBD5E1" />
        <Text style={styles.addCardText}>Add New Resource</Text>
      </TouchableOpacity>

      {/* ADMIN LIST MODAL */}
      <Modal
        visible={adminModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAdminModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Admin List</Text>
              <TouchableOpacity onPress={() => setAdminModalVisible(false)}>
                <Icon name="close" size={28} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {adminsList.map((admin, index) => (
                <View key={index} style={styles.adminItem}>
                  <View style={styles.adminInfo}>
                    <Text style={styles.adminId}>{admin.id}</Text>
                    <Text style={styles.adminName}>{admin.name}</Text>
                    <Text style={styles.adminEmail}>{admin.email}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setAdminModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* STUDENT MODAL - Only Info */}
      <Modal
        visible={studentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStudentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Student List</Text>
              <TouchableOpacity onPress={() => setStudentModalVisible(false)}>
                <Icon name="close" size={28} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {studentsList.map((student, index) => (
                <View key={index} style={styles.studentItem}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentId}>{student.id}</Text>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentEmail}>{student.email}</Text>
                    <Text style={styles.studentProgram}>{student.program}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setStudentModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* TEACHER MODAL - Only Info (ID, Full Name, Subject) */}
      <Modal
        visible={teacherModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTeacherModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Teacher List</Text>
              <TouchableOpacity onPress={() => setTeacherModalVisible(false)}>
                <Icon name="close" size={28} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {teachersList.map((teacher, index) => (
                <View key={index} style={styles.teacherItem}>
                  <View style={styles.teacherInfo}>
                    <Text style={styles.teacherId}>{teacher.id}</Text>
                    <Text style={styles.teacherName}>{teacher.name}</Text>
                    <Text style={styles.teacherEmail}>{teacher.email}</Text>
                    <Text style={styles.teacherSubject}>{teacher.subject}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setTeacherModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ManageCard Component - Fully Unchanged
const ManageCard = ({ 
  title, 
  sub, 
  icon, 
  isSpecial, 
  onAddPress,
  onViewPress 
}: any) => {
  const isManageAdmin = title === "Manage Admin";
  const isCreateClass = title === "Create Class";
  const isManageStudent = title === "Manage Student";
  const isManageTeacher = title === "Manage Teacher";

  const ActionButton = ({ children, isDelete, onPress }: { 
    children: any; 
    isDelete?: boolean; 
    onPress?: () => void 
  }) => {
    const [isPressed, setIsPressed] = useState(false);

    return (
      <TouchableHighlight
        style={[styles.miniBtn, isPressed && styles.btnPressed]}
        underlayColor={isDelete ? "#FF4D4D" : "#1E293B"}
        onHideUnderlay={() => setIsPressed(false)}
        onShowUnderlay={() => setIsPressed(true)}
        onPress={onPress || (() => {})}
      >
        <View style={styles.btnContent}>
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              const element = child as React.ReactElement<any>;
              return React.cloneElement(element, { 
                color: isPressed ? "#FFF" : (element.props.color || (isDelete ? "#ff4d4d" : "#64748B")) 
              });
            }
            if (typeof child === 'string') {
              return <Text style={[styles.miniBtnText, isPressed && styles.textWhite]}>{child}</Text>;
            }
            return child;
          })}
        </View>
      </TouchableHighlight>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconBox}>
          <Icon name={icon} size={22} color="#ff4d4d" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSub}>{sub}</Text>
        </View>
      </View>
      
      <View style={styles.cardActions}>
        {isSpecial ? (
          <>
            <ActionButton>Train</ActionButton>
            <ActionButton>Modify</ActionButton>
          </>
        ) : isCreateClass || isManageStudent || isManageTeacher ? (
          <>
            <ActionButton>
              + Add
            </ActionButton>
            
            <ActionButton onPress={onViewPress}>
              <Icon name="eye-outline" size={16} />
              <Text> View</Text>
            </ActionButton>
          </>
        ) : isManageAdmin ? (
          <>
            <ActionButton onPress={onAddPress}>
              + Add
            </ActionButton>
            
            <ActionButton onPress={onViewPress}>
              <Icon name="eye-outline" size={16} />
              <Text> View</Text>
            </ActionButton>
          </>
        ) : (
          <>
            <ActionButton>+ Add</ActionButton>
            <ActionButton>
              <Icon name="eye-outline" size={16} />
              <Text> View</Text>
            </ActionButton>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between' 
  },
  card: { 
    backgroundColor: '#FFFFFF', 
    width: '31%', 
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9', 
  },
  cardHeader: { 
    flexDirection: 'row', 
    marginBottom: 20, 
    alignItems: 'center' 
  },
  cardIconBox: { 
    width: 44, 
    height: 44, 
    backgroundColor: '#FFF5F5', 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15 
  },
  cardTitle: { 
    color: '#1E293B', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  cardSub: { 
    color: '#94A3B8', 
    fontSize: 12, 
    marginTop: 4 
  },
  cardActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 10, 
    gap: 6 
  },
  miniBtn: { 
    backgroundColor: '#F8FAFC', 
    paddingVertical: 11, 
    paddingHorizontal: 12,
    borderRadius: 8, 
    flex: 1, 
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    alignItems: 'center',
  },
  btnContent: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  btnPressed: { 
    borderColor: '#FF4D4D',
    backgroundColor: '#FF4D4D' 
  },
  miniBtnText: { 
    color: '#64748B', 
    fontSize: 13, 
    fontWeight: '600' 
  },
  textWhite: { color: '#FFF' },

  // Modal Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContent: { 
    width: '90%', 
    maxWidth: 460, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 25,
    maxHeight: '85%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#1E293B' 
  },
  adminItem: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  adminInfo: {
    gap: 4,
  },
  adminId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  adminName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 2,
  },
  adminEmail: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  closeButton: {
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  closeButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  addCard: { 
    width: '31%', 
    height: 145, 
    borderStyle: 'dashed', 
    borderWidth: 2, 
    borderColor: '#E2E8F0', 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  addCardText: { 
    color: '#94A3B8', 
    fontWeight: '700', 
    marginTop: 12, 
    fontSize: 14 
  },

  // Student Styles
  studentItem: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  studentInfo: { gap: 4 },
  studentId: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  studentName: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginTop: 4 },
  studentEmail: { fontSize: 14, color: '#64748B', marginTop: 2 },
  studentProgram: { fontSize: 14, color: '#2563EB', fontWeight: '600', marginTop: 6 },

  // Teacher Styles
  teacherItem: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  teacherInfo: { gap: 4 },
  teacherId: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  teacherName: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginTop: 4 },
  teacherEmail: { fontSize: 14, color: '#64748B', marginTop: 2 },
  teacherSubject: { fontSize: 14, color: '#8B5CF6', fontWeight: '600', marginTop: 6 },
});