import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

export interface Material {
  id: string;
  title: string;
  type: 'pdf' | 'video' | 'document' | 'link';
  uploadedDate: string;
}

export interface AssignmentFile {
  id: string;
  name: string;
  uploadedAt: string;
  uri?: string;
}

export interface CourseAssignment {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  points?: number;
  maxPoints?: number;
  topic?: string;
  materialIds?: string[];
  files?: AssignmentFile[];
}

export interface GeneratedActivity {
  id: string;
  assignmentId: string;
  title: string;
  type: 'review' | 'practice' | 'advanced';
  difficulty: 'easy' | 'medium' | 'hard';
  instructions: string;
  basedOnMaterials: string[];
}

export interface CourseDetailData {
  id: string;
  name: string;
  code: string;
  instructor: string;
  description: string;
  materials: Material[];
  assignments: CourseAssignment[];
}

interface CourseDetailProps {
  course?: CourseDetailData;
  onBack?: () => void;
  initialTab?: 'materials' | 'assignments';
}

const MOCK_COURSE: CourseDetailData = {
  id: '1',
  name: 'Web Development 101',
  code: 'CS-101',
  instructor: 'Prof. John Smith',
  description:
    'Learn the fundamentals of web development including HTML, CSS, JavaScript, and introductory React concepts.',
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
      title: 'React Components Introduction',
      type: 'document',
      uploadedDate: '2026-02-07',
    },
    {
      id: 'm5',
      title: 'Project Guidelines',
      type: 'document',
      uploadedDate: '2026-02-10',
    },
  ],
  assignments: [
    {
      id: 'a1',
      title: 'React Fundamentals Quiz',
      dueDate: '2026-02-15',
      status: 'graded',
      points: 8,
      maxPoints: 20,
      topic: 'React Fundamentals',
      materialIds: ['m4'],
      files: [
        {
          id: 'f-a1-1',
          name: 'React_Fundamentals_Quiz_submission.pdf',
          uploadedAt: '2026-02-15 08:30 AM',
        },
      ],
    },
    {
      id: 'a2',
      title: 'Build a Simple Website',
      dueDate: '2026-02-20',
      status: 'graded',
      points: 42,
      maxPoints: 50,
      topic: 'HTML and CSS Layout',
      materialIds: ['m1', 'm2', 'm5'],
      files: [
        {
          id: 'f-a2-1',
          name: 'Simple_Website_Project.zip',
          uploadedAt: '2026-02-20 09:10 AM',
        },
        {
          id: 'f-a2-2',
          name: 'Project_Screenshots.pdf',
          uploadedAt: '2026-02-20 09:12 AM',
        },
      ],
    },
    {
      id: 'a3',
      title: 'JavaScript Basics Checkpoint',
      dueDate: '2026-02-24',
      status: 'submitted',
      points: 0,
      maxPoints: 25,
      topic: 'JavaScript Fundamentals',
      materialIds: ['m3'],
      files: [
        {
          id: 'f-a3-1',
          name: 'JS_Basics_Checkpoint.docx',
          uploadedAt: '2026-02-24 07:50 AM',
        },
      ],
    },
    {
      id: 'a4',
      title: 'Responsive Design Exercise',
      dueDate: '2026-02-28',
      status: 'pending',
      points: 0,
      maxPoints: 30,
      topic: 'Responsive Design',
      materialIds: ['m2', 'm5'],
      files: [],
    },
  ],
};

