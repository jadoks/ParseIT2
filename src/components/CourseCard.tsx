import React, { useState } from 'react';
import { Alert, Dimensions, FlatList, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Assignment, Comment, FileUpload, MOCK_ASSIGNMENTS } from '../data/mockAssignments';

interface CourseCardProps {
  title?: string;
  instructor?: string;
  onPress?: () => void;
}

const CourseCard = ({ title = 'Programming 1', instructor = 'Jade M. Lisondra', onPress }: CourseCardProps) => {
  const { width, height } = useWindowDimensions();
  const screenDimensions = Dimensions.get('window');
  const isPortrait = height >= width;
  const isSmallScreen = width < 380;
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;

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

  // Responsive column calculation with better breakpoints
  let cols: number;
  if (isLargeTablet) cols = 4;
  else if (isTablet) cols = 3;
  else if (width >= 500) cols = 2;
  else cols = 1;

  const horizontalPadding = isSmallScreen ? 12 : isTablet ? 24 : 16;
  const gap = isSmallScreen ? 10 : isTablet ? 16 : 12;
  const cardWidth = cols === 1 ? width - horizontalPadding * 2 : Math.max(150, Math.floor((width - horizontalPadding * 2 - gap * (cols - 1)) / cols));

  // Responsive typography with better scaling
  const baseScale = Math.min(1.2, Math.max(0.7, cardWidth / 280));
  const titleSize = Math.max(13, Math.round(16 * baseScale));
  const subSize = Math.max(10, Math.round(11 * baseScale));
  const badgeSize = Math.max(30, Math.round(40 * baseScale));
  const iconSize = Math.max(16, Math.round(20 * baseScale));
  
  // Responsive padding
  const cardPadding = isSmallScreen ? 10 : 14;
  const headerMinHeight = isSmallScreen ? 60 : 70;
  const footerPadding = isSmallScreen ? 10 : 15;
  const footerGap = isSmallScreen ? 8 : 15;

  // Modal max width for large screens
  const modalMaxWidth = isLargeTablet ? 800 : width;
  const modalContentPadding = isSmallScreen ? 12 : isTablet ? 20 : 16;

  return (
    <View>
      <TouchableOpacity 
        style={[
          styles.card, 
          { 
            width: cardWidth,
            marginBottom: isSmallScreen ? 18 : 25,
          }
        ]} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Top Red Section */}
        <View style={[
          styles.cardHeader,
          {
            padding: cardPadding,
            minHeight: headerMinHeight,
          }
        ]}>
          <Text style={[
            styles.cardTitle, 
            { 
              fontSize: titleSize,
              marginBottom: isSmallScreen ? 1 : 2
            }
          ]}>
            {title}
          </Text>
          <Text style={[
            styles.cardSub, 
            { fontSize: subSize }
          ]}>
            {instructor}
          </Text>

          {/* Overlapping Profile Icon */}
          <View style={[
            styles.avatarBadge, 
            { 
              width: badgeSize, 
              height: badgeSize, 
              borderRadius: badgeSize / 2, 
              right: cardPadding, 
              bottom: -badgeSize / 2.5,
              borderWidth: isSmallScreen ? 1.5 : 2
            }
          ]}>
            <Text style={[
              styles.avatarEmoji, 
              { fontSize: Math.round(badgeSize * 0.45) }
            ]}>
              👤
            </Text>
          </View>
        </View>

        {/* Main Card Body (White Space) */}
        <View style={styles.cardBody} />

        {/* Footer Icons */}
        <View style={[
          styles.cardFooter,
          {
            paddingHorizontal: footerPadding,
            paddingBottom: footerPadding,
            gap: footerGap
          }
        ]}>
          <TouchableOpacity 
            style={[
              styles.footerIcon,
              {
                padding: isSmallScreen ? 4 : 6,
                minWidth: isSmallScreen ? 36 : 44,
                minHeight: isSmallScreen ? 36 : 44,
                justifyContent: 'center',
                alignItems: 'center'
              }
            ]}
            onPress={() => setShowAssignments(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.iconText, { fontSize: iconSize }]}>📋</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <Modal 
        visible={showAssignments} 
        animationType="slide" 
        transparent 
        onRequestClose={() => setShowAssignments(false)}
      >
        <ScrollView 
          contentContainerStyle={[
            modalStyles.container,
            {
              padding: modalContentPadding,
              maxWidth: modalMaxWidth,
              marginHorizontal: 'auto'
            }
          ]}
        >
          <View style={[
            modalStyles.header,
            {
              marginBottom: isSmallScreen ? 8 : 12,
              paddingBottom: isSmallScreen ? 8 : 12,
            }
          ]}>
            <Text style={[
              modalStyles.title,
              { 
                fontSize: isSmallScreen ? 16 : 18,
                flex: 1
              }
            ]}>
              Assignments — {title}
            </Text>
            <TouchableOpacity 
              onPress={() => setShowAssignments(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[modalStyles.close, { fontSize: 20 }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={courseAssignments}
            keyExtractor={i => i.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: isSmallScreen ? 8 : 10 }} />}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[
                  modalStyles.assignmentCard,
                  { padding: isSmallScreen ? 10 : 12 }
                ]}
                onPress={() => setSelectedAssignment(item)}
              >
                <Text style={[
                  modalStyles.assignmentTitle,
                  { fontSize: isSmallScreen ? 13 : 14 }
                ]}>
                  {item.title}
                </Text>
                <Text style={[
                  modalStyles.assignmentSubtitle,
                  { fontSize: isSmallScreen ? 11 : 12, marginTop: 4 }
                ]}>
                  {item.dueDate} • {item.status}
                </Text>
              </TouchableOpacity>
            )}
          />

          {/* Assignment detail inside modal */}
          {selectedAssignment && (
            <View style={[
              modalStyles.detailBox,
              {
                marginTop: isSmallScreen ? 8 : 12,
                padding: isSmallScreen ? 10 : 12
              }
            ]}>
              <View style={modalStyles.detailHeader}>
                <Text style={[
                  modalStyles.detailTitle,
                  { fontSize: isSmallScreen ? 15 : 16 }
                ]}>
                  {selectedAssignment.title}
                </Text>
                <TouchableOpacity 
                  onPress={() => setSelectedAssignment(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[modalStyles.close, { fontSize: 18 }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginVertical: isSmallScreen ? 6 : 8 }}>
                <Text style={[
                  modalStyles.detailText,
                  { marginBottom: 6, fontSize: isSmallScreen ? 12 : 13 }
                ]}>
                  {selectedAssignment.description}
                </Text>
                <Text style={[
                  modalStyles.detailText,
                  { marginBottom: 8, fontSize: isSmallScreen ? 11 : 12 }
                ]}>
                  Due: {selectedAssignment.dueDate}
                </Text>
              </View>

              <View style={{ marginBottom: isSmallScreen ? 8 : 10 }}>
                <Text style={[
                  modalStyles.sectionTitle,
                  { fontSize: isSmallScreen ? 12 : 13, marginBottom: 6 }
                ]}>
                  Files
                </Text>
                {(filesState[selectedAssignment.id] || []).length > 0 ? (
                  filesState[selectedAssignment.id].map(f => (
                    <View key={f.id} style={{ paddingVertical: 6 }}>
                      <Text style={{ fontSize: isSmallScreen ? 11 : 12 }}>
                        {f.fileName} • {f.fileSize}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={{ fontStyle: 'italic', color: '#888', fontSize: isSmallScreen ? 11 : 12 }}>
                    No files
                  </Text>
                )}
                <TouchableOpacity 
                  style={[
                    modalStyles.uploadBtn,
                    { paddingVertical: isSmallScreen ? 8 : 10 }
                  ]}
                  onPress={handleFileUpload}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ 
                    color: '#fff',
                    fontSize: isSmallScreen ? 12 : 13,
                    fontWeight: '600'
                  }}>
                    Upload
                  </Text>
                </TouchableOpacity>
              </View>

              <View>
                <Text style={[
                  modalStyles.sectionTitle,
                  { fontSize: isSmallScreen ? 12 : 13, marginBottom: 6 }
                ]}>
                  Comments
                </Text>
                {(commentsState[selectedAssignment.id] || []).map(c => (
                  <View key={c.id} style={{ paddingVertical: 6, marginBottom: 6 }}>
                    <Text style={{ fontWeight: '700', fontSize: isSmallScreen ? 11 : 12 }}>
                      {c.author}
                    </Text>
                    <Text style={{ fontSize: isSmallScreen ? 11 : 12, marginVertical: 2 }}>
                      {c.content}
                    </Text>
                    <Text style={{ 
                      color: '#888', 
                      fontSize: isSmallScreen ? 10 : 11
                    }}>
                      {c.timestamp}
                    </Text>
                  </View>
                ))}

                <TextInput 
                  value={commentText} 
                  onChangeText={setCommentText} 
                  placeholder="Add comment" 
                  placeholderTextColor="#999"
                  style={[
                    modalStyles.commentInput,
                    {
                      minHeight: isSmallScreen ? 35 : 40,
                      padding: isSmallScreen ? 8 : 10,
                      fontSize: isSmallScreen ? 12 : 13
                    }
                  ]}
                  multiline
                />
                <TouchableOpacity 
                  style={[
                    modalStyles.sendBtn,
                    { paddingVertical: isSmallScreen ? 8 : 10 }
                  ]}
                  onPress={handleAddComment}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ 
                    color: '#fff',
                    fontSize: isSmallScreen ? 12 : 13,
                    fontWeight: '600'
                  }}>
                    Send
                  </Text>
                </TouchableOpacity>
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
    backgroundColor: '#FFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'visible',
    ...Platform.select({
      web: {
        // Web-specific styles
      },
      ios: {
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cardHeader: { 
    backgroundColor: '#D32F2F',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'relative',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        paddingVertical: 14,
        paddingHorizontal: 14,
      },
    }),
  },
  cardTitle: { 
    color: '#FFF', 
    fontWeight: 'bold',
    marginBottom: 2,
    ...Platform.select({
      web: {
        letterSpacing: -0.3,
      },
    }),
  },
  cardSub: { 
    color: '#FFF', 
    opacity: 0.9,
    ...Platform.select({
      web: {
        letterSpacing: -0.2,
      },
    }),
  },
  avatarBadge: { 
    position: 'absolute',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#FFF',
  },
  avatarEmoji: { 
    color: '#FFF',
  },
  cardBody: { 
    flex: 1,
    minHeight: 8,
  },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  footerIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    color: '#333',
  }
});

