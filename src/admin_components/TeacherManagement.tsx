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
    // STATE FOR TEACHER LIST (Includes 10 teachers for testing)
    const [teachers, setTeachers] = useState([
        { id: 'T-88210', name: 'Dr. Elena Rodriguez', email: 'e.rodriguez@univ.edu', subject: 'Advanced Mathematics', status: 'Active', img: 'https://i.pravatar.cc/150?u=elena' },
        { id: 'T-88245', name: 'Prof. Marcus Thorne', email: 'm.thorne@univ.edu', subject: 'Data Structures & Alg', status: 'On Leave', img: 'https://i.pravatar.cc/150?u=marcus' },
        { id: 'T-88262', name: 'Sarah Jenkins', email: 's.jenkins@univ.edu', subject: 'Full-Stack Web Dev', status: 'Active', img: 'https://i.pravatar.cc/150?u=sarah' },
        { id: 'T-88270', name: 'Dr. James Wilson', email: 'j.wilson@univ.edu', subject: 'Cybersecurity', status: 'Active', img: 'https://i.pravatar.cc/150?u=james' },
        { id: 'T-88285', name: 'Prof. Linda Chen', email: 'l.chen@univ.edu', subject: 'Artificial Intelligence', status: 'Active', img: 'https://i.pravatar.cc/150?u=linda' },
        { id: 'T-88290', name: 'Robert Miller', email: 'r.miller@univ.edu', subject: 'Database Systems', status: 'On Leave', img: 'https://i.pravatar.cc/150?u=robert' },
        { id: 'T-88310', name: 'Dr. Sophia Varga', email: 's.varga@univ.edu', subject: 'Cloud Computing', status: 'Active', img: 'https://i.pravatar.cc/150?u=sophia' },
        { id: 'T-88325', name: 'Michael Scott', email: 'm.scott@univ.edu', subject: 'Management Info Systems', status: 'Active', img: 'https://i.pravatar.cc/150?u=michael' },
        { id: 'T-88340', name: 'Laura Palmer', email: 'l.palmer@univ.edu', subject: 'Human Computer Interaction', status: 'Active', img: 'https://i.pravatar.cc/150?u=laura' },
        { id: 'T-88355', name: 'David Lynch', email: 'd.lynch@univ.edu', subject: 'Network Engineering', status: 'On Leave', img: 'https://i.pravatar.cc/150?u=david' },
    ]);

    const [search, setSearch] = useState('');
    const [isEditModalVisible, setEditModalVisible] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState<any>(null);

    // Filtering logic
    const filteredTeachers = teachers.filter(t => 
        t.name.toLowerCase().includes(search.toLowerCase()) || 
        t.id.includes(search) ||
        t.subject.toLowerCase().includes(search.toLowerCase())
    );

    // ACTION: Delete Teacher
    const handleDelete = (id: string) => {
        setTeachers(teachers.filter(t => t.id !== id));
    };

    // ACTION: Open Edit Modal
    const handleEditPress = (teacher: any) => {
        setSelectedTeacher({ ...teacher });
        setEditModalVisible(true);
    };

    // ACTION: Save Edit
    const handleSaveEdit = () => {
        setTeachers(teachers.map(t => t.id === selectedTeacher.id ? selectedTeacher : t));
        setEditModalVisible(false);
    };

    return (
        <View style={styles.outerContainer}>
            {/* TITLE SECTION */}
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.title}>Teacher Management</Text>
                    <Text style={styles.subtitle}>Manage faculty members, departments, and teaching assignments.</Text>
                </View>
            </View>

            {/* SEARCH SECTION */}
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
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Feather name="x-circle" size={16} color="#CBD5E1" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* DATA TABLE */}
            <View style={styles.tableCard}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.hText, { flex: 1 }]}>TEACHER ID</Text>
                    <Text style={[styles.hText, { flex: 2.5 }]}>FULL NAME</Text>
                    <Text style={[styles.hText, { flex: 2 }]}>SUBJECT</Text>
                    <Text style={[styles.hText, { flex: 1, textAlign: 'center' }]}>STATUS</Text>
                    <Text style={[styles.hText, { flex: 1.2, textAlign: 'right', paddingRight: 20 }]}>ACTIONS</Text>
                </View>

                {/* SCROLLABLE AREA - Set to trigger scroll after 5 rows */}
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
                                
                                <View style={[styles.statusCell, { flex: 1 }]}>
                                    <Text style={[styles.statusTag, item.status === 'Active' ? styles.active : styles.leave]}>
                                        {item.status}
                                    </Text>
                                </View>

                                <View style={[styles.actionCell, { flex: 1.2 }]}>
                                    <TouchableOpacity onPress={() => handleEditPress(item)} style={styles.actionIcon}>
                                        <Feather name="edit-2" size={16} color="#64748B" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionIcon}>
                                        <Feather name="trash-2" size={16} color="#F87171" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.noResult}>
                            <Text style={styles.noResultText}>No teachers found matching your search.</Text>
                        </View>
                    )}
                </ScrollView>
            </View>

            {/* EDIT MODAL */}
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
    searchContainer: { 
        maxWidth: 500, 
        backgroundColor: '#F8FAFC', 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 15, 
        height: 48, 
        borderRadius: 10, 
        borderWidth: 1, 
        borderColor: '#E2E8F0' 
    },
    searchInput: { color: '#1E293B', marginLeft: 10, flex: 1, fontSize: 14 },

    tableCard: { 
        backgroundColor: '#FFFFFF', 
        borderRadius: 16, 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        overflow: 'hidden',
        elevation: 2,
    },
    tableHeader: { 
        flexDirection: 'row', 
        padding: 20, 
        backgroundColor: '#1E293B' 
    },
    hText: { color: '#94A3B8', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    
    // SCROLL LOGIC: Scroll triggers after 5 rows
    scrollArea: { maxHeight: 450 },

    row: { flexDirection: 'row', padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    idText: { color: '#F87171', fontSize: 13, fontWeight: '700' },
    userInfo: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 15, backgroundColor: '#F1F5F9' },
    uName: { color: '#1E293B', fontWeight: 'bold', fontSize: 15 },
    uEmail: { color: '#64748B', fontSize: 12 },
    cellText: { color: '#475569', fontSize: 14, fontWeight: '500' },
    statusCell: { alignItems: 'center' },
    statusTag: { fontSize: 11, fontWeight: 'bold' },
    active: { color: '#10B981' },
    leave: { color: '#F59E0B' },

    actionCell: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
    actionIcon: { marginLeft: 15, padding: 5 },

    noResult: { padding: 40, alignItems: 'center' },
    noResultText: { color: '#94A3B8', fontSize: 14 },

    // MODAL STYLES
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