const CourseDetail = ({
  course = MOCK_COURSE,
  initialTab = 'materials',
  onBack,
}: CourseDetailProps) => {
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 360;

  const [activeTab, setActiveTab] = useState<'materials' | 'assignments'>(initialTab);
  const [selectedAssignment, setSelectedAssignment] = useState<CourseAssignment | null>(null);
  const [newComment, setNewComment] = useState('');
  const [assignmentComments, setAssignmentComments] = useState<{ [key: string]: any[] }>(
    Object.fromEntries(
      course.assignments.map((a) => [
        a.id,
        [
          ...(a.status === 'graded'
            ? [
                {
                  id: `seed-${a.id}`,
                  author: course.instructor,
                  content:
                    a.points !== undefined && a.maxPoints
                      ? a.points / a.maxPoints < 0.6
                        ? 'Please review the related materials before attempting the next activity.'
                        : 'Good work. Continue practicing to strengthen your understanding.'
                      : 'Your submission is being reviewed.',
                  timestamp: new Date().toLocaleString(),
                  isInstructor: true,
                },
              ]
            : []),
        ],
      ]))
  );
  const [assignmentAttachments, setAssignmentAttachments] = useState<{ [key: string]: AssignmentFile[] }>(
    Object.fromEntries(course.assignments.map((a) => [a.id, a.files || []]))
  );
  const [showUploadInput, setShowUploadInput] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [generatedActivities, setGeneratedActivities] = useState<{ [key: string]: GeneratedActivity[] }>({});
  const [selectedGeneratedActivity, setSelectedGeneratedActivity] = useState<GeneratedActivity | null>(null);

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

  const getScorePercent = (assignment: CourseAssignment) => {
    if (
      assignment.status !== 'graded' ||
      assignment.points === undefined ||
      assignment.maxPoints === undefined ||
      assignment.maxPoints === 0
    ) {
      return null;
    }
    return Math.round((assignment.points / assignment.maxPoints) * 100);
  };

  const getRecommendationType = (
    assignment: CourseAssignment
  ): 'review' | 'practice' | 'advanced' | null => {
    const percent = getScorePercent(assignment);
    if (percent === null) return null;
    if (percent < 60) return 'review';
    if (percent < 80) return 'practice';
    return 'advanced';
  };

  const getRecommendationLabel = (assignment: CourseAssignment) => {
    const recommendation = getRecommendationType(assignment);
    if (!recommendation) return 'No recommendation yet';
    if (recommendation === 'review') return 'Recommended: Review Activity';
    if (recommendation === 'practice') return 'Recommended: Practice Quiz';
    return 'Recommended: Advanced Challenge';
  };

  const getRecommendationColor = (assignment: CourseAssignment) => {
    const recommendation = getRecommendationType(assignment);
    if (recommendation === 'review') return '#D32F2F';
    if (recommendation === 'practice') return '#F57C00';
    if (recommendation === 'advanced') return '#2E7D32';
    return '#999';
  };

  const getRelatedMaterials = (assignment: CourseAssignment) => {
    return course.materials.filter((m) => assignment.materialIds?.includes(m.id));
  };

  const classPerformance = useMemo(() => {
    const graded = course.assignments.filter((a) => a.status === 'graded' && a.maxPoints);
    if (graded.length === 0) return null;

    const totalPercent = graded.reduce((sum, item) => {
      const percent = getScorePercent(item);
      return sum + (percent ?? 0);
    }, 0);

    return Math.round(totalPercent / graded.length);
  }, [course.assignments]);

  const generateActivityForAssignment = (assignment: CourseAssignment) => {
    const recommendation = getRecommendationType(assignment);
    if (!recommendation) {
      Alert.alert('Not available', 'Only graded assignments can generate a follow-up activity.');
      return;
    }

    const relatedMaterials = getRelatedMaterials(assignment);
    const materialTitles = relatedMaterials.map((m) => m.title);

    const activity: GeneratedActivity =
      recommendation === 'review'
        ? {
            id: `ga-${Date.now()}`,
            assignmentId: assignment.id,
            title: `${assignment.topic || assignment.title} Review Activity`,
            type: 'review',
            difficulty: 'easy',
            instructions:
              'Review the linked materials, answer 5 short questions, and write a short summary of the topic in your own words.',
            basedOnMaterials: materialTitles,
          }
        : recommendation === 'practice'
        ? {
            id: `ga-${Date.now()}`,
            assignmentId: assignment.id,
            title: `${assignment.topic || assignment.title} Practice Quiz`,
            type: 'practice',
            difficulty: 'medium',
            instructions:
              'Complete a 10-item practice quiz focused on the concepts where you need more consistency.',
            basedOnMaterials: materialTitles,
          }
        : {
            id: `ga-${Date.now()}`,
            assignmentId: assignment.id,
            title: `${assignment.topic || assignment.title} Advanced Challenge`,
            type: 'advanced',
            difficulty: 'hard',
            instructions:
              'Solve a more challenging task that applies the topic in a real-world scenario and submit a brief explanation of your solution.',
            basedOnMaterials: materialTitles,
          };

    const existing = generatedActivities[assignment.id] || [];
    const updated = {
      ...generatedActivities,
      [assignment.id]: [activity, ...existing],
    };

    setGeneratedActivities(updated);
    setSelectedGeneratedActivity(activity);

    Alert.alert('Success', `${activity.title} has been generated.`);
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

  const renderAssignmentItem = ({ item }: { item: CourseAssignment }) => {
    const percent = getScorePercent(item);
    const recommendationLabel = getRecommendationLabel(item);
    const recommendationColor = getRecommendationColor(item);
    const relatedMaterials = getRelatedMaterials(item);
    const attachmentCount = (assignmentAttachments[item.id] || []).length;

    return (
      <TouchableOpacity
        style={styles.assignmentCard}
        activeOpacity={0.85}
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
          <Text style={styles.topicText}>Topic: {item.topic || 'General'}</Text>

          {item.points !== undefined && item.maxPoints !== undefined && (
            <>
              <Text style={styles.points}>
                Points: {item.points}/{item.maxPoints}
              </Text>
              {percent !== null && <Text style={styles.percentText}>Score: {percent}%</Text>}
            </>
          )}

          {attachmentCount > 0 && (
            <Text style={styles.attachmentText}>
              📎 {attachmentCount} file{attachmentCount > 1 ? 's' : ''} uploaded
            </Text>
          )}

          {relatedMaterials.length > 0 && (
            <Text style={styles.relatedText}>
              Based on: {relatedMaterials.map((m) => m.title).join(', ')}
            </Text>
          )}

          {item.status === 'graded' && (
            <View style={[styles.recommendationBadge, { backgroundColor: `${recommendationColor}15` }]}>
              <Text style={[styles.recommendationText, { color: recommendationColor }]}>
                {recommendationLabel}
              </Text>
            </View>
          )}

          {item.status === 'graded' && (
            <TouchableOpacity
              style={[styles.generateButton, { backgroundColor: recommendationColor }]}
              onPress={() => generateActivityForAssignment(item)}
            >
              <Text style={styles.generateButtonText}>Generate Activity</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

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

    setAssignmentComments({
      ...assignmentComments,
      [selectedAssignment.id]: updatedComments,
    });
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

        setAssignmentAttachments({
          ...assignmentAttachments,
          [selectedAssignment.id]: updated,
        });
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

    setAssignmentAttachments({
      ...assignmentAttachments,
      [selectedAssignment.id]: updated,
    });

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
      <View style={[styles.courseHeader, { paddingHorizontal: wp(isSmallPhone ? '3' : '5') }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
        )}

        <Text style={[styles.courseCode, { fontSize: isSmallPhone ? 11 : 12 }]}>{course.code}</Text>
        <Text style={[styles.courseName, { fontSize: isSmallPhone ? 20 : 24 }]}>{course.name}</Text>
        <Text style={[styles.instructor, { fontSize: isSmallPhone ? 12 : 14 }]}>
          Instructor: {course.instructor}
        </Text>
        <Text style={[styles.description, { fontSize: isSmallPhone ? 12 : 13 }]}>
          {course.description}
        </Text>

        {classPerformance !== null && (
          <View style={styles.performanceCard}>
            <Text style={styles.performanceTitle}>Class Progress Snapshot</Text>
            <Text style={styles.performanceValue}>Average Graded Score: {classPerformance}%</Text>
          </View>
        )}
      </View>

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
        ) : course.assignments.length > 0 ? (
          <FlatList
            data={course.assignments}
            renderItem={renderAssignmentItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.emptyText}>No assignments yet</Text>
        )}

        <Modal
          visible={!!selectedAssignment}
          animationType="slide"
          transparent={false}
          onRequestClose={closeAssignmentModal}
        >
          <View style={{ flex: 1, backgroundColor: '#FFF', padding: wp('4') }}>
            <TouchableOpacity onPress={closeAssignmentModal} style={{ marginBottom: hp('1') }}>
              <Text style={{ color: '#D32F2F', fontWeight: '700' }}>← Back</Text>
            </TouchableOpacity>

            {selectedAssignment && (
              <>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '700',
                    marginBottom: hp('1'),
                    textAlign: 'center',
                  }}
                >
                  {selectedAssignment.title}
                </Text>

                <View style={styles.infoBox}>
                  <View style={styles.infoLeft}>
                    <Text style={{ fontWeight: '700', color: '#333' }}>{course.name}</Text>
                    <Text style={{ color: '#666', marginTop: 6, flexShrink: 1 }}>
                      {course.description}
                    </Text>
                    <Text style={{ color: '#444', marginTop: 8, fontWeight: '600' }}>
                      Topic: {selectedAssignment.topic || 'General'}
                    </Text>
                  </View>

                  <View style={styles.infoRight}>
                    <Text style={{ fontWeight: '700', color: '#000', textAlign: 'right' }}>
                      {selectedAssignment.dueDate}
                    </Text>
                    <Text style={{ color: '#888', marginTop: 6, textAlign: 'right' }}>
                      {selectedAssignment.points}/{selectedAssignment.maxPoints}
                    </Text>
                    {getScorePercent(selectedAssignment) !== null && (
                      <Text
                        style={{
                          color: getRecommendationColor(selectedAssignment),
                          marginTop: 4,
                          textAlign: 'right',
                          fontWeight: '700',
                        }}
                      >
                        {getScorePercent(selectedAssignment)}%
                      </Text>
                    )}
                  </View>
                </View>

                {selectedAssignment.status === 'graded' && (
                  <View style={styles.generatedSection}>
                    <Text style={styles.generatedSectionTitle}>{getRecommendationLabel(selectedAssignment)}</Text>
                    <TouchableOpacity
                      onPress={() => generateActivityForAssignment(selectedAssignment)}
                      style={[
                        styles.uploadFullButton,
                        { backgroundColor: getRecommendationColor(selectedAssignment) },
                      ]}
                    >
                      <Text style={styles.uploadFullButtonText}>Generate Follow-Up Activity</Text>
                    </TouchableOpacity>

                    {(generatedActivities[selectedAssignment.id] || []).length > 0 && (
                      <View style={{ marginTop: hp('1') }}>
                        {(generatedActivities[selectedAssignment.id] || []).map((activity) => (
                          <TouchableOpacity
                            key={activity.id}
                            style={styles.generatedCard}
                            onPress={() => setSelectedGeneratedActivity(activity)}
                          >
                            <Text style={styles.generatedCardTitle}>{activity.title}</Text>
                            <Text style={styles.generatedCardSubtitle}>
                              {activity.type.toUpperCase()} • {activity.difficulty.toUpperCase()}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                <View style={{ marginTop: hp('2'), marginBottom: hp('2') }}>
                  <Text style={{ fontWeight: '700', marginBottom: hp('1') }}>📎 Files</Text>

                  {(assignmentAttachments[selectedAssignment.id] || []).length === 0 ? (
                    <Text style={{ color: '#999', marginBottom: hp('1') }}>No files uploaded yet</Text>
                  ) : (
                    (assignmentAttachments[selectedAssignment.id] || []).map((f) => (
                      <View
                        key={f.id}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingVertical: hp('0.6'),
                        }}
                      >
                        <Text style={{ flex: 1 }}>{f.name}</Text>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          <Text style={{ color: '#999', fontSize: 12 }}>{f.uploadedAt}</Text>
                          <TouchableOpacity
                            onPress={() => handleRemoveAttachment(selectedAssignment.id, f.id)}
                          >
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
                      <TextInput
                        placeholder="Filename (e.g. report.docx)"
                        value={uploadFileName}
                        onChangeText={setUploadFileName}
                        style={{
                          borderWidth: 1,
                          borderColor: '#EEE',
                          padding: 8,
                          borderRadius: 8,
                          marginBottom: 8,
                        }}
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          onPress={handleAttachFile}
                          style={[styles.uploadFullButton, { width: 120, paddingVertical: 10 }]}
                        >
                          <Text style={styles.uploadFullButtonText}>Attach</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setShowUploadInput(false);
                            setUploadFileName('');
                          }}
                          style={{ padding: 10, borderRadius: 8 }}
                        >
                          <Text style={{ color: '#333', fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {(assignmentAttachments[selectedAssignment.id] || []).length > 0 && (
                    <TouchableOpacity
                      onPress={handleSubmitAssignment}
                      style={[
                        styles.uploadFullButton,
                        { marginTop: hp('1.5'), backgroundColor: '#308C5D' },
                      ]}
                    >
                      <Text style={styles.uploadFullButtonText}>SUBMIT</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', marginBottom: hp('0.5') }}>Comments</Text>
                  {(assignmentComments[selectedAssignment.id] || []).length === 0 ? (
                    <Text style={{ color: '#999' }}>
                      No comments yet. Be the first to comment.
                    </Text>
                  ) : (
                    (assignmentComments[selectedAssignment.id] || []).map((c) => (
                      <View
                        key={c.id}
                        style={[
                          c.isInstructor
                            ? styles.instructorCommentBox
                            : {
                                paddingVertical: hp('0.6'),
                                borderBottomWidth: 1,
                                borderBottomColor: '#F0F0F0',
                              },
                        ]}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontWeight: '700' }}>{c.author}</Text>
                          {c.isInstructor && (
                            <View style={styles.instructorBadge}>
                              <Text style={{ color: '#FFF', fontWeight: '700' }}>Instructor</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ marginTop: hp('0.3') }}>{c.content}</Text>
                        <Text style={{ color: '#999', fontSize: 12, marginTop: hp('0.4') }}>
                          {c.timestamp}
                        </Text>
                      </View>
                    ))
                  )}
                </View>

                <View style={{ paddingVertical: hp('1') }}>
                  <TextInput
                    placeholder="Add a comment..."
                    value={newComment}
                    onChangeText={setNewComment}
                    style={styles.commentInputInline}
                  />
                  <TouchableOpacity
                    onPress={handleAddComment}
                    style={[styles.postButton, !newComment.trim() && styles.postButtonDisabled]}
                    disabled={!newComment.trim()}
                  >
                    <Text style={styles.postButtonText}>Send</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </Modal>

        <Modal
          visible={!!selectedGeneratedActivity}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setSelectedGeneratedActivity(null)}
        >
          <View style={{ flex: 1, backgroundColor: '#FFF', padding: wp('4') }}>
            <TouchableOpacity
              onPress={() => setSelectedGeneratedActivity(null)}
              style={{ marginBottom: hp('1') }}
            >
              <Text style={{ color: '#D32F2F', fontWeight: '700' }}>← Back</Text>
            </TouchableOpacity>

            {selectedGeneratedActivity && (
              <>
                <Text style={styles.generatedModalTitle}>{selectedGeneratedActivity.title}</Text>

                <View style={styles.generatedMetaRow}>
                  <Text style={styles.generatedMetaText}>
                    Type: {selectedGeneratedActivity.type.toUpperCase()}
                  </Text>
                  <Text style={styles.generatedMetaText}>
                    Difficulty: {selectedGeneratedActivity.difficulty.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.generatedModalCard}>
                  <Text style={styles.generatedModalSectionTitle}>Instructions</Text>
                  <Text style={styles.generatedModalBody}>
                    {selectedGeneratedActivity.instructions}
                  </Text>
                </View>

                <View style={styles.generatedModalCard}>
                  <Text style={styles.generatedModalSectionTitle}>Based on Materials</Text>
                  {selectedGeneratedActivity.basedOnMaterials.length > 0 ? (
                    selectedGeneratedActivity.basedOnMaterials.map((item, index) => (
                      <Text key={`${item}-${index}`} style={styles.generatedModalBody}>
                        • {item}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.generatedModalBody}>No linked materials found.</Text>
                  )}
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
  performanceCard: {
    marginTop: hp('1.5'),
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    padding: 12,
  },
  performanceTitle: {
    color: '#FFF',
    fontWeight: '700',
    marginBottom: 4,
  },
  performanceValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
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
  topicText: {
    fontSize: 12,
    color: '#444',
    marginBottom: 4,
    fontWeight: '600',
  },
  points: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  percentText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '700',
    marginBottom: 6,
  },
  attachmentText: {
    fontSize: 12,
    color: '#444',
    fontWeight: '600',
    marginBottom: 6,
  },
  relatedText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  recommendationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  recommendationText: {
    fontSize: 12,
    fontWeight: '700',
  },
  generateButton: {
    marginTop: 2,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
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
    flexWrap: 'wrap',
    gap: 16,
    borderWidth: 1,
    borderColor: '#FFECE9',
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
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
  generatedSection: {
    marginTop: hp('2'),
    marginBottom: hp('1'),
  },
  generatedSectionTitle: {
    fontWeight: '700',
    marginBottom: hp('1'),
    color: '#333',
  },
  generatedCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  generatedCardTitle: {
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  generatedCardSubtitle: {
    color: '#666',
    fontSize: 12,
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
  generatedModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    color: '#222',
  },
  generatedMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  generatedMetaText: {
    fontWeight: '700',
    color: '#444',
    backgroundColor: '#F6F6F6',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  generatedModalCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  generatedModalSectionTitle: {
    fontWeight: '700',
    marginBottom: 8,
    color: '#111',
  },
  generatedModalBody: {
    color: '#555',
    lineHeight: 21,
  },
});

export default CourseDetail;