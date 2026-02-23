import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

export interface Material {
  id: string;
  title: string;
  type: 'pdf' | 'video' | 'document' | 'link';
  uploadedDate: string;
}

export interface CourseAssignment {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  points?: number;
  maxPoints?: number;
}

export interface CourseDetail {
  id: string;
  name: string;
  code: string;
  instructor: string;
  description: string;
  materials: Material[];
  assignments: CourseAssignment[];
}

interface CourseDetailProps {
  course?: CourseDetail;
  onBack?: () => void;
  initialTab?: 'materials' | 'assignments';
}

const MOCK_COURSE: CourseDetail = {
  id: '1',
  name: 'Web Development 101',
  code: 'CS-101',
  instructor: 'Prof. John Smith',
  description: 'Learn the fundamentals of web development including HTML, CSS, and JavaScript.',
  materials: [
    {
      id: 'm1',
      title: 'HTML Basics Tutorial',
      type: 'video',
      uploadedDate: '2026-02-01',
    },
    {
      id: 'm2',
      title: 'CSS Styling Guide',
      type: 'pdf',
      uploadedDate: '2026-02-03',
    },
    {
      id: 'm3',
      title: 'JavaScript Fundamentals',
      type: 'video',
      uploadedDate: '2026-02-05',
    },
    {
      id: 'm4',
      title: 'Project Guidelines',
      type: 'document',
      uploadedDate: '2026-02-07',
    },
  ],
  assignments: [
    {
      id: 'a1',
      title: 'React Fundamentals Quiz',
      dueDate: '2026-02-15',
      status: 'pending',
      points: 0,
      maxPoints: 20,
    },
    {
      id: 'a2',
      title: 'Build a Simple Website',
      dueDate: '2026-02-20',
      status: 'pending',
      points: 0,
      maxPoints: 50,
    },
  ],
};

