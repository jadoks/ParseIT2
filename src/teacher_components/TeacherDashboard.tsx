import React, { useMemo, useState } from 'react';
import {
    ImageBackground,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Components
import AnnouncementBanner from './TeacherAnnouncementBanner';
import AnnouncementModal from './TeacherAnnouncementModal';

// Local Asset path
const DEFAULT_COURSE_IMAGE = require('../../assets/parseclass/AP1.jpg');

interface DashboardProps {
  announcements?: any[];
  courses?: any[];
  onOpenCourse?: (course: any) => void;
  onCreateClass?: () => void;
}

const Dashboard = ({
  announcements = [],
  courses = [
    {
      id: '1',
      name: 'Programming ',
      code: 'CC123',
      instructor: 'Ramcee Jade L. Munoz',
    },
    {
      id: '2',
      name: 'Programming',
      code: 'CC123',
      instructor: 'Ramcee Jade L. Munoz',
    },
    {
      id: '3',
      name: 'Programming',
      code: 'CC123',
      instructor: 'Ramcee Jade L. Munoz',
    },
    {
      id: '3',
      name: 'Programming',
      code: 'CC123',
      instructor: 'Ramcee Jade L. Munoz',
    },{
      id: '3',
      name: 'Programming',
      code: 'CC123',
      instructor: 'Ramcee Jade L. Munoz',
    },
    {
      id: '3',
      name: 'Programming',
      code: 'CC123',
      instructor: 'Ramcee Jade L. Munoz',
    }
    
  ],
  onOpenCourse,
  onCreateClass,
}: DashboardProps) => {
  const { width } = useWindowDimensions();
  const [isModalVisible, setModalVisible] = useState(false);

  const isMobile = width < 768;
  const isLargeScreen = width >= 1200;

  // Simplified processing since we removed the score/topic logic
  const processedCourses = useMemo(() => {
    return courses.map((course: any) => ({
      ...course,
      themeColor: '#2E7D32', // Defaulting to a clean green theme
    }));
  }, [courses]);

  const cardWidth = isMobile ? '100%' : isLargeScreen ? '31.5%' : '48%';

  return (
    <View style={styles.safeArea}>
      <AnnouncementModal 
        visible={isModalVisible} 
        onClose={() => setModalVisible(false)} 
        announcements={announcements} 
      />

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollPadding}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainWrapper}>
          
          <View style={styles.headerRow}>
            <Text style={styles.sectionHeader}>Announcements</Text>
          </View>
          
          <AnnouncementBanner announcements={announcements} />

          <View style={styles.classesHeaderRow}>
            <Text style={styles.classesTitle}>Classes</Text>
            <TouchableOpacity style={styles.createBtn} onPress={onCreateClass}>
              <Text style={styles.createBtnText}>+ Create Class</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.courseGrid}>
            {processedCourses.map((item: any) => (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.card, { width: cardWidth }]} 
                onPress={() => onOpenCourse?.(item)}
                activeOpacity={0.9}
              >
                {/* Course Banner Section */}
                <View style={styles.bannerWrapper}>
                  <ImageBackground 
                    source={DEFAULT_COURSE_IMAGE} 
                    style={styles.banner}
                    imageStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
                  >
                    <View style={styles.bannerOverlay}>
                      <Text style={styles.bannerName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.bannerCode}>{item.code}{item.section ? ` • ${item.section}` : ''}</Text>
                    </View>
                  </ImageBackground>
                </View>

                {/* Simplified Card Content */}
                <View style={styles.cardContent}>
                  <Text style={styles.instructorLabel}>Instructor</Text>
                  <Text style={styles.instructorName}>{item.instructor}</Text>
                </View>

                {/* Footer Accent */}
                <View style={styles.cardFooter}>
                  <MaterialCommunityIcons name="dots-vertical" size={22} color="#5f6368" />
                  <View style={[styles.bottomBorder, { backgroundColor: item.themeColor }]} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  scrollPadding: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 60 },
  mainWrapper: { maxWidth: 1200, alignSelf: 'center', width: '100%' },
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'flex-start', 
    alignItems: 'center',
    marginBottom: 12 
  },
  sectionHeader: { fontSize: 20, fontWeight: 'bold', color: '#202124' },
  classesHeaderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 20, 
    marginBottom: 20 
  },
  classesTitle: { fontSize: 28, fontWeight: 'bold', color: '#000' },
  createBtn: { backgroundColor: '#D32F2F', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  createBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  courseGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'flex-start',
    gap: 16,
    width: '100%'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    overflow: 'hidden',
    marginBottom: 10,
  },
  bannerWrapper: { height: 120, width: '100%' },
  banner: { flex: 1 },
  bannerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', padding: 16, justifyContent: 'flex-end' },
  bannerName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  bannerCode: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600', marginTop: 2 },
  cardContent: { padding: 16 },
  instructorLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', fontWeight: '700' },
  instructorName: { fontSize: 15, fontWeight: '600', color: '#202124', marginTop: 2 },
  cardFooter: { padding: 8, alignItems: 'flex-end' },
  bottomBorder: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4 }
});

export default Dashboard;