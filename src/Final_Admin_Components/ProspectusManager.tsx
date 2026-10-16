import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiFetch } from '../services/api';
import { FONT_BODY, FONT_TITLE, WEIGHT_EMPHASIS, WEIGHT_TITLE } from '../theme/typography';
import Toast from './Toast';

// Admin-only screen (the server enforces this too): upload, replace, delete and
// view the program prospectus that students' progress is checked against.
// Rendered inside AdminApp's ScrollView, so it does not scroll on its own.

type CurriculumEntry = {
  year: number;
  semester: string;
  code: string;
  codeLabel: string;
  title: string;
  prerequisiteText: string;
  units: number;
  lec: number;
  lab: number;
};

type ProspectusData = {
  exists: boolean;
  program?: { code?: string; name?: string; school?: string; cmo?: string; effectiveAY?: string };
  meta?: {
    fileName: string | null;
    hasFile: boolean;
    uploadedAt: string | null;
    uploadedBy: string | null;
    totalUnits: number;
    totalSubjects: number;
    warnings: string[];
  };
  fileUrl?: string | null;
  curriculum?: CurriculumEntry[];
};

type ToastType = 'success' | 'error' | 'info';
type Busy = null | 'loading' | 'uploading' | 'deleting';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const SEMESTER_ORDER = ['1st Semester', '2nd Semester', 'Summer'];
const ordinal = (n: number) => `${n}${['st', 'nd', 'rd'][n - 1] || 'th'} Year`;

const readFileAsBase64 = async (uri: string): Promise<string> => {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result;
        if (typeof res !== 'string') {
          reject(new Error('Failed to read file.'));
          return;
        }
        resolve(res.includes(',') ? res.split(',')[1] : res);
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(blob);
    });
  }
  return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
};

