import React, { useMemo, useState } from 'react';
import {
  FlatList,
  GestureResponderEvent,
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
  userEmail?: string;
  posts: CommunityPost[];
  onCreatePost?: (query: string) => void;
  onAddAnswer?: (postId: string, message: string) => void;
  onEditPost?: (postId: string, content: string) => void;
  onDeletePost?: (postId: string) => void;
  onEditAnswer?: (postId: string, answerId: string, message: string) => void;
  onDeleteAnswer?: (postId: string, answerId: string) => void;
}

type PostDropdownState =
  | {
      type: 'post';
      x: number;
      y: number;
      post: CommunityPost;
    }
  | null;

type AnswerDropdownState = {
  answer: CommunityAnswer;
  x: number;
  y: number;
} | null;

const DEFAULT_AVATAR = require('../../assets/images/pogi.jpg');
const POST_DROPDOWN_WIDTH = 160;
const ANSWER_DROPDOWN_WIDTH = 170;

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
  userEmail = 'jadelisondra101@gmail.com',
  userAvatar = DEFAULT_AVATAR,
  posts,
  onCreatePost,
  onAddAnswer,
  onEditPost,
  onDeletePost,
  onEditAnswer,
  onDeleteAnswer,
}) => {
  const [hiddenPosts, setHiddenPosts] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const [answersModalVisible, setAnswersModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [localPosts, setLocalPosts] = useState<CommunityPost[]>(posts);
  const [answerText, setAnswerText] = useState('');

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostText, setEditPostText] = useState('');
  const [editPostModalVisible, setEditPostModalVisible] = useState(false);

  const [hiddenAnswersByPost, setHiddenAnswersByPost] = useState<Record<string, string[]>>({});
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editAnswerText, setEditAnswerText] = useState('');
  const [editAnswerModalVisible, setEditAnswerModalVisible] = useState(false);

  const [deletePostConfirmVisible, setDeletePostConfirmVisible] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  const [deleteAnswerConfirmVisible, setDeleteAnswerConfirmVisible] = useState(false);
  const [answerToDelete, setAnswerToDelete] = useState<string | null>(null);

  const [postDropdownState, setPostDropdownState] = useState<PostDropdownState>(null);
  const [answerDropdownState, setAnswerDropdownState] = useState<AnswerDropdownState>(null);

  const { width, height } = useWindowDimensions();
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

  const visibleAnswers = useMemo(() => {
    if (!selectedPost) return [];
    const hiddenForSelectedPost = hiddenAnswersByPost[selectedPost.id] || [];
    return selectedPost.answers.filter(
      (answer) => !hiddenForSelectedPost.includes(answer.id)
    );
  }, [selectedPost, hiddenAnswersByPost]);

  const getPostDropdownPosition = (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;

    const left = Math.min(
      Math.max(12, pageX - POST_DROPDOWN_WIDTH + 24),
      width - POST_DROPDOWN_WIDTH - 12
    );

    const top = Math.min(pageY + 8, height - 180);

    return { x: left, y: top };
  };

  const getAnswerDropdownPosition = (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;

    const left = Math.min(
      Math.max(12, pageX - ANSWER_DROPDOWN_WIDTH + 24),
      width - ANSWER_DROPDOWN_WIDTH - 12
    );

    const top = Math.min(pageY + 8, height - 160);

    return { x: left, y: top };
  };

  const openPostDropdown = (event: GestureResponderEvent, post: CommunityPost) => {
    Keyboard.dismiss();
    const { x, y } = getPostDropdownPosition(event);
    setPostDropdownState({
      type: 'post',
      x,
      y,
      post,
    });
  };

  const closePostDropdown = () => {
    setPostDropdownState(null);
  };

  const openAnswerDropdown = (event: GestureResponderEvent, answer: CommunityAnswer) => {
    Keyboard.dismiss();
    const { x, y } = getAnswerDropdownPosition(event);
    setAnswerDropdownState({
      answer,
      x,
      y,
    });
  };

  const closeAnswerDropdown = () => {
    setAnswerDropdownState(null);
  };

  const openAnswersModal = (post: CommunityPost) => {
    setSelectedPostId(post.id);
    setAnswerText('');
    closePostDropdown();
    closeAnswerDropdown();
    setAnswersModalVisible(true);
  };

  const closeAnswersModal = () => {
    setSelectedPostId(null);
    setAnswerText('');
    closePostDropdown();
    closeAnswerDropdown();
    setAnswersModalVisible(false);
  };

  const reopenAnswersModal = () => {
    closePostDropdown();
    closeAnswerDropdown();
    setAnswersModalVisible(true);
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

  const handleEditPost = (post: CommunityPost) => {
    closePostDropdown();
    setEditingPostId(post.id);
    setEditPostText(post.content);
    setEditPostModalVisible(true);
  };

  const handleSaveEditedPost = () => {
    const trimmed = editPostText.trim();
    if (!trimmed || !editingPostId) return;

    setLocalPosts((prev) =>
      prev.map((post) =>
        post.id === editingPostId ? { ...post, content: trimmed } : post
      )
    );

    onEditPost?.(editingPostId, trimmed);
    setEditingPostId(null);
    setEditPostText('');
    setEditPostModalVisible(false);
  };

  const handleCloseEditPostModal = () => {
    setEditingPostId(null);
    setEditPostText('');
    setEditPostModalVisible(false);
  };

  const requestDeletePost = (postId: string) => {
    closePostDropdown();
    setPostToDelete(postId);
    setDeletePostConfirmVisible(true);
  };

  const confirmDeletePost = () => {
    if (!postToDelete) return;

    setLocalPosts((prev) => prev.filter((post) => post.id !== postToDelete));
    onDeletePost?.(postToDelete);

    if (selectedPostId === postToDelete) {
      closeAnswersModal();
    }

    setPostToDelete(null);
    setDeletePostConfirmVisible(false);
  };

  const cancelDeletePost = () => {
    setPostToDelete(null);
    setDeletePostConfirmVisible(false);
  };

  const handleHidePost = (postId: string) => {
    closePostDropdown();
    setHiddenPosts((prev) => [...prev, postId]);
  };

  const handleEditAnswer = (answer: CommunityAnswer) => {
    closeAnswerDropdown();
    closePostDropdown();
    setEditingAnswerId(answer.id);
    setEditAnswerText(answer.message);
    setAnswerToDelete(null);
    setDeleteAnswerConfirmVisible(false);
    setAnswersModalVisible(false);
    setEditAnswerModalVisible(true);
  };

  const handleSaveEditedAnswer = () => {
    const trimmed = editAnswerText.trim();
    if (!trimmed || !editingAnswerId || !selectedPostId) return;

    setLocalPosts((prev) =>
      prev.map((post) =>
        post.id === selectedPostId
          ? {
              ...post,
              answers: post.answers.map((answer) =>
                answer.id === editingAnswerId
                  ? { ...answer, message: trimmed }
                  : answer
              ),
            }
          : post
      )
    );

    onEditAnswer?.(selectedPostId, editingAnswerId, trimmed);

    setEditAnswerModalVisible(false);
    setEditingAnswerId(null);
    setEditAnswerText('');
    closeAnswerDropdown();

    reopenAnswersModal();
  };

  const handleCloseEditAnswerModal = () => {
    setEditAnswerModalVisible(false);
    setEditingAnswerId(null);
    setEditAnswerText('');
    closeAnswerDropdown();

    reopenAnswersModal();
  };

  const requestDeleteAnswer = (answerId: string) => {
    closeAnswerDropdown();
    closePostDropdown();
    setAnswerToDelete(answerId);
    setEditingAnswerId(null);
    setEditAnswerModalVisible(false);
    setAnswersModalVisible(false);
    setDeleteAnswerConfirmVisible(true);
  };

  const confirmDeleteAnswer = () => {
    if (!selectedPostId || !answerToDelete) return;

    setLocalPosts((prev) =>
      prev.map((post) =>
        post.id === selectedPostId
          ? {
              ...post,
              answers: post.answers.filter((answer) => answer.id !== answerToDelete),
            }
          : post
      )
    );

    onDeleteAnswer?.(selectedPostId, answerToDelete);

    setAnswerToDelete(null);
    setDeleteAnswerConfirmVisible(false);
    closeAnswerDropdown();

    reopenAnswersModal();
  };

  const cancelDeleteAnswer = () => {
    setAnswerToDelete(null);
    setDeleteAnswerConfirmVisible(false);
    closeAnswerDropdown();

    reopenAnswersModal();
  };

  const handleHideAnswer = (answerId: string) => {
    if (!selectedPostId) return;

    closeAnswerDropdown();
    closePostDropdown();
    setHiddenAnswersByPost((prev) => ({
      ...prev,
      [selectedPostId]: [...(prev[selectedPostId] || []), answerId],
    }));
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
            <View style={{ marginLeft: 8, flex: 1 }}>
              <Text style={styles.postUserName}>{item.userName}</Text>
              <Text style={styles.postDateTime}>{item.dateTime}</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={(event) => openPostDropdown(event, item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#555" />
          </TouchableOpacity>
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

  const renderPostDropdownContent = () => {
    if (!postDropdownState || postDropdownState.type !== 'post') {
      return <View />;
    }

    const post = postDropdownState.post;
    const isCurrentUserPost =
      post.userName === userName || post.userEmail === userEmail;

    return (
      <View
        style={[
          styles.dropdownMenuModal,
          {
            top: postDropdownState.y,
            left: postDropdownState.x,
            width: POST_DROPDOWN_WIDTH,
          },
        ]}
      >
        {isCurrentUserPost ? (
          <>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleEditPost(post)}
            >
              <View style={styles.actionIconCircle}>
                <Ionicons name="create-outline" size={13} color="#fff" />
              </View>
              <Text style={styles.menuText}>Edit Post</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => requestDeletePost(post.id)}
            >
              <View style={styles.deleteIconCircle}>
                <Ionicons name="trash-outline" size={13} color="#fff" />
              </View>
              <Text style={styles.menuText}>Delete Post</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleHidePost(post.id)}
          >
            <View style={styles.hideIconCircle}>
              <Ionicons name="eye-off" size={13} color="#fff" />
            </View>
            <Text style={styles.menuText}>Hide</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        if (
          !modalVisible &&
          !answersModalVisible &&
          !editPostModalVisible &&
          !editAnswerModalVisible &&
          !deletePostConfirmVisible &&
          !deleteAnswerConfirmVisible &&
          !postDropdownState &&
          !answerDropdownState
        ) {
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
          visible={!!postDropdownState}
          transparent
          animationType="fade"
          onRequestClose={closePostDropdown}
        >
          <TouchableWithoutFeedback onPress={closePostDropdown}>
            <View style={styles.dropdownOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View>{renderPostDropdownContent()}</View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal
          visible={editPostModalVisible}
          transparent
          animationType="fade"
          onRequestClose={handleCloseEditPostModal}
        >
          <TouchableWithoutFeedback onPress={handleCloseEditPostModal}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.editPostModalCard}>
                  <View style={styles.answerModalHeader}>
                    <Text style={styles.answerModalTitle}>Edit Post</Text>
                    <TouchableOpacity onPress={handleCloseEditPostModal}>
                      <Ionicons name="close" size={22} color="#333" />
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={styles.answerInput}
                    placeholder="Edit your post"
                    placeholderTextColor="#999"
                    multiline
                    value={editPostText}
                    onChangeText={setEditPostText}
                    textAlignVertical="top"
                  />

                  <TouchableOpacity
                    style={styles.postAnswerButton}
                    onPress={handleSaveEditedPost}
                  >
                    <Text style={styles.postAnswerButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal
          visible={editAnswerModalVisible}
          transparent
          animationType="fade"
          onRequestClose={handleCloseEditAnswerModal}
        >
          <TouchableWithoutFeedback onPress={handleCloseEditAnswerModal}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.editPostModalCard}>
                  <View style={styles.answerModalHeader}>
                    <Text style={styles.answerModalTitle}>Edit Answer</Text>
                    <TouchableOpacity onPress={handleCloseEditAnswerModal}>
                      <Ionicons name="close" size={22} color="#333" />
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={styles.answerInput}
                    placeholder="Edit your answer"
                    placeholderTextColor="#999"
                    multiline
                    value={editAnswerText}
                    onChangeText={setEditAnswerText}
                    textAlignVertical="top"
                  />

                  <TouchableOpacity
                    style={styles.postAnswerButton}
                    onPress={handleSaveEditedAnswer}
                  >
                    <Text style={styles.postAnswerButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal
          visible={deletePostConfirmVisible}
          transparent
          animationType="fade"
          onRequestClose={cancelDeletePost}
        >
          <TouchableWithoutFeedback onPress={cancelDeletePost}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.confirmModalCard}>
                  <Text style={styles.confirmTitle}>Delete Post</Text>
                  <Text style={styles.confirmMessage}>
                    Are you sure you want to delete this post?
                  </Text>

                  <View style={styles.confirmActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={cancelDeletePost}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={confirmDeletePost}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal
          visible={deleteAnswerConfirmVisible}
          transparent
          animationType="fade"
          onRequestClose={cancelDeleteAnswer}
        >
          <TouchableWithoutFeedback onPress={cancelDeleteAnswer}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.confirmModalCard}>
                  <Text style={styles.confirmTitle}>Delete Answer</Text>
                  <Text style={styles.confirmMessage}>
                    Are you sure you want to delete this answer?
                  </Text>

                  <View style={styles.confirmActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={cancelDeleteAnswer}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={confirmDeleteAnswer}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal
          visible={answersModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeAnswersModal}
        >
          <TouchableWithoutFeedback
            onPress={() => {
              closeAnswerDropdown();
              closeAnswersModal();
            }}
          >
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
                        keyboardShouldPersistTaps="handled"
                      >
                        {visibleAnswers.length > 0 ? (
                          visibleAnswers.map((answer) => (
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

                                  <TouchableOpacity
                                    onPress={(event) => openAnswerDropdown(event, answer)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                  >
                                    <Ionicons
                                      name="ellipsis-vertical"
                                      size={18}
                                      color="#555"
                                    />
                                  </TouchableOpacity>
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

              {answerDropdownState && (
                <TouchableWithoutFeedback onPress={closeAnswerDropdown}>
                  <View style={styles.answerDropdownOverlay}>
                    <TouchableWithoutFeedback onPress={() => {}}>
                      <View
                        style={[
                          styles.answerDropdownFloating,
                          {
                            top: answerDropdownState.y,
                            left: answerDropdownState.x,
                          },
                        ]}
                      >
                        {answerDropdownState.answer.userName === userName ? (
                          <>
                            <TouchableOpacity
                              style={styles.menuItem}
                              onPress={() => {
                                const latestAnswer = selectedPost?.answers.find(
                                  (item) => item.id === answerDropdownState.answer.id
                                );
                                if (latestAnswer) {
                                  handleEditAnswer(latestAnswer);
                                }
                              }}
                            >
                              <View style={styles.actionIconCircle}>
                                <Ionicons name="create-outline" size={13} color="#fff" />
                              </View>
                              <Text style={styles.menuText}>Edit Answer</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.menuItem}
                              onPress={() => requestDeleteAnswer(answerDropdownState.answer.id)}
                            >
                              <View style={styles.deleteIconCircle}>
                                <Ionicons name="trash-outline" size={13} color="#fff" />
                              </View>
                              <Text style={styles.menuText}>Delete Answer</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => handleHideAnswer(answerDropdownState.answer.id)}
                          >
                            <View style={styles.hideIconCircle}>
                              <Ionicons name="eye-off" size={13} color="#fff" />
                            </View>
                            <Text style={styles.menuText}>Hide</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </TouchableWithoutFeedback>
              )}
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
    flex: 1,
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

  postContent: {
    color: '#333',
    marginVertical: 8,
  },

  showAnswersBtn: {
    color: '#1976d2',
    fontWeight: '400',
  },

  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  dropdownMenuModal: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 6,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  actionIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  deleteIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
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

  editPostModalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
  },

  confirmModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 20,
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

  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 10,
  },

  confirmMessage: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 18,
  },

  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },

  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },

  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },

  deleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#D32F2F',
  },

  deleteButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },

  answerDropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99998,
    elevation: 99998,
  },

  answerDropdownFloating: {
    position: 'absolute',
    width: ANSWER_DROPDOWN_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 6,
    zIndex: 99999,
    elevation: 99999,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});

export default Community;