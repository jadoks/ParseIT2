import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import PostQueryModal from '../components/PostQueryModal';

const Profile = () => {

  const { width } = useWindowDimensions();
  const isLargeScreen = width > 1000;

  const [queryModalVisible, setQueryModalVisible] = useState(false);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
      >

        {/* Banner */}
        <View style={styles.bannerContainer}>
          <Image
            source={require('../../assets/images/venti_bg.png')}
            style={styles.banner}
          />
        </View>

        {/* Profile Info */}
        <View
          style={[
            styles.profileInfo,
            !isLargeScreen && { paddingHorizontal: 10 },
            isLargeScreen && { alignSelf: 'center', maxWidth: 600 }
          ]}
        >

          <Image
            source={require('../../assets/images/pogi.jpg')}
            style={styles.avatar}
          />

          <View style={styles.nameContainer}>
            <Text style={styles.name}>Jade M. Lisondra</Text>
            <Text style={styles.email}>jadelisondra101@gmail.com</Text>

            <TouchableOpacity style={styles.editBtn}>
              <MaterialCommunityIcons name="pencil" size={14} color="#D32F2F" />
              <Text style={styles.editText}> Edit Avatar</Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Question Input */}
        <View
          style={[
            styles.askContainer,
            !isLargeScreen && { paddingHorizontal: 10 },
            isLargeScreen && { alignSelf: 'center', maxWidth: 600 }
          ]}
        >

          <Image
            source={require('../../assets/images/pogi.jpg')}
            style={styles.smallAvatar}
          />

          {/* Trigger Modal */}
          <TouchableOpacity
            style={styles.askInput}
            onPress={() => setQueryModalVisible(true)}
          >
            <Text style={{ color: '#999' }}>
              Have a question, Jade?
            </Text>
          </TouchableOpacity>

        </View>

        {/* Post Card */}
        <View
          style={[
            styles.postCard,
            isLargeScreen && { alignSelf: 'center', maxWidth: 600 }
          ]}
        >

          <View style={styles.postHeader}>
            <Image
              source={require('../../assets/images/pogi.jpg')}
              style={styles.postAvatar}
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.postName}>Jade Lisondra</Text>
              <Text style={styles.postTime}>Feb 23, 2026 11:30 AM</Text>
            </View>

            <MaterialCommunityIcons name="dots-vertical" size={20} color="#333" />
          </View>

          <Text style={styles.postText}>
            Is anyone attending the workshop tomorrow?
          </Text>

          <TouchableOpacity>
            <Text style={styles.answerLink}>View 2 Answer(s)</Text>
          </TouchableOpacity>

        </View>

      </ScrollView>

      {/* Query Modal */}
      <PostQueryModal
        visible={queryModalVisible}
        onClose={() => setQueryModalVisible(false)}
      />
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

  postCard: {
    borderRadius: 16,
    borderLeftWidth: 5,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#D32F2F',
    padding: 18,
    width: '100%',
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

});

export default Profile;