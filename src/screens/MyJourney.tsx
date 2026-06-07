import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

const apiFetch = (url: string, options: any = {}) =>
  fetch(url, {
    credentials: 'include',
    ...options,
  });

type CurrentStudent = {
  studentId: string;
  firstName: string;
  lastName: string;
  email?: string;
};

type ParsedGrade = {
  subjectCode: string | null;
  subjectTitle: string | null;
  units: number | null;
  grade: string | null;
};

type MyJourneyProps = {
  courses?: any[]; // Kept for prop compatibility, but no longer used
  searchQuery?: string;
  currentStudent: CurrentStudent;
  studentName?: string;
  apiBaseUrl: string;
};

const SEMS = [
  '1st Semester',
  '2nd Semester'
];

const getDefaultStartYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return String(currentMonth >= 6 ? currentYear : currentYear - 1);
};

const MyJourney = ({
  searchQuery = '',
  currentStudent,
  studentName,
  apiBaseUrl,
}: MyJourneyProps) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;

  const [startYearInput, setStartYearInput] = useState(() => getDefaultStartYear());
  const [sem, setSem] = useState(SEMS[0]);
  const [show, setShow] = useState(false);

  // State for AI-parsed uploaded grades
  const [uploadedGrades, setUploadedGrades] = useState<ParsedGrade[]>([]);
  const [isLoadingUploadedGrades, setIsLoadingUploadedGrades] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [hasFetchedGrade, setHasFetchedGrade] = useState(false);

  const startYearNumber = Number(startYearInput);
  const hasValidStartYear = Number.isInteger(startYearNumber) && startYearInput.length === 4;
  const computedSchoolYear = hasValidStartYear ? `${startYearNumber}-${startYearNumber + 1}` : '';
  
  const totalUnits = uploadedGrades.reduce((total, g) => total + (Number(g.units) || 0), 0);
  const resolvedStudentName =
    studentName || `${currentStudent?.firstName || ''} ${currentStudent?.lastName || ''}`.trim() || 'Student';

  const handleStartYearChange = (value: string) => {
    const digitsOnly = value.replace(/[^0-9]/g, '').slice(0, 4);
    setStartYearInput(digitsOnly);
    setShow(false);
  };

  // Fetch and parse uploaded grade file when "Generate Record" is clicked
  useEffect(() => {
    if (!show || !apiBaseUrl || !currentStudent?.studentId) {
      setUploadedGrades([]);
      setUploadedFileName(null);
      setHasFetchedGrade(false);
      return;
    }

    let cancelled = false;

    
    const parseUploadedGrade = async () => {
      try {
        setIsLoadingUploadedGrades(true);
        setHasFetchedGrade(false);
        
        // Build query parameters for the AI to filter by
        const params = new URLSearchParams();
        if (computedSchoolYear) params.append('schoolYear', computedSchoolYear);
        if (sem) params.append('semester', sem);
        
        const response = await apiFetch(`${apiBaseUrl}/student-grade/parse/${currentStudent.studentId}?${params.toString()}`);
        const data = await response.json();

        console.log(
          "PARSED GRADE RESPONSE =>",
          JSON.stringify(data, null, 2)
        );

        if (!cancelled) {
          if (response.ok && data.success && Array.isArray(data.data) && data.data.length > 0) {
            setUploadedGrades(data.data);
            setUploadedFileName(data.fileName || null);
          } else {
            setUploadedGrades([]);
            setUploadedFileName(null);
          }
          setHasFetchedGrade(true);
        }
      } catch (error) {
        console.log('PARSE UPLOADED GRADE ERROR =>', error);
        if (!cancelled) {
          setUploadedGrades([]);
          setUploadedFileName(null);
          setHasFetchedGrade(true);
        }
      } finally {
        if (!cancelled) setIsLoadingUploadedGrades(false);
      }
    };

    parseUploadedGrade();
    return () => { cancelled = true; };
  }, [apiBaseUrl, currentStudent?.studentId, show]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        isTablet && styles.containerTablet,
        isMobile && styles.containerMobile,
      ]}
      style={styles.screen}
    >
      <View style={[styles.pageHeaderCard, isMobile && styles.pageHeaderCardMobile]}>
        <View style={styles.pageHeaderAccent} />
        <View style={styles.pageHeaderContent}>
          <Text style={styles.pageEyebrow}>Academic Record</Text>
          <Text style={styles.pageTitle}>My Journey</Text>
          <Text style={styles.pageSubtitle}>
            Generate your official academic record from your uploaded grade file.
          </Text>
        </View>
      </View>

      <View style={[styles.filterCard, isMobile && styles.filterCardMobile]}>
        <View style={[styles.filterHeaderRow, isMobile && styles.filterHeaderRowMobile]}>
          <View>
            <Text style={styles.filterTitle}>Record Filters</Text>
            <Text style={styles.filterSubtitle}>Enter the school year start and select a semester.</Text>
          </View>
          <View style={styles.schoolYearBadge}>
            <Text style={styles.schoolYearBadgeLabel}>School Year</Text>
            <Text style={styles.schoolYearBadgeValue}>
              {hasValidStartYear ? computedSchoolYear : '---- - ----'}
            </Text>
          </View>
        </View>

        <View style={[styles.controlsRow, isTablet && styles.controlsRowTablet, isMobile && styles.controlsRowMobile]}>
          <View style={[styles.selectWrap, isTablet && styles.selectWrapTablet, isMobile && styles.selectWrapMobile]}>
            <Text style={styles.selectLabel}>Academic Year Start</Text>
            <View style={styles.inputShell}>
              <TextInput
                value={startYearInput}
                onChangeText={handleStartYearChange}
                placeholder="2025"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={4}
                style={styles.textInput}
              />
              <Text style={styles.inputSuffix}>+ 1 year</Text>
            </View>
            <Text style={styles.helperText}>
              {hasValidStartYear ? `Automatically becomes S.Y. ${computedSchoolYear}.` : 'Enter a valid 4-digit start year.'}
            </Text>
          </View>

          <View style={[styles.selectWrap, isTablet && styles.selectWrapTablet, isMobile && styles.selectWrapMobile]}>
            <Text style={styles.selectLabel}>Semester</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={sem}
                onValueChange={(itemValue) => { setSem(itemValue); setShow(false); }}
                style={styles.picker}
              >
                {SEMS.map((s) => (<Picker.Item key={s} label={s} value={s} />))}
              </Picker>
            </View>
            <Text style={styles.helperText}>Select the semester for your record.</Text>
          </View>

          <TouchableOpacity
            style={[styles.showBtn, isTablet && styles.showBtnTablet, isMobile && styles.showBtnMobile, !hasValidStartYear && styles.showBtnDisabled]}
            onPress={() => hasValidStartYear && setShow(true)}
            disabled={!hasValidStartYear}
            activeOpacity={0.85}
          >
            <Text style={styles.showBtnText}>Generate Record</Text>
          </TouchableOpacity>
        </View>
      </View>

      {show && (
        <View style={[styles.paper, isTablet && styles.paperTablet, isMobile && styles.paperMobile]}>
          <Image source={require('../../assets/images/myjourney-header-template-1.png')} style={styles.headerImage} />

          <View style={styles.academicTitleBlock}>
            <Text style={styles.documentTitle}>Academic Journey Record</Text>

          </View>

          <View style={styles.studentInfoBox}>
            <View style={[styles.infoLine, isMobile && styles.infoLineMobile]}>
              <View style={styles.infoLineItem}>
                <Text style={styles.infoLabel}>Student ID</Text>
                <Text style={styles.infoValue}>{currentStudent?.studentId || 'N/A'}</Text>
              </View>
              <View style={styles.infoLineItemWide}>
                <Text style={styles.infoLabel}>Student Name</Text>
                <Text style={styles.infoValue}>{resolvedStudentName}</Text>
              </View>
            </View>
            <View style={[styles.infoLine, isMobile && styles.infoLineMobile]}>
              <View style={styles.infoLineItem}>
                <Text style={styles.infoLabel}>School Year</Text>
                <Text style={styles.infoValue}>S.Y. {computedSchoolYear}</Text>
              </View>
              <View style={styles.infoLineItemWide}>
                <Text style={styles.infoLabel}>Semester</Text>
                <Text style={styles.infoValue}>{sem}</Text>
              </View>
            </View>
          </View>

          {isLoadingUploadedGrades ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#D32F2F" />
              <Text style={styles.loadingText}>AI is extracting grades from uploaded file...</Text>
            </View>
          ) : hasFetchedGrade && uploadedGrades.length > 0 ? (
            <>
              <View style={styles.uploadedSourceBadge}>
                <Text style={styles.uploadedSourceText}>Source: {uploadedFileName || 'Uploaded Grade File'}</Text>
              </View>
              {isMobile ? (
                <View style={styles.mobileCourseList}>
                  {uploadedGrades.map((item, index) => (
                    <View key={index} style={styles.mobileCourseCard}>
                      <View style={styles.mobileCourseHeader}>
                        <View>
                          <Text style={styles.mobileCourseIndex}>Subject {index + 1}</Text>
                          <Text style={styles.mobileCourseCode}>{item.subjectCode || 'N/A'}</Text>
                        </View>
                        <View style={styles.mobileGradeBadge}>
                          <Text style={styles.mobileGradeLabel}>Grade</Text>
                          <Text style={styles.mobileGradeValue}>{item.grade || 'N/A'}</Text>
                        </View>
                      </View>
                      <Text style={styles.mobileCourseName}>{item.subjectTitle || 'Unknown Subject'}</Text>
                      <View style={styles.mobileCourseMetaRow}>
                        <View style={styles.mobileMetaItem}>
                          <Text style={styles.mobileMetaLabel}>Units</Text>
                          <Text style={styles.mobileMetaValue}>{item.units || '-'}</Text>
                        </View>
                        <View style={styles.mobileMetaItem}>
                          <Text style={styles.mobileMetaLabel}>Remarks</Text>
                          <Text style={styles.mobileMetaValue}>{item.grade ? 'Passed' : 'Pending'}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.tableWrap}>
                  <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.tdSubject, styles.th]}>Subject Code</Text>
                    <Text style={[styles.tdDescription, styles.th]}>Descriptive Title</Text>
                    <Text style={[styles.tdSmall, styles.th]}>Units</Text>
                    <Text style={[styles.tdSmall, styles.th, styles.lastCell]}>Final Grade</Text>
                  </View>
                  {uploadedGrades.map((item, index) => (
                    <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                      <Text style={styles.tdSubject}>{item.subjectCode || 'N/A'}</Text>
                      <Text style={styles.tdDescription}>{item.subjectTitle || 'Unknown Subject'}</Text>
                      <Text style={styles.tdSmall}>{item.units || '-'}</Text>
                      <Text style={[styles.tdSmall, styles.lastCell]}>{item.grade || 'N/A'}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : hasFetchedGrade ? (
            <View style={[styles.emptyState, styles.emptyStateBordered]}>
              <Text style={styles.emptyTitle}>No Uploaded Grade Yet</Text>
              <Text style={styles.emptyText}>
                Please upload your grade file from the menu to generate your academic record.
              </Text>
            </View>
          ) : null}

          {hasFetchedGrade && uploadedGrades.length > 0 && (
            <View style={[styles.summaryPanel, isMobile && styles.summaryPanelMobile]}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Subjects</Text>
                <Text style={styles.summaryValue}>{uploadedGrades.length}</Text>
              </View>
              <View style={[styles.summaryItem, styles.summaryItemLast]}>
                <Text style={styles.summaryLabel}>Total Units</Text>
                <Text style={styles.summaryValue}>{totalUnits || '-'}</Text>
              </View>
            </View>
          )}

          <View style={[styles.footerNoteRow, isMobile && styles.footerNoteRowMobile]}>
            <Text style={styles.footerNote}>Generated from uploaded grade file via AI.</Text>
          </View>

        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { width: '100%', maxWidth: 1280, alignSelf: 'center', padding: 24, paddingBottom: 44 },
  containerTablet: { paddingHorizontal: 20 },
  containerMobile: { padding: 14, paddingBottom: 28 },
  pageHeaderCard: { backgroundColor: '#FFFFFF', borderRadius: 22, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  pageHeaderAccent: { height: 8, backgroundColor: '#D32F2F' },
  pageHeaderContent: { paddingHorizontal: 22, paddingVertical: 20 },
  pageHeaderCardMobile: { borderRadius: 18, marginBottom: 14 },
  pageEyebrow: { fontSize: 12, fontWeight: '900', color: '#D32F2F', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 6 },
  pageTitle: { fontSize: 30, fontWeight: '900', color: '#111827', marginBottom: 6 },
  pageSubtitle: { fontSize: 14, color: '#6B7280', lineHeight: 21 },
  filterCard: { backgroundColor: '#FFFFFF', borderRadius: 22, borderWidth: 1, borderColor: '#E5E7EB', padding: 18, marginBottom: 22, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  filterCardMobile: { borderRadius: 18, padding: 14, marginBottom: 18 },
  filterHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingBottom: 16, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filterHeaderRowMobile: { alignItems: 'flex-start', flexDirection: 'column' },
  filterTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  filterSubtitle: { marginTop: 4, fontSize: 13, color: '#6B7280' },
  schoolYearBadge: { minWidth: 170, borderRadius: 16, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', paddingHorizontal: 14, paddingVertical: 10 },
  schoolYearBadgeLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8, color: '#991B1B', textTransform: 'uppercase', marginBottom: 3 },
  schoolYearBadgeValue: { fontSize: 16, fontWeight: '900', color: '#D32F2F' },
  controlsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' },
  controlsRowTablet: { gap: 12 },
  controlsRowMobile: { flexDirection: 'column' },
  selectWrap: { flex: 1, minWidth: 220 },
  selectWrapTablet: { minWidth: 260 },
  selectWrapMobile: { width: '100%', minWidth: 0 },
  selectLabel: { color: '#374151', marginBottom: 8, fontWeight: '900', fontSize: 13 },
  inputShell: { height: 54, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  textInput: { flex: 1, height: 54, paddingHorizontal: 16, fontSize: 16, fontWeight: '800', color: '#111827', backgroundColor: '#FFFFFF' },
  inputSuffix: { height: '100%', paddingHorizontal: 14, textAlignVertical: 'center', color: '#6B7280', fontSize: 12, fontWeight: '800', borderLeftWidth: 1, borderLeftColor: '#E5E7EB' },
  helperText: { marginTop: 7, color: '#6B7280', fontSize: 12 },
  pickerWrapper: { height: 54, overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', justifyContent: 'center' },
  picker: { height: 54, width: '100%', color: '#111827' },
  showBtn: { minWidth: 170, height: 54, backgroundColor: '#D32F2F', paddingHorizontal: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 25, shadowColor: '#D32F2F', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  showBtnTablet: { flexGrow: 1, minWidth: 220 },
  showBtnMobile: { width: '100%', marginTop: 2 },
  showBtnDisabled: { backgroundColor: '#C9C9C9', shadowOpacity: 0 },
  showBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  paper: { backgroundColor: '#fff', paddingHorizontal: 28, paddingVertical: 26, borderRadius: 8, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  paperTablet: { paddingHorizontal: 22 },
  paperMobile: { paddingHorizontal: 14, paddingVertical: 18 },
  headerImage: { width: '100%', height: 96, resizeMode: 'contain', marginBottom: 8 },
  academicTitleBlock: { alignItems: 'center', paddingBottom: 14, marginBottom: 16, borderBottomWidth: 2, borderBottomColor: '#222' },
  documentTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 1.2, color: '#111827', textAlign: 'center', textTransform: 'uppercase' },
  documentSubtitle: { marginTop: 4, fontSize: 13, fontWeight: '700', color: '#6B7280', textAlign: 'center' },
  studentInfoBox: { borderWidth: 1, borderColor: '#D1D5DB', marginBottom: 18 },
  infoLine: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  infoLineMobile: { flexDirection: 'column' },
  infoLineItem: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, borderRightWidth: 1, borderRightColor: '#E5E7EB' },
  infoLineItemWide: { flex: 1.5, paddingHorizontal: 12, paddingVertical: 10 },
  infoLabel: { color: '#6B7280', fontWeight: '800', marginBottom: 4, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  infoValue: { fontSize: 15, fontWeight: '800', color: '#111827' },
  tableWrap: { marginTop: 4, borderWidth: 1, borderColor: '#111827', overflow: 'hidden' },
  tableRow: { flexDirection: 'row', minHeight: 46, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#D1D5DB' },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  tableHeader: { backgroundColor: '#F3F4F6', borderBottomColor: '#111827' },
  tdSubject: { flex: 1, fontSize: 13, color: '#111827', paddingHorizontal: 10, paddingVertical: 12, borderRightWidth: 1, borderRightColor: '#D1D5DB' },
  tdDescription: { flex: 2.5, fontSize: 13, color: '#111827', paddingHorizontal: 10, paddingVertical: 12, borderRightWidth: 1, borderRightColor: '#D1D5DB' },
  tdSmall: { flex: 0.7, fontSize: 13, color: '#111827', textAlign: 'center', paddingHorizontal: 8, paddingVertical: 12, borderRightWidth: 1, borderRightColor: '#D1D5DB' },
  lastCell: { borderRightWidth: 0 },
  th: { fontWeight: '900', color: '#111827', fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase' },
  mobileCourseList: { gap: 12 },
  mobileCourseCard: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, backgroundColor: '#FFFFFF', padding: 14 },
  mobileCourseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  mobileCourseIndex: { fontSize: 10, color: '#991B1B', fontWeight: '900', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 3 },
  mobileCourseCode: { fontSize: 17, color: '#111827', fontWeight: '900' },
  mobileGradeBadge: { minWidth: 78, borderRadius: 14, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center' },
  mobileGradeLabel: { fontSize: 10, color: '#991B1B', fontWeight: '900', textTransform: 'uppercase', marginBottom: 2 },
  mobileGradeValue: { fontSize: 15, color: '#111827', fontWeight: '900' },
  mobileCourseName: { fontSize: 14, lineHeight: 20, color: '#374151', fontWeight: '700', marginBottom: 12 },
  mobileCourseMetaRow: { flexDirection: 'row', gap: 10 },
  mobileMetaItem: { flex: 1, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 9 },
  mobileMetaLabel: { fontSize: 10, color: '#6B7280', fontWeight: '900', textTransform: 'uppercase', marginBottom: 2 },
  mobileMetaValue: { fontSize: 13, color: '#111827', fontWeight: '900' },
  emptyStateBordered: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16 },
  emptyState: { padding: 20, alignItems: 'center', backgroundColor: '#FFF' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#222', marginBottom: 4 },
  emptyText: { fontSize: 13, color: '#777', textAlign: 'center' },
  summaryPanel: { alignSelf: 'flex-end', marginTop: 14, borderWidth: 1, borderColor: '#D1D5DB', flexDirection: 'row', backgroundColor: '#F9FAFB' },
  summaryPanelMobile: { width: '100%', alignSelf: 'stretch' },
  summaryItem: { minWidth: 130, paddingHorizontal: 14, paddingVertical: 10, borderRightWidth: 1, borderRightColor: '#D1D5DB' },
  summaryItemLast: { borderRightWidth: 0 },
  summaryLabel: { fontSize: 11, color: '#6B7280', fontWeight: '800', textTransform: 'uppercase' },
  summaryValue: { marginTop: 3, fontSize: 16, color: '#111827', fontWeight: '900' },
  footerNoteRow: { marginTop: 22, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  footerNoteRowMobile: { flexDirection: 'column', gap: 4 },
  footerNote: { color: '#6B7280', fontSize: 11, fontStyle: 'italic' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, justifyContent: 'flex-end' },
  loadingText: { marginLeft: 8, color: '#777', fontSize: 13 },
  uploadedSourceBadge: { 
    alignSelf: 'flex-start', 
    backgroundColor: '#FEF2F2', 
    borderWidth: 1, 
    borderColor: '#FECACA', 
    borderRadius: 8, 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    marginBottom: 12 
  },
  uploadedSourceText: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#991B1B' 
  },
});

export default MyJourney;