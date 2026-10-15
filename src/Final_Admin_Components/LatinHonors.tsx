import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { FONT_BODY, FONT_TITLE, WEIGHT_EMPHASIS, WEIGHT_TITLE } from '../theme/typography';

type HonorKey = 'summa' | 'magna' | 'cumLaude';

type SemesterGwa = {
  schoolYear: string;
  semester: string;
  yearNumber: number;
  units: number;
  gwa: number | null;
};

type LatinStudent = {
  id: string;
  name: string;
  section: string;
  gwa: number | null;
  semesters: SemesterGwa[];
  honor?: HonorKey;
  honorLabel?: string;
  reasons?: string[];
};

type Band = { key: HonorKey; label: string; min: number; max: number };

type LatinHonorsResult = {
  graduatingSchoolYear: string;
  coverage: string;
  bands: Band[];
  summary: {
    candidates: number;
    qualified: number;
    summa: number;
    magna: number;
    cumLaude: number;
    notQualified: number;
  };
  qualified: LatinStudent[];
  notQualified: LatinStudent[];
};

type Props = {
  apiBaseUrl: string;
};

const HONOR_STYLE: Record<HonorKey, { bg: string; fg: string; border: string }> = {
  summa: { bg: '#FEF3C7', fg: '#92400E', border: '#FCD34D' },
  magna: { bg: '#F2F4F7', fg: '#344054', border: '#D0D5DD' },
  cumLaude: { bg: '#FFEDD5', fg: '#9A3412', border: '#FDBA74' },
};

const RULES = [
  'GWA is the average of every semester GWA, from 1st year up to 4th year (8 semesters).',
  'No subject with a grade above 2.50 in any semester.',
  'No INC (Incomplete) in any semester.',
  'NSTP subjects are excluded from the GWA and from the rules above.',
];

const formatGwa = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3) : '—';

const formatRange = (band: Band) => `${band.min.toFixed(3)} – ${band.max.toFixed(3)}`;

