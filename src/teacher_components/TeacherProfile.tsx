import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import { CommunityPost } from './TeacherCommunity';

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
  onCreatePost?: () => void;
  onBack: () => void;
  onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({
  userPosts,
  onCreatePost,
  onBack,
  onLogout,
}) => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 1000;

  const [editMenuVisible, setEditMenuVisible] = useState(false);
  const [answersModalVisible, setAnswersModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

  const [profileImage, setProfileImage] = useState<any>(
    require('../../assets/images/avatar.jpg')
  );
  const [bannerImage, setBannerImage] = useState<any>(
    require('../../assets/images/venti_bg.png')
  );

  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
  });

  const editBtnRef = useRef<View | null>(null);
  const lastAppliedCropTs = useRef<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      const result = globalThis.__PROFILE_CROP_RESULT__;

      if (!result?.uri) return;
      if (lastAppliedCropTs.current === result.ts) return;

      if (result.type === 'profile') {
        setProfileImage({ uri: result.uri });
      } else {
        setBannerImage({ uri: result.uri });
      }

      lastAppliedCropTs.current = result.ts;
      globalThis.__PROFILE_CROP_RESULT__ = undefined;
    }, [])
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
        pathname: '/CropScreen' as any,
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
    setSelectedPost(post);
    setAnswersModalVisible(true);
  };

  const closeAnswersModal = () => {
    setSelectedPost(null);
    setAnswersModalVisible(false);
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
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
            <Text style={styles.name}>Ramcee Jade L. Munoz</Text>
            <Text style={styles.email}>ludoviceramceejademunoz@gmail.com</Text>

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
            onPress={onCreatePost}
          >
            <Text style={styles.askText}>Have a question, Jade?</Text>
          </TouchableOpacity>
        </View>

        {userPosts.map((post) => (
          <View
            key={post.id}
            style={[
              styles.postCard,
              isLargeScreen && { alignSelf: 'center', maxWidth: 600 },
            ]}
          >
            <View style={styles.postHeader}>
              <Image source={profileImage} style={styles.postAvatar} />

              <View style={{ flex: 1 }}>
                <Text style={styles.postName}>{post.userName}</Text>
                <Text style={styles.postTime}>{post.dateTime}</Text>
              </View>

              <MaterialCommunityIcons
                name="dots-vertical"
                size={20}
                color="#333"
              />
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
                    <MaterialCommunityIcons name="close" size={22} color="#333" />
                  </TouchableOpacity>
                </View>

                {selectedPost && (
                  <>
                    <Text style={styles.selectedPostText}>{selectedPost.content}</Text>

                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.modalAnswersContainer}
                    >
                      {selectedPost.answers.length > 0 ? (
                        selectedPost.answers.map((answer) => (
                          <View key={answer.id} style={styles.answerCard}>
                            <View style={styles.answerHeader}>
                              <Image source={answer.avatar} style={styles.answerAvatar} />
                              <View style={{ marginLeft: 10, flex: 1 }}>
                                <Text style={styles.answerName}>{answer.userName}</Text>
                                <Text style={styles.answerDate}>{answer.answeredAt}</Text>
                              </View>
                            </View>

                            <Text style={styles.answerMessage}>{answer.message}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noAnswerText}>No answers yet.</Text>
                      )}
                    </ScrollView>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
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
    alignItems: 'center',
    marginBottom: 10,
  },
  postAvatar: {
    width: 35,
    height: 35,
    borderRadius: 20,
    marginRight: 10,
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
    color: '#2962FF',
    marginTop: 8,
    fontSize: 13,
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
    maxHeight: '80%',
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
  },
  answersModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  answersModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  selectedPostText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 14,
    lineHeight: 22,
  },
  modalAnswersContainer: {
    gap: 12,
  },
  answerCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  answerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  answerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },
  answerDate: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  answerMessage: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
  },
  noAnswerText: {
    color: '#777',
    fontSize: 14,
  },
});

export default Profile;