import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { FONT_BODY, FONT_TITLE, WEIGHT_EMPHASIS, WEIGHT_TITLE } from '../theme/typography';

const apiFetch = (url: string, options: any = {}) =>
  fetch(url, {
    credentials: 'include',
    ...options,
  });

type Status = 'passed' | 'failed' | 'incomplete' | 'not_taken';

type ProspectusSubject = {
  code: string;
  codeLabel: string;
  title: string;
  prerequisites: string;
  units: number;
  lec: number;
  lab: number;
  status: Status;
  grade: number | null;
  takenSchoolYear: string | null;
  takenSemester: string | null;
  attempts: number;
  blockedBy: string[];
};

type TakenTerm = { schoolYear: string; semester: string; count: number };

type ProspectusSemester = {
  semester: string;
  totalUnits: number;
  // The term(s) the subjects in this block were really taken in.
  takenTerms?: TakenTerm[];
  mainTerm?: { schoolYear: string; semester: string } | null;
  subjects: ProspectusSubject[];
};

type ProspectusYear = {
  year: number;
  label: string;
  schoolYear?: string | null;
  semesters: ProspectusSemester[];
};

type UnmatchedSubject = {
  subjectCode: string | null;
  subjectTitle: string;
  units: number;
  grade: number | null;
  status: Status;
  schoolYear: string | null;
  semester: string | null;
};

type ProspectusResponse = {
  irregular?: boolean;
  success: boolean;
  // false until an admin uploads a prospectus; the fields below are then absent
  hasProspectus: boolean;
  program?: { code?: string; name?: string; school?: string; cmo?: string; effectiveAY?: string };
  passingGrade: number;
  hasGrades: boolean;
  summary: {
    totalSubjects: number;
    totalUnits: number;
    earnedUnits: number;
    remainingUnits: number;
    percent: number;
    passed: number;
    failed: number;
    incomplete: number;
    notTaken: number;
  };
  years: ProspectusYear[];
  unmatched: UnmatchedSubject[];
};

type CurrentStudent = {
  studentId: string;
  firstName: string;
  lastName: string;
  email?: string;
};

type ProspectusProps = {
  currentStudent: CurrentStudent;
  studentName?: string;
  apiBaseUrl: string;
};

const STATUS_META: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  passed: { label: 'Passed', color: '#067647', bg: '#ECFDF3', border: '#ABEFC6' },
  failed: { label: 'Failed', color: '#B42318', bg: '#FEF3F2', border: '#FECDCA' },
  incomplete: { label: 'INC', color: '#B54708', bg: '#FFFAEB', border: '#FEDF89' },
  not_taken: { label: 'No grade submitted', color: '#667085', bg: '#F2F4F7', border: '#E4E7EC' },
};

const yearShort = (n: number) => `${n}${['st', 'nd', 'rd'][n - 1] || 'th'} Year`;

const formatGrade = (grade: number | null) => (grade === null || grade === undefined ? '-' : grade.toFixed(2));

