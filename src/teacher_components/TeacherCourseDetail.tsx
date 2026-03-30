import React, { useState } from 'react';
import {
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Interface for the Dynamic Modules
interface ModuleItem {
  id: string;
  title: string;
  date: string;
}

interface TeacherCourseDetailProps {
  onBack?: () => void;
}

const TeacherCourseDetail = ({ onBack }: TeacherCourseDetailProps) => {
  const [activeTab, setActiveTab] = useState('Materials');
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  
  // Initial module list based on your photo
  const [modules, setModules] = useState<ModuleItem[]>([
    { id: '1', title: 'Week 1', date: 'Feb 28, 2026 (4:21 PM)' }
  ]);

  const handleCreateModule = () => {
    if (newModuleName.trim() === '') return;

    const newModule: ModuleItem = {
      id: Math.random().toString(),
      title: newModuleName,
      date: new Date().toLocaleString('en-US', { 
        month: 'short', day: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: true 
      }),
    };

    setModules([newModule, ...modules]); // Adds the newest one to the top
    setNewModuleName('');
    setCreateModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Red Header Section - Exactly like week.png */}
      <View style={styles.redHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <MaterialCommunityIcons name="chevron-left" size={32} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.courseTitle}>CC123 (3A - Python)</Text>
            <Text style={styles.courseSubText}>Programming 2 (Lecture)    Mon (Lab 3)    8:00 AM - 10:00 AM</Text>
            <Text style={styles.instructorText}>Instructor: Ramcee Bading</Text>
          </View>
          <MaterialCommunityIcons name="information-outline" size={24} color="#FFF" />
        </View>
      </View>

      {/* 2. Custom Tab Navigation - Centered over the line */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'Materials' && styles.tabActive]} 
          onPress={() => setActiveTab('Materials')}
        >
          <MaterialCommunityIcons 
            name="book-multiple" 
            size={20} 
            color={activeTab === 'Materials' ? "#B71C1C" : "#555"} 
          />
          <Text style={[styles.tabLabel, activeTab === 'Materials' && styles.tabLabelActive]}>
            Materials ({modules.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'Assignments' && styles.tabActive]} 
          onPress={() => setActiveTab('Assignments')}
        >
          <MaterialCommunityIcons 
            name="clipboard-text-outline" 
            size={20} 
            color={activeTab === 'Assignments' ? "#B71C1C" : "#555"} 
          />
          <Text style={[styles.tabLabel, activeTab === 'Assignments' && styles.tabLabelActive]}>
            Assignments (2)
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contentPadding}>
        {/* 3. Create Button */}
        <TouchableOpacity style={styles.createBtn} onPress={() => setCreateModalVisible(true)}>
          <Text style={styles.createBtnText}>+ Create</Text>
        </TouchableOpacity>

        {/* 4. Dynamic List of Weeks/Modules */}
        {activeTab === 'Materials' ? (
          modules.map((item) => (
            <View key={item.id} style={styles.moduleCard}>
              <View style={styles.cardLeftAccent} />
              <View style={styles.cardInner}>
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons name="book-open-variant" size={30} color="#000" />
                </View>
                <Text style={styles.weekTitle}>{item.title}</Text>
                <View style={styles.postedRow}>
                  <Text style={styles.postedLabel}>Posted</Text>
                  <Text style={styles.dateText}>{item.date}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.placeholder}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={50} color="#EEE" />
            <Text style={{color: '#999', marginTop: 10}}>No assignments posted yet.</Text>
          </View>
        )}
      </ScrollView>

      {/* CREATE MODAL */}
      <Modal visible={isCreateModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.createModal}>
            <Text style={styles.modalHeading}>New Module</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Week 2 - Strings"
              value={newModuleName}
              onChangeText={setNewModuleName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={styles.cancelBtn}>
                <Text style={{color: '#888'}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateModule} style={styles.postBtn}>
                <Text style={{color: '#FFF', fontWeight: 'bold'}}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  // Header
  redHeader: { 
    backgroundColor: '#D32F2F', 
    paddingHorizontal: 25, 
    paddingVertical: 35 
  },
  headerTopRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  backButton: { 
    marginRight: 15 
  },
  headerInfo: { 
    flex: 1 
  },
  courseTitle: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#FFF' 
  },
  courseSubText: { 
    fontSize: 13, 
    color: 'rgba(255,255,255,0.8)', 
    marginTop: 4 
  },
  instructorText: { 
    fontSize: 13, 
    color: 'rgba(255,255,255,0.8)' 
  },
  // Tabs
  tabContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    borderBottomWidth: 1, 
    borderBottomColor: '#EEE' 
  },
  tabItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 15, 
    paddingHorizontal: 30, 
    gap: 8 
  },
  tabActive: { 
    borderBottomWidth: 3, 
    borderBottomColor: '#B71C1C' 
  },
  tabLabel: { 
    fontSize: 14, 
    color: '#555', 
    fontWeight: '600' 
  },
  tabLabelActive: { 
    color: '#B71C1C' 
  },
  // Body
  contentPadding: { 
    padding: 30 
  },
  createBtn: { 
    backgroundColor: '#D32F2F', 
    paddingHorizontal: 18, 
    paddingVertical: 8, 
    borderRadius: 20, 
    alignSelf: 'flex-start', 
    marginBottom: 30 
  },
  createBtnText: { 
    color: '#FFF', 
    fontWeight: 'bold', 
    fontSize: 13 
  },
  // Module Cards
  moduleCard: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF', 
    height: 100, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#F0F0F0', 
    overflow: 'hidden', 
    marginBottom: 15 
  },
  cardLeftAccent: { 
    width: 6, 
    height: '60%', 
    backgroundColor: '#D32F2F', 
    alignSelf: 'center', 
    borderRadius: 3, 
    marginLeft: 5 
  },
  cardInner: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20 
  },
  iconBox: { 
    width: 50, 
    height: 50, 
    backgroundColor: '#E0E0E0', 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 20 
  },
  weekTitle: { 
    flex: 1, 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#333' 
  },
  postedRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10 
  },
  postedLabel: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#000' 
  },
  dateText: { 
    fontSize: 12, 
    color: '#888' 
  },
  // Modal
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  createModal: { 
    width: 300, 
    backgroundColor: '#FFF', 
    borderRadius: 15, 
    padding: 25 
  },
  modalHeading: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 15 
  },
  modalInput: { 
    borderWidth: 1, 
    borderColor: '#DDD', 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 20 
  },
  modalButtons: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    gap: 20 
  },
  cancelBtn: { 
    padding: 10 
  },
  postBtn: { 
    backgroundColor: '#D32F2F', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 8 
  },
  placeholder: { 
    padding: 50, 
    alignItems: 'center' 
  }
});

export default TeacherCourseDetail;