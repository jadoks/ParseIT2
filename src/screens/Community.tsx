import React, { useState } from 'react';
import {
  FlatList,
  Image,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PostQueryModal from '../components/PostQueryModal';

interface Post {
  id: string;
  userName: string;
  avatar: any;
  dateTime: string;
  content: string;
  answers: string[];
}

interface CommunityProps {
  userName?: string;
}

const samplePosts: Post[] = [
  {
    id: '1',
    userName: 'Ramcee Bading',
    avatar: require('../../assets/images/default_profile.png'),
    dateTime: 'Feb 24, 2026 10:30 AM',
    content: 'How do I solve this programming problem?',
    answers: ['You can use a loop', 'Check your variables'],
  },
  {
    id: '2',
    userName: 'Abai Clipord',
    avatar: require('../../assets/images/default_profile.png'),
    dateTime: 'Feb 23, 2026 2:15 PM',
    content: 'Is anyone attending the workshop tomorrow?',
    answers: ['Yes, I will be there', 'Count me in!'],
  },
];

const Community: React.FC<CommunityProps> = ({
  userName = 'Jade',
}) => {
  const [showAnswersFor, setShowAnswersFor] = useState<string | null>(null);
  const [menuVisibleFor, setMenuVisibleFor] = useState<string | null>(null);
  const [hiddenPosts, setHiddenPosts] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  const renderPost = ({ item }: { item: Post }) => {
    const showAnswers = showAnswersFor === item.id;

    return (
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <View style={styles.userRow}>
            <Image source={item.avatar} style={styles.postAvatar} />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.postUserName}>{item.userName}</Text>
              <Text style={styles.postDateTime}>{item.dateTime}</Text>
            </View>
          </View>

          <View style={{ position: 'relative' }}>
            <TouchableOpacity
              onPress={() =>
                setMenuVisibleFor(
                  menuVisibleFor === item.id ? null : item.id
                )
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

        {item.answers.length > 0 && (
          <TouchableOpacity
            onPress={() =>
              setShowAnswersFor(showAnswers ? null : item.id)
            }
          >
            <Text style={styles.showAnswersBtn}>
              {showAnswers
                ? 'Hide Answers'
                : `View ${item.answers.length} Answer(s)`}
            </Text>
          </TouchableOpacity>
        )}

        {showAnswers && (
          <View style={styles.answersContainer}>
            {item.answers.map((ans, index) => (
              <Text key={index} style={styles.answerText}>
                • {ans}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        setMenuVisibleFor(null);
        Keyboard.dismiss();
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
                source={require('../../assets/images/default_profile.png')}
                style={styles.inputAvatar}
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
              data={samplePosts.filter(post => !hiddenPosts.includes(post.id))}
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

  answersContainer: {
    marginTop: 6,
    paddingLeft: 8,
  },

  answerText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
});

export default Community;