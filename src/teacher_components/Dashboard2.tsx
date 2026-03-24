import React, { useMemo } from 'react';
import {
    ImageBackground,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AnnouncementBanner from '../components/AnnouncementBanner';
import { Announcement } from '../components/AnnouncementModal';

// --- Interfaces ---
export interface DashboardMaterial {
    id: string;
    title: string;
    type: 'pdf' | 'video' | 'document' | 'link';
    uploadedDate: string;
}

export interface DashboardAssignment {
    id: string;
    title: string;
    dueDate: string;
    status: 'pending' | 'submitted' | 'graded';
    points?: number;
    maxPoints?: number;
    topic?: string;
    materialIds?: string[];
}

export interface DashboardCourse {
    id: string;
    name: string;
    code: string;
    instructor: string;
    description: string;
    materials: DashboardMaterial[];
    assignments: DashboardAssignment[];
    section?: string;
}

export interface DashboardProps {
    announcements?: Announcement[];
    courses?: DashboardCourse[];
    onOpenCourse?: (course: DashboardCourse) => void;
    onCreateClass?: () => void;
}

const Dashboard = ({
    announcements = [],
    courses = [],
    onOpenCourse,
    onCreateClass,
}: DashboardProps) => {
    const { width } = useWindowDimensions();

    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1200;
    const isLargeScreen = width >= 1200;

    const pagePadding = isMobile ? 14 : isTablet ? 24 : 32;
    const titleSize = isMobile ? 24 : 28;

    const getScorePercent = (assignment: DashboardAssignment) => {
        if (assignment.status !== 'graded' || !assignment.points || !assignment.maxPoints) return null;
        return Math.round((assignment.points / assignment.maxPoints) * 100);
    };

    const derivedCourses = useMemo(() => {
        return courses.map((course) => {
            const graded = course.assignments.filter((a) => a.status === 'graded');
            const avgScore = graded.length > 0 
                ? Math.round(graded.reduce((s, i) => s + (getScorePercent(i) ?? 0), 0) / graded.length) 
                : null;
            
            const weakest = [...graded].sort((a, b) => (getScorePercent(a) ?? 100) - (getScorePercent(b) ?? 100))[0];

            // Determine status color based on design specs
            const statusColor = (avgScore === null || avgScore >= 80) ? '#2E7D32' : avgScore < 60 ? '#D32F2F' : '#F57C00';

            return {
                course,
                weakestTopic: weakest?.topic || weakest?.title || "No graded topic yet",
                materialsCount: course.materials.length,
                avgScore,
                statusColor,
            };
        });
    }, [courses]);

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingHorizontal: pagePadding, paddingTop: 20, paddingBottom: 60 }}>
            <View style={[styles.contentWrap, { maxWidth: isLargeScreen ? 1280 : 1100 }]}>
                
                {/* 1. Announcements */}
                <Text style={[styles.pageTitle, { fontSize: titleSize }]}>Announcements</Text>
                {announcements.length > 0 ? (
                    <AnnouncementBanner announcements={announcements} />
                ) : (
                    <View style={styles.emptyBanner}>
                        <Text style={styles.emptyBannerText}>No announcements yet.</Text>
                    </View>
                )}

                {/* 2. My Classes Header */}
                <View style={styles.headerRow}>
                    <Text style={styles.myClassesTitle}>Classes</Text>
                </View>

                {/* 3. The New Integrated Course Grid */}
                <View style={[styles.courseGrid, (isTablet || isLargeScreen) && styles.courseGridRow]}>
                    {derivedCourses.map((item) => (
                        <TouchableOpacity 
                            key={item.course.id} 
                            style={[
                                styles.card, 
                                { width: isMobile ? '100%' : isLargeScreen ? '32%' : '48.5%', borderBottomColor: item.statusColor }
                            ]}
                            activeOpacity={0.9}
                            onPress={() => onOpenCourse?.(item.course)}
                        >
                            {/* Card Header: Image Banner with Dark Overlay */}
                            <View style={styles.bannerContainer}>
                                <ImageBackground 
                                    source={require('../../assets/parseclass/AP1.jpg')} // Update path as needed
                                    style={styles.bannerImage}
                                    imageStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                                >
                                    <View style={styles.overlay} />
                                    <View style={styles.bannerTextContainer}>
                                        <Text style={styles.bannerTitle} numberOfLines={1}>{item.course.name}</Text>
                                        <Text style={styles.sectionLabel}>
                                            {item.course.code}{item.course.section ? ` • ${item.course.section}` : ''}
                                        </Text>
                                        <Text style={styles.bannerInstructor}>{item.course.instructor}</Text>
                                    </View>
                                </ImageBackground>
                            </View>

                            {/* Card Body: Meta Information */}
                            <View style={styles.cardBody}>
                                <View style={styles.metaBlock}>
                                    <Text style={styles.metaLabel}>Weakest topic</Text>
                                    <Text style={styles.metaValue} numberOfLines={1}>{item.weakestTopic}</Text>
                                </View>

                                <View style={styles.metaBlockRow}>
                                    <View style={styles.metaBlockHalf}>
                                        <Text style={styles.metaLabel}>Average</Text>
                                        <Text style={styles.metaValue}>{item.avgScore !== null ? `${item.avgScore}%` : 'N/A'}</Text>
                                    </View>
                                    <View style={styles.metaBlockHalf}>
                                        <Text style={styles.metaLabel}>Materials</Text>
                                        <Text style={styles.metaValue}>{item.materialsCount}</Text>
                                    </View>
                                </View>

                                {/* Performance Badge */}
                                <View style={[styles.supportBadge, { backgroundColor: `${item.statusColor}18` }]}>
                                    <Text style={[styles.supportBadgeText, { color: item.statusColor }]}>
                                        {item.avgScore !== null && item.avgScore >= 80 ? 'Advanced Challenge' : 'Support activities available'}
                                    </Text>
                                </View>
                            </View>

                            {/* Card Footer: Options Icon */}
                            <View style={styles.cardFooter}>
                                <MaterialCommunityIcons name="dots-vertical" size={22} color="#5f6368" />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* 4. Create Class Button (Positioned Below Classes) */}
                <View style={styles.leftActionRow}>
                    <TouchableOpacity style={styles.createBtn} onPress={onCreateClass}>
                        <Text style={styles.createBtnText}>+ Create Class</Text>
                    </TouchableOpacity>
                </View>

            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    contentWrap: { alignSelf: 'center', width: '100%' },
    pageTitle: { fontWeight: 'bold', color: '#000', marginBottom: 15 },
    emptyBanner: { backgroundColor: '#f5f5f5', height: 100, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    emptyBannerText: { color: '#888' },
    
    headerRow: { marginTop: 25, marginBottom: 20 },
    myClassesTitle: { fontSize: 28, fontWeight: 'bold', color: '#000' },
    
    leftActionRow: { flexDirection: 'row', justifyContent: 'flex-start', marginTop: 30 },
    createBtn: { backgroundColor: '#D32F2F', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 10 },
    createBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

    courseGrid: { gap: 16 },
    courseGridRow: { flexDirection: 'row', flexWrap: 'wrap' },

    // Integrated CourseCard Styles
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        borderBottomWidth: 4,
    },
    bannerContainer: { height: 140 },
    bannerImage: { width: '100%', height: '100%' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
    bannerTextContainer: { position: 'absolute', bottom: 12, left: 16, right: 16 },
    bannerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 2 },
    sectionLabel: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
    bannerInstructor: { color: '#eee', fontSize: 13, marginTop: 2 },
    
    cardBody: { padding: 16 },
    metaBlock: { marginBottom: 10 },
    metaBlockRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
    metaBlockHalf: { flex: 1 },
    metaLabel: { fontSize: 11, color: '#888', marginBottom: 2 },
    metaValue: { fontSize: 15, color: '#222', fontWeight: '600' },
    
    supportBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
    supportBadgeText: { fontWeight: '700', fontSize: 12 },
    cardFooter: { paddingHorizontal: 12, paddingBottom: 12, alignItems: 'flex-end' },
});

export default Dashboard;