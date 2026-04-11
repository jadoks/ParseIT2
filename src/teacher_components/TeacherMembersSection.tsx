import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { Member } from './TeacherCourseDetail2';

type Props = {
  members: Member[];
  memberIdInput: string;
  setMemberIdInput: (value: string) => void;
  onBack: () => void;
  onAddMember: () => void;
  onRemoveMember: () => void;
  onOpenSubmission: () => void;
};

const TeacherMembersSection = ({
  members,
  memberIdInput,
  setMemberIdInput,
  onBack,
  onAddMember,
  onRemoveMember,
  onOpenSubmission,
}: Props) => {
  const { width } = useWindowDimensions();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1200;
  const isLargeScreen = width >= 1200;

  const pagePadding = isMobile ? 14 : isTablet ? 20 : 24;
  const cardWidth = isMobile ? '100%' : isLargeScreen ? '48.8%' : '48.5%';

  return (
    <SafeAreaView style={styles.container}>
      <View
        style={[
          styles.membersHeader,
          {
            paddingHorizontal: pagePadding,
            paddingTop: isMobile ? 16 : 20,
            paddingBottom: isMobile ? 12 : 16,
          },
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={isMobile ? 30 : 35}
            color="#000"
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.membersTitle,
            { fontSize: isMobile ? 24 : isTablet ? 28 : 32 },
          ]}
          numberOfLines={1}
        >
          Members
        </Text>
      </View>

      <View
        style={[
          styles.membersActionRow,
          {
            paddingHorizontal: pagePadding,
            marginBottom: 20,
          },
        ]}
      >
        <TextInput
          style={styles.idInput}
          placeholder="Enter Student ID"
          placeholderTextColor="#999"
          value={memberIdInput}
          onChangeText={setMemberIdInput}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.plusBtn} onPress={onAddMember}>
          <Text style={styles.btnText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.minusBtn} onPress={onRemoveMember}>
          <Text style={styles.btnText}>-</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: pagePadding, paddingBottom: 30 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {members.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[
              styles.studentCardWide,
              {
                width: cardWidth,
                minHeight: isMobile ? 108 : 115,
              },
            ]}
            onPress={onOpenSubmission}
            activeOpacity={0.85}
          >
            <View style={styles.studentRedAccent} />
            <View
              style={[
                styles.studentInfo,
                {
                  paddingHorizontal: isMobile ? 14 : 18,
                  paddingVertical: isMobile ? 14 : 16,
                },
              ]}
            >
              <View style={styles.studentTopRow}>
                <Text style={styles.studentId}>{m.id}</Text>
                <Text style={styles.studentHandle}>{m.handle}</Text>
              </View>
              <Text style={styles.studentName}>{m.name}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default TeacherMembersSection;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },

  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backBtn: {
    marginRight: 8,
    padding: 2,
  },

  membersTitle: {
    fontWeight: '700',
    color: '#111',
    flex: 1,
    marginLeft: 6,
  },

  membersActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  idInput: {
    flex: 1,
    height: 45,
    borderWidth: 1.5,
    borderColor: '#666',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#222',
    backgroundColor: '#FFF',
  },

  plusBtn: {
    backgroundColor: '#C62828',
    width: 45,
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  minusBtn: {
    backgroundColor: '#C62828',
    width: 45,
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  btnText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },

  scrollContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },

  studentCardWide: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ECECEC',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    overflow: 'hidden',
    marginBottom: 2,
  },

  studentRedAccent: {
    width: 4,
    backgroundColor: '#C62828',
  },

  studentInfo: {
    flex: 1,
    justifyContent: 'center',
  },

  studentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  studentId: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },

  studentHandle: {
    fontSize: 12,
    color: '#BBB',
  },

  studentName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#444',
    marginTop: 5,
  },
});