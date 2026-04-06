import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export const TeacherManagement = () => {
    const [teachers, setTeachers] = useState([
        { id: 'T-88210', name: 'Dr. Elena Rodriguez', email: 'e.rodriguez@univ.edu', subject: 'Advanced Mathematics', img: 'https://i.pravatar.cc/150?u=elena' },
        { id: 'T-88245', name: 'Prof. Marcus Thorne', email: 'm.thorne@univ.edu', subject: 'Data Structures & Alg', img: 'https://i.pravatar.cc/150?u=marcus' },
        { id: 'T-88262', name: 'Sarah Jenkins', email: 's.jenkins@univ.edu', subject: 'Full-Stack Web Dev', img: 'https://i.pravatar.cc/150?u=sarah' },
        { id: 'T-88270', name: 'Dr. James Wilson', email: 'j.wilson@univ.edu', subject: 'Cybersecurity', img: 'https://i.pravatar.cc/150?u=james' },
        { id: 'T-88285', name: 'Prof. Linda Chen', email: 'l.chen@univ.edu', subject: 'Artificial Intelligence', img: 'https://i.pravatar.cc/150?u=linda' },
        { id: 'T-88290', name: 'Robert Miller', email: 'r.miller@univ.edu', subject: 'Database Systems', img: 'https://i.pravatar.cc/150?u=robert' },
        { id: 'T-88310', name: 'Dr. Sophia Varga', email: 's.varga@univ.edu', subject: 'Cloud Computing', img: 'https://i.pravatar.cc/150?u=sophia' },
        { id: 'T-88325', name: 'Michael Scott', email: 'm.scott@univ.edu', subject: 'Management Info Systems', img: 'https://i.pravatar.cc/150?u=michael' },
        { id: 'T-88340', name: 'Laura Palmer', email: 'l.palmer@univ.edu', subject: 'Human Computer Interaction', img: 'https://i.pravatar.cc/150?u=laura' },
        { id: 'T-88355', name: 'David Lynch', email: 'd.lynch@univ.edu', subject: 'Network Engineering', img: 'https://i.pravatar.cc/150?u=david' },
    ]);

    const [search, setSearch] = useState('');
    const [isEditModalVisible, setEditModalVisible] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState<any>(null);

    const filteredTeachers = teachers.filter(t => 
        t.name.toLowerCase().includes(search.toLowerCase()) || 
        t.id.includes(search) ||
        t.subject.toLowerCase().includes(search.toLowerCase())
    );

    const handleDelete = (id: string) => {
        setTeachers(teachers.filter(t => t.id !== id));
    };

    const handleEditPress = (teacher: any) => {
        setSelectedTeacher({ ...teacher });
        setEditModalVisible(true);
    };

    const handleSaveEdit = () => {
        setTeachers(teachers.map(t => t.id === selectedTeacher.id ? selectedTeacher : t));
        setEditModalVisible(false);
    };

    return (
        <View style={styles.outerContainer}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.title}>Teacher Management</Text>
                    <Text style={styles.subtitle}>Manage faculty members, departments, and teaching assignments.</Text>
                </View>
            </View>

            <View style={styles.filterBar}>
                <View style={styles.searchContainer}>
                    <Feather name="search" size={18} color="#94A3B8" />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search by name, ID, or subject..."
                        placeholderTextColor="#94A3B8"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            <View style={styles.tableCard}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.hText, { flex: 1 }]}>TEACHER ID</Text>
                    <Text style={[styles.hText, { flex: 2.5 }]}>FULL NAME</Text>
                    <Text style={[styles.hText, { flex: 2 }]}>SUBJECT</Text>
                    {/* Aligned width to match Admin and Student sections */}
                    <Text style={[styles.hText, { width: 90, textAlign: 'center' }]}>ACTIONS</Text>
                </View>

                <ScrollView 
                    style={styles.scrollArea} 
                    showsVerticalScrollIndicator={true}
                >
                    {filteredTeachers.length > 0 ? (
                        filteredTeachers.map((item) => (
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

                                {/* Standardized Action Cell */}
                                <View style={styles.actionCell}>
                                    <TouchableOpacity onPress={() => handleEditPress(item)} style={styles.actionIcon}>
                                        <Feather name="edit-2" size={17} color="#64748B" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionIcon}>
                                        <Feather name="trash-2" size={17} color="#F87171" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.noResult}>
                            <Text style={styles.noResultText}>No teachers found.</Text>
                        </View>
                    )}
                </ScrollView>
            </View>

            <Modal visible={isEditModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Update Teacher Info</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Full Name</Text>
                            <TextInput 
                                style={styles.input} 
                                value={selectedTeacher?.name} 
                                onChangeText={(t) => setSelectedTeacher({...selectedTeacher, name: t})}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Department / Subject</Text>
                            <TextInput 
                                style={styles.input} 
                                value={selectedTeacher?.subject} 
                                onChangeText={(t) => setSelectedTeacher({...selectedTeacher, subject: t})}
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
    outerContainer: { flex: 1, backgroundColor: '#FFFFFF', padding: 25 },
    headerRow: { marginBottom: 20 },
    title: { color: '#1E293B', fontSize: 28, fontWeight: 'bold' },
    subtitle: { color: '#64748B', fontSize: 14, marginTop: 4 },
    filterBar: { marginBottom: 25 },
    searchContainer: { maxWidth: 400, backgroundColor: '#F8FAFC', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
    searchInput: { color: '#1E293B', marginLeft: 10, flex: 1, fontSize: 14 },
    tableCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', elevation: 2 },
    tableHeader: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 18, backgroundColor: '#1E293B', alignItems: 'center' },
    hText: { color: '#94A3B8', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    
    // TRACES SCROLLBAR AFTER 5 ROWS (approx 405px)
    scrollArea: { maxHeight: 405 },

    row: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    idText: { color: '#F87171', fontSize: 13, fontWeight: '700' },
    userInfo: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 15, backgroundColor: '#F1F5F9' },
    uName: { color: '#1E293B', fontWeight: 'bold', fontSize: 15 },
    uEmail: { color: '#64748B', fontSize: 12 },
    cellText: { color: '#475569', fontSize: 14, fontWeight: '500' },
    
    // ALIGNED ACTION CELL (defined width shifts it left from far right)
    actionCell: { 
        flexDirection: 'row', 
        width: 90, 
        justifyContent: 'space-between', 
        alignItems: 'center'
    },
    actionIcon: { padding: 5 },

    noResult: { padding: 40, alignItems: 'center' },
    noResultText: { color: '#94A3B8', fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalBox: { width: 400, backgroundColor: '#FFF', borderRadius: 20, padding: 30 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 20 },
    inputGroup: { marginBottom: 15 },
    inputLabel: { fontSize: 12, color: '#64748B', fontWeight: 'bold', marginBottom: 5 },
    input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 14, color: '#1E293B' },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
    cancelBtn: { padding: 12, marginRight: 10 },
    cancelText: { color: '#94A3B8', fontWeight: 'bold' },
    saveBtn: { backgroundColor: '#F87171', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
    saveText: { color: '#FFF', fontWeight: 'bold' },
});

export default TeacherManagement;