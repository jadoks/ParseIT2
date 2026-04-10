import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { Assignment } from './TeacherCourseDetail2';

type Props = {
  assignments: Assignment[];
  onCreate: () => void;
  onOpenMembers: (id: string) => void;
};

const TeacherAssignmentSection = ({
  assignments,
  onCreate,
  onOpenMembers,
}: Props) => {
  const { width } = useWindowDimensions();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1200;
  const isLargeScreen = width >= 1200;

  const pagePadding = isMobile ? 14 : isTablet ? 20 : 24;
  const cardWidth = isMobile ? '100%' : isLargeScreen ? '48.8%' : '48.5%';

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { paddingHorizontal: pagePadding, paddingTop: 18, paddingBottom: 30 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        style={[
          styles.createBtn,
          {
            paddingHorizontal: isMobile ? 16 : 18,
            paddingVertical: isMobile ? 11 : 12,
            borderRadius: 14,
            marginBottom: isMobile ? 18 : 22,
          },
        ]}
        onPress={onCreate}
      >
        <Text style={styles.createBtnText}>+ Create Assignment</Text>
      </TouchableOpacity>

      <View style={styles.assignmentGrid}>
        {assignments.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.assignmentCard,
              {
                width: cardWidth,
                minHeight: isMobile ? 172 : 185,
              },
            ]}
            activeOpacity={0.85}
            onPress={() => onOpenMembers(item.id)}
          >
            <View style={styles.redLeftAccent} />

            <View
              style={[
                styles.cardContent,
                {
                  paddingHorizontal: isMobile ? 14 : 16,
                  paddingVertical: isMobile ? 14 : 16,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBackground,
                  {
                    width: isMobile ? 48 : 52,
                    height: isMobile ? 48 : 52,
                    borderRadius: 12,
                    marginRight: isMobile ? 12 : 14,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="clipboard-text-outline"
                  size={isMobile ? 26 : 30}
                  color="#000"
                />
              </View>

              <View style={styles.assignmentInfo}>
                <Text
                  style={[
                    styles.assignmentHeader,
                    { fontSize: isMobile ? 16 : 17 },
                  ]}
                  numberOfLines={2}
                >
                  {item.header}
                </Text>

                <Text
                  style={[
                    styles.assignmentInstruction,
                    { fontSize: isMobile ? 12 : 13 },
                  ]}
                  numberOfLines={2}
                >
                  {item.instruction}
                </Text>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Posted:</Text>
                  <Text style={styles.metaValue}>{item.posted}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Due:</Text>
                  <Text style={styles.metaValue}>{item.dueDate}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Total Score:</Text>
                  <Text style={styles.metaValue}>{item.totalScore}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Points On Time:</Text>
                  <Text style={styles.metaValue}>{item.pointsOnTime}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Repository:</Text>
                  <Text
                    style={[
                      styles.metaValue,
                      item.repositoryDisabledAfterDue
                        ? styles.disabledText
                        : styles.enabledText,
                    ]}
                  >
                    {item.repositoryDisabledAfterDue
                      ? 'Disabled after due'
                      : 'Enabled'}
                  </Text>
                </View>

                {!!item.fileName && (
                  <Text style={styles.fileText} numberOfLines={1}>
                    File: {item.fileName}
                  </Text>
                )}

                <View style={styles.openRow}>
                  <MaterialCommunityIcons
                    name="account-group-outline"
                    size={16}
                    color="#D32F2F"
                  />
                  <Text style={styles.openHint}>Open submissions</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

export default TeacherAssignmentSection;

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 30,
  },

  createBtn: {
    backgroundColor: '#D32F2F',
    alignSelf: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  createBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },

  assignmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
    width: '100%',
  },

  assignmentCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 18,
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

  redLeftAccent: {
    width: 4,
    backgroundColor: '#D32F2F',
  },

  cardContent: {
    flex: 1,
    flexDirection: 'row',
  },

  iconBackground: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },

  assignmentInfo: {
    flex: 1,
  },

  assignmentHeader: {
    fontWeight: '700',
    color: '#222',
    lineHeight: 22,
  },

  assignmentInstruction: {
    color: '#555',
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 18,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 3,
  },

  metaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginRight: 4,
  },

  metaValue: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },

  enabledText: {
    color: '#2E7D32',
    fontWeight: '700',
  },

  disabledText: {
    color: '#D32F2F',
    fontWeight: '700',
  },

  fileText: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 8,
    fontWeight: '600',
  },

  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  openHint: {
    fontSize: 12,
    color: '#D32F2F',
    marginLeft: 6,
    fontWeight: '700',
  },
});