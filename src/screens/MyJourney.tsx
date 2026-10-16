import React from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { FONT_BODY, FONT_TITLE, WEIGHT_EMPHASIS, WEIGHT_TITLE } from '../theme/typography';
import Prospectus from './Prospectus';

type CurrentStudent = {
  studentId: string;
  firstName: string;
  lastName: string;
  email?: string;
};

type MyJourneyProps = {
  courses?: any[]; // Kept for prop compatibility, but no longer used
  searchQuery?: string; // Kept for prop compatibility, but no longer used
  currentStudent: CurrentStudent;
  studentName?: string;
  apiBaseUrl: string;
};

// My Journey now shows a single view: the program Prospectus, which already lists
// every subject with its grade and status, so a separate per-semester record
// would only repeat the same information.
const MyJourney = ({ currentStudent, studentName, apiBaseUrl }: MyJourneyProps) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;
  const isLargeScreen = width >= 1100;

  const resolvedStudentName =
    studentName || `${currentStudent?.firstName || ''} ${currentStudent?.lastName || ''}`.trim() || 'Student';

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        isTablet && styles.containerTablet,
        isMobile && styles.containerMobile,
        isLargeScreen && styles.containerLarge,
      ]}
      style={styles.screen}
    >
      <View style={[styles.pageHeaderCard, isMobile && styles.pageHeaderCardMobile]}>
        <View style={styles.pageHeaderAccent} />
        <View style={styles.pageHeaderContent}>
          <Text style={styles.pageEyebrow}>Academic Record</Text>
          <Text style={styles.pageTitle}>My Journey</Text>
          <Text style={styles.pageSubtitle}>
            Track your curriculum progress and grades, based on your uploaded grade file.
          </Text>
        </View>
      </View>

      <Prospectus currentStudent={currentStudent} studentName={resolvedStudentName} apiBaseUrl={apiBaseUrl} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7FB' },
  container: { width: '100%', maxWidth: 1280, alignSelf: 'center', padding: 24, paddingBottom: 44 },
  containerTablet: { paddingHorizontal: 20 },
  containerMobile: { padding: 14, paddingBottom: 28 },
  containerLarge: { paddingHorizontal: 150 },
  pageHeaderCard: { backgroundColor: '#FFFFFF', borderRadius: 22, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  pageHeaderAccent: { height: 8, backgroundColor: '#8B0000' },
  pageHeaderContent: { paddingHorizontal: 22, paddingVertical: 20 },
  pageHeaderCardMobile: { borderRadius: 18, marginBottom: 14 },
  pageEyebrow: { fontSize: 12, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, color: '#8B0000', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 6 },
  pageTitle: { fontSize: 30, fontWeight: WEIGHT_TITLE, fontFamily: FONT_TITLE, color: '#111827', marginBottom: 6 },
  pageSubtitle: { fontSize: 14, color: '#6B7280', lineHeight: 21, fontFamily: FONT_BODY },
});

export default MyJourney;