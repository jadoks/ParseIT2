import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Image,
  Keyboard,
  Modal,
  Pressable,
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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import PostQueryModal from '../components/PostQueryModal';
import { CommunityAnswer, CommunityPost } from './Community';

type CropType = 'profile' | 'banner';

declare global {
  var __PROFILE_CROP_RESULT__:
    | {
        uri: string;
        type: CropType;
        ts: number;
      }
    | undefined;
}

interface ProfileProps {
  userPosts: CommunityPost[];
  onCreatePost?: (query: string) => void;
  onAddAnswer?: (postId: string, message: string) => void;
  userName?: string;
  userEmail?: string;
  profileImage: any;
  bannerImage: any;
  onChangeProfileImage: (image: any) => void;
  onChangeBannerImage: (image: any) => void;
}

const DEFAULT_AVATAR = require('../../assets/images/pogi.jpg');

const Profile: React.FC<ProfileProps> = ({
  userPosts,
  onCreatePost,
  onAddAnswer,
  userName = 'Jade Lisondra',
  userEmail = 'jadelisondra101@gmail.com',
  profileImage,
  bannerImage,
  onChangeProfileImage,
  onChangeBannerImage,
}) => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 1000;

  const [queryModalVisible, setQueryModalVisible] = useState(false);
  const [editMenuVisible, setEditMenuVisible] = useState(false);

  const [menuVisibleFor, setMenuVisibleFor] = useState<string | null>(null);
  const [hiddenPosts, setHiddenPosts] = useState<string[]>([]);

  const [answersModalVisible, setAnswersModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [localPosts, setLocalPosts] = useState<CommunityPost[]>(userPosts);
  const [answerText, setAnswerText] = useState('');

  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
  });

  const editBtnRef = useRef<View | null>(null);
  const lastAppliedCropTs = useRef<number | null>(null);

  React.useEffect(() => {
    setLocalPosts(userPosts);
  }, [userPosts]);

  const selectedPost = useMemo(
    () => localPosts.find((post) => post.id === selectedPostId) || null,
    [localPosts, selectedPostId]
  );

  useFocusEffect(
    useCallback(() => {
      const result = globalThis.__PROFILE_CROP_RESULT__;

      if (!result?.uri) return;
      if (lastAppliedCropTs.current === result.ts) return;

      if (result.type === 'profile') {
        onChangeProfileImage({ uri: result.uri });
      } else {
        onChangeBannerImage({ uri: result.uri });
      }

      lastAppliedCropTs.current = result.ts;
      globalThis.__PROFILE_CROP_RESULT__ = undefined;
    }, [onChangeBannerImage, onChangeProfileImage])
  );

  const openEditMenu = () => {
    if (editBtnRef.current && 'measureInWindow' in editBtnRef.current) {
      (editBtnRef.current as any).measureInWindow(
        (x: number, y: number, _btnWidth: number, btnHeight: number) => {
          setMenuPosition({
            top: y + btnHeight + 8,
            left: x,
          });
          setEditMenuVisible(true);
        }
      );
    }
  };

  const pickFile = async (type: CropType) => {
    try {
      setEditMenuVisible(false);
      globalThis.__PROFILE_CROP_RESULT__ = undefined;

      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const selected = result.assets?.[0];
      if (!selected?.uri) return;

      router.push({
        pathname: '/CropScreen',
        params: {
          imageUri: selected.uri,
          cropType: type,
        },
      });
    } catch (error) {
      console.log('Picker error:', error);
    }
  };

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
      avatar: profileImage?.uri ? { uri: profileImage.uri } : profileImage || DEFAULT_AVATAR,
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

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        if (!queryModalVisible && !answersModalVisible) {
          setMenuVisibleFor(null);
          Keyboard.dismiss();
        }
      }}
    >
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.bannerContainer}>
            <Image source={bannerImage} style={styles.banner} />
          </View>

          <View
            style={[
              styles.profileInfo,
              !isLargeScreen && { paddingHorizontal: 10 },
              isLargeScreen && { alignSelf: 'center', maxWidth: 600 },
            ]}
          >
            <Image source={profileImage} style={styles.avatar} />

            <View style={styles.nameContainer}>
              <Text style={styles.name}>{userName}</Text>
              <Text style={styles.email}>{userEmail}</Text>

              <View ref={editBtnRef} collapsable={false}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={openEditMenu}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons
                    name="pencil"
                    size={14}
                    color="#D32F2F"
                  />
                  <Text style={styles.editText}> Edit Profile </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View
            style={[
              styles.askContainer,
              !isLargeScreen && { paddingHorizontal: 10 },
              isLargeScreen && { alignSelf: 'center', maxWidth: 600 },
            ]}
          >
            <Image source={profileImage} style={styles.smallAvatar} />

            <TouchableOpacity
              style={styles.askInput}
              onPress={() => setQueryModalVisible(true)}
            >
              <Text style={styles.askText}>Have a question, {userName}?</Text>
            </TouchableOpacity>
          </View>

          {localPosts
            .filter((post) => !hiddenPosts.includes(post.id))
            .map((post) => (
              <View
                key={post.id}
                style={[
                  styles.postCard,
                  isLargeScreen && { alignSelf: 'center', maxWidth: 600 },
                ]}
              >
                <View style={styles.postHeader}>
                  <View style={styles.userRow}>
                    <Image
                      source={post.avatar || profileImage}
                      style={styles.postAvatar}
                    />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.postName}>{post.userName}</Text>
                      <Text style={styles.postTime}>{post.dateTime}</Text>
                    </View>
                  </View>

                  <View style={{ position: 'relative' }}>
                    <TouchableOpacity
                      onPress={() =>
                        setMenuVisibleFor(
                          menuVisibleFor === post.id ? null : post.id
                        )
                      }
                    >
                      <Ionicons
                        name="ellipsis-vertical"
                        size={20}
                        color="#333"
                      />
                    </TouchableOpacity>

                    {menuVisibleFor === post.id && (
                      <View style={styles.dropdownPostMenu}>
                        <TouchableOpacity
                          style={styles.menuItem}
                          onPress={() => {
                            setHiddenPosts((prev) => [...prev, post.id]);
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

                <Text style={styles.postText}>{post.content}</Text>

                <TouchableOpacity onPress={() => openAnswersModal(post)}>
                  <Text style={styles.answerLink}>
                    View {post.answers.length} Answer(s)
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
        </ScrollView>

        <Modal
          visible={editMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setEditMenuVisible(false)}
        >
          <Pressable
            style={styles.dropdownOverlay}
            onPress={() => setEditMenuVisible(false)}
          >
            <View
              style={[
                styles.dropdownMenu,
                {
                  top: menuPosition.top,
                  left: menuPosition.left,
                },
              ]}
            >
              <Text style={styles.dropdownTitle}>Choose Option</Text>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => pickFile('profile')}
              >
                <MaterialCommunityIcons
                  name="account-edit"
                  size={18}
                  color="#000"
                  style={styles.dropdownIcon}
                />
                <Text style={styles.dropdownText}>Avatar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => pickFile('banner')}
              >
                <MaterialCommunityIcons
                  name="image-edit"
                  size={18}
                  color="#000"
                  style={styles.dropdownIcon}
                />
                <Text style={styles.dropdownText}>Banner</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

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
                  <View style={styles.answersModalHeader}>
                    <Text style={styles.answersModalTitle}>Answers</Text>
                    <TouchableOpacity onPress={closeAnswersModal}>
                      <Ionicons name="close" size={22} color="#333" />
                    </TouchableOpacity>
                  </View>

                  {selectedPost && (
                    <>
                      <Text style={styles.selectedPostText}>
                        {selectedPost.content}
                      </Text>

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
                                    source={answer.avatar}
                                    style={styles.answerAvatar}
                                  />
                                  <View style={{ marginLeft: 8, flex: 1 }}>
                                    <Text style={styles.answerUserName}>
                                      {answer.userName}
                                    </Text>
                                    <Text style={styles.answerDate}>
                                      {answer.answeredAt}
                                    </Text>
                                  </View>
                                </View>
                              </View>

                              <Text style={styles.answerPreviewText}>
                                {answer.message}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.noAnswersText}>
                            No answers yet.
                          </Text>
                        )}
                      </ScrollView>

                      <View style={styles.answerInputSection}>
                        <Text style={styles.answerInputLabel}>
                          Write an answer
                        </Text>
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
                          <Text style={styles.postAnswerButtonText}>
                            Post Answer
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <PostQueryModal
          visible={queryModalVisible}
          onClose={() => setQueryModalVisible(false)}
          onPost={onCreatePost}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
  },

  bannerContainer: {
    alignItems: 'center',
    marginTop: 20,
  },

  banner: {
    width: '100%',
    maxWidth: 800,
    height: 150,
    borderRadius: 6,
  },

  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -15,
    alignSelf: 'center',
    maxWidth: 800,
    width: '100%',
  },

  avatar: {
    width: 95,
    height: 95,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFF',
    marginRight: 15,
    marginTop: -20,
  },

  nameContainer: {
    justifyContent: 'center',
    marginTop: 20,
  },

  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },

  email: {
    color: '#666',
    marginTop: 4,
  },

  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#F4DCDC',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },

  editText: {
    color: '#D32F2F',
    fontWeight: '600',
  },

  divider: {
    height: 1,
    backgroundColor: '#DDD',
    marginVertical: 25,
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
  },

  askContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 800,
  },

  smallAvatar: {
    width: 35,
    height: 35,
    borderRadius: 20,
    marginRight: 12,
  },

  askInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#D32F2F',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    justifyContent: 'center',
  },

  askText: {
    color: '#999',
  },

  postCard: {
    borderRadius: 16,
    borderLeftWidth: 5,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#D32F2F',
    padding: 18,
    width: '100%',
    backgroundColor: '#fff',
    marginBottom: 14,
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
    width: 35,
    height: 35,
    borderRadius: 20,
  },

  postName: {
    fontWeight: '700',
    color: '#111',
  },

  postTime: {
    fontSize: 12,
    color: '#777',
  },

  postText: {
    marginTop: 8,
    fontSize: 15,
    color: '#333',
  },

  answerLink: {
    color: '#1976d2',
    marginTop: 8,
    fontSize: 13,
    fontWeight: '400',
  },

  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  dropdownMenu: {
    position: 'absolute',
    width: 230,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  dropdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    color: '#333',
  },

  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAEAEA',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 12,
  },

  dropdownIcon: {
    marginRight: 8,
  },

  dropdownText: {
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
  },

  dropdownPostMenu: {
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

  answersModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  answersModalTitle: {
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

export default Profile;