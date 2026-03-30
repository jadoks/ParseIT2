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

  const isSmallPhone = width < 380;
  const isPhone = width < 768;
  const isLargeScreen = width > 1000;

  const horizontalPadding = isSmallPhone ? 12 : isPhone ? 16 : 20;
  const contentMaxWidth = isLargeScreen ? 600 : 800;

  const bannerHeight = isSmallPhone ? 128 : isPhone ? 140 : 150;
  const avatarSize = isSmallPhone ? 84 : isPhone ? 92 : 95;
  const avatarBorderWidth = isSmallPhone ? 3 : 4;

  const [queryModalVisible, setQueryModalVisible] = useState(false);
  const [editMenuVisible, setEditMenuVisible] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);

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
    if (isPickingImage) return;

    if (editBtnRef.current && 'measureInWindow' in editBtnRef.current) {
      (editBtnRef.current as any).measureInWindow(
        (x: number, y: number, _btnWidth: number, btnHeight: number) => {
          const menuWidth = isSmallPhone ? 200 : 230;
          const safeLeft = Math.max(
            horizontalPadding,
            Math.min(x, width - menuWidth - horizontalPadding)
          );

          setMenuPosition({
            top: y + btnHeight + 8,
            left: safeLeft,
          });
          setEditMenuVisible(true);
        }
      );
    }
  };

  const pickFile = async (type: CropType) => {
    if (isPickingImage) return;

    try {
      setIsPickingImage(true);
      setEditMenuVisible(false);
      globalThis.__PROFILE_CROP_RESULT__ = undefined;

      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        return;
      }

      const selected = result.assets?.[0];
      if (!selected?.uri) {
        return;
      }

      setTimeout(() => {
        router.push({
          pathname: '/CropScreen',
          params: {
            imageUri: selected.uri,
            cropType: type,
          },
        });
      }, 60);
    } catch (error) {
      console.log('Picker error:', error);
    } finally {
      setTimeout(() => {
        setIsPickingImage(false);
      }, 250);
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
      avatar: profileImage?.uri
        ? { uri: profileImage.uri }
        : profileImage || DEFAULT_AVATAR,
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
        if (!queryModalVisible && !answersModalVisible && !isPickingImage) {
          setMenuVisibleFor(null);
          Keyboard.dismiss();
        }
      }}
    >
      <View style={{ flex: 1 }}>
        <ScrollView
          style={[styles.container, { paddingHorizontal: horizontalPadding }]}
          contentContainerStyle={{ paddingBottom: isSmallPhone ? 28 : 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.bannerContainer, { marginTop: isSmallPhone ? 14 : 20 }]}>
            <Image
              source={bannerImage}
              style={[
                styles.banner,
                {
                  height: bannerHeight,
                  borderRadius: isSmallPhone ? 10 : 6,
                },
              ]}
              resizeMode="cover"
            />
          </View>

          <View
            style={[
              styles.profileInfo,
              { marginTop: isSmallPhone ? -10 : -15 },
              !isLargeScreen && { paddingHorizontal: isSmallPhone ? 4 : 10 },
              isLargeScreen && { alignSelf: 'center', maxWidth: contentMaxWidth },
            ]}
          >
            <View
              style={[
                styles.avatarOuter,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                  borderWidth: avatarBorderWidth,
                  marginRight: isSmallPhone ? 12 : 15,
                  marginTop: isSmallPhone ? -14 : -20,
                },
              ]}
            >
              <Image
                source={profileImage}
                style={[
                  styles.avatarImage,
                  {
                    width: avatarSize - avatarBorderWidth * 2,
                    height: avatarSize - avatarBorderWidth * 2,
                    borderRadius: (avatarSize - avatarBorderWidth * 2) / 2,
                  },
                ]}
                resizeMode="cover"
              />
            </View>

            <View
              style={[
                styles.nameContainer,
                { marginTop: isSmallPhone ? 14 : 20, flex: 1 },
              ]}
            >
              <Text
                style={[
                  styles.name,
                  { fontSize: isSmallPhone ? 18 : isPhone ? 20 : 22 },
                ]}
                numberOfLines={1}
              >
                {userName}
              </Text>

              <Text
                style={[
                  styles.email,
                  { fontSize: isSmallPhone ? 13 : 14 },
                ]}
                numberOfLines={1}
              >
                {userEmail}
              </Text>

              <View ref={editBtnRef} collapsable={false}>
                <TouchableOpacity
                  style={[
                    styles.editBtn,
                    {
                      marginTop: isSmallPhone ? 8 : 10,
                      paddingHorizontal: isSmallPhone ? 12 : 15,
                      paddingVertical: isSmallPhone ? 7 : 6,
                      borderRadius: isSmallPhone ? 8 : 6,
                    },
                    isPickingImage && styles.editBtnDisabled,
                  ]}
                  onPress={openEditMenu}
                  activeOpacity={0.85}
                  disabled={isPickingImage}
                >
                  <MaterialCommunityIcons
                    name="pencil"
                    size={isSmallPhone ? 13 : 14}
                    color="#D32F2F"
                  />
                  <Text
                    style={[
                      styles.editText,
                      { fontSize: isSmallPhone ? 13 : 14 },
                    ]}
                  >
                    {isPickingImage ? ' Opening...' : ' Edit Profile '}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.divider,
              { marginVertical: isSmallPhone ? 20 : 25 },
            ]}
          />

          <View
            style={[
              styles.askContainer,
              !isLargeScreen && { paddingHorizontal: isSmallPhone ? 4 : 10 },
              isLargeScreen && { alignSelf: 'center', maxWidth: contentMaxWidth },
            ]}
          >
            <Image
              source={profileImage}
              style={[
                styles.smallAvatar,
                {
                  width: isSmallPhone ? 32 : 35,
                  height: isSmallPhone ? 32 : 35,
                  borderRadius: isSmallPhone ? 16 : 20,
                  marginRight: isSmallPhone ? 10 : 12,
                },
              ]}
              resizeMode="cover"
            />

            <TouchableOpacity
              style={[
                styles.askInput,
                {
                  paddingHorizontal: isSmallPhone ? 14 : 18,
                  paddingVertical: isSmallPhone ? 9 : 10,
                },
              ]}
              onPress={() => setQueryModalVisible(true)}
            >
              <Text
                style={[styles.askText, { fontSize: isSmallPhone ? 13 : 14 }]}
                numberOfLines={1}
              >
                Have a question, {userName}?
              </Text>
            </TouchableOpacity>
          </View>

          {localPosts
            .filter((post) => !hiddenPosts.includes(post.id))
            .map((post) => (
              <View
                key={post.id}
                style={[
                  styles.postCard,
                  {
                    padding: isSmallPhone ? 14 : 18,
                    borderRadius: isSmallPhone ? 14 : 16,
                    marginBottom: isSmallPhone ? 12 : 14,
                  },
                  isLargeScreen && { alignSelf: 'center', maxWidth: contentMaxWidth },
                ]}
              >
                <View style={styles.postHeader}>
                  <View style={styles.userRow}>
                    <Image
                      source={post.avatar || profileImage}
                      style={[
                        styles.postAvatar,
                        {
                          width: isSmallPhone ? 32 : 35,
                          height: isSmallPhone ? 32 : 35,
                          borderRadius: isSmallPhone ? 16 : 20,
                        },
                      ]}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text
                        style={[
                          styles.postName,
                          { fontSize: isSmallPhone ? 15 : 16 },
                        ]}
                        numberOfLines={1}
                      >
                        {post.userName}
                      </Text>
                      <Text
                        style={[
                          styles.postTime,
                          { fontSize: isSmallPhone ? 11 : 12 },
                        ]}
                        numberOfLines={1}
                      >
                        {post.dateTime}
                      </Text>
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
                      <View
                        style={[
                          styles.dropdownPostMenu,
                          { right: isSmallPhone ? 0 : 15 },
                        ]}
                      >
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

                <Text
                  style={[
                    styles.postText,
                    {
                      fontSize: isSmallPhone ? 14 : 15,
                      lineHeight: isSmallPhone ? 21 : 23,
                    },
                  ]}
                >
                  {post.content}
                </Text>

                <TouchableOpacity onPress={() => openAnswersModal(post)}>
                  <Text
                    style={[
                      styles.answerLink,
                      { fontSize: isSmallPhone ? 12 : 13 },
                    ]}
                  >
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
                  width: isSmallPhone ? 200 : 230,
                  paddingVertical: isSmallPhone ? 12 : 14,
                  paddingHorizontal: isSmallPhone ? 12 : 14,
                },
              ]}
            >
              <Text
                style={[
                  styles.dropdownTitle,
                  { fontSize: isSmallPhone ? 16 : 18, marginBottom: isSmallPhone ? 10 : 12 },
                ]}
              >
                Choose Option
              </Text>

              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  { paddingVertical: isSmallPhone ? 10 : 12 },
                ]}
                onPress={() => pickFile('profile')}
                disabled={isPickingImage}
              >
                <MaterialCommunityIcons
                  name="account-edit"
                  size={18}
                  color="#000"
                  style={styles.dropdownIcon}
                />
                <Text
                  style={[
                    styles.dropdownText,
                    { fontSize: isSmallPhone ? 15 : 16 },
                  ]}
                >
                  Avatar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  { paddingVertical: isSmallPhone ? 10 : 12, marginBottom: 0 },
                ]}
                onPress={() => pickFile('banner')}
                disabled={isPickingImage}
              >
                <MaterialCommunityIcons
                  name="image-edit"
                  size={18}
                  color="#000"
                  style={styles.dropdownIcon}
                />
                <Text
                  style={[
                    styles.dropdownText,
                    { fontSize: isSmallPhone ? 15 : 16 },
                  ]}
                >
                  Banner
                </Text>
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
            <View
              style={[
                styles.modalOverlay,
                { paddingHorizontal: isSmallPhone ? 14 : 20 },
              ]}
            >
              <TouchableWithoutFeedback onPress={() => {}}>
                <View
                  style={[
                    styles.answersModalCard,
                    { padding: isSmallPhone ? 14 : 18 },
                  ]}
                >
                  <View style={styles.answersModalHeader}>
                    <Text
                      style={[
                        styles.answersModalTitle,
                        { fontSize: isSmallPhone ? 17 : 18 },
                      ]}
                    >
                      Answers
                    </Text>
                    <TouchableOpacity onPress={closeAnswersModal}>
                      <Ionicons name="close" size={22} color="#333" />
                    </TouchableOpacity>
                  </View>

                  {selectedPost && (
                    <>
                      <Text
                        style={[
                          styles.selectedPostText,
                          {
                            fontSize: isSmallPhone ? 14 : 15,
                            lineHeight: isSmallPhone ? 20 : 22,
                          },
                        ]}
                      >
                        {selectedPost.content}
                      </Text>

                      <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.modalAnswersContainer}
                        style={[
                          styles.answersScroll,
                          { maxHeight: isSmallPhone ? 220 : 260 },
                        ]}
                      >
                        {selectedPost.answers.length > 0 ? (
                          selectedPost.answers.map((answer) => (
                            <View key={answer.id} style={styles.answerCard}>
                              <View style={styles.answerPreviewHeader}>
                                <View style={styles.userRow}>
                                  <Image
                                    source={answer.avatar}
                                    style={[
                                      styles.answerAvatar,
                                      {
                                        width: isSmallPhone ? 28 : 30,
                                        height: isSmallPhone ? 28 : 30,
                                        borderRadius: isSmallPhone ? 14 : 15,
                                      },
                                    ]}
                                    resizeMode="cover"
                                  />
                                  <View style={{ marginLeft: 8, flex: 1 }}>
                                    <Text
                                      style={[
                                        styles.answerUserName,
                                        { fontSize: isSmallPhone ? 13 : 14 },
                                      ]}
                                    >
                                      {answer.userName}
                                    </Text>
                                    <Text
                                      style={[
                                        styles.answerDate,
                                        { fontSize: isSmallPhone ? 11 : 12 },
                                      ]}
                                    >
                                      {answer.answeredAt}
                                    </Text>
                                  </View>
                                </View>
                              </View>

                              <Text
                                style={[
                                  styles.answerPreviewText,
                                  {
                                    fontSize: isSmallPhone ? 13 : 14,
                                    lineHeight: isSmallPhone ? 18 : 20,
                                  },
                                ]}
                              >
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
                        <Text
                          style={[
                            styles.answerInputLabel,
                            { fontSize: isSmallPhone ? 13 : 14 },
                          ]}
                        >
                          Write an answer
                        </Text>
                        <TextInput
                          style={[
                            styles.answerInput,
                            {
                              minHeight: isSmallPhone ? 84 : 90,
                              fontSize: isSmallPhone ? 13 : 14,
                            },
                          ]}
                          placeholder="Type your answer here"
                          placeholderTextColor="#999"
                          multiline
                          value={answerText}
                          onChangeText={setAnswerText}
                          textAlignVertical="top"
                        />
                        <TouchableOpacity
                          style={[
                            styles.postAnswerButton,
                            {
                              paddingHorizontal: isSmallPhone ? 14 : 16,
                              paddingVertical: isSmallPhone ? 9 : 10,
                            },
                          ]}
                          onPress={handlePostAnswer}
                        >
                          <Text
                            style={[
                              styles.postAnswerButtonText,
                              { fontSize: isSmallPhone ? 13 : 14 },
                            ]}
                          >
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
  },

  bannerContainer: {
    alignItems: 'center',
  },

  banner: {
    width: '100%',
    maxWidth: 800,
  },

  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: 800,
    width: '100%',
  },

  avatarOuter: {
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderColor: '#FFF',
  },

  avatarImage: {
    overflow: 'hidden',
  },

  nameContainer: {
    justifyContent: 'center',
  },

  name: {
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
    backgroundColor: '#F4DCDC',
    alignSelf: 'flex-start',
  },

  editBtnDisabled: {
    opacity: 0.7,
  },

  editText: {
    color: '#D32F2F',
    fontWeight: '600',
  },

  divider: {
    height: 1,
    backgroundColor: '#DDD',
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
    overflow: 'hidden',
  },

  askInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#D32F2F',
    borderRadius: 25,
    backgroundColor: '#FFF',
    justifyContent: 'center',
  },

  askText: {
    color: '#999',
  },

  postCard: {
    borderLeftWidth: 5,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#D32F2F',
    width: '100%',
    backgroundColor: '#fff',
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
    overflow: 'hidden',
  },

  postName: {
    fontWeight: '700',
    color: '#111',
  },

  postTime: {
    color: '#777',
  },

  postText: {
    marginTop: 8,
    color: '#333',
  },

  answerLink: {
    color: '#1976d2',
    marginTop: 8,
    fontWeight: '400',
  },

  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  dropdownMenu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  dropdownTitle: {
    fontWeight: '700',
    textAlign: 'center',
    color: '#333',
  },

  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAEAEA',
    borderRadius: 8,
    marginBottom: 12,
  },

  dropdownIcon: {
    marginRight: 8,
  },

  dropdownText: {
    color: '#222',
    fontWeight: '500',
  },

  dropdownPostMenu: {
    position: 'absolute',
    marginTop: -10,
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
  },

  answersModalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    backgroundColor: '#FFF',
    borderRadius: 18,
  },

  answersModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  answersModalTitle: {
    fontWeight: '700',
    color: '#222',
  },

  selectedPostText: {
    color: '#333',
    marginBottom: 16,
  },

  answersScroll: {},

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
    overflow: 'hidden',
  },

  answerUserName: {
    fontWeight: '700',
    color: '#222',
  },

  answerDate: {
    color: '#777',
  },

  answerPreviewText: {
    color: '#555',
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
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },

  answerInput: {
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#222',
    backgroundColor: '#FFF',
  },

  postAnswerButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#D32F2F',
    borderRadius: 8,
  },

  postAnswerButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
});

export default Profile;