const ProspectusManager = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [data, setData] = useState<ProspectusData | null>(null);
  const [busy, setBusy] = useState<Busy>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | 'replace' | 'delete'>(null);
  const [activeYear, setActiveYear] = useState<number>(1);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false,
    message: '',
    type: 'info',
  });

  const showToast = (message: string, type: ToastType = 'info') => setToast({ visible: true, message, type });
  const hideToast = () => setToast((prev) => ({ ...prev, visible: false }));

  const applyData = (next: ProspectusData) => {
    setData(next);
    const years = [...new Set((next.curriculum || []).map((e) => e.year))].sort((a, b) => a - b);
    setActiveYear((prev) => (years.includes(prev) ? prev : years[0] ?? 1));
  };

  const load = useCallback(async () => {
    setBusy('loading');
    setLoadError(null);
    try {
      const response = await apiFetch('/admin/prospectus');
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || 'Failed to load prospectus.');
      applyData(json);
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to load prospectus.');
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pickAndUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];

      const isPdf = asset.mimeType === 'application/pdf' || /\.pdf$/i.test(asset.name || '');
      if (!isPdf) {
        showToast('Please choose a PDF file.', 'error');
        return;
      }
      if (asset.size && asset.size > MAX_FILE_BYTES) {
        showToast('File must be under 10MB.', 'error');
        return;
      }

      setBusy('uploading');
      const base64 = await readFileAsBase64(asset.uri);
      if (!base64 || base64.length < 100) throw new Error('File content is empty or too small.');

      const response = await apiFetch('/admin/prospectus', {
        method: 'POST',
        body: JSON.stringify({
          fileBase64: base64,
          fileName: asset.name,
          fileType: 'application/pdf',
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || 'Upload failed.');

      applyData({ exists: true, ...json });
      showToast(json.replaced ? 'Prospectus replaced.' : 'Prospectus uploaded.', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Upload failed.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const startUpload = () => {
    if (data?.exists) setConfirm('replace');
    else pickAndUpload();
  };

  const deleteProspectus = async () => {
    setConfirm(null);
    setBusy('deleting');
    try {
      const response = await apiFetch('/admin/prospectus', { method: 'DELETE' });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || 'Delete failed.');
      setData({ exists: false });
      showToast('Prospectus deleted.', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Delete failed.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const openPdf = () => {
    if (!data?.fileUrl) return;
    Linking.openURL(data.fileUrl).catch(() => showToast('Could not open the PDF.', 'error'));
  };

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString();
  };

  /* ---------------------------- render pieces ---------------------------- */

  const curriculum = data?.curriculum || [];
  const years = [...new Set(curriculum.map((e) => e.year))].sort((a, b) => a - b);
  const programLine = [data?.program?.code, data?.program?.cmo, data?.program?.effectiveAY && `Effective ${data.program.effectiveAY}`]
    .filter(Boolean)
    .join(' · ');

  const renderYear = () => {
    const rows = curriculum.filter((e) => e.year === activeYear);
    const semesters = SEMESTER_ORDER.filter((s) => rows.some((r) => r.semester === s));
    return semesters.map((semester) => {
      const subjects = rows.filter((r) => r.semester === semester);
      const units = subjects.reduce((n, s) => n + s.units, 0);
      return (
        <View key={semester} style={styles.semBlock}>
          <View style={styles.semHeader}>
            <Text style={styles.semTitle}>{semester}</Text>
            <Text style={styles.semUnits}>{units} units</Text>
          </View>

          {isMobile ? (
            <View style={{ gap: 10 }}>
              {subjects.map((s) => (
                <View key={s.code} style={styles.mobileCard}>
                  <Text style={styles.mobileCode}>{s.codeLabel || s.code}</Text>
                  <Text style={styles.mobileTitle}>{s.title}</Text>
                  <View style={styles.mobileMetaRow}>
                    <View style={styles.metaBox}>
                      <Text style={styles.metaLabel}>Units</Text>
                      <Text style={styles.metaValue}>{s.units}</Text>
                    </View>
                    <View style={[styles.metaBox, { flex: 2 }]}>
                      <Text style={styles.metaLabel}>Pre-requisite</Text>
                      <Text style={styles.metaValue}>{s.prerequisiteText}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.tableWrap}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.td, styles.tdCode, styles.th]}>Course Code</Text>
                <Text style={[styles.td, styles.tdTitle, styles.th]}>Descriptive Title</Text>
                <Text style={[styles.td, styles.tdPrereq, styles.th]}>Co-/Prerequisite</Text>
                <Text style={[styles.td, styles.tdSmall, styles.th]}>Units</Text>
                <Text style={[styles.td, styles.tdSmall, styles.th]}>Lec</Text>
                <Text style={[styles.td, styles.tdSmall, styles.th, styles.lastCell]}>Lab</Text>
              </View>
              {subjects.map((s, i) => (
                <View key={s.code} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                  <Text style={[styles.td, styles.tdCode, styles.tdBold]}>{s.codeLabel || s.code}</Text>
                  <Text style={[styles.td, styles.tdTitle, styles.tdText]}>{s.title}</Text>
                  <Text style={[styles.td, styles.tdPrereq, styles.tdText]}>{s.prerequisiteText}</Text>
                  <Text style={[styles.td, styles.tdSmall, styles.tdText]}>{s.units}</Text>
                  <Text style={[styles.td, styles.tdSmall, styles.tdText]}>{s.lec}</Text>
                  <Text style={[styles.td, styles.tdSmall, styles.tdText, styles.lastCell]}>{s.lab}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      );
    });
  };

  const busyMessage =
    busy === 'uploading'
      ? 'Reading the prospectus with AI. This can take up to a minute...'
      : busy === 'deleting'
      ? 'Deleting prospectus...'
      : '';

  const confirmCopy = {
    replace: {
      title: 'Replace the prospectus?',
      body: 'The current prospectus and its PDF will be replaced once the new file is read successfully. Student progress will be recalculated against the new one.',
      action: 'Choose new PDF',
      onPress: () => {
        setConfirm(null);
        pickAndUpload();
      },
    },
    delete: {
      title: 'Delete the prospectus?',
      body: 'Students will no longer see their curriculum progress until a new prospectus is uploaded. This cannot be undone.',
      action: 'Delete',
      onPress: deleteProspectus,
    },
  };

  return (
    <View>
      <View style={[styles.headerCard, isMobile && styles.headerCardMobile]}>
        <View style={styles.headerAccent} />
        <View style={styles.headerContent}>
          <Text style={styles.eyebrow}>Admin Tools</Text>
          <Text style={styles.pageTitle}>Prospectus</Text>
          <Text style={styles.pageSubtitle}>
            Upload the official program prospectus. Students see their curriculum progress checked against it. Only admins can
            upload, replace or delete it.
          </Text>
        </View>
      </View>

      {busy === 'loading' && (
        <View style={styles.centerBox}>
          <ActivityIndicator color="#8B0000" />
          <Text style={styles.mutedText}>Loading prospectus...</Text>
        </View>
      )}

      {busy !== 'loading' && loadError && (
        <View style={[styles.card, styles.centerBox]}>
          <Text style={styles.emptyTitle}>Could not load prospectus</Text>
          <Text style={styles.emptyText}>{loadError}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={load} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ------------------------------ empty state ------------------------------ */}
      {busy !== 'loading' && !loadError && data && !data.exists && (
        <View style={[styles.card, styles.emptyCard, isMobile && styles.cardMobile]}>
          <View style={styles.emptyIcon}>
            <MaterialCommunityIcons name="file-upload-outline" size={30} color="#8B0000" />
          </View>
          <Text style={styles.emptyTitle}>No prospectus uploaded yet</Text>
          <Text style={styles.emptyText}>
            Upload the program prospectus as a PDF. Until one is uploaded, students will see that no prospectus is available.
          </Text>
          <View style={[styles.btnRow, isMobile && styles.btnRowMobile]}>
            <TouchableOpacity style={styles.primaryBtn} onPress={startUpload} activeOpacity={0.85}>
              <MaterialCommunityIcons name="upload" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Upload prospectus (PDF)</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ------------------------------ current prospectus ------------------------------ */}
      {busy !== 'loading' && !loadError && data?.exists && data.meta && (
        <>
          <View style={[styles.card, isMobile && styles.cardMobile]}>
            <View style={[styles.infoTop, isMobile && styles.infoTopMobile]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{data.program?.name || data.program?.code || 'Current prospectus'}</Text>
                {!!programLine && <Text style={styles.cardSubtitle}>{programLine}</Text>}
                <Text style={styles.fileLine}>
                  {data.meta.fileName || 'Prospectus'}
                </Text>
                <Text style={styles.cardSubtitle}>
                  Uploaded {formatDate(data.meta.uploadedAt)}
                  {data.meta.uploadedBy ? ` by ${data.meta.uploadedBy}` : ''}
                </Text>
              </View>

              <View style={[styles.btnRow, isMobile && styles.btnRowMobile]}>
                {data.fileUrl ? (
                  <TouchableOpacity style={styles.secondaryBtn} onPress={openPdf} activeOpacity={0.85}>
                    <MaterialCommunityIcons name="file-pdf-box" size={18} color="#8B0000" />
                    <Text style={styles.secondaryBtnText}>Open PDF</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={styles.primaryBtn} onPress={startUpload} activeOpacity={0.85}>
                  <MaterialCommunityIcons name="swap-horizontal" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Replace</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dangerBtn} onPress={() => setConfirm('delete')} activeOpacity={0.85}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color="#B42318" />
                  <Text style={styles.dangerBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.statsRow, isMobile && { flexWrap: 'wrap' }]}>
              <View style={styles.statBox}>
                <Text style={styles.metaLabel}>Subjects</Text>
                <Text style={styles.statValue}>{data.meta.totalSubjects}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.metaLabel}>Total units</Text>
                <Text style={styles.statValue}>{data.meta.totalUnits}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.metaLabel}>Years</Text>
                <Text style={styles.statValue}>{years.length}</Text>
              </View>
            </View>
          </View>

          {data.meta.warnings.length > 0 && (
            <View style={styles.warnBox}>
              <View style={styles.warnHeader}>
                <MaterialCommunityIcons name="alert-outline" size={18} color="#B54708" />
                <Text style={styles.warnTitle}>Please review ({data.meta.warnings.length})</Text>
              </View>
              {data.meta.warnings.map((w, i) => (
                <Text key={i} style={styles.warnText}>
                  • {w}
                </Text>
              ))}
            </View>
          )}

          {/* ---- read-only view of the parsed curriculum ---- */}
          <View style={styles.tabsRow}>
            {years.map((y) => {
              const active = y === activeYear;
              return (
                <TouchableOpacity
                  key={y}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setActiveYear(y)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{ordinal(y)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.card, isMobile && styles.cardMobile]}>{renderYear()}</View>
        </>
      )}

      {/* ------------------------------ confirm dialog ------------------------------ */}
      <Modal visible={confirm !== null} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setConfirm(null)} />
          {confirm && (
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{confirmCopy[confirm].title}</Text>
              <Text style={styles.modalBody}>{confirmCopy[confirm].body}</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setConfirm(null)} activeOpacity={0.85}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={confirm === 'delete' ? styles.dangerSolidBtn : styles.primaryBtn}
                  onPress={confirmCopy[confirm].onPress}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>{confirmCopy[confirm].action}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* ------------------------------ busy overlay ------------------------------ */}
      <Modal visible={busy !== null && busy !== 'loading'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.busyCard]}>
            <ActivityIndicator color="#8B0000" size="large" />
            <Text style={styles.busyText}>{busyMessage}</Text>
          </View>
        </View>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
};

const styles = StyleSheet.create({
  headerCard: { backgroundColor: '#FFFFFF', borderRadius: 22, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  headerCardMobile: { borderRadius: 18, marginBottom: 14 },
  headerAccent: { height: 8, backgroundColor: '#8B0000' },
  headerContent: { paddingHorizontal: 22, paddingVertical: 20 },
  eyebrow: { fontSize: 12, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, color: '#8B0000', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 6 },
  pageTitle: { fontSize: 30, fontWeight: WEIGHT_TITLE, fontFamily: FONT_TITLE, color: '#111827', marginBottom: 6 },
  pageSubtitle: { fontSize: 14, color: '#6B7280', lineHeight: 21, fontFamily: FONT_BODY },

  card: { backgroundColor: '#FFFFFF', borderRadius: 22, borderWidth: 1, borderColor: '#E5E7EB', padding: 18, marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  cardMobile: { borderRadius: 18, padding: 14, marginBottom: 14 },
  cardTitle: { fontSize: 18, fontWeight: WEIGHT_TITLE, fontFamily: FONT_TITLE, color: '#111827' },
  cardSubtitle: { marginTop: 4, fontSize: 12, color: '#6B7280', fontFamily: FONT_BODY, lineHeight: 18 },
  fileLine: { marginTop: 10, fontSize: 14, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, color: '#111827' },

  centerBox: { alignItems: 'center', justifyContent: 'center', padding: 28, gap: 8 },
  mutedText: { color: '#6B7280', fontSize: 13, fontFamily: FONT_BODY },
  emptyCard: { alignItems: 'center', paddingVertical: 34, gap: 8 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#F8F0F0', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 17, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, color: '#111827' },
  emptyText: { fontSize: 13, color: '#6B7280', textAlign: 'center', fontFamily: FONT_BODY, lineHeight: 19, maxWidth: 460 },

  infoTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 16 },
  infoTopMobile: { flexDirection: 'column' },
  btnRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 14, justifyContent: 'center' },
  btnRowMobile: { alignSelf: 'stretch' },
  primaryBtn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#8B0000', borderRadius: 14, paddingHorizontal: 18 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, fontSize: 14 },
  secondaryBtn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F8F0F0', borderWidth: 1, borderColor: '#E8CCCC', borderRadius: 14, paddingHorizontal: 18 },
  secondaryBtnText: { color: '#8B0000', fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, fontSize: 14 },
  dangerBtn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF3F2', borderWidth: 1, borderColor: '#FECDCA', borderRadius: 14, paddingHorizontal: 18 },
  dangerBtnText: { color: '#B42318', fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, fontSize: 14 },
  dangerSolidBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#B42318', borderRadius: 14, paddingHorizontal: 18 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flexGrow: 1, flexBasis: 110, borderRadius: 14, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 10 },
  statValue: { marginTop: 3, fontSize: 17, color: '#111827', fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY },

  warnBox: { backgroundColor: '#FFFAEB', borderWidth: 1, borderColor: '#FEDF89', borderRadius: 16, padding: 14, marginBottom: 18, gap: 4 },
  warnHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  warnTitle: { color: '#B54708', fontSize: 14, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY },
  warnText: { color: '#B54708', fontSize: 12, lineHeight: 18, fontFamily: FONT_BODY },

  tabsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  tab: { flexGrow: 1, minWidth: 80, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', paddingVertical: 12, alignItems: 'center' },
  tabActive: { backgroundColor: '#8B0000', borderColor: '#8B0000' },
  tabText: { fontSize: 14, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, color: '#374151' },
  tabTextActive: { color: '#FFFFFF' },

  semBlock: { marginBottom: 20 },
  semHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  semTitle: { fontSize: 15, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, color: '#8B0000', textTransform: 'uppercase', letterSpacing: 0.6 },
  semUnits: { fontSize: 12, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, color: '#6B7280' },

  tableWrap: { borderWidth: 1, borderColor: '#111827', overflow: 'hidden' },
  tableRow: { flexDirection: 'row', minHeight: 44, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#D1D5DB' },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  tableHeader: { backgroundColor: '#F3F4F6', borderBottomColor: '#111827' },
  td: { paddingHorizontal: 10, paddingVertical: 10, borderRightWidth: 1, borderRightColor: '#D1D5DB', justifyContent: 'center' },
  tdText: { fontSize: 13, color: '#111827', fontFamily: FONT_BODY },
  tdBold: { fontSize: 13, color: '#111827', fontFamily: FONT_BODY, fontWeight: WEIGHT_EMPHASIS },
  tdCode: { flex: 1.1 },
  tdTitle: { flex: 3 },
  tdPrereq: { flex: 1.6 },
  tdSmall: { flex: 0.5, textAlign: 'center' },
  lastCell: { borderRightWidth: 0 },
  th: { fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, color: '#111827', fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },

  mobileCard: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, backgroundColor: '#FFFFFF', padding: 12 },
  mobileCode: { fontSize: 16, color: '#111827', fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, marginBottom: 4 },
  mobileTitle: { fontSize: 14, lineHeight: 20, color: '#374151', fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, marginBottom: 10 },
  mobileMetaRow: { flexDirection: 'row', gap: 8 },
  metaBox: { flex: 1, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 8 },
  metaLabel: { fontSize: 10, color: '#6B7280', fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, textTransform: 'uppercase', marginBottom: 2 },
  metaValue: { fontSize: 13, color: '#111827', fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(43, 17, 17, 0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#EBD4D4', padding: 22 },
  modalTitle: { fontSize: 20, fontWeight: WEIGHT_TITLE, fontFamily: FONT_TITLE, color: '#2B1111', marginBottom: 8 },
  modalBody: { fontSize: 14, lineHeight: 21, color: '#6B7280', fontFamily: FONT_BODY, marginBottom: 18 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  busyCard: { alignItems: 'center', gap: 14, maxWidth: 340 },
  busyText: { fontSize: 14, lineHeight: 20, color: '#374151', textAlign: 'center', fontFamily: FONT_BODY },
});

export default ProspectusManager;