const modalStyles = StyleSheet.create({
  container: { 
    paddingBottom: 40, 
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: { 
    fontWeight: '700',
    ...Platform.select({
      web: {
        letterSpacing: -0.3,
      },
    }),
  },
  close: { 
    color: '#666',
    fontWeight: '600',
  },
  assignmentCard: { 
    borderRadius: 8, 
    backgroundColor: '#F5F5F5',
    marginBottom: 2,
    ...Platform.select({
      ios: {
        paddingVertical: 1,
      },
    }),
  },
  assignmentTitle: { 
    fontWeight: '700',
    color: '#000',
    ...Platform.select({
      web: {
        letterSpacing: -0.2,
      },
    }),
  },
  assignmentSubtitle: { 
    color: '#666',
  },
  detailBox: { 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#EEE',
    marginVertical: 8,
  },
  detailHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailTitle: { 
    fontWeight: '700',
    color: '#000',
    flex: 1,
    ...Platform.select({
      web: {
        letterSpacing: -0.2,
      },
    }),
  },
  detailText: {
    color: '#555',
    lineHeight: 18,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#000',
    ...Platform.select({
      web: {
        letterSpacing: -0.1,
      },
    }),
  },
  uploadBtn: { 
    marginTop: 8,
    backgroundColor: '#D32F2F', 
    borderRadius: 6, 
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
      android: {
        elevation: 3,
      },
    }),
  },
  commentInput: { 
    backgroundColor: '#F5F5F5', 
    borderRadius: 6, 
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#000',
  },
  sendBtn: { 
    marginTop: 8, 
    backgroundColor: '#D32F2F', 
    borderRadius: 6, 
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
      android: {
        elevation: 3,
      },
    }),
  },
});

export default CourseCard;