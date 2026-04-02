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

export const StudentManagement = () => {
    // STATE FOR STUDENT LIST
    const [students, setStudents] = useState([
        { id: '#102931', name: 'Alexander Wright', email: 'a.wright@univ.edu', program: 'BSCS - 4B', img: 'https://i.pravatar.cc/150?u=1' },
        { id: '#102945', name: 'Elena Rodriguez', email: 'e.rodriguez@univ.edu', program: 'BSIT - 3B', img: 'https://i.pravatar.cc/150?u=2' },
        { id: '#102958', name: 'Marcus Thorne', email: 'm.thorne@univ.edu', program: 'BSDS - 2A', img: 'https://i.pravatar.cc/150?u=3' },
        { id: '#102960', name: 'Sarah Jenkins', email: 's.jenkins@univ.edu', program: 'BSCS - 1A', img: 'https://i.pravatar.cc/150?u=4' },
        { id: '#102965', name: 'David Miller', email: 'd.miller@univ.edu', program: 'BSIT - 2C', img: 'https://i.pravatar.cc/150?u=5' },
        { id: '#102970', name: 'Sophia Chen', email: 's.chen@univ.edu', program: 'BSDS - 4B', img: 'https://i.pravatar.cc/150?u=6' },
        { id: '#102975', name: 'Liam Wilson', email: 'l.wilson@univ.edu', program: 'BSCS - 3A', img: 'https://i.pravatar.cc/150?u=7' },
        { id: '#102980', name: 'Olivia Brown', email: 'o.brown@univ.edu', program: 'BSIT - 1B', img: 'https://i.pravatar.cc/150?u=8' },
        { id: '#102985', name: 'Noah Davis', email: 'n.davis@univ.edu', program: 'BSDS - 3C', img: 'https://i.pravatar.cc/150?u=9' },
        { id: '#102990', name: 'Emma Garcia', email: 'e.garcia@univ.edu', program: 'BSCS - 2B', img: 'https://i.pravatar.cc/150?u=10' },
    ]);

    const [search, setSearch] = useState('');
    const [isEditModalVisible, setEditModalVisible] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search)
    );

    const handleDelete = (id: string) => {
        setStudents(students.filter(s => s.id !== id));
    };

    const handleEditPress = (student: any) => {
        setSelectedStudent({ ...student });
        setEditModalVisible(true);
    };

    const handleSaveEdit = () => {
        setStudents(students.map(s => s.id === selectedStudent.id ? selectedStudent : s));
        setEditModalVisible(false);
    };

    return (
        <View style={styles.outerContainer}>
            {/* TITLE SECTION */}
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.title}>Student Management</Text>
                    <Text style={styles.subtitle}>View and manage registered students and enrollment data.</Text>
                </View>
            </View>

            {/* SEARCH SECTION */}
            <View style={styles.filterBar}>
                <View style={styles.searchContainer}>
                    <Feather name="search" size={18} color="#94A3B8" />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search by ID or name..."
                        placeholderTextColor="#94A3B8"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {/* DATA TABLE */}
            <View style={styles.tableCard}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.hText, { flex: 1 }]}>STUDENT ID</Text>
                    <Text style={[styles.hText, { flex: 2.5 }]}>FULL NAME</Text>
                    <Text style={[styles.hText, { flex: 2 }]}>PROGRAM / YEAR</Text>
                    {/* Width defined to pull icons leftward */}
                    <Text style={[styles.hText, { width: 90, textAlign: 'center' }]}>ACTIONS</Text>
                </View>

                <ScrollView 
                    style={styles.scrollArea} 
                    showsVerticalScrollIndicator={true}
                >
                    {filteredStudents.length > 0 ? (
                        filteredStudents.map((item) => (
                            <View key={item.id} style={styles.row}>
                                <Text style={[styles.idText, { flex: 1 }]}>{item.id}</Text>
                                
                                <View style={[styles.userInfo, { flex: 2.5 }]}>
                                    <Image source={{ uri: item.img }} style={styles.avatar} />
                                    <View>
                                        <Text style={styles.uName}>{item.name}</Text>
                                        <Text style={styles.uEmail}>{item.email}</Text>
                                    </View>
                                </View>
                                
                                <Text style={[styles.cellText, { flex: 2 }]}>{item.program}</Text>

                                {/* Action container shifted slightly left to balance spacing */}
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
                            <Text style={styles.noResultText}>No students found.</Text>
                        </View>
                    )}
                </ScrollView>
            </View>

            {/* EDIT MODAL */}
            <Modal visible={isEditModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Update Student</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Full Name</Text>
                            <TextInput 
                                style={styles.input} 
                                value={selectedStudent?.name} 
                                onChangeText={(t) => setSelectedStudent({...selectedStudent, name: t})}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Program / Year</Text>
                            <TextInput 
                                style={styles.input} 
                                value={selectedStudent?.program} 
                                onChangeText={(t) => setSelectedStudent({...selectedStudent, program: t})}
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
        maxWidth: 400, 
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
        paddingHorizontal: 20,
        paddingVertical: 18, 
        backgroundColor: '#1E293B',
        alignItems: 'center'
    },
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

export default StudentManagement;