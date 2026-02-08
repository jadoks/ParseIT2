import React, { useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Assignment, Comment, FileUpload, MOCK_ASSIGNMENTS } from '../data/mockAssignments';

interface CourseCardProps {
  title?: string;
  instructor?: string;
  onPress?: () => void;
}

const CourseCard = ({ title = 'Programming 1', instructor = 'Jade M. Lisondra', onPress }: CourseCardProps) => {
  const { width } = useWindowDimensions();

  // Local state for assignments modal
  const [showAssignments, setShowAssignments] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [commentText, setCommentText] = useState('');

  // initialize comments/files from mock for the course
  const courseAssignments = MOCK_ASSIGNMENTS.filter(a => a.courseName === title);
  const initialComments: { [key: string]: Comment[] } = Object.fromEntries(courseAssignments.map(a => [a.id, a.comments || []]));
  const initialFiles: { [key: string]: FileUpload[] } = Object.fromEntries(courseAssignments.map(a => [a.id, a.files || []]));
  const [commentsState, setCommentsState] = useState<{ [key: string]: Comment[] }>(initialComments);
  const [filesState, setFilesState] = useState<{ [key: string]: FileUpload[] }>(initialFiles);

  const handleAddComment = () => {
    if (!selectedAssignment || !commentText.trim()) return;
    const updated = [ ...(commentsState[selectedAssignment.id] || []), { id: `c${Date.now()}`, author: 'You', content: commentText, timestamp: new Date().toLocaleString(), isInstructor: false } ];
    setCommentsState({ ...commentsState, [selectedAssignment.id]: updated });
    setCommentText('');
  };

  const handleFileUpload = () => {
    if (!selectedAssignment) return;
    Alert.alert('Upload', 'File picker not implemented in demo.');
  };

  // determine column count based on screen width
  const cols = width >= 1024 ? 4 : width >= 768 ? 3 : width >= 420 ? 2 : 1;
  const gap = 20;
  const horizontalPadding = 30;
  const cardWidth = Math.max(200, Math.floor((width - horizontalPadding - gap * (cols - 1)) / cols));

  // scale factors for typography and badge
  const scale = Math.min(1.0, Math.max(0.75, cardWidth / 320));
  const titleSize = Math.round(16 * scale);
  const subSize = Math.round(11 * scale);
  const badgeSize = Math.round(35 * scale);

  return (
    <View>
      <TouchableOpacity 
        style={[styles.card, { width: cardWidth }]} 
        onPress={onPress}
        activeOpacity={0.8}
      >
        {/* Top Red Section */}
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { fontSize: titleSize }]}>{title}</Text>
          <Text style={[styles.cardSub, { fontSize: subSize }]}>{instructor}</Text>

          {/* Overlapping Profile Icon */}
          <View style={[styles.avatarBadge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, right: 12 * scale, bottom: -badgeSize / 3 }] }>
            <Text style={[styles.avatarEmoji, { fontSize: Math.round(16 * scale) }]}>👤</Text>
          </View>
        </View>

        {/* Main Card Body (White Space) */}
        <View style={styles.cardBody} />

        {/* Footer Icons */}
        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.footerIcon} onPress={() => setShowAssignments(true)}>
            <Text style={styles.iconText}>📋</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <Modal visible={showAssignments} animationType="slide" transparent onRequestClose={() => setShowAssignments(false)}>
        <ScrollView contentContainerStyle={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Assignments — {title}</Text>
            <TouchableOpacity onPress={() => setShowAssignments(false)}><Text style={modalStyles.close}>✕</Text></TouchableOpacity>
          </View>

          <FlatList
            data={courseAssignments}
            keyExtractor={i => i.id}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <TouchableOpacity style={modalStyles.assignmentCard} onPress={() => setSelectedAssignment(item)}>
                <Text style={modalStyles.assignmentTitle}>{item.title}</Text>
                <Text style={modalStyles.assignmentSubtitle}>{item.dueDate} • {item.status}</Text>
              </TouchableOpacity>
            )}
          />

          {/* Assignment detail inside modal */}
          {selectedAssignment && (
            <View style={modalStyles.detailBox}>
              <View style={modalStyles.detailHeader}>
                <Text style={modalStyles.detailTitle}>{selectedAssignment.title}</Text>
                <TouchableOpacity onPress={() => setSelectedAssignment(null)}><Text style={modalStyles.close}>✕</Text></TouchableOpacity>
              </View>

              <View style={{ marginVertical: 8 }}>
                <Text style={{ color: '#444', marginBottom: 6 }}>{selectedAssignment.description}</Text>
                <Text style={{ color: '#666', marginBottom: 8 }}>Due: {selectedAssignment.dueDate}</Text>
              </View>

              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontWeight: '700', marginBottom: 6 }}>Files</Text>
                {(filesState[selectedAssignment.id] || []).length > 0 ? (
                  filesState[selectedAssignment.id].map(f => (
                    <View key={f.id} style={{ paddingVertical: 6 }}><Text>{f.fileName} • {f.fileSize}</Text></View>
                  ))
                ) : (
                  <Text style={{ fontStyle: 'italic', color: '#888' }}>No files</Text>
                )}
                <TouchableOpacity style={modalStyles.uploadBtn} onPress={handleFileUpload}><Text style={{ color: '#fff' }}>Upload</Text></TouchableOpacity>
              </View>

              <View>
                <Text style={{ fontWeight: '700', marginBottom: 6 }}>Comments</Text>
                {(commentsState[selectedAssignment.id] || []).map(c => (
                  <View key={c.id} style={{ paddingVertical: 6 }}>
                    <Text style={{ fontWeight: '700' }}>{c.author}</Text>
                    <Text>{c.content}</Text>
                    <Text style={{ color: '#888', fontSize: 12 }}>{c.timestamp}</Text>
                  </View>
                ))}

                <TextInput value={commentText} onChangeText={setCommentText} placeholder="Add comment" style={modalStyles.commentInput} />
                <TouchableOpacity style={modalStyles.sendBtn} onPress={handleAddComment}><Text style={{ color: '#fff' }}>Send</Text></TouchableOpacity>
              </View>
            </View>
          )}

        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    minWidth: 200,
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'visible',
  },
  cardHeader: { 
    backgroundColor: '#D32F2F',
    padding: 14,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'relative',
    minHeight: 68,
    justifyContent: 'center'
  },
  cardTitle: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: 'bold',
    marginBottom: 2 
  },
  cardSub: { 
    color: '#FFF', 
    fontSize: 11,
    opacity: 0.9 
  },
  avatarBadge: { 
    position: 'absolute',
    right: 15,
    bottom: -15,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF'
  },
  avatarEmoji: { 
    fontSize: 16, 
    color: '#FFF' 
  },
  cardBody: { 
    flex: 1,
    minHeight: 10
  },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    paddingHorizontal: 15, 
    paddingBottom: 15,
    gap: 15 
  },
  footerIcon: {
    padding: 5
  },
  iconText: {
    fontSize: 18,
    color: '#333'
  }
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  container: { padding: 16, paddingBottom: 40, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  close: { fontSize: 18, color: '#666' },
  assignmentCard: { padding: 12, borderRadius: 8, backgroundColor: '#F5F5F5' },
  assignmentTitle: { fontWeight: '700', fontSize: 14 },
  assignmentSubtitle: { color: '#666', fontSize: 12 },
  detailBox: { marginTop: 12, padding: 12, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#EEE' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailTitle: { fontSize: 16, fontWeight: '700' },
  uploadBtn: { marginTop: 8, backgroundColor: '#D32F2F', padding: 8, borderRadius: 6, alignItems: 'center' },
  commentInput: { backgroundColor: '#F5F5F5', borderRadius: 6, padding: 8, minHeight: 40, marginTop: 8 },
  sendBtn: { marginTop: 8, backgroundColor: '#D32F2F', padding: 10, borderRadius: 6, alignItems: 'center' },
});

export default CourseCard;