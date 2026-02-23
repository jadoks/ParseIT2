import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Assignment, Comment, FileUpload, MOCK_ASSIGNMENTS } from '../data/mockAssignments';

interface CourseCardProps {
  title?: string;
  instructor?: string;
  section?: string;
  onPress?: () => void;
  onAssignmentPress?: () => void;
}

const CourseCard = ({
  title = 'CC112 – Data Structures and Algorithms',
  instructor = 'Prof. Maria L. Santos, MIT',
  section = 'Section A',
  onPress,
  onAssignmentPress,
}: CourseCardProps) => {
  const { width, height } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;

  const [showAssignments, setShowAssignments] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [commentText, setCommentText] = useState('');

  const courseAssignments = MOCK_ASSIGNMENTS.filter(a => a.courseName === title);

  const initialComments: { [key: string]: Comment[] } =
    Object.fromEntries(courseAssignments.map(a => [a.id, a.comments || []]));

  const initialFiles: { [key: string]: FileUpload[] } =
    Object.fromEntries(courseAssignments.map(a => [a.id, a.files || []]));

  const [commentsState, setCommentsState] =
    useState<{ [key: string]: Comment[] }>(initialComments);

  const [filesState, setFilesState] =
    useState<{ [key: string]: FileUpload[] }>(initialFiles);

  const handleAddComment = () => {
    if (!selectedAssignment || !commentText.trim()) return;

    const updated = [
      ...(commentsState[selectedAssignment.id] || []),
      {
        id: `c${Date.now()}`,
        author: 'You',
        content: commentText,
        timestamp: new Date().toLocaleString(),
        isInstructor: false,
      },
    ];

    setCommentsState({ ...commentsState, [selectedAssignment.id]: updated });
    setCommentText('');
  };

  const handleFileUpload = () => {
    if (!selectedAssignment) return;
    Alert.alert('Upload', 'File picker not implemented in demo.');
  };

  // Responsive Columns
  let cols: number;
  if (isLargeTablet) cols = 4;
  else if (isTablet) cols = 3;
  else if (width >= 500) cols = 2;
  else cols = 1;

  const horizontalPadding = 16;
  const gap = 16;

  const cardWidth =
    cols === 1
      ? width - horizontalPadding * 2
      : Math.max(
          200,
          Math.floor((width - horizontalPadding * 2 - gap * (cols - 1)) / cols)
        );

  const bannerHeight = isSmallScreen ? 120 : 140;

  const getCourseImage = () => {
    const imageMap: { [key: string]: any } = {
      'CC111 – Introduction to Computing': require('../../assets/parseclass/CC111.jpg'),
      'CC112 – Data Structures and Algorithms': require('../../assets/parseclass/CC112.jpg'),
      'PC121 – Discrete Mathematics': require('../../assets/parseclass/PC121.jpg'),
      'GEC-US – Understanding the Self': require('../../assets/parseclass/GEC-US.jpg'),
      'NSTP1 – Civic Welfare Training Service': require('../../assets/parseclass/NSTP1.jpg'),
      'PATHFIT2 – Exercise-Based Fitness Activities': require('../../assets/parseclass/PATHFIT2.jpg'),
    };

    return imageMap[title] || require('../../assets/parseclass/AP1.jpg');
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.card, { width: cardWidth }]}
        activeOpacity={0.9}
        onPress={onPress}
      >
        {/* Banner */}
        <View style={{ height: bannerHeight }}>
          <Image
            source={getCourseImage()}
            style={styles.bannerImage}
            resizeMode="cover"
          />

          <View style={styles.overlay} />

          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>{title}</Text>
            {section && <Text style={styles.sectionLabel}>{section}</Text>}
            <Text style={styles.bannerInstructor}>{instructor}</Text>
          </View>
        </View>

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              if (onAssignmentPress) {
                onAssignmentPress();
              } else {
                setShowAssignments(true);
              }
            }}
          >
            <MaterialCommunityIcons
              name="clipboard-list-outline"
              size={22}
              color="#5f6368"
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* ASSIGNMENT MODAL */}
      <Modal
        visible={showAssignments}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAssignments(false)}
      >
        <ScrollView contentContainerStyle={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>
              Assignments — {title}
            </Text>
            <TouchableOpacity onPress={() => setShowAssignments(false)}>
              <Text style={modalStyles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={courseAssignments}
            keyExtractor={i => i.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={modalStyles.assignmentCard}
                onPress={() => setSelectedAssignment(item)}
              >
                <Text style={modalStyles.assignmentTitle}>
                  {item.title}
                </Text>
                <Text style={modalStyles.assignmentSubtitle}>
                  {item.dueDate} • {item.status}
                </Text>
              </TouchableOpacity>
            )}
          />

          {selectedAssignment && (
            <View style={modalStyles.detailBox}>
              <View style={modalStyles.detailHeader}>
                <Text style={modalStyles.detailTitle}>
                  {selectedAssignment.title}
                </Text>
                <TouchableOpacity onPress={() => setSelectedAssignment(null)}>
                  <Text style={modalStyles.close}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={modalStyles.detailText}>
                {selectedAssignment.description}
              </Text>

              <TouchableOpacity
                style={modalStyles.uploadBtn}
                onPress={handleFileUpload}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>
                  Upload
                </Text>
              </TouchableOpacity>

              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Add comment"
                style={modalStyles.commentInput}
                multiline
              />

              <TouchableOpacity
                style={modalStyles.sendBtn}
                onPress={handleAddComment}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>
                  Send
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bannerTextContainer: {
    position: 'absolute',
    bottom: 12,
    left: 16,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerInstructor: {
    color: '#eee',
    fontSize: 13,
    marginTop: 2,
  },
  cardFooter: {
    padding: 12,
    alignItems: 'flex-end',
  },
  iconButton: {
    padding: 6,
  },
});

const modalStyles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  close: {
    fontSize: 20,
    color: '#666',
  },
  assignmentCard: {
    backgroundColor: '#f1f3f4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  assignmentTitle: {
    fontWeight: '600',
  },
  assignmentSubtitle: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  detailBox: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailTitle: {
    fontWeight: '700',
    fontSize: 16,
  },
  detailText: {
    marginBottom: 12,
    color: '#555',
  },
  uploadBtn: {
    backgroundColor: '#1a73e8',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  commentInput: {
    backgroundColor: '#f1f3f4',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  sendBtn: {
    backgroundColor: '#1a73e8',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
});

export default CourseCard;