const StatusChip = ({ status }: { status: Status }) => {
  const meta = STATUS_META[status];
  return (
    <View style={[styles.chip, { backgroundColor: meta.bg, borderColor: meta.border }]}>
      <Text style={[styles.chipText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
};

// The school year is shown once in the year heading, so a subject only gets a
// "Taken ..." note when it was taken in a different school year or semester.
const SubjectNotes = ({
  subject,
  headingSchoolYear,
  blockSemester,
  mainTerm,
}: {
  subject: ProspectusSubject;
  headingSchoolYear?: string | null;
  blockSemester: string;
  // Irregular students: compare against the term shown under the table instead.
  mainTerm?: { schoolYear: string; semester: string } | null;
}) => {
  const differences: string[] = [];
  if (subject.status !== 'not_taken') {
    if (mainTerm) {
      if (subject.takenSemester !== mainTerm.semester || subject.takenSchoolYear !== mainTerm.schoolYear) {
        if (subject.takenSemester) differences.push(subject.takenSemester);
        if (subject.takenSchoolYear) differences.push(`S.Y. ${subject.takenSchoolYear}`);
      }
    } else {
      if (subject.takenSemester && subject.takenSemester !== blockSemester) differences.push(subject.takenSemester);
      if (subject.takenSchoolYear && subject.takenSchoolYear !== headingSchoolYear) {
        differences.push(`S.Y. ${subject.takenSchoolYear}`);
      }
    }
  }
  return (
    <>
      {subject.status !== 'passed' && subject.blockedBy.length > 0 && (
        <Text style={styles.noteWarn}>Prerequisite not yet passed: {subject.blockedBy.join(', ')}</Text>
      )}
      {subject.attempts > 1 && <Text style={styles.noteMuted}>Taken {subject.attempts} times</Text>}
      {differences.length > 0 && <Text style={styles.noteMuted}>Taken {differences.join(' ')}</Text>}
    </>
  );
};

const Prospectus = ({ currentStudent, apiBaseUrl }: ProspectusProps) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [data, setData] = useState<ProspectusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [showUnmatched, setShowUnmatched] = useState(false);

  const load = useCallback(async () => {
    if (!apiBaseUrl || !currentStudent?.studentId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`${apiBaseUrl}/prospectus/${encodeURIComponent(currentStudent.studentId)}`);
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Failed to load prospectus.');
      setData(json);
      // No prospectus uploaded yet: the empty state is rendered below.
      if (!json.hasProspectus) return;
      // Open the first year that still has something left to take.
      const firstOpen = ((json.years || []) as ProspectusYear[]).find((y) =>
        y.semesters.some((s) => s.subjects.some((sub) => sub.status !== 'passed'))
      );
      setActiveYear((prev) => prev ?? firstOpen?.year ?? 4);
    } catch (e: any) {
      setError(e?.message || 'Failed to load prospectus.');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, currentStudent?.studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const yearProgress = useMemo(() => {
    const map: Record<number, { earned: number; total: number }> = {};
    (data?.years ?? []).forEach((y) => {
      let earned = 0;
      let total = 0;
      y.semesters.forEach((s) =>
        s.subjects.forEach((sub) => {
          total += sub.units;
          if (sub.status === 'passed') earned += sub.units;
        })
      );
      map[y.year] = { earned, total };
    });
    return map;
  }, [data]);

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator color="#8B0000" />
        <Text style={styles.loadingText}>Loading your prospectus...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.card, styles.centerBox]}>
        <Text style={styles.emptyTitle}>Could not load prospectus</Text>
        <Text style={styles.emptyText}>{error || 'Please try again.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.85}>
          <Text style={styles.retryBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data.hasProspectus) {
    return (
      <View style={[styles.card, styles.centerBox, isMobile && styles.cardMobile]}>
        <MaterialCommunityIcons name="book-open-page-variant-outline" size={34} color="#8B0000" />
        <Text style={styles.emptyTitle}>No prospectus available yet</Text>
        <Text style={styles.emptyText}>
          Your department hasn't published the program prospectus yet. Check back later.
        </Text>
      </View>
    );
  }

  const { summary } = data;
  const year = data.years.find((y) => y.year === activeYear) || data.years[0];
  const programLine = [
    data.program?.code,
    data.program?.cmo,
    data.program?.effectiveAY && `Effective ${data.program.effectiveAY}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const renderSubjectRow = (
    subject: ProspectusSubject,
    index: number,
    blockSemester: string,
    mainTerm?: { schoolYear: string; semester: string } | null
  ) => {
    if (isMobile) {
      return (
        <View key={subject.code} style={styles.mobileCard}>
          <View style={styles.mobileCardHeader}>
            <Text style={styles.mobileCode}>{subject.codeLabel}</Text>
            <StatusChip status={subject.status} />
          </View>
          <Text style={styles.mobileTitle}>{subject.title}</Text>
          <View style={styles.mobileMetaRow}>
            <View style={styles.mobileMetaItem}>
              <Text style={styles.metaLabel}>Units</Text>
              <Text style={styles.metaValue}>{subject.units}</Text>
            </View>
            <View style={styles.mobileMetaItem}>
              <Text style={styles.metaLabel}>Grade</Text>
              <Text style={styles.metaValue}>{formatGrade(subject.grade)}</Text>
            </View>
            <View style={[styles.mobileMetaItem, { flex: 1.6 }]}>
              <Text style={styles.metaLabel}>Pre-requisite</Text>
              <Text style={styles.metaValue}>{subject.prerequisites}</Text>
            </View>
          </View>
          <SubjectNotes subject={subject} headingSchoolYear={year.schoolYear} blockSemester={blockSemester} mainTerm={mainTerm} />
        </View>
      );
    }

    return (
      <View key={subject.code} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
        <Text style={[styles.td, styles.tdCode]}>{subject.codeLabel}</Text>
        <View style={[styles.td, styles.tdTitle]}>
          <Text style={styles.tdText}>{subject.title}</Text>
          <SubjectNotes subject={subject} headingSchoolYear={year.schoolYear} blockSemester={blockSemester} mainTerm={mainTerm} />
        </View>
        <Text style={[styles.td, styles.tdPrereq, styles.tdText]}>{subject.prerequisites}</Text>
        <Text style={[styles.td, styles.tdSmall, styles.tdText]}>{subject.units}</Text>
        <Text style={[styles.td, styles.tdSmall, styles.tdText]}>{formatGrade(subject.grade)}</Text>
        <View style={[styles.td, styles.tdStatus, styles.lastCell]}>
          <StatusChip status={subject.status} />
        </View>
      </View>
    );
  };

  return (
    <View>
      {/* ---------- Progress summary ---------- */}
      <View style={[styles.card, isMobile && styles.cardMobile]}>
        <View style={styles.progressHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Curriculum Progress</Text>
            {!!programLine && <Text style={styles.cardSubtitle}>{programLine}</Text>}
          </View>
          <View style={styles.percentBadge}>
            <Text style={styles.percentValue}>{summary.percent}%</Text>
            <Text style={styles.percentLabel}>of units earned</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, summary.percent)}%` }]} />
        </View>

        <View style={[styles.statsRow, isMobile && styles.statsRowMobile]}>
          <View style={styles.statBox}>
            <Text style={styles.metaLabel}>Units earned</Text>
            <Text style={styles.statValue}>
              {summary.earnedUnits} / {summary.totalUnits}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.metaLabel}>Passed</Text>
            <Text style={[styles.statValue, { color: STATUS_META.passed.color }]}>{summary.passed}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.metaLabel}>Remaining</Text>
            <Text style={styles.statValue}>{summary.notTaken}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.metaLabel}>Failed / INC</Text>
            <Text
              style={[
                styles.statValue,
                (summary.failed > 0 || summary.incomplete > 0) && { color: STATUS_META.failed.color },
              ]}
            >
              {summary.failed} / {summary.incomplete}
            </Text>
          </View>
        </View>
      </View>

      {!data.hasGrades && (
        <View style={styles.banner}>
          <MaterialCommunityIcons name="information-outline" size={18} color="#B54708" />
          <Text style={styles.bannerText}>
            No grades found yet. Upload your grade file from the menu and your progress will appear here.
          </Text>
        </View>
      )}

      {/* ---------- Year tabs ---------- */}
      <View style={styles.tabsRow}>
        {data.years.map((y) => {
          const active = y.year === year.year;
          const p = yearProgress[y.year];
          const done = p && p.total > 0 && p.earned === p.total;
          return (
            <TouchableOpacity
              key={y.year}
              style={[styles.tab, active && styles.tabActive, isMobile && styles.tabMobile]}
              onPress={() => setActiveYear(y.year)}
              activeOpacity={0.85}
            >
              <View style={styles.tabInner}>
                {done && <MaterialCommunityIcons name="check-circle" size={14} color={active ? '#FFFFFF' : '#067647'} />}
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{yearShort(y.year)}</Text>
              </View>
              {!isMobile && p && (
                <Text style={[styles.tabSub, active && styles.tabSubActive]}>
                  {p.earned}/{p.total} units
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ---------- Semester tables ---------- */}
      <View style={[styles.card, isMobile && styles.cardMobile]}>
        <Text style={styles.yearTitle}>
          {year.label}
          {!data.irregular && year.schoolYear ? <Text style={styles.yearTitleSy}> (S.Y. {year.schoolYear})</Text> : null}
        </Text>
        {year.semesters.map((sem) => (
          <View key={sem.semester} style={styles.semBlock}>
            <View style={styles.semHeader}>
              <Text style={styles.semTitle}>{sem.semester}</Text>
              <Text style={styles.semUnits}>{sem.totalUnits} units</Text>
            </View>

            {isMobile ? (
              <View style={styles.mobileList}>
                {sem.subjects.map((s, i) => renderSubjectRow(s, i, sem.semester, data.irregular ? sem.mainTerm : null))}
              </View>
            ) : (
              <View style={styles.tableWrap}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.td, styles.tdCode, styles.th]}>Course Code</Text>
                  <Text style={[styles.td, styles.tdTitle, styles.th]}>Descriptive Title</Text>
                  <Text style={[styles.td, styles.tdPrereq, styles.th]}>Co-/Prerequisite</Text>
                  <Text style={[styles.td, styles.tdSmall, styles.th]}>Units</Text>
                  <Text style={[styles.td, styles.tdSmall, styles.th]}>Grade</Text>
                  <Text style={[styles.td, styles.tdStatus, styles.th, styles.lastCell]}>Status</Text>
                </View>
                {sem.subjects.map((s, i) => renderSubjectRow(s, i, sem.semester, data.irregular ? sem.mainTerm : null))}
              </View>
            )}

            {/* Irregular students: show when this block was actually taken, below its subjects. */}
            {data.irregular && sem.takenTerms && sem.takenTerms.length > 0 && (
              <Text style={styles.takenFooter}>
                Taken:{' '}
                {sem.takenTerms
                  .map(
                    (t) =>
                      `${t.semester} (S.Y. ${t.schoolYear})` + (sem.takenTerms!.length > 1 ? ` - ${t.count} subject${t.count === 1 ? '' : 's'}` : '')
                  )
                  .join('  ·  ')}
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* ---------- Grades that are not part of the prospectus ---------- */}
      {data.unmatched.length > 0 && (
        <View style={[styles.card, isMobile && styles.cardMobile]}>
          <TouchableOpacity
            style={styles.unmatchedHeader}
            onPress={() => setShowUnmatched((v) => !v)}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Other subjects in your grades ({data.unmatched.length})</Text>
              <Text style={styles.cardSubtitle}>
                These could not be matched to a prospectus subject, e.g. different titles or an older curriculum.
              </Text>
            </View>
            <MaterialCommunityIcons name={showUnmatched ? 'chevron-up' : 'chevron-down'} size={22} color="#6B7280" />
          </TouchableOpacity>

          {showUnmatched &&
            data.unmatched.map((u, i) => (
              <View key={`${u.subjectTitle}-${i}`} style={styles.unmatchedRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tdText}>{u.subjectTitle}</Text>
                  <Text style={styles.noteMuted}>
                    {u.semester} S.Y. {u.schoolYear} · {u.units} units
                  </Text>
                </View>
                <Text style={styles.metaValue}>{formatGrade(u.grade)}</Text>
              </View>
            ))}
        </View>
      )}

      <Text style={styles.footerNote}>
        Progress is matched by subject title from your uploaded grade file. A grade of {data.passingGrade.toFixed(2)} or
        better counts as passed. Prerequisite notes are advisory; confirm enrollment with your department.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  centerBox: { alignItems: 'center', justifyContent: 'center', padding: 28, gap: 8 },
  loadingText: { color: '#6B7280', fontSize: 13, fontFamily: FONT_BODY },

  card: { backgroundColor: '#FFFFFF', borderRadius: 22, borderWidth: 1, borderColor: '#E5E7EB', padding: 18, marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  cardMobile: { borderRadius: 18, padding: 14, marginBottom: 14 },
  cardTitle: { fontSize: 18, fontWeight: WEIGHT_TITLE, fontFamily: FONT_TITLE, color: '#111827' },
  cardSubtitle: { marginTop: 4, fontSize: 12, color: '#6B7280', fontFamily: FONT_BODY, lineHeight: 18 },

  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  percentBadge: { minWidth: 110, borderRadius: 16, borderWidth: 1, borderColor: '#E2BFBF', backgroundColor: '#F8F0F0', paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
  percentValue: { fontSize: 22, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, color: '#8B0000' },
  percentLabel: { fontSize: 10, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, color: '#6B0000', textTransform: 'uppercase', letterSpacing: 0.6 },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: '#F3F4F6', overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#8B0000' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statsRowMobile: { flexWrap: 'wrap' },
  statBox: { flexGrow: 1, flexBasis: 120, borderRadius: 14, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 10 },
  statValue: { marginTop: 3, fontSize: 17, color: '#111827', fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY },

  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFAEB', borderWidth: 1, borderColor: '#FEDF89', borderRadius: 14, padding: 12, marginBottom: 18 },
  bannerText: { flex: 1, color: '#B54708', fontSize: 13, fontFamily: FONT_BODY, lineHeight: 19 },

  tabsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tab: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center' },
  tabMobile: { paddingVertical: 10, paddingHorizontal: 4 },
  tabActive: { backgroundColor: '#8B0000', borderColor: '#8B0000' },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tabText: { fontSize: 14, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, color: '#374151' },
  tabTextActive: { color: '#FFFFFF' },
  tabSub: { marginTop: 3, fontSize: 11, fontFamily: FONT_BODY, color: '#6B7280' },
  tabSubActive: { color: '#F5D5D5' },

  yearTitle: { fontSize: 20, fontWeight: WEIGHT_TITLE, fontFamily: FONT_TITLE, color: '#111827', marginBottom: 14 },
  yearTitleSy: { fontSize: 15, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, color: '#6B7280' },
  semBlock: { marginBottom: 20 },
  semHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  semTitle: { fontSize: 15, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, color: '#8B0000', textTransform: 'uppercase', letterSpacing: 0.6 },
  semUnits: { fontSize: 12, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, color: '#6B7280' },

  tableWrap: { borderWidth: 1, borderColor: '#111827', overflow: 'hidden' },
  tableRow: { flexDirection: 'row', minHeight: 46, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#D1D5DB' },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  tableHeader: { backgroundColor: '#F3F4F6', borderBottomColor: '#111827' },
  td: { paddingHorizontal: 10, paddingVertical: 10, borderRightWidth: 1, borderRightColor: '#D1D5DB', justifyContent: 'center' },
  tdText: { fontSize: 13, color: '#111827', fontFamily: FONT_BODY },
  tdCode: { flex: 1.1, fontSize: 13, color: '#111827', fontFamily: FONT_BODY, fontWeight: WEIGHT_EMPHASIS },
  tdTitle: { flex: 3 },
  tdPrereq: { flex: 1.6 },
  tdSmall: { flex: 0.6, textAlign: 'center' },
  tdStatus: { flex: 1.2, alignItems: 'center' },
  lastCell: { borderRightWidth: 0 },
  th: { fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, color: '#111827', fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },

  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  chipText: { fontSize: 11, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY },
  noteWarn: { marginTop: 3, fontSize: 11, color: '#B54708', fontFamily: FONT_BODY },
  takenFooter: { marginTop: 8, fontSize: 12, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, color: '#6B7280' },
  noteMuted: { marginTop: 3, fontSize: 11, color: '#6B7280', fontFamily: FONT_BODY },

  mobileList: { gap: 10 },
  mobileCard: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, backgroundColor: '#FFFFFF', padding: 12 },
  mobileCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6 },
  mobileCode: { fontSize: 16, color: '#111827', fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY },
  mobileTitle: { fontSize: 14, lineHeight: 20, color: '#374151', fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, marginBottom: 10 },
  mobileMetaRow: { flexDirection: 'row', gap: 8 },
  mobileMetaItem: { flex: 1, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 8 },
  metaLabel: { fontSize: 10, color: '#6B7280', fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, textTransform: 'uppercase', marginBottom: 2 },
  metaValue: { fontSize: 13, color: '#111827', fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY },

  unmatchedHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  unmatchedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },

  emptyTitle: { fontSize: 15, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, color: '#222' },
  emptyText: { fontSize: 13, color: '#777', textAlign: 'center', fontFamily: FONT_BODY },
  retryBtn: { marginTop: 8, backgroundColor: '#8B0000', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  retryBtnText: { color: '#fff', fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, fontSize: 13 },

  footerNote: { color: '#6B7280', fontSize: 11, fontStyle: 'italic', fontFamily: FONT_BODY, lineHeight: 17, marginBottom: 8 },
});

export default Prospectus;