const CourseDetail = ({ course = MOCK_COURSE, initialTab = 'materials', onBack }: CourseDetailProps) => {
  const { width } = useWindowDimensions();
  
  // Responsive breakpoints
  const isSmallPhone = width < 360;
  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isLargeScreen = width >= 1024;
  
  const [activeTab, setActiveTab] = useState<'materials' | 'assignments'>(initialTab);
  const [selectedAssignment, setSelectedAssignment] = useState<CourseAssignment | null>(null);
  const [newComment, setNewComment] = useState('');
  const [assignmentComments, setAssignmentComments] = useState<{ [key: string]: any[] }>(
    Object.fromEntries(MOCK_COURSE.assignments.map(a => [a.id, []]))
  );
  const [assignmentAttachments, setAssignmentAttachments] = useState<{ [key: string]: any[] }>(
    Object.fromEntries(MOCK_COURSE.assignments.map(a => [a.id, []]))
  );
  const [showUploadInput, setShowUploadInput] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return '📄';
      case 'video':
        return '🎥';
      case 'document':
        return '📝';
      case 'link':
        return '🔗';
      default:
        return '📎';
    }
  };

  const renderMaterialItem = ({ item }: { item: Material }) => (
    <TouchableOpacity style={styles.materialCard} activeOpacity={0.7}>
      <View style={styles.materialIcon}>
        <Text style={styles.iconText}>{getMaterialIcon(item.type)}</Text>
      </View>
      <View style={styles.materialInfo}>
        <Text style={styles.materialTitle}>{item.title}</Text>
        <Text style={styles.materialType}>
          {item.type.charAt(0).toUpperCase() + item.type.slice(1)} • {item.uploadedDate}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderAssignmentItem = ({ item }: { item: CourseAssignment }) => (
    <TouchableOpacity 
      style={styles.assignmentCard} 
      activeOpacity={0.7}
      onPress={() => setSelectedAssignment(item)}
    >
      <View style={styles.assignmentHeader}>
        <Text style={styles.assignmentTitle}>{item.title}</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === 'pending'
                  ? '#FF9800'
                  : item.status === 'submitted'
                  ? '#2196F3'
                  : '#4CAF50',
            },
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.assignmentDetails}>
        <Text style={styles.dueDate}>Due: {item.dueDate}</Text>
        {item.points !== undefined && item.maxPoints && (
          <Text style={styles.points}>Points: {item.points}/{item.maxPoints}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const handleAddComment = () => {
    if (!selectedAssignment || !newComment.trim()) return;
    
    const updatedComments = [
      ...(assignmentComments[selectedAssignment.id] || []),
      {
        id: `c${Date.now()}`,
        author: 'You',
        content: newComment,
        timestamp: new Date().toLocaleString(),
        isInstructor: false,
      },
    ];
    setAssignmentComments({ ...assignmentComments, [selectedAssignment.id]: updatedComments });
    setNewComment('');
  };

  const handleFileUpload = async () => {
    if (!selectedAssignment) return;
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        const updated = [
          ...(assignmentAttachments[selectedAssignment.id] || []),
          {
            id: `f${Date.now()}`,
            name: file.name || 'file',
            uri: file.uri,
            uploadedAt: new Date().toLocaleString(),
          },
        ];
        setAssignmentAttachments({ ...assignmentAttachments, [selectedAssignment.id]: updated });
      }
    } catch (err) {
      console.warn('DocumentPicker error', err);
      Alert.alert('Upload failed', 'Could not open file picker.');
    }
  };

  const handleAttachFile = () => {
    if (!selectedAssignment || !uploadFileName.trim()) return;
    const updated = [
      ...(assignmentAttachments[selectedAssignment.id] || []),
      {
        id: `f${Date.now()}`,
        name: uploadFileName.trim(),
        uploadedAt: new Date().toLocaleString(),
      },
    ];
    setAssignmentAttachments({ ...assignmentAttachments, [selectedAssignment.id]: updated });
    setUploadFileName('');
    setShowUploadInput(false);
  };

  const handleRemoveAttachment = (assignmentId: string, fileId: string) => {
    const list = (assignmentAttachments[assignmentId] || []).filter((f) => f.id !== fileId);
    setAssignmentAttachments({ ...assignmentAttachments, [assignmentId]: list });
  };

  const closeAssignmentModal = () => {
    setSelectedAssignment(null);
    setShowUploadInput(false);
    setUploadFileName('');
    setNewComment('');
  };

  const handleSubmitAssignment = () => {
    if (!selectedAssignment) return;
    const files = assignmentAttachments[selectedAssignment.id] || [];
    if (files.length === 0) {
      Alert.alert('No files', 'Please upload at least one file before submitting.');
      return;
    }
    Alert.alert('Success', `Assignment submitted with ${files.length} file(s).`);
    closeAssignmentModal();
  };

  return (
    <ScrollView style={styles.container}>
      {/* Course Header - Responsive */}
      <View style={[styles.courseHeader, { paddingHorizontal: wp(isSmallPhone ? '3' : '5') }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF">
  <Text style={{ color: '#FFF', fontSize: 20, marginLeft: 5 , fontFamily: 'System'}}>
    Back
  </Text>
  </MaterialCommunityIcons>
          </TouchableOpacity>
        )}
        <Text style={[styles.courseCode, { fontSize: isSmallPhone ? 11 : 12 }]}>{course.code}</Text>
        <Text style={[styles.courseName, { fontSize: isSmallPhone ? 20 : 24 }]}>{course.name}</Text>
        <Text style={[styles.instructor, { fontSize: isSmallPhone ? 12 : 14 }]}>Instructor: {course.instructor}</Text>
        <Text style={[styles.description, { fontSize: isSmallPhone ? 12 : 13 }]}>{course.description}</Text>
      </View>

      {/* Tab Navigation - Responsive */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab('materials')}
          style={[
            styles.tab,
            activeTab === 'materials' && styles.tabActive,
            { paddingVertical: isSmallPhone ? hp('1.2') : hp('2') },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'materials' && styles.tabTextActive,
              { fontSize: isSmallPhone ? 12 : 13 },
            ]}
          >
            📚 Materials ({course.materials.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('assignments')}
          style={[
            styles.tab,
            activeTab === 'assignments' && styles.tabActive,
            { paddingVertical: isSmallPhone ? hp('1.2') : hp('2') },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'assignments' && styles.tabTextActive,
              { fontSize: isSmallPhone ? 12 : 13 },
            ]}
          >
            ✓ Assignments ({course.assignments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content - Responsive */}
      <View style={[styles.contentContainer, { paddingHorizontal: wp(isSmallPhone ? '3' : '4') }]}>
        {activeTab === 'materials' ? (
          course.materials.length > 0 ? (
            <FlatList
              data={course.materials}
              renderItem={renderMaterialItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.emptyText}>No materials available yet</Text>
          )
        ) : (
          course.assignments.length > 0 ? (
            <FlatList
              data={course.assignments}
              renderItem={renderAssignmentItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.emptyText}>No assignments yet</Text>
          )
        )}
        {/* Assignment Details Modal */}
        <Modal visible={!!selectedAssignment} animationType="slide" transparent={false} onRequestClose={closeAssignmentModal}>
          <View style={{ flex: 1, backgroundColor: '#FFF', padding: wp('4') }}>
            <TouchableOpacity onPress={closeAssignmentModal} style={{ marginBottom: hp('1') }}>
              <Text style={{ color: '#D32F2F', fontWeight: '700' }}>← Back</Text>
            </TouchableOpacity>
            {selectedAssignment && (
              <>
                {/* Title */}
                <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: hp('1'), textAlign: 'center' }}>{selectedAssignment.title}</Text>

                {/* Info Box with left description and right due/points */}
                <View style={styles.infoBox}>
                  <View style={styles.infoLeft}>
                    <Text style={{ fontWeight: '700', color: '#333' }}>{course.name}</Text>
                    <Text style={{ color: '#666', marginTop: 6 , flexShrink: 1,}}ellipsizeMode="tail">{course.description}</Text>
                  </View>
                  <View style={styles.infoRight}>
                    <Text style={{ fontWeight: '700', color: '#000', textAlign: 'right' }}>{selectedAssignment.dueDate}</Text>
                    <Text style={{ color: '#888', marginTop: 6, textAlign: 'right' }}>{selectedAssignment.points}/{selectedAssignment.maxPoints}</Text>
                  </View>
                </View>

                {/* Files section and Upload button */}
                <View style={{ marginTop: hp('2'), marginBottom: hp('2') }}>
                  <Text style={{ fontWeight: '700', marginBottom: hp('1') }}>📎 Files</Text>
                  {(assignmentAttachments[selectedAssignment.id] || []).length === 0 ? (
                    <Text style={{ color: '#999', marginBottom: hp('1') }}>No files uploaded yet</Text>
                  ) : (
                    (assignmentAttachments[selectedAssignment.id] || []).map((f) => (
                      <View key={f.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: hp('0.6') }}>
                        <Text>{f.name}</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Text style={{ color: '#999', fontSize: 12 }}>{f.uploadedAt}</Text>
                          <TouchableOpacity onPress={() => handleRemoveAttachment(selectedAssignment.id, f.id)}>
                            <Text style={{ color: '#D32F2F' }}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}

                  {!showUploadInput ? (
                    <TouchableOpacity onPress={handleFileUpload} style={styles.uploadFullButton}>
                      <Text style={styles.uploadFullButtonText}>+ Upload File</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ marginTop: hp('1') }}>
                      <TextInput placeholder="Filename (e.g. report.docx)" value={uploadFileName} onChangeText={setUploadFileName} style={{ borderWidth: 1, borderColor: '#EEE', padding: 8, borderRadius: 8, marginBottom: 8 }} />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={handleAttachFile} style={[styles.uploadFullButton, { width: 120, paddingVertical: 10 }] }>
                          <Text style={styles.uploadFullButtonText}>Attach</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setShowUploadInput(false); setUploadFileName(''); }} style={{ padding: 10, borderRadius: 8 }}>
                          <Text style={{ color: '#333', fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {(assignmentAttachments[selectedAssignment.id] || []).length > 0 && (
                    <TouchableOpacity onPress={handleSubmitAssignment} style={[styles.uploadFullButton, { marginTop: hp('1.5'), backgroundColor: '#308C5D' }]}>
                      <Text style={styles.uploadFullButtonText}>SUBMIT</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Comments */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', marginBottom: hp('0.5') }}>Comments</Text>
                  {(assignmentComments[selectedAssignment.id] || []).length === 0 ? (
                    <Text style={{ color: '#999' }}>No comments yet. Be the first to comment.</Text>
                  ) : (
                    (assignmentComments[selectedAssignment.id] || []).map((c) => (
                      <View key={c.id} style={[c.isInstructor ? styles.instructorCommentBox : { paddingVertical: hp('0.6'), borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontWeight: '700' }}>{c.author}</Text>
                          {c.isInstructor && <View style={styles.instructorBadge}><Text style={{ color: '#FFF', fontWeight: '700' }}>Instructor</Text></View>}
                        </View>
                        <Text style={{ marginTop: hp('0.3') }}>{c.content}</Text>
                        <Text style={{ color: '#999', fontSize: 12, marginTop: hp('0.4') }}>{c.timestamp}</Text>
                      </View>
                    ))
                  )}
                </View>

                <View style={{ paddingVertical: hp('1') }}>
                  <TextInput placeholder="Add a comment..." value={newComment} onChangeText={setNewComment} style={styles.commentInputInline} />
                  <TouchableOpacity onPress={handleAddComment} style={[styles.postButton, !newComment.trim() && styles.postButtonDisabled]} disabled={!newComment.trim()}>
                    <Text style={styles.postButtonText}>Send</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  courseHeader: {
    backgroundColor: '#D32F2F',
    paddingVertical: hp('2'),
    position: 'relative',
  },
  backButton: {
    marginBottom: hp('1'),
    paddingVertical: hp('0.5'),
  },
  courseCode: {
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: hp('0.5'),
  },
  courseName: {
    fontWeight: '700',
    color: '#FFF',
    marginBottom: hp('1'),
  },
  instructor: {
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: hp('1.2'),
    fontWeight: '500',
  },
  description: {
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingHorizontal: wp('2'),
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#D32F2F',
  },
  tabText: {
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#D32F2F',
  },
  contentContainer: {
    paddingVertical: hp('2'),
  },
  materialCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: wp('3'),
    marginBottom: hp('1.5'),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  materialIcon: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp('3'),
  },
  iconText: {
    fontSize: 24,
  },
  materialInfo: {
    flex: 1,
  },
  materialTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  materialType: {
    fontSize: 12,
    color: '#999',
  },
  assignmentCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: wp('4'),
    marginBottom: hp('1.5'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('1'),
  },
  assignmentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: wp('2'),
    paddingVertical: hp('0.5'),
    borderRadius: 6,
    marginLeft: wp('2'),
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'capitalize',
  },
  assignmentDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: hp('1'),
  },
  dueDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  points: {
    fontSize: 12,
    color: '#888',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginVertical: hp('3'),
  },
  infoBox: {
    backgroundColor: '#FFF8F6',
    borderRadius: 10,
    padding: wp('3'),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',             // ← the most important line
    gap: 16,
    borderWidth: 1,
    borderColor: '#FFECE9',
    borderLeftWidth: 4, borderLeftColor: '#D32F2F'
    
  },
  infoLeft: {
    flex: 1,
    minWidth: 160,
    paddingRight: wp('2'),
  },
  infoRight: {
    minWidth: 100,
    alignItems: 'flex-end',
  },
  uploadFullButton: {
    marginTop: hp('1'),
    backgroundColor: '#D32F2F',
    paddingVertical: hp('1.2'),
    borderRadius: 10,
    alignItems: 'center',
  },
  uploadFullButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
  instructorCommentBox: {
    backgroundColor: '#FFF9E6',
    borderColor: '#FFE7A3',
    borderWidth: 1,
    padding: hp('1'),
    borderRadius: 8,
    marginBottom: hp('1'),
  },
  instructorBadge: {
    backgroundColor: '#F0A500',
    paddingHorizontal: wp('2'),
    paddingVertical: hp('0.3'),
    borderRadius: 6,
  },
  commentInputInline: {
    borderWidth: 1,
    borderColor: '#EEE',
    padding: 10,
    borderRadius: 8,
    marginBottom: hp('1'),
  },
  postButton: {
    backgroundColor: '#D32F2F',
    paddingVertical: hp('1'),
    borderRadius: 8,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#EEE',
  },
  postButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
});

export default CourseDetail;
