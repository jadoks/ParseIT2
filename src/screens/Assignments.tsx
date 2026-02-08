import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MOCK_ASSIGNMENTS } from '../data/mockAssignments';

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  isInstructor: boolean;
}

interface FileUpload {
  id: string;
  fileName: string;
  fileSize: string;
  uploadedDate: string;
}

interface Assignment {
  id: string;
  title: string;
  courseName: string;
  description?: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  points?: number;
  maxPoints?: number;
  comments?: Comment[];
  files?: FileUpload[];
}

const Assignments = () => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [newComment, setNewComment] = useState('');

  const [comments, setComments] = useState<{ [key: string]: Comment[] }>(
    Object.fromEntries(MOCK_ASSIGNMENTS.map(a => [a.id, a.comments || []]))
  );

  const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: FileUpload[] }>(
    Object.fromEntries(MOCK_ASSIGNMENTS.map(a => [a.id, a.files || []]))
  );
  const [showUploadInput, setShowUploadInput] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');

  const filteredAssignments = filter === 'all'
    ? MOCK_ASSIGNMENTS
    : MOCK_ASSIGNMENTS.filter(a => a.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9800';
      case 'submitted':
        return '#2196F3';
      case 'graded':
        return '#4CAF50';
      default:
        return '#999';
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const days = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const handleAddComment = () => {
    if (!selectedAssignment || !newComment.trim()) return;

    const updatedComments = [
      ...(comments[selectedAssignment.id] || []),
      {
        id: `c${Date.now()}`,
        author: 'You',
        content: newComment,
        timestamp: new Date().toLocaleString(),
        isInstructor: false,
      },
    ];
    setComments({ ...comments, [selectedAssignment.id]: updatedComments });
    setNewComment('');
  };

  const handleFileUpload = async () => {
    if (!selectedAssignment) return;
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        const updated = [
          ...(uploadedFiles[selectedAssignment.id] || []),
          {
            id: `f${Date.now()}`,
            fileName: file.name || 'file',
            fileSize: '1.2 MB',
            uploadedDate: new Date().toLocaleString(),
          },
        ];
        setUploadedFiles({ ...uploadedFiles, [selectedAssignment.id]: updated });
      }
    } catch (err) {
      console.warn('DocumentPicker error', err);
      Alert.alert('Upload failed', 'Could not open file picker.');
    }
  };

  const handleAttachFile = () => {
    if (!selectedAssignment || !uploadFileName.trim()) return;
    const updated = [
      ...(uploadedFiles[selectedAssignment.id] || []),
      {
        id: `f${Date.now()}`,
        fileName: uploadFileName.trim(),
        fileSize: '1.2 MB',
        uploadedDate: new Date().toLocaleString(),
      },
    ];
    setUploadedFiles({ ...uploadedFiles, [selectedAssignment.id]: updated });
    setUploadFileName('');
    setShowUploadInput(false);
  };

  const handleRemoveAttachment = (assignmentId: string, fileId: string) => {
    const list = (uploadedFiles[assignmentId] || []).filter((f) => f.id !== fileId);
    setUploadedFiles({ ...uploadedFiles, [assignmentId]: list });
  };

  const handleSubmitAssignment = () => {
    if (!selectedAssignment) return;
    const files = uploadedFiles[selectedAssignment.id] || [];
    if (files.length === 0) {
      Alert.alert('No files', 'Please upload at least one file before submitting.');
      return;
    }
    Alert.alert('Success', `Assignment submitted with ${files.length} file(s).`);
    setSelectedAssignment(null);
  };

  const renderAssignmentItem = ({ item }: { item: Assignment }) => {
    const daysUntil = getDaysUntilDue(item.dueDate);
    const isOverdue = daysUntil < 0;

    return (
      <TouchableOpacity style={styles.assignmentCard} activeOpacity={0.8} onPress={() => setSelectedAssignment(item)}>
        <View style={styles.assignmentHeader}>
          <View style={styles.assignmentInfo}>
            <Text style={styles.assignmentTitle}>{item.title}</Text>
            <Text style={styles.courseName}>{item.courseName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.assignmentFooter}>
          <Text style={[styles.dueDateText, isOverdue && styles.overdueText]}>
            Due: {item.dueDate} {daysUntil < 0 ? `(${Math.abs(daysUntil)} days overdue)` : daysUntil === 0 ? '(Today)' : `(${daysUntil} days left)`}
          </Text>
          {item.points !== undefined && item.maxPoints && (
            <Text style={styles.pointsText}>Points: {item.points}/{item.maxPoints}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.filterContainer}>
        {['all', 'pending', 'submitted', 'graded'].map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setFilter(tab as any)}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
          >
            <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.countText}>{filteredAssignments.length} {filter === 'all' ? 'assignment' : filter}{filteredAssignments.length !== 1 ? 's' : ''}</Text>

      <FlatList
        data={filteredAssignments}
        renderItem={renderAssignmentItem}
        keyExtractor={item => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      <Modal visible={selectedAssignment !== null} animationType="slide" transparent onRequestClose={() => { setSelectedAssignment(null); setShowUploadInput(false); setUploadFileName(''); }}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.detailContainer}>
            {selectedAssignment && (
              <>
                <View style={styles.detailHeader}>
                  <TouchableOpacity onPress={() => { setSelectedAssignment(null); setShowUploadInput(false); setUploadFileName(''); }}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                  <Text style={styles.detailTitle}>{selectedAssignment.title}</Text>
                  <View style={{ width: 30 }} />
                </View>

                <View style={styles.detailContent}>
                  <View style={styles.infoCard}>
                    <Text style={styles.courseName}>{selectedAssignment.courseName}</Text>
                    <Text style={styles.description}>{selectedAssignment.description}</Text>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Due Date:</Text>
                      <Text style={styles.infoValue}>{selectedAssignment.dueDate}</Text>
                    </View>

                    {selectedAssignment.maxPoints && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Points:</Text>
                        <Text style={styles.infoValue}>{selectedAssignment.points}/{selectedAssignment.maxPoints}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📎 Files</Text>

                    {(uploadedFiles[selectedAssignment.id] || []).length > 0 ? (
                      <View>
                        {(uploadedFiles[selectedAssignment.id] || []).map(file => (
                          <TouchableOpacity key={file.id} style={styles.fileItem}>
                            <Text style={{ fontSize: 20 }}>📄</Text>
                            <View style={styles.fileInfo}>
                              <Text style={styles.fileName}>{file.fileName}</Text>
                              <Text style={styles.fileDetails}>{file.fileSize} • {file.uploadedDate}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.emptyText}>No files uploaded yet</Text>
                    )}

                    {!showUploadInput ? (
                      <TouchableOpacity style={styles.uploadButton} onPress={handleFileUpload}>
                        <Text style={styles.uploadButtonText}>+ Upload File</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ marginTop: 8 }}>
                        <TextInput placeholder="Filename (e.g. report.docx)" value={uploadFileName} onChangeText={setUploadFileName} style={{ borderWidth: 1, borderColor: '#EEE', padding: 8, borderRadius: 8, marginBottom: 8 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', gap: 8 }}>
                          <TouchableOpacity onPress={handleAttachFile} style={[styles.uploadButton, { marginRight: 8 }] }>
                            <Text style={styles.uploadButtonText}>Attach</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => { setShowUploadInput(false); setUploadFileName(''); }} style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
                            <Text style={{ color: '#333', fontWeight: '600' }}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {(uploadedFiles[selectedAssignment.id] || []).length > 0 && (
                      <TouchableOpacity onPress={handleSubmitAssignment} style={[styles.uploadButton, { marginTop: 12, backgroundColor: '#308C5D' }]}>
                        <Text style={styles.uploadButtonText}>SUBMIT</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💬 Comments</Text>
                    {(comments[selectedAssignment.id] || []).length > 0 ? (
                      <View>
                        {(comments[selectedAssignment.id] || []).map(comment => (
                          <View key={comment.id} style={[styles.commentItem, comment.isInstructor && styles.instructorComment]}>
                            <View style={styles.commentHeader}>
                              <Text style={styles.commentAuthor}>{comment.author}</Text>
                              {comment.isInstructor && <Text style={styles.instructorBadge}>Instructor</Text>}
                            </View>
                            <Text style={styles.commentContent}>{comment.content}</Text>
                            <Text style={styles.commentTime}>{comment.timestamp}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.emptyText}>No comments yet</Text>
                    )}

                    <View style={styles.commentInputContainer}>
                      <TextInput
                        style={styles.commentInput}
                        placeholder="Add a comment..."
                        placeholderTextColor="#999"
                        value={newComment}
                        onChangeText={setNewComment}
                        multiline
                      />
                      <TouchableOpacity style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]} disabled={!newComment.trim()} onPress={handleAddComment}>
                        <Text style={styles.sendButtonText}>Send</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 12 },
  filterContainer: { flexDirection: 'row', marginBottom: 16 },
  filterTab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#E0E0E0', marginRight: 8 },
  filterTabActive: { backgroundColor: '#D32F2F' },
  filterTabText: { color: '#666', fontWeight: '600' },
  filterTabTextActive: { color: '#fff' },
  countText: { fontSize: 18, color: '#555', marginBottom: 12, fontWeight: '500' },
  assignmentCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  assignmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  assignmentInfo: { flex: 1, marginRight: 8 },
  assignmentTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 4 },
  courseName: { color: '#666', fontWeight: '500', fontSize: 13 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: '#fff', fontWeight: '700', textTransform: 'capitalize', fontSize: 12 },
  assignmentFooter: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 8 },
  dueDateText: { color: '#666', fontWeight: '500', fontSize: 13 },
  overdueText: { color: '#D32F2F', fontWeight: '700' },
  pointsText: { fontSize: 12, color: '#888', fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  detailContainer: { padding: 16, paddingBottom: 40, backgroundColor: '#fff' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  closeButton: { fontSize: 20, color: '#666' },
  detailTitle: { fontSize: 18, fontWeight: '700', color: '#000', flex: 1, textAlign: 'center' },
  detailContent: { },
  infoCard: { backgroundColor: '#F9F9F9', borderRadius: 10, padding: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#D32F2F' },
  description: { color: '#666', marginVertical: 8, lineHeight: 20, fontSize: 13 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
  infoLabel: { fontWeight: '600', color: '#666', fontSize: 13 },
  infoValue: { fontWeight: '700', color: '#000', fontSize: 13 },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 8 },

  fileItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 8, padding: 8, marginBottom: 8 },
  fileInfo: { flex: 1, marginLeft: 8 },
  fileName: { fontWeight: '600', color: '#000', marginBottom: 4, fontSize: 13 },
  fileDetails: { color: '#888', fontSize: 12 },
  uploadButton: { backgroundColor: '#D32F2F', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  uploadButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  emptyText: { color: '#999', fontStyle: 'italic', marginVertical: 8, fontSize: 13 },
  commentItem: { backgroundColor: '#F9F9F9', borderRadius: 8, padding: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#2196F3' },
  instructorComment: { backgroundColor: '#FFF9C4', borderLeftColor: '#FBC02D' },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  commentAuthor: { fontWeight: '700', color: '#000', fontSize: 13 },
  instructorBadge: { fontWeight: '700', color: '#FFF', backgroundColor: '#FBC02D', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  commentContent: { fontSize: 13, color: '#333', lineHeight: 18, marginBottom: 6 },
  commentTime: { fontSize: 11, color: '#888', fontWeight: '500' },
  commentInputContainer: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingTop: 12 },
  commentInput: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 10, minHeight: 60, fontSize: 13, color: '#000', marginBottom: 8 },
  sendButton: { backgroundColor: '#D32F2F', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#CCC' },
  sendButtonText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});

export default Assignments;
