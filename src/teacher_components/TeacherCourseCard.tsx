import Constants from 'expo-constants';
import { Image } from 'expo-image'; // <--- expo-image for instant caching
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Matching the type from TeacherApp.tsx
interface CourseWithIcon {
  id: string;
  name: string;
  courseCode: string;
  classCode: string;
  instructor: string;
  section?: string;
  bannerUri?: string;
  bannerStoragePath?: string | null; // Added for signed URL fetching
  semester?: string;
  schoolYear?: string;
  year?: string;
}

interface Coursedetail2Props {
  onBack?: () => void;
  course?: CourseWithIcon | null;
  currentTeacher?: any;
  availableCourses?: any[];
}

// API Helpers (Matching Student CourseCard)
function getApiBaseUrl() {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }
  const possibleHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    '';
  const host = possibleHost.split(':')[0];
  if (host) {
    return `http://${host}:5000`;
  }
  return 'http://192.168.1.5:5000';
}

const API_BASE_URL = getApiBaseUrl();

const apiFetch = (url: string, options: any = {}) =>
  fetch(url, {
    credentials: 'include',
    ...options,
  });

const Coursedetail2 = ({ onBack, course }: Coursedetail2Props) => {
  const [activeTab, setActiveTab] = useState('Materials');
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  
  const [modules, setModules] = useState([
    { id: '1', title: 'Week 1', date: 'Feb 28, 2026 (4:21 PM)' }
  ]);

  // Banner logic matching Student CourseCard
  const [bannerLoadFailed, setBannerLoadFailed] = useState(false);
  const [signedBannerUrl, setSignedBannerUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const refreshSignedBannerUrl = async () => {
      setBannerLoadFailed(false);
      setSignedBannerUrl(null);

      if (!course?.bannerStoragePath) {
        return;
      }

      try {
        const response = await apiFetch(`${API_BASE_URL}/storage/signed-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            storagePath: course.bannerStoragePath,
            classId: course.id,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Unable to refresh class banner.');
        }

        if (isMounted && data?.url) {
          setSignedBannerUrl(data.url);
          setBannerLoadFailed(false); 
        }
      } catch {
        if (isMounted) {
          setBannerLoadFailed(true);
        }
      }
    };

    refreshSignedBannerUrl();

    return () => {
      isMounted = false;
    };
  }, [course?.id, course?.bannerUri, course?.bannerStoragePath]);

  const getCourseImage = () => {
    // Local fallback assets matching Student CourseCard
    const imageMap: { [key: string]: any } = {
      'CC111 – Introduction to Computing': require('../../assets/parseclass/CC111.jpg'),
      'CC112 – Data Structures and Algorithms': require('../../assets/parseclass/CC112.jpg'),
      'PC121 – Discrete Mathematics': require('../../assets/parseclass/PC121.jpg'),
      'GEC-US – Understanding the Self': require('../../assets/parseclass/GEC-US.jpg'),
      'NSTP1 – Civic Welfare Training Service': require('../../assets/parseclass/NSTP1.jpg'),
      'PATHFIT2 – Exercise-Based Fitness Activities': require('../../assets/parseclass/PATHFIT2.jpg'),
      'Web Development': require('../../assets/parseclass/AP1.jpg'),
      'Programming Logic': require('../../assets/parseclass/AP1.jpg'),
      'Computer Fundamentals': require('../../assets/parseclass/AP1.jpg'),
    };

    const uri = signedBannerUrl || course?.bannerUri;

    // Show the remote image immediately if we have a URI and it hasn't permanently failed
    if (uri && !bannerLoadFailed) {
      return { uri };
    }

    // Fallback to local asset
    return imageMap[course?.name || ''] || require('../../assets/parseclass/AP1.jpg');
  };

  const handleCreateModule = () => {
    if (newModuleName.trim() === '') return;
    const newModule = {
      id: Math.random().toString(),
      title: newModuleName,
      date: new Date().toLocaleString('en-US', { 
        month: 'short', day: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: true 
      }),
    };
    setModules([newModule, ...modules]);
    setNewModuleName('');
    setCreateModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Optional Banner Image */}
      <View style={styles.headerContainer}>
        {/* expo-image ensures instant caching and smooth 200ms fade-in */}
        <Image
          source={getCourseImage()}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={200}
          onError={() => setBannerLoadFailed(true)}
        />
        
        {/* Dark overlay to ensure white text is always readable over the image */}
        <View style={styles.headerOverlay} />

        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <MaterialCommunityIcons name="chevron-left" size={32} color="#FFF" />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.courseTitle}>
              {course ? `${course.courseCode} (${course.year} - ${course.section})` : 'CC123 (3A - Python)'}
            </Text>
            <Text style={styles.courseSubText}>
              {course?.name || 'Programming 2 (Lecture)'} • {course?.semester || '1st Semester'}
            </Text>
            <Text style={styles.instructorText}>
              Instructor: {course?.instructor || 'Ramcee Bading'}
            </Text>
          </View>
          
          <MaterialCommunityIcons name="information-outline" size={24} color="#FFF" />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'Materials' && styles.tabActive]} 
          onPress={() => setActiveTab('Materials')}
        >
          <MaterialCommunityIcons name="book-multiple" size={20} color={activeTab === 'Materials' ? "#B71C1C" : "#555"} />
          <Text style={[styles.tabLabel, activeTab === 'Materials' && styles.tabLabelActive]}>
            Materials ({modules.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'Assignments' && styles.tabActive]} 
          onPress={() => setActiveTab('Assignments')}
        >
          <MaterialCommunityIcons name="clipboard-text-outline" size={20} color={activeTab === 'Assignments' ? "#B71C1C" : "#555"} />
          <Text style={[styles.tabLabel, activeTab === 'Assignments' && styles.tabLabelActive]}>
            Assignments (2)
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contentPadding}>
        <TouchableOpacity style={styles.createBtn} onPress={() => setCreateModalVisible(true)}>
          <Text style={styles.createBtnText}>+ Create</Text>
        </TouchableOpacity>

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
          <View style={styles.placeholder}><Text>Assignments Content...</Text></View>
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={isCreateModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.createModal}>
            <Text style={styles.modalHeading}>New Module</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Week 2"
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
  
  // UPDATED Header Styles
  headerContainer: {
    minHeight: 140,
    paddingHorizontal: 25,
    paddingVertical: 30,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative', // Required for absoluteFillObject to work inside
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)', // Ensures text is readable over any image
  },
  headerTopRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    zIndex: 10, // Ensures text stays above the image/overlay
  },
  
  backButton: { marginRight: 15 },
  headerInfo: { flex: 1 },
  courseTitle: { fontSize: 26, fontWeight: 'bold', color: '#FFF' },
  courseSubText: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  instructorText: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  
  tabContainer: { flexDirection: 'row', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  tabItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 30, gap: 8 },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#B71C1C' },
  tabLabel: { fontSize: 14, color: '#555', fontWeight: '600' },
  tabLabelActive: { color: '#B71C1C' },
  contentPadding: { padding: 30 },
  createBtn: { backgroundColor: '#D32F2F', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 30 },
  createBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  moduleCard: { flexDirection: 'row', backgroundColor: '#FFF', height: 90, borderRadius: 12, borderWidth: 1, borderColor: '#F0F0F0', overflow: 'hidden', marginBottom: 15 },
  cardLeftAccent: { width: 6, height: '60%', backgroundColor: '#D32F2F', alignSelf: 'center', borderRadius: 3, marginLeft: 5 },
  cardInner: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  iconBox: { width: 45, height: 45, backgroundColor: '#E0E0E0', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  weekTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#333' },
  postedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postedLabel: { fontSize: 14, fontWeight: 'bold', color: '#000' },
  dateText: { fontSize: 11, color: '#888' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  createModal: { width: '80%', backgroundColor: '#FFF', borderRadius: 15, padding: 25 },
  modalHeading: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  modalInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 },
  cancelBtn: { padding: 10 },
  postBtn: { backgroundColor: '#D32F2F', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  placeholder: { padding: 50, alignItems: 'center' }
});

export default Coursedetail2;