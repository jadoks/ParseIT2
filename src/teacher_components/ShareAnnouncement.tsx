import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View
} from 'react-native';

interface Announcement {
    id: string;
    date: string;
    day: string;
    time: string;
    title: string;
    content: string;
}

const AnnouncementCard = ({ announcement }: { announcement: Announcement }) => {
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 1024;
    
    const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle');
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const handleShareToBSIT = () => {
        Alert.alert(
            "System Broadcast",
            `This will trigger a push notification to all students enrolled in BSIT. Proceed?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Broadcast Now", 
                    onPress: () => {
                        setStatus('sending');
                        Animated.sequence([
                            Animated.timing(fadeAnim, { toValue: 0.5, duration: 500, useNativeDriver: true }),
                            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                        ]).start();

                        setTimeout(() => {
                            setStatus('success');
                        }, 2000);
                    } 
                }
            ]
        );
    };

    return (
        <Animated.View style={[
            styles.cardContainer, 
            { opacity: fadeAnim },
            status === 'success' && styles.cardSuccess,
            isLargeScreen && { width: 380 }
        ]}>
            <View style={styles.cardHeader}>
                <View style={styles.statusBadge}>
                    <View style={[styles.dot, status === 'success' ? { backgroundColor: '#4CAF50' } : { backgroundColor: '#D32F2F' }]} />
                    <Text style={styles.statusText}>{status === 'success' ? 'Published' : 'Draft'}</Text>
                </View>
                <Text style={styles.timeText}>{announcement.time}</Text>
            </View>

            <View style={styles.cardBody}>
                <Text style={styles.titleText}>{announcement.title}</Text>
                <Text style={styles.contentText}>{announcement.content}</Text>
                <Text style={styles.dateLabel}>{announcement.date} • {announcement.day}</Text>
                
                <View style={styles.actionArea}>
                    <Pressable 
                        onPress={handleShareToBSIT}
                        disabled={status !== 'idle'}
                        style={({ pressed }) => [
                            styles.mainButton,
                            pressed && { opacity: 0.7 },
                            status === 'success' && styles.btnSuccess,
                            status === 'sending' && styles.btnSending
                        ]}
                    >
                        {status === 'sending' ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons 
                                    name={status === 'success' ? "checkmark-done" : "share-social"} 
                                    size={16} 
                                    color="#fff" 
                                />
                                <Text style={styles.btnText}>
                                    {status === 'success' ? "Shared with BSIT" : "Share to BSIT"}
                                </Text>
                            </>
                        )}
                    </Pressable>
                </View>
            </View>
        </Animated.View>
    );
};

const ShareAnnouncement: React.FC = () => {
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 1024;

    const announcements: Announcement[] = [
        {
            id: '1',
            date: 'March 08, 2026',
            day: 'Sunday',
            time: '09:00 AM',
            title: 'Midterm Examination',
            content: 'Please be advised that the midterm exams will start next week. Ensure all permits are ready.',
        },
        {
            id: '2',
            date: 'March 05, 2026',
            day: 'Thursday',
            time: '04:30 PM',
            title: 'Capstone Update',
            content: 'Final documentation for OmniSafe and Beacon projects must be submitted by Friday.',
        },
    ];

    return (
        <View style={styles.screen}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                <View style={styles.h3Wrapper}>
                    <View style={styles.h3Left}>
                        <Text style={styles.h3Main}>All Notifications</Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{announcements.length}</Text>
                        </View>
                    </View>
                    <Text style={styles.h3Sub}>Manage and broadcast class alerts</Text>
                </View>

                <View style={[isLargeScreen && styles.webGrid]}>
                    {announcements.map((item) => (
                        <AnnouncementCard key={item.id} announcement={item} />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
};

// Web-consistent Font Family Stack
const SYSTEM_FONTS = Platform.select({
    web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    ios: 'System',
    android: 'sans-serif',
});

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#F4F7F9',
    },
    scrollContent: {
        padding: 20,
    },
    /* H3 STYLING - UPDATED */
    h3Wrapper: {
        marginBottom: 30,
        paddingLeft: 5,
    },
    h3Left: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    h3Main: {
        fontFamily: SYSTEM_FONTS,
        fontSize: 14, // As requested
        fontWeight: '700', // Bold for H3 feel
        color: '#1A202C',
        textTransform: 'uppercase', // Professional web look
        letterSpacing: 0.5,
    },
    countBadge: {
        backgroundColor: '#D32F2F',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    countText: {
        fontFamily: SYSTEM_FONTS,
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    h3Sub: {
        fontFamily: SYSTEM_FONTS,
        fontSize: 13,
        color: '#718096',
        marginTop: 4,
    },
    webGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
    },
    /* CARD STYLING - UPDATED */
    cardContainer: {
        backgroundColor: '#fff',
        borderRadius: 12, // Slightly cleaner for web
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Platform.select({
            web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
            default: { elevation: 2 }
        })
    },
    cardSuccess: {
        borderColor: '#C6F6D5',
        backgroundColor: '#F0FFF4',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EDF2F7',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EDF2F7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontFamily: SYSTEM_FONTS,
        fontSize: 11,
        fontWeight: '700',
        color: '#4A5568',
        textTransform: 'uppercase',
    },
    timeText: {
        fontFamily: SYSTEM_FONTS,
        fontSize: 12,
        color: '#A0AEC0',
        fontWeight: '600',
    },
    cardBody: {
        padding: 20,
    },
    titleText: {
        fontFamily: SYSTEM_FONTS,
        fontSize: 14, // As requested
        fontWeight: '700',
        color: '#2D3748',
        marginBottom: 10,
    },
    contentText: {
        fontFamily: SYSTEM_FONTS,
        fontSize: 13,
        color: '#4A5568',
        lineHeight: 20,
        marginBottom: 15,
    },
    dateLabel: {
        fontFamily: SYSTEM_FONTS,
        fontSize: 11,
        color: '#A0AEC0',
        fontWeight: '600',
        fontStyle: 'italic',
    },
    actionArea: {
        marginTop: 20,
    },
    mainButton: {
        backgroundColor: '#D32F2F',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 10,
    },
    btnSuccess: {
        backgroundColor: '#38A169',
    },
    btnSending: {
        backgroundColor: '#E53E3E',
    },
    btnText: {
        fontFamily: SYSTEM_FONTS,
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },
});

export default ShareAnnouncement;