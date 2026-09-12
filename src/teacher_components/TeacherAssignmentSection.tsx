import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FONT_BODY, FONT_TITLE, WEIGHT_TITLE } from '../theme/typography';
import type { Assignment } from './TeacherCourseDetail2';

type Props = {
  assignments: Assignment[];
  onCreate: () => void;
  onOpenMembers: (id: string) => void;
};

// Mirrors parseDueDateTime() in TeacherCourseDetail2.tsx — dueDate is stored
// as "YYYY-MM-DD HH:mm" (or date-only), so this turns it back into a Date
// we can compare against "now" to know if the assignment is past due.
const parseDueDateTime = (value?: string) => {
  if (!value?.trim()) return null;
  const normalized = value.trim().replace(' ', 'T');
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const dateOnly = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
      23,
      59
    );
  }
  return null;
};

const isPastDue = (dueDate?: string) => {
  const due = parseDueDateTime(dueDate);
  if (!due) return false;
  return due.getTime() < Date.now();
};

// Display-only: renders the raw "YYYY-MM-DD HH:mm" (24-hour) dueDate as
// "YYYY-MM-DD hh:mm AM/PM" — matches formatDueDateForDisplay in
// Assignments.tsx so the due date/time reads the same 12-hour way for
// teachers and students. Falls back to the raw string if it can't be
// parsed, so nothing breaks on an unexpected format.
const formatDueDateForDisplay = (dueDate?: string) => {
  if (!dueDate?.trim()) return '';
  const parsed = parseDueDateTime(dueDate);
  if (!parsed) return dueDate;
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const datePart = `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
  const hour24 = parsed.getHours();
  const meridiem = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  const timePart = `${pad2(hour12)}:${pad2(parsed.getMinutes())} ${meridiem}`;
  return `${datePart} ${timePart}`;
};

// "Closed" means students can no longer act on the assignment:
// - Regular (file/link) assignments only close once BOTH the due date has
//   passed AND the teacher turned on "disable repository after due" —
//   matches isSubmissionLocked() on the student side.
// - Game-based assignments have no such toggle; students are always
//   blocked from playing once the due date passes (see
//   getPlayGameBlockedReason() in Assignments.tsx), so these close on due
//   date alone.
const isAssignmentClosed = (item: Assignment) => {
  if (!isPastDue(item.dueDate)) return false;
  return item.assignmentType === 'game_based' ? true : !!item.repositoryDisabledAfterDue;
};

const TeacherAssignmentSection = ({
  assignments,
  onCreate,
  onOpenMembers,
}: Props) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1200;
  
  const containerPadding = isMobile ? 16 : isTablet ? 40 : 80;
  const cardPaddingHorizontal = isMobile ? 14 : isTablet ? 22 : 38;

  const renderAssignmentItem = ({ item }: { item: Assignment }) => {
    const closed = isAssignmentClosed(item);

    return (
    <TouchableOpacity
      style={[
        styles.assignmentCard,
        { paddingHorizontal: cardPaddingHorizontal },
      ]}
      activeOpacity={0.85}
      onPress={() => onOpenMembers(item.id)}
    >
      <View style={styles.assignmentHeader}>
        <View style={styles.assignmentInfo}>
          <Text style={styles.assignmentTitle}>{item.header}</Text>
          {!!item.instruction && (
            <Text style={styles.assignmentTopicText} numberOfLines={2}>
              {item.instruction}
            </Text>
          )}
        </View>

        <View style={[styles.statusBadge, closed && styles.statusBadgeClosed]}>
          <Text style={[styles.statusText, closed && styles.statusTextClosed]}>
            {closed ? 'Closed' : 'Open'}
          </Text>
        </View>
      </View>

      <View style={styles.assignmentFooter}>
        <Text style={styles.dueDateText}>
          Due: {item.dueDate ? formatDueDateForDisplay(item.dueDate) : 'No due date'}
        </Text>

        <Text style={styles.pointsText}>
          Score: {item.totalScore || '0'}
        </Text>
      </View>

      {!!item.fileName && (
        <Text style={styles.relatedPreviewText} numberOfLines={1}>
          File: {item.fileName}
        </Text>
      )}

      {item.assignmentType !== 'game_based' && (
        <View style={styles.recommendationBadge}>
          <Text style={styles.recommendationText}>
            {item.repositoryDisabledAfterDue
              ? 'Repository disabled after due'
              : 'Open submissions'}
          </Text>
        </View>
      )}

      {/* NEW: Game-Based Badge */}
      {!!item.assignmentType && item.assignmentType === 'game_based' && (
        <View style={styles.gameBadge}>
          <Ionicons name="game-controller" size={12} color="#2E7D32" style={{ marginRight: 4 }} />
          <Text style={styles.gameBadgeText}>
            {item.gameType === 'quiz_master' ? 'Quiz Master' : 
             item.gameType === 'memory_match' ? 'Memory Match' :
             item.gameType === 'fill_in_blanks' ? 'Fill-in-Blanks' :
             item.gameType === 'flashcard' ? 'Flashcard' : 'Boss Battle'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
    );
  };

  return (
  <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
    <View style={styles.topActionRow}>
      <TouchableOpacity style={styles.createButton} onPress={onCreate}>
        <Ionicons name="add" size={18} color="#FFF" />
        <Text style={styles.createButtonText}>Create Assignment</Text>
      </TouchableOpacity>
    </View>
    {assignments.length > 0 ? (
      <View style={{ paddingBottom: hp('10') }}>
        {assignments.map((item, index) => (
          <View key={item.id} style={index > 0 ? { marginTop: 12 } : undefined}>
            {renderAssignmentItem({ item })}
          </View>
        ))}
      </View>
    ) : (
      <Text style={styles.emptyText}>No assignments yet</Text>
    )}
  </View>
);
};

export default TeacherAssignmentSection;

const styles = StyleSheet.create({
  container: { paddingVertical: hp('2'), backgroundColor: '#ffffff' },
  topActionRow: { marginBottom: hp('1.5'), alignItems: 'flex-start' },
  createButton: { backgroundColor: '#D32F2F', borderRadius: 16, minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  createButtonText: { fontFamily: FONT_BODY, color: '#FFF', fontWeight: '700', fontSize: 13 },
  assignmentCard: { borderWidth: 1, borderColor: '#E6E6E6', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  assignmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  assignmentInfo: { flex: 1, marginRight: 8 },
  assignmentTitle: { fontFamily: FONT_TITLE, fontSize: 16, fontWeight: WEIGHT_TITLE, color: '#000', marginBottom: 4 },
  assignmentTopicText: { fontFamily: FONT_BODY, color: '#444', fontSize: 12, fontWeight: '600', marginTop: 4, lineHeight: 18 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: '#FDECEC' },
  statusText: { fontFamily: FONT_BODY, fontWeight: '700', fontSize: 12, color: '#D32F2F' },
  statusBadgeClosed: { backgroundColor: '#EEEEEE' },
  statusTextClosed: { color: '#666666' },
  assignmentFooter: { borderTopWidth: 1, borderTopColor: '#E6E6E6', paddingTop: 8 },
  dueDateText: { fontFamily: FONT_BODY, color: '#D32F2F', fontWeight: '600', fontSize: 13, marginBottom: 4 },
  pointsText: { fontFamily: FONT_BODY, fontSize: 12, color: '#666', fontWeight: '600' },
  relatedPreviewText: { fontFamily: FONT_BODY, fontSize: 12, color: '#666', marginTop: 8, lineHeight: 18 },
  recommendationBadge: { marginTop: 10, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start', backgroundColor: '#FFF1F1' },
  recommendationText: { fontFamily: FONT_BODY, fontSize: 12, fontWeight: '700', color: '#D32F2F' },
  emptyText: { fontFamily: FONT_BODY, textAlign: 'center', color: '#777', marginTop: 20, fontSize: 14 },
  // NEW STYLES FOR GAME BADGE
  gameBadge: {
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  gameBadgeText: { fontFamily: FONT_BODY,
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
  },
});