export default function LatinHonors({ apiBaseUrl }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [startYear, setStartYear] = useState('2025');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LatinHonorsResult | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNotQualified, setShowNotQualified] = useState(false);

  const startYearNumber = Number(startYear);
  const hasValidYear = startYear.length === 4 && Number.isInteger(startYearNumber);
  const graduatingLabel = hasValidYear ? `S.Y ${startYearNumber} - ${startYearNumber + 1}` : 'S.Y ---- - ----';

  const handleGenerate = async () => {
    if (!hasValidYear) {
      setError('Enter a valid 4-digit year.');
      return;
    }

    setIsGenerating(true);
    setError('');
    setExpandedId(null);

    try {
      const response = await fetch(
        `${apiBaseUrl}/latin-honors?schoolYear=${encodeURIComponent(startYear)}`,
        { credentials: 'include' }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to generate Latin Honors.');
      }

      setResult(data as LatinHonorsResult);
    } catch (err: any) {
      setResult(null);
      setError(err?.message || 'Failed to generate Latin Honors.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Competition ranking: students with the same GWA share a rank.
  const rankOf = (student: LatinStudent) =>
    1 + (result?.qualified.filter((other) => (other.gwa ?? 99) < (student.gwa ?? 99)).length ?? 0);

  const renderSemesterBreakdown = (student: LatinStudent) => (
    <View style={styles.breakdown}>
      {student.semesters.map((semester) => (
        <View key={`${semester.schoolYear}-${semester.semester}`} style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel} numberOfLines={1}>
            Year {semester.yearNumber} · {semester.semester} · {semester.schoolYear}
          </Text>
          <Text style={styles.breakdownValue}>{formatGwa(semester.gwa)}</Text>
        </View>
      ))}
    </View>
  );

  const renderQualifiedRow = (student: LatinStudent) => {
    const isOpen = expandedId === student.id;

    return (
      <View key={student.id} style={styles.studentCard}>
        <TouchableOpacity
          style={styles.studentRow}
          onPress={() => setExpandedId(isOpen ? null : student.id)}
          activeOpacity={0.8}
        >
          <Text style={styles.rank}>{rankOf(student)}</Text>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName} numberOfLines={2}>
              {student.name}
            </Text>
            <Text style={styles.studentMeta}>{student.section}</Text>
          </View>
          <Text style={styles.studentGwa}>{formatGwa(student.gwa)}</Text>
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#98A2B3" />
        </TouchableOpacity>
        {isOpen && renderSemesterBreakdown(student)}
      </View>
    );
  };

  const renderNotQualifiedRow = (student: LatinStudent) => {
    const isOpen = expandedId === `nq-${student.id}`;

    return (
      <View key={student.id} style={styles.studentCard}>
        <TouchableOpacity
          style={styles.studentRow}
          onPress={() => setExpandedId(isOpen ? null : `nq-${student.id}`)}
          activeOpacity={0.8}
        >
          <View style={styles.studentInfo}>
            <Text style={styles.studentName} numberOfLines={2}>
              {student.name}
            </Text>
            <Text style={styles.studentMeta}>
              {student.section} · {student.reasons?.length ?? 0} issue
              {(student.reasons?.length ?? 0) === 1 ? '' : 's'}
            </Text>
          </View>
          <Text style={[styles.studentGwa, styles.studentGwaMuted]}>{formatGwa(student.gwa)}</Text>
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#98A2B3" />
        </TouchableOpacity>
        {isOpen && (
          <View style={styles.breakdown}>
            {(student.reasons ?? []).map((reason, index) => (
              <View key={index} style={styles.reasonRow}>
                <Ionicons name="alert-circle-outline" size={15} color="#B42318" style={styles.reasonIcon} />
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ))}
            {student.semesters.length > 0 && student.gwa !== null && renderSemesterBreakdown(student)}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Ionicons name="ribbon-outline" size={26} color="#8B0000" />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { fontSize: isMobile ? 22 : 28 }]}>Latin Honors</Text>
          <Text style={styles.subtitle}>
            Enter the graduating academic start year to view the candidates for Latin Honors.
          </Text>
        </View>
      </View>

      <View style={styles.rulesCard}>
        <Text style={styles.sectionLabel}>HOW IT'S COMPUTED</Text>
        {RULES.map((rule) => (
          <View key={rule} style={styles.ruleRow}>
            <Ionicons name="checkmark-circle" size={16} color="#8B0000" style={styles.ruleIcon} />
            <Text style={styles.ruleText}>{rule}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.controls, isMobile && styles.controlsMobile]}>
        <View style={styles.controlField}>
          <Text style={styles.controlLabel}>Graduating Academic Start Year</Text>
          <TextInput
            style={styles.input}
            value={startYear}
            onChangeText={(value) => setStartYear(value.replace(/[^0-9]/g, '').slice(0, 4))}
            placeholder="e.g. 2025"
            placeholderTextColor="#8A8A8A"
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>

        <View style={styles.controlField}>
          <Text style={styles.controlLabel}>Graduating School Year</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{graduatingLabel}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.generateBtn, isMobile && styles.generateBtnMobile, isGenerating && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={isGenerating}
          activeOpacity={0.85}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.generateBtnText}>Generate Latin Honors</Text>
          )}
        </TouchableOpacity>
      </View>

      {!!error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color="#B42318" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!result && !error && !isGenerating && (
        <View style={styles.emptyBox}>
          <Ionicons name="school-outline" size={34} color="#B8AFA7" />
          <Text style={styles.emptyText}>Generate the list to see the Latin Honors candidates.</Text>
        </View>
      )}

      {result && (
        <>
          <Text style={styles.coverage}>
            Graduating {result.graduatingSchoolYear} · grades from {result.coverage}
          </Text>

          {/* GWA ranges (from the server, so they stay in one place). */}
          <View style={styles.statsRow}>
            {result.bands.map((band) => {
              const tone = HONOR_STYLE[band.key];
              return (
                <View key={band.key} style={[styles.statCard, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                  <Text style={[styles.statCount, { color: tone.fg }]}>{result.summary[band.key]}</Text>
                  <Text style={[styles.statLabel, { color: tone.fg }]}>{band.label}</Text>
                  <Text style={[styles.statRange, { color: tone.fg }]}>{formatRange(band)}</Text>
                </View>
              );
            })}
            <View style={[styles.statCard, { backgroundColor: '#FFF6F5', borderColor: '#FDA29B' }]}>
              <Text style={[styles.statCount, { color: '#B42318' }]}>{result.summary.notQualified}</Text>
              <Text style={[styles.statLabel, { color: '#B42318' }]}>Not qualified</Text>
              <Text style={[styles.statRange, { color: '#B42318' }]}>of {result.summary.candidates} candidates</Text>
            </View>
          </View>

          {result.qualified.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="ribbon-outline" size={34} color="#B8AFA7" />
              <Text style={styles.emptyText}>No student qualifies for Latin Honors for this school year.</Text>
            </View>
          ) : (
            result.bands.map((band) => {
              const students = result.qualified.filter((student) => student.honor === band.key);
              if (students.length === 0) return null;
              const tone = HONOR_STYLE[band.key];

              return (
                <View key={band.key} style={styles.group}>
                  <View style={[styles.groupHeader, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                    <Ionicons name="ribbon" size={18} color={tone.fg} />
                    <Text style={[styles.groupTitle, { color: tone.fg }]}>{band.label}</Text>
                    <Text style={[styles.groupCount, { color: tone.fg }]}>{students.length}</Text>
                  </View>
                  {students.map(renderQualifiedRow)}
                </View>
              );
            })
          )}

          {result.notQualified.length > 0 && (
            <View style={styles.group}>
              <TouchableOpacity
                style={[styles.groupHeader, styles.groupHeaderNeutral]}
                onPress={() => setShowNotQualified((prev) => !prev)}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={18} color="#B42318" />
                <Text style={[styles.groupTitle, { color: '#344054' }]}>Not qualified</Text>
                <Text style={[styles.groupCount, { color: '#344054' }]}>{result.notQualified.length}</Text>
                <Ionicons name={showNotQualified ? 'chevron-up' : 'chevron-down'} size={18} color="#667085" />
              </TouchableOpacity>
              {showNotQualified && result.notQualified.map(renderNotQualifiedRow)}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E5EA',
    borderRadius: 24,
    padding: 20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#F1E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerText: { flex: 1 },
  title: { fontFamily: FONT_TITLE, fontWeight: WEIGHT_TITLE, color: '#2B1111' },
  subtitle: { fontFamily: FONT_BODY, marginTop: 2, fontSize: 13, color: '#667085' },

  rulesCard: {
    backgroundColor: '#FFFDFD',
    borderWidth: 1,
    borderColor: '#EBD4D4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  sectionLabel: {
    fontFamily: FONT_BODY,
    fontSize: 12,
    fontWeight: WEIGHT_EMPHASIS,
    letterSpacing: 1,
    color: '#98A2B3',
    marginBottom: 8,
  },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 },
  ruleIcon: { marginTop: 1, marginRight: 8 },
  ruleText: { fontFamily: FONT_BODY, flex: 1, fontSize: 13, lineHeight: 19, color: '#344054' },

  controls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E5EA',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  controlsMobile: { flexDirection: 'column', alignItems: 'stretch' },
  controlField: { flex: 1 },
  controlLabel: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#344054',
    marginBottom: 6,
  },
  input: {
    fontFamily: FONT_BODY,
    height: 46,
    borderWidth: 1,
    borderColor: '#B8AFA7',
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    color: '#111',
    fontSize: 14,
    fontWeight: '700',
  },
  badge: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#DDE1E6',
    borderRadius: 16,
    backgroundColor: '#F8F9FB',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  badgeText: { fontFamily: FONT_BODY, fontSize: 14, fontWeight: '700', color: '#344054' },
  generateBtn: {
    backgroundColor: '#8B0000',
    minWidth: 210,
    height: 46,
    paddingHorizontal: 24,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#5A0000',
  },
  generateBtnMobile: { width: '100%', minWidth: 0, height: 50 },
  generateBtnDisabled: { opacity: 0.65 },
  generateBtnText: { fontFamily: FONT_BODY, color: '#FFF', fontSize: 13, fontWeight: WEIGHT_EMPHASIS },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF6F5',
    borderWidth: 1,
    borderColor: '#FDA29B',
    marginBottom: 16,
  },
  errorText: { fontFamily: FONT_BODY, flex: 1, fontSize: 13, color: '#B42318' },
  emptyBox: { alignItems: 'center', paddingVertical: 36, gap: 10 },
  emptyText: { fontFamily: FONT_BODY, fontSize: 14, color: '#667085', textAlign: 'center' },

  coverage: { fontFamily: FONT_BODY, fontSize: 12, color: '#667085', marginBottom: 12 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: {
    flexGrow: 1,
    flexBasis: 150,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  statCount: { fontFamily: FONT_TITLE, fontSize: 28, fontWeight: WEIGHT_TITLE },
  statLabel: { fontFamily: FONT_BODY, fontSize: 13, fontWeight: WEIGHT_EMPHASIS, marginTop: 2 },
  statRange: { fontFamily: FONT_BODY, fontSize: 12, marginTop: 2, opacity: 0.85 },

  group: { marginBottom: 18 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  groupHeaderNeutral: { backgroundColor: '#F8F9FB', borderColor: '#E2E5EA' },
  groupTitle: { fontFamily: FONT_BODY, flex: 1, fontSize: 15, fontWeight: WEIGHT_EMPHASIS },
  groupCount: { fontFamily: FONT_BODY, fontSize: 14, fontWeight: WEIGHT_EMPHASIS },

  studentCard: {
    borderWidth: 1,
    borderColor: '#EEF0F3',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    overflow: 'hidden',
  },
  studentRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  rank: { fontFamily: FONT_BODY, width: 28, fontSize: 14, fontWeight: WEIGHT_EMPHASIS, color: '#8B0000' },
  studentInfo: { flex: 1 },
  studentName: { fontFamily: FONT_BODY, fontSize: 14, fontWeight: WEIGHT_EMPHASIS, color: '#111827' },
  studentMeta: { fontFamily: FONT_BODY, fontSize: 12, color: '#667085', marginTop: 2 },
  studentGwa: { fontFamily: FONT_BODY, fontSize: 15, fontWeight: WEIGHT_EMPHASIS, color: '#111827' },
  studentGwaMuted: { color: '#98A2B3' },

  breakdown: { paddingHorizontal: 14, paddingBottom: 12, paddingTop: 2, backgroundColor: '#FBFBFC' },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F7',
  },
  breakdownLabel: { fontFamily: FONT_BODY, flex: 1, fontSize: 12, color: '#475467', paddingRight: 10 },
  breakdownValue: { fontFamily: FONT_BODY, fontSize: 12, fontWeight: WEIGHT_EMPHASIS, color: '#111827' },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 8 },
  reasonIcon: { marginTop: 1, marginRight: 6 },
  reasonText: { fontFamily: FONT_BODY, flex: 1, fontSize: 12, lineHeight: 17, color: '#B42318' },
});