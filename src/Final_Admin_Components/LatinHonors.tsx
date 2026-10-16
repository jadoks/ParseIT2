import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { apiFetch } from '../services/api'; // path-only fetch that adds the Bearer token
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
  };
  qualified: LatinStudent[];
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

// Side-by-side columns (Summa | Magna | Cum Laude) from this width up.
const COLUMNS_MIN_WIDTH = 1100;

// ArrayBuffer -> base64 (React Native has no Buffer; used to save the .docx on native).
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64[a >> 2] + B64[((a & 3) << 4) | (b >> 4)];
    out += i + 1 < bytes.length ? B64[((b & 15) << 2) | (c >> 6)] : '=';
    out += i + 2 < bytes.length ? B64[c & 63] : '=';
  }
  return out;
};

export default function LatinHonors({ apiBaseUrl }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const useColumns = width >= COLUMNS_MIN_WIDTH;

  const [startYear, setStartYear] = useState('2025');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LatinHonorsResult | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

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
      const response = await apiFetch(`/latin-honors?schoolYear=${encodeURIComponent(startYear)}`);
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

  // Downloads the Latin Honors Word form (server fills templates/latin-honors-template.docx).
  // Only the qualified students are sent.
  const handleDownloadForm = async () => {
    if (!result || result.qualified.length === 0 || isDownloading) return;

    setIsDownloading(true);
    setError('');

    try {
      const response = await apiFetch('/latin-honors/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolYear: startYear,
          students: result.qualified.map((student) => ({
            name: student.name,
            gwa: student.gwa,
            honor: student.honor,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to download the Latin Honors form.');
      }

      const fileName = `latin-honors-form-${startYearNumber}-${startYearNumber + 1}.docx`;

      if (Platform.OS === 'web') {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const uri = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(uri, arrayBufferToBase64(await response.arrayBuffer()), {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            dialogTitle: 'Latin Honors Form',
          });
        } else {
          throw new Error('Sharing is not available on this device.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to download the Latin Honors form.');
    } finally {
      setIsDownloading(false);
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

      <View style={[styles.controlsCard, isMobile && styles.controlsCardMobile]}>
        <View style={[styles.controlsRow, isMobile && styles.controlsRowMobile]}>
          <View style={isMobile ? styles.fieldMobile : styles.yearGroup}>
            <Text style={styles.controlLabel}>Graduating Start Year</Text>
            <TextInput
              style={[styles.input, isMobile && styles.inputMobile]}
              value={startYear}
              onChangeText={(value) => setStartYear(value.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="e.g. 2025"
              placeholderTextColor="#8A8A8A"
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>

          <View style={isMobile ? styles.fieldMobile : styles.schoolYearGroup}>
            <Text style={styles.controlLabel}>Graduating School Year</Text>
            <View style={[styles.badge, isMobile && styles.badgeMobile]}>
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
          <View style={[styles.coverageRow, isMobile && styles.coverageRowMobile]}>
            <Text style={styles.coverage}>
              Graduating {result.graduatingSchoolYear} · grades from {result.coverage}
            </Text>
            {result.qualified.length > 0 && (
              <TouchableOpacity
                style={[styles.downloadBtn, isMobile && styles.downloadBtnMobile, isDownloading && styles.generateBtnDisabled]}
                onPress={handleDownloadForm}
                disabled={isDownloading}
                activeOpacity={0.85}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#8B0000" />
                ) : (
                  <Ionicons name="download-outline" size={18} color="#8B0000" />
                )}
                <Text style={styles.downloadBtnText}>{isDownloading ? 'Preparing...' : 'Download Form'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {result.qualified.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="ribbon-outline" size={34} color="#B8AFA7" />
              <Text style={styles.emptyText}>No student qualifies for Latin Honors for this school year.</Text>
            </View>
          ) : (
            <View style={useColumns ? styles.columnsRow : undefined}>
              {result.bands.map((band) => {
                const students = result.qualified.filter((student) => student.honor === band.key);
                // Stacked layout hides empty honors; the 3-column table keeps all
                // three so Summa | Magna | Cum Laude always line up.
                if (students.length === 0 && !useColumns) return null;
                const tone = HONOR_STYLE[band.key];

                return (
                  <View key={band.key} style={[styles.group, useColumns && styles.column]}>
                    <View style={[styles.groupHeader, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                      <Ionicons name="ribbon" size={18} color={tone.fg} />
                      <View style={styles.groupTitleWrap}>
                        <Text style={[styles.groupTitle, { color: tone.fg }]}>{band.label}</Text>
                        <Text style={[styles.groupRange, { color: tone.fg }]}>GWA {formatRange(band)}</Text>
                      </View>
                      <Text style={[styles.groupCount, { color: tone.fg }]}>{students.length}</Text>
                    </View>
                    {students.length === 0 ? (
                      <Text style={styles.columnEmpty}>No students</Text>
                    ) : (
                      students.map(renderQualifiedRow)
                    )}
                  </View>
                );
              })}
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

  controlsCard: {
    marginBottom: 25,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E5EA',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.035,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  controlsCardMobile: { marginBottom: 18, padding: 14, borderRadius: 14 },
  controlsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' },
  controlsRowMobile: { flexDirection: 'column', alignItems: 'stretch', gap: 14 },
  yearGroup: { width: 210 },
  schoolYearGroup: { width: 240 },
  fieldMobile: { width: '100%' },
  controlLabel: {
    fontFamily: FONT_BODY,
    color: '#3B332E',
    fontSize: 12,
    fontWeight: WEIGHT_EMPHASIS,
    letterSpacing: 0.4,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  input: {
    fontFamily: FONT_BODY,
    width: '100%',
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
  inputMobile: { height: 48, fontSize: 15 },
  badge: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#DDE1E6',
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  badgeMobile: { minHeight: 48 },
  badgeText: { fontFamily: FONT_BODY, color: '#2D2926', fontSize: 14, fontWeight: WEIGHT_EMPHASIS },
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
  generateBtnMobile: { width: '100%', minWidth: 0, height: 50, paddingHorizontal: 16 },
  generateBtnDisabled: { opacity: 0.65 },
  generateBtnText: {
    fontFamily: FONT_BODY,
    color: '#FFF',
    fontSize: 13,
    fontWeight: WEIGHT_EMPHASIS,
    letterSpacing: 0.25,
    textTransform: 'uppercase',
  },

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

  coverageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  coverageRowMobile: { flexDirection: 'column', alignItems: 'stretch' },
  coverage: { fontFamily: FONT_BODY, flex: 1, fontSize: 12, color: '#667085' },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#8B0000',
    backgroundColor: '#FFF6F5',
  },
  downloadBtnMobile: { width: '100%' },
  downloadBtnText: { fontFamily: FONT_BODY, color: '#8B0000', fontSize: 13, fontWeight: WEIGHT_EMPHASIS },
  group: { marginBottom: 18 },
  // Large screens: Summa | Magna | Cum Laude side by side.
  columnsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  column: { flex: 1, minWidth: 0 },
  columnEmpty: { fontFamily: FONT_BODY, fontSize: 13, color: '#98A2B3', textAlign: 'center', paddingVertical: 18 },
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
  groupTitleWrap: { flex: 1 },
  groupTitle: { fontFamily: FONT_BODY, fontSize: 15, fontWeight: WEIGHT_EMPHASIS },
  groupRange: { fontFamily: FONT_BODY, fontSize: 12, marginTop: 1, opacity: 0.85 },
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
});