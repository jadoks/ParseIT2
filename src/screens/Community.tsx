import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PostQueryModal from '../components/PostQueryModal';

export interface CommunityAnswer {
  id: string;
  userName: string;
  avatar: any;
  answeredAt: string;
  message: string;
}

export interface CommunityPost {
  id: string;
  userName: string;
  userEmail?: string;
  avatar: any;
  dateTime: string;
  content: string;
  answers: CommunityAnswer[];
}

interface CommunityProps {
  userName?: string;
  userAvatar?: any;
  posts: CommunityPost[];
  onCreatePost?: (query: string) => void;
  onAddAnswer?: (postId: string, message: string) => void;
}

const DEFAULT_AVATAR = require('../../assets/images/pogi.jpg');

const normalizeImageSource = (img: any) => {
  if (!img) return DEFAULT_AVATAR;

  if (typeof img === 'number') {
    return img;
  }

  if (img?.uri) {
    return { uri: img.uri };
  }

  return DEFAULT_AVATAR;
};

const Community: React.FC<CommunityProps> = ({
  userName = 'Jade Lisondra',
  userAvatar = DEFAULT_AVATAR,
  posts,
  onCreatePost,
  onAddAnswer,
}) => {
  const [menuVisibleFor, setMenuVisibleFor] = useState<string | null>(null);
  const [hiddenPosts, setHiddenPosts] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const [answersModalVisible, setAnswersModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [localPosts, setLocalPosts] = useState<CommunityPost[]>(posts);
  const [answerText, setAnswerText] = useState('');

  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  React.useEffect(() => {
    setLocalPosts(posts);
  }, [posts]);

  const selectedPost = useMemo(
    () => localPosts.find((post) => post.id === selectedPostId) || null,
    [localPosts, selectedPostId]
  );

  const userAvatarSource = useMemo(
    () => normalizeImageSource(userAvatar),
    [userAvatar]
  );

  const openAnswersModal = (post: CommunityPost) => {
    setSelectedPostId(post.id);
    setAnswerText('');
    setAnswersModalVisible(true);
  };

  const closeAnswersModal = () => {
    setSelectedPostId(null);
    setAnswerText('');
    setAnswersModalVisible(false);
  };

  const handlePostAnswer = () => {
    const trimmed = answerText.trim();
    if (!trimmed || !selectedPostId) return;

    const newAnswer: CommunityAnswer = {
      id: `answer-${Date.now()}`,
      userName,
      avatar: userAvatarSource,
      answeredAt: new Date().toLocaleString(),
      message: trimmed,
    };

    setLocalPosts((prev) =>
      prev.map((post) =>
        post.id === selectedPostId
          ? { ...post, answers: [...post.answers, newAnswer] }
          : post
      )
    );

    onAddAnswer?.(selectedPostId, trimmed);
    setAnswerText('');
  };

  const renderPost = ({ item }: { item: CommunityPost }) => {
    return (
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <View style={styles.userRow}>
            <Image
              source={normalizeImageSource(item.avatar)}
              style={styles.postAvatar}
              resizeMode="cover"
            />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.postUserName}>{item.userName}</Text>
              <Text style={styles.postDateTime}>{item.dateTime}</Text>
            </View>
          </View>

          <View style={{ position: 'relative' }}>
            <TouchableOpacity
              onPress={() =>
                setMenuVisibleFor(menuVisibleFor === item.id ? null : item.id)
              }
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#555" />
            </TouchableOpacity>

            {menuVisibleFor === item.id && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setHiddenPosts([...hiddenPosts, item.id]);
                    setMenuVisibleFor(null);
                  }}
                >
                  <View style={styles.hideIconCircle}>
                    <Ionicons name="eye-off" size={13} color="#fff" />
                  </View>
                  <Text style={styles.menuText}>Hide</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.postContent}>{item.content}</Text>

        <TouchableOpacity onPress={() => openAnswersModal(item)}>
          <Text style={styles.showAnswersBtn}>
            View {item.answers.length} Answer(s)
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        if (!modalVisible && !answersModalVisible) {
          setMenuVisibleFor(null);
          Keyboard.dismiss();
        }
      }}
    >
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.contentContainer,
            isLargeScreen && styles.largeScreenContentContainer,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.innerWrapper}>
            <View style={styles.header}>
              <Text style={styles.title}>ParseIt Community</Text>
            </View>

            <View style={styles.inputRow}>
              <Image
                source={userAvatarSource}
                style={styles.inputAvatar}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.inputField}
                onPress={() => setModalVisible(true)}
              >
                <Text style={{ color: '#999' }}>
                  Have a question, {userName}?
                </Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={localPosts.filter((post) => !hiddenPosts.includes(post.id))}
              keyExtractor={(item) => item.id}
              renderItem={renderPost}
              scrollEnabled={false}
              contentContainerStyle={{ paddingBottom: 50 }}
            />
          </View>
        </ScrollView>

        <PostQueryModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onPost={onCreatePost}
        />

        <Modal
          visible={answersModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeAnswersModal}
        >
          <TouchableWithoutFeedback onPress={closeAnswersModal}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.answersModalCard}>
                  <View style={styles.answerModalHeader}>
                    <Text style={styles.answerModalTitle}>Answers</Text>
                    <TouchableOpacity onPress={closeAnswersModal}>
                      <Ionicons name="close" size={22} color="#333" />
                    </TouchableOpacity>
                  </View>

                  {selectedPost && (
                    <>
                      <Text style={styles.selectedPostText}>{selectedPost.content}</Text>

                      <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.modalAnswersContainer}
                        style={styles.answersScroll}
                      >
                        {selectedPost.answers.length > 0 ? (
                          selectedPost.answers.map((answer) => (
                            <View key={answer.id} style={styles.answerCard}>
                              <View style={styles.answerPreviewHeader}>
                                <View style={styles.userRow}>
                                  <Image
                                    source={normalizeImageSource(answer.avatar)}
                                    style={styles.answerAvatar}
                                    resizeMode="cover"
                                  />
                                  <View style={{ marginLeft: 8, flex: 1 }}>
                                    <Text style={styles.answerUserName}>{answer.userName}</Text>
                                    <Text style={styles.answerDate}>{answer.answeredAt}</Text>
                                  </View>
                                </View>
                              </View>

                              <Text style={styles.answerPreviewText}>
                                {answer.message}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.noAnswersText}>No answers yet.</Text>
                        )}
                      </ScrollView>

                      <View style={styles.answerInputSection}>
                        <Text style={styles.answerInputLabel}>Write an answer</Text>
                        <TextInput
                          style={styles.answerInput}
                          placeholder="Type your answer here"
                          placeholderTextColor="#999"
                          multiline
                          value={answerText}
                          onChangeText={setAnswerText}
                          textAlignVertical="top"
                        />
                        <TouchableOpacity
                          style={styles.postAnswerButton}
                          onPress={handlePostAnswer}
                        >
                          <Text style={styles.postAnswerButtonText}>Post Answer</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 30,
  },

  largeScreenContentContainer: {
    paddingHorizontal: 150,
  },

  innerWrapper: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  inputAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    overflow: 'hidden',
    aspectRatio: 1,
  },

  inputField: {
    flex: 1,
    height: 45,
    borderRadius: 25,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D32F2F',
    justifyContent: 'center',
    maxWidth: 400,
    width: '100%',
  },

  postContainer: {
    backgroundColor: '#ffffff',
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
    borderColor: '#D32F2F',
    borderLeftWidth: 5,
    borderBottomWidth: 1,
    borderRightWidth: 1,
  },

  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    aspectRatio: 1,
  },

  postUserName: {
    fontWeight: '700',
    color: '#222',
  },

  postDateTime: {
    fontSize: 12,
    color: '#666',
  },

  dropdownMenu: {
    position: 'absolute',
    marginTop: -10,
    right: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 6,
    width: 80,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    zIndex: 999,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  hideIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
  },

  menuText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#333',
  },

  postContent: {
    color: '#333',
    marginVertical: 8,
  },

  showAnswersBtn: {
    color: '#1976d2',
    fontWeight: '400',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  answersModalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
  },

  answerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  answerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },

  selectedPostText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 16,
  },

  answersScroll: {
    maxHeight: 260,
  },

  modalAnswersContainer: {
    gap: 10,
    paddingBottom: 4,
  },

  answerCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },

  answerPreviewHeader: {
    marginBottom: 6,
  },

  answerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    aspectRatio: 1,
  },

  answerUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },

  answerDate: {
    fontSize: 12,
    color: '#777',
  },

  answerPreviewText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },

  noAnswersText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    paddingVertical: 12,
  },

  answerInputSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 14,
  },

  answerInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },

  answerInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#222',
    backgroundColor: '#FFF',
  },

  postAnswerButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#D32F2F',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },

  postAnswerButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default Community;