import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
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

const AnnouncementCard = ({ announcement, onShare }: { announcement: Announcement, onShare: () => void }) => {
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 1024;
    const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle');
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
        setStatus('sending');
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0.5, duration: 500, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start();

        setTimeout(() => {
            setStatus('success');
            onShare();
        }, 1500);
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
                    <View style={[styles.dot, status === 'success' ? { backgroundColor: '#4CAF50' } : { backgroundColor: '#B71C1C' }]} />
                    <Text style={styles.statusText}>{status === 'success' ? 'Published' : 'Draft'}</Text>
                </View>
                <Text style={styles.timeText}>{announcement.time}</Text>
            </View>

            <View style={styles.cardBody}>
                <Text style={styles.cardTitleText}>{announcement.title}</Text>
                <Text style={styles.contentText}>{announcement.content}</Text>
                <Text style={styles.dateLabel}>{announcement.date} • {announcement.day}</Text>
                
                <View style={styles.actionArea}>
                    <Pressable 
                        onPress={handlePress}
                        disabled={status !== 'idle'}
                        style={({ pressed }) => [
                            styles.mainButton,
                            pressed && { opacity: 0.7 },
                            status === 'success' && styles.btnSuccess,
                        ]}
                    >
                        {status === 'sending' ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name={status === 'success' ? "checkmark-done" : "share-social"} size={16} color="#fff" />
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

    const [isCreating, setIsCreating] = useState(false);
    const [selectedBg, setSelectedBg] = useState(0);

    const announcements: Announcement[] = [
        {
            id: '1',
            date: 'March 08, 2026',
            day: 'Sunday',
            time: '09:00 AM',
            title: 'Midterm Examination',
            content: 'Please be advised that the midterm exams will start next week. Ensure all permits are ready.',
        },
    ];

    // Mock data for your rectangle banner photos
    const bannerPhotos = [
        { id: 0, uri: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&q=80' }, // Laptop
        { id: 1, uri: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500&q=80' }, // Tech
        { id: 2, uri: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=500&q=80' }, // Circuit
        { id: 3, uri: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80' }, // Meeting
    ];

    if (isCreating) {
        return (
            <SafeAreaView style={styles.screen}>
                <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
                    <View style={styles.formWidthContainer}>
                        
                        {/* Title Row with Back Button on the Left */}
                        <View style={styles.formTitleRow}>
                            <TouchableOpacity onPress={() => setIsCreating(false)} style={styles.inlineBackBtn}>
                                <Ionicons name="chevron-back" size={28} color="#000" />
                            </TouchableOpacity>
                            <Text style={styles.formMainTitle}>Share an Announcement.</Text>
                        </View>
                        
                        <Text style={styles.formSubTitle}>Announcement will be available to all students.</Text>

                        <View style={styles.inputOutlineBox}>
                            <Text style={styles.innerLabel}>Header</Text>
                            <TextInput 
                                style={styles.inputField}
                                placeholder="Please wear your departmental shirt tomorrow..."
                                placeholderTextColor="#999"
                            />
                        </View>

                        <View style={styles.inputOutlineBox}>
                            <Text style={styles.innerLabel}>Description</Text>
                            <TextInput 
                                style={[styles.inputField, { height: 60 }]}
                                placeholder="Enter details here..."
                                placeholderTextColor="#999"
                                multiline
                            />
                        </View>

                        {/* --- RECTANGLE BANNER SELECTOR --- */}
                        <View style={styles.selectorOutlineBox}>
                            <Text style={styles.innerLabel}>Select Background Banner</Text>
                            <View style={styles.bgGrid}>
                                {bannerPhotos.map((item) => (
                                    <TouchableOpacity 
                                        key={item.id} 
                                        onPress={() => setSelectedBg(item.id)}
                                        style={[styles.bannerItem, selectedBg === item.id && styles.bannerItemActive]}
                                    >
                                        <Image source={{ uri: item.uri }} style={styles.bannerImg} resizeMode="cover" />
                                        {selectedBg === item.id && (
                                            <View style={styles.selectedOverlay}>
                                                <Ionicons name="checkmark-circle" size={30} color="#FFF" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity style={styles.shareSubmitBtn} onPress={() => setIsCreating(false)}>
                            <Text style={styles.shareSubmitText}>Share</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.title}>Notifications</Text>
                        <View style={styles.countBadge}><Text style={styles.countText}>{announcements.length}</Text></View>
                    </View>
                    <TouchableOpacity style={styles.createBtn} onPress={() => setIsCreating(true)}>
                        <Ionicons name="add" size={20} color="#FFF" />
                        <Text style={styles.createBtnText}>Create</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.subHeader}>
                    <Text style={styles.mainHeading}>Manage Broadcasts</Text>
                    <Text style={styles.subHeadingText}>Manage and broadcast class alerts for your students</Text>
                </View>

                <View style={[isLargeScreen && styles.webGrid]}>
                    {announcements.map((item) => (
                        <AnnouncementCard key={item.id} announcement={item} onShare={() => Alert.alert("Success", "Shared!")} />
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#FFFFFF' },
    scrollContent: { paddingHorizontal: 40, paddingTop: 30 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    title: { fontSize: 36, fontWeight: '800', color: '#000' },
    createBtn: { backgroundColor: '#B71C1C', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 10, borderRadius: 20, gap: 5 },
    createBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    subHeader: { marginTop: 15, marginBottom: 35 },
    mainHeading: { fontSize: 22, fontWeight: '700', color: '#000' },
    subHeadingText: { fontSize: 14, color: '#444', marginTop: 2 },
    countBadge: { backgroundColor: '#B71C1C', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12 },
    countText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    webGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },

    cardContainer: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#EEE', elevation: 2 },
    cardSuccess: { borderColor: '#C6F6D5', backgroundColor: '#F0FFF4' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 11, fontWeight: '700', color: '#4A5568', textTransform: 'uppercase' },
    timeText: { fontSize: 12, color: '#A0AEC0', fontWeight: '600' },
    cardBody: { padding: 20 },
    cardTitleText: { fontSize: 18, fontWeight: '800', color: '#000', marginBottom: 10 },
    contentText: { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 15 },
    dateLabel: { fontSize: 12, color: '#A0AEC0', fontWeight: '600', fontStyle: 'italic' },
    actionArea: { marginTop: 5 },
    mainButton: { backgroundColor: '#B71C1C', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, gap: 10 },
    btnSuccess: { backgroundColor: '#38A169' },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

    // --- UPDATED FORM STYLES ---
    formScroll: { paddingHorizontal: 40, paddingTop: 40, paddingBottom: 60 },
    formWidthContainer: { maxWidth: 650, width: '100%', alignSelf: 'flex-start' },
    formTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 },
    inlineBackBtn: { padding: 5 },
    formMainTitle: { fontSize: 32, fontWeight: '800', color: '#000' },
    formSubTitle: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 30, marginLeft: 45 },
    inputOutlineBox: { borderWidth: 1.5, borderColor: '#718096', borderRadius: 8, padding: 12, marginBottom: 20 },
    innerLabel: { fontSize: 14, fontWeight: '700', color: '#4A5568', marginBottom: 5 },
    inputField: { fontSize: 15, color: '#000' },
    selectorOutlineBox: { borderWidth: 1.5, borderColor: '#718096', borderRadius: 8, padding: 15, marginBottom: 35 },
    
    // Banner Grid Styling
    bgGrid: { marginTop: 10 },
    bannerItem: { 
        width: '100%', 
        height: 110, // RECTANGLE HEIGHT
        borderRadius: 10, 
        marginBottom: 15, 
        backgroundColor: '#F7FAFC', 
        elevation: 3, 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        overflow: 'hidden' 
    },
    bannerItemActive: { borderColor: '#B71C1C', borderWidth: 3 },
    bannerImg: { width: '100%', height: '100%' },
    selectedOverlay: { 
        ...StyleSheet.absoluteFillObject, 
        backgroundColor: 'rgba(183, 28, 28, 0.4)', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },

    shareSubmitBtn: { backgroundColor: '#B71C1C', height: 55, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    shareSubmitText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
});

export default ShareAnnouncement;