import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
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

    // Logic for the new BSIT sharing button
    const handleShareToBSIT = () => {
        Alert.alert(
            "Confirm Share",
            `Share "${announcement.title}" with all BSIT students?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Share", 
                    onPress: () => console.log(`Announcement ${announcement.id} sent to BSIT group.`) 
                }
            ]
        );
    };

    return (
        <Pressable
            style={(state: any) => [
                styles.cardContainer,
                isLargeScreen && state.hovered && styles.cardHovered,
            ]}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.dateText}>{announcement.date}</Text>
                <View style={styles.headerRight}>
                    <Text style={styles.subText}>{announcement.day}</Text>
                    <Text style={styles.subText}>{announcement.time}</Text>
                </View>
            </View>

            <View style={styles.cardContent}>
                <Text style={styles.titleText}>{announcement.title}</Text>
                <Text style={styles.contentText}>{announcement.content}</Text>
                
                {/* Button to share with BSIT students */}
                <View style={styles.buttonWrapper}>
                    <Pressable 
                        onPress={handleShareToBSIT}
                        style={({ pressed }) => [
                            styles.shareButton,
                            pressed && styles.shareButtonPressed
                        ]}
                    >
                        <Ionicons name="people-circle-outline" size={20} color="#D32F2F" />
                        <Text style={styles.shareText}>Share to BSIT Students</Text>
                    </Pressable>
                </View>
            </View>
        </Pressable>
    );
};

const ShareAnnouncement: React.FC = () => {
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 1024;

    const announcements: Announcement[] = [
        {
            id: '1',
            date: 'January 13, 2025',
            day: 'Monday',
            time: '02:15 PM',
            title: 'Welcome Back',
            content: 'Please check your schedules for the upcoming semester.',
        },
        {
            id: '2',
            date: 'January 7, 2025',
            day: 'Tuesday',
            time: '09:26 PM',
            title: 'Final Defense',
            content: 'Our final defense is within this week only. Please prepare your documentations.',
        },
    ];

    return (
        <View style={styles.screen}>
            <ScrollView 
                contentContainerStyle={[
                    styles.scrollContent,
                    isLargeScreen && styles.webGrid 
                ]}
            >
                {announcements.map((item) => (
                    <AnnouncementCard key={item.id} announcement={item} />
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        padding: 20,
    },
    webGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
    },
    cardContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        overflow: 'hidden',
        marginBottom: 15,
        ...Platform.select({
            web: {
                width: 380,
                boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            },
            default: {
                width: '100%',
            }
        }),
    },
    cardHovered: {
        ...Platform.select({
            web: {
                borderColor: '#D32F2F',
                boxShadow: '0 8px 15px rgba(0,0,0,0.1)',
                transform: [{ translateY: -4 }],
            }
        }),
    },
    cardHeader: {
        backgroundColor: '#fff2f2',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerRight: {
        flexDirection: 'row',
        gap: 15,
    },
    dateText: {
        fontWeight: '700',
        fontSize: 15,
        color: '#333',
    },
    subText: {
        color: '#666',
        fontSize: 13,
    },
    cardContent: {
        padding: 15,
    },
    titleText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#222',
        marginBottom: 4,
    },
    contentText: {
        fontSize: 14,
        color: '#444',
        lineHeight: 20,
        marginBottom: 15,
    },
    buttonWrapper: {
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 12,
        marginTop: 5,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#D32F2F',
        gap: 10,
    },
    shareButtonPressed: {
        backgroundColor: '#fff2f2',
    },
    shareText: {
        color: '#D32F2F',
        fontWeight: '700',
        fontSize: 14,
    },
});

export default ShareAnnouncement;