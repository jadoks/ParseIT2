import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    AppState,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "./Toast";

// ─── Types ───────────────────────────────────────────────────────────────────

type RosterType = "students" | "teachers";
type ToastType = "success" | "error" | "info";

type RosterRecord = {
  userId: string;
  firstName: string;
  lastName: string;
  birthday: string; // YYYY-MM-DD
  registered: boolean;
};

type UploadIssue = { row: string; message: string };

type UploadResult = {
  fileName: string;
  added: number;
  updated: number;
  skipped: number;
  errorCount: number;
  errors: UploadIssue[];
  ignoredLines?: number;
};

type UploadConfig = {
  maxFileSizeBytes: number;
  allowedExtensions: string[];
};

type Props = {
  width: number;
  apiBaseUrl: string;
};

// The server is the source of truth (GET /admin/user-data/config). These are
// only used until that request comes back, or if it fails.
const DEFAULT_CONFIG: UploadConfig = {
  maxFileSizeBytes: 5 * 1024 * 1024,
  allowedExtensions: [".doc", ".docx", ".pdf", ".xls", ".xlsx", ".csv"],
};

const PICKER_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/comma-separated-values",
  "application/csv",
];

const PAGE_SIZE = 20;
const ISSUES_PREVIEW = 10;

// ─── Live polling ────────────────────────────────────────────────────────────
// Every POLL_INTERVAL_MS we ask the server for a tiny count summary. The full
// list is only downloaded when those counts changed (or every FULL_REFRESH_MS
// as a safety net for edits that don't change a count, e.g. a re-upload that
// fixes a name). Polling pauses while the app/tab is in the background.
const POLL_INTERVAL_MS = 5000;
const FULL_REFRESH_MS = 60000;
const OFFLINE_AFTER_FAILURES = 3;
const HIGHLIGHT_MS = 8000; // how long a "just registered" row stays highlighted

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getExtension(fileName: string): string {
  const match = /\.[a-z0-9]+$/i.exec(fileName || "");
  return match ? match[0].toLowerCase() : "";
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** YYYY-MM-DD -> MM/DD/YYYY (the format used on the Register screen). */
function formatBirthday(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return match ? `${match[2]}/${match[3]}/${match[1]}` : iso || "—";
}

function formatExtensionList(extensions: string[]): string {
  return extensions.map((e) => e.replace(".", "").toUpperCase()).join(", ");
}

/** Cheap change detector so identical poll results never trigger a re-render. */
function listSignature(list: RosterRecord[]): string {
  return list
    .map((r) => `${r.userId}|${r.registered ? 1 : 0}|${r.firstName}|${r.lastName}|${r.birthday}`)
    .join("\n");
}

async function readJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

// ─── One list (students or teachers) ─────────────────────────────────────────

type RosterCardProps = {
  type: RosterType;
  title: string;
  singular: string;
  addLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  records: RosterRecord[];
  loading: boolean;
  isUploading: boolean;
  uploadLocked: boolean;
  result: UploadResult | null;
  isWide: boolean;
  highlightIds: Record<string, boolean>;
  onAdd: () => void;
  onDelete: (record: RosterRecord) => void;
};

function RosterCard({
  title,
  singular,
  addLabel,
  icon,
  records,
  loading,
  isUploading,
  uploadLocked,
  result,
  isWide,
  highlightIds,
  onAdd,
  onDelete,
}: RosterCardProps) {
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showAllIssues, setShowAllIssues] = useState(false);

  const query = search.trim().toLowerCase();
  const filtered = query
    ? records.filter(
        (r) =>
          r.userId.toLowerCase().includes(query) ||
          `${r.firstName} ${r.lastName}`.toLowerCase().includes(query) ||
          `${r.lastName} ${r.firstName}`.toLowerCase().includes(query)
      )
    : records;
  const visible = filtered.slice(0, visibleCount);
  const registeredCount = records.filter((r) => r.registered).length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query]);

  useEffect(() => {
    setShowAllIssues(false);
  }, [result]);

  const issues = result?.errors || [];
  const shownIssues = showAllIssues ? issues : issues.slice(0, ISSUES_PREVIEW);

  return (
    <View style={[styles.card, isWide && styles.cardWide]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconBox}>
          <Ionicons name={icon} size={22} color="#8B0000" />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>
            {loading
              ? "Loading list..."
              : `${records.length} on the list, ${registeredCount} registered`}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, uploadLocked && styles.primaryButtonDisabled]}
        onPress={onAdd}
        disabled={uploadLocked}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={addLabel}
      >
        {isUploading ? (
          <>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Uploading...</Text>
          </>
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={19} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>{addLabel}</Text>
          </>
        )}
      </TouchableOpacity>

      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultFile} numberOfLines={1}>
            {result.fileName}
          </Text>
          <View style={styles.resultChips}>
            <View style={[styles.resultChip, styles.resultChipGood]}>
              <Text style={[styles.resultChipText, styles.resultChipTextGood]}>
                {result.added} added
              </Text>
            </View>
            <View style={styles.resultChip}>
              <Text style={styles.resultChipText}>{result.updated} updated</Text>
            </View>
            {result.skipped > 0 && (
              <View style={[styles.resultChip, styles.resultChipWarn]}>
                <Text style={[styles.resultChipText, styles.resultChipTextWarn]}>
                  {result.skipped} skipped
                </Text>
              </View>
            )}
          </View>

          {!!result.ignoredLines && result.ignoredLines > 0 && (
            <Text style={styles.resultNote}>
              {result.ignoredLines} line{result.ignoredLines > 1 ? "s" : ""} without a
              birthday were ignored (titles, headings, page numbers).
            </Text>
          )}

          {issues.length > 0 && (
            <View style={styles.issuesBox}>
              <Text style={styles.issuesTitle}>Fix these rows and upload again</Text>
              {shownIssues.map((issue, index) => (
                <Text key={`${issue.row}-${index}`} style={styles.issueText}>
                  {issue.row}: {issue.message}
                </Text>
              ))}
              {result.errorCount > shownIssues.length && !showAllIssues && (
                <TouchableOpacity onPress={() => setShowAllIssues(true)} activeOpacity={0.8}>
                  <Text style={styles.linkText}>
                    Show all {issues.length}
                    {result.errorCount > issues.length
                      ? ` (of ${result.errorCount} issues)`
                      : ""}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#A07C7C" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={`Search ${title.toLowerCase()} by name or ID`}
          placeholderTextColor="#B79A9A"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#A07C7C" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.emptyBox}>
          <ActivityIndicator color="#8B0000" />
        </View>
      ) : records.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="document-text-outline" size={30} color="#C9A3A3" />
          <Text style={styles.emptyTitle}>No {title.toLowerCase()} on the list yet</Text>
          <Text style={styles.emptyText}>
            Choose {addLabel} to upload your {singular} list. Nobody can register as a{" "}
            {singular} until they appear here.
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No match for "{search.trim()}".</Text>
        </View>
      ) : (
        <View>
          {visible.map((record) => (
            <View key={record.userId} style={styles.recordRow}>
              <View style={styles.recordBody}>
                <Text style={styles.recordName} numberOfLines={1}>
                  {record.lastName}, {record.firstName}
                </Text>
                <View style={styles.recordMetaRow}>
                  <Text style={styles.recordMeta}>ID {record.userId}</Text>
                  <Text style={styles.recordMeta}>Born {formatBirthday(record.birthday)}</Text>
                  <View
                    style={[
                      styles.statusChip,
                      record.registered && styles.statusChipDone,
                      record.registered && highlightIds[record.userId] && styles.statusChipFresh,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        record.registered && styles.statusChipTextDone,
                      ]}
                    >
                      {record.registered
                        ? highlightIds[record.userId]
                          ? "Registered · just now"
                          : "Registered"
                        : "Not registered"}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => onDelete(record)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${record.firstName} ${record.lastName} from the list`}
              >
                <Ionicons name="trash-outline" size={18} color="#8B0000" />
              </TouchableOpacity>
            </View>
          ))}

          {filtered.length > visible.length && (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={() => setVisibleCount((c) => c + PAGE_SIZE)}
              activeOpacity={0.85}
            >
              <Text style={styles.showMoreText}>
                Show {Math.min(PAGE_SIZE, filtered.length - visible.length)} more (
                {filtered.length - visible.length} remaining)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ManageUserData({ width, apiBaseUrl }: Props) {
  const isMobile = width < 768;
  const isWide = width >= 1000;

  const [config, setConfig] = useState<UploadConfig>(DEFAULT_CONFIG);
  const [records, setRecords] = useState<Record<RosterType, RosterRecord[]>>({
    students: [],
    teachers: [],
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<RosterType | null>(null);
  const [results, setResults] = useState<Record<RosterType, UploadResult | null>>({
    students: null,
    teachers: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<{
    type: RosterType;
    record: RosterRecord;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false,
    message: "",
    type: "success",
  });

  const showToast = useCallback(
    (message: string, type: ToastType = "success") =>
      setToast({ visible: true, message, type }),
    []
  );

  // Live-polling bookkeeping (refs so the interval never sees stale values).
  const recordsRef = useRef<Record<RosterType, RosterRecord[]>>({ students: [], teachers: [] });
  const busyRef = useRef(false); // an upload/delete is running: don't poll over it
  const mutationVersion = useRef(0); // bumped after every upload/delete
  const inFlightRef = useRef(false);
  const failuresRef = useRef(0);
  const lastFullAtRef = useRef(0);
  const lastSummaryRef = useRef<Record<RosterType, string | null>>({
    students: null,
    teachers: null,
  });
  const highlightTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [liveState, setLiveState] = useState<"live" | "offline">("live");
  const [justRegistered, setJustRegistered] = useState<Record<string, boolean>>({});

  const request = useCallback(
    (path: string, init: RequestInit = {}) =>
      // Same session-cookie auth the rest of the admin app uses.
      fetch(`${apiBaseUrl}${path}`, { credentials: "include", ...init }),
    [apiBaseUrl]
  );

  const fetchList = useCallback(
    async (type: RosterType): Promise<RosterRecord[]> => {
      const response = await request(`/admin/user-data/${type}`);
      const body = await readJson(response);
      if (!response.ok) throw new Error(body?.error || "Could not load the list.");
      return body.records || [];
    },
    [request]
  );

  /**
   * Commits a list to state only if it actually changed. With `announce`, rows
   * that flipped Not registered -> Registered get highlighted and toasted.
   */
  const applyRecords = useCallback(
    (type: RosterType, next: RosterRecord[], announce: boolean) => {
      const prev = recordsRef.current[type];
      if (listSignature(prev) === listSignature(next)) return;

      if (announce) {
        const wasRegistered = new Map(prev.map((r) => [r.userId, r.registered]));
        const newly = next.filter((r) => r.registered && wasRegistered.get(r.userId) === false);
        if (newly.length) {
          const ids = newly.map((r) => r.userId);
          setJustRegistered((cur) => {
            const copy = { ...cur };
            ids.forEach((id) => (copy[id] = true));
            return copy;
          });
          highlightTimers.current.push(
            setTimeout(() => {
              setJustRegistered((cur) => {
                const copy = { ...cur };
                ids.forEach((id) => delete copy[id]);
                return copy;
              });
            }, HIGHLIGHT_MS)
          );

          const first = `${newly[0].firstName} ${newly[0].lastName}`.trim();
          showToast(
            newly.length === 1
              ? `${first} just registered.`
              : `${first} and ${newly.length - 1} other${newly.length > 2 ? "s" : ""} just registered.`,
            "success"
          );
        }
      }

      recordsRef.current = { ...recordsRef.current, [type]: next };
      setRecords(recordsRef.current);
    },
    [showToast]
  );

  const loadList = useCallback(
    async (type: RosterType) => {
      applyRecords(type, await fetchList(type), false);
    },
    [fetchList, applyRecords]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const configResponse = await request("/admin/user-data/config");
        if (configResponse.ok) {
          const body = await readJson(configResponse);
          if (!cancelled && body?.maxFileSizeBytes && Array.isArray(body?.allowedExtensions)) {
            setConfig({
              maxFileSizeBytes: body.maxFileSizeBytes,
              allowedExtensions: body.allowedExtensions,
            });
          }
        }
        await Promise.all([loadList("students"), loadList("teachers")]);
      } catch (error: any) {
        if (!cancelled) {
          showToast(error?.message || "Could not load user data. Check your connection.", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [request, loadList]);

  const pollOnce = useCallback(
    async (force = false) => {
      if (inFlightRef.current || busyRef.current) return;
      inFlightRef.current = true;
      const versionAtStart = mutationVersion.current;

      try {
        const response = await request("/admin/user-data/summary");
        const body = await readJson(response);
        if (!response.ok) throw new Error(body?.error || "Live update failed.");

        const now = Date.now();
        const stale = now - lastFullAtRef.current >= FULL_REFRESH_MS;
        const types: RosterType[] = ["students", "teachers"];
        const changed = types.filter(
          (t) => force || stale || JSON.stringify(body[t]) !== lastSummaryRef.current[t]
        );

        if (changed.length) {
          const lists = await Promise.all(changed.map((t) => fetchList(t)));
          // An upload/delete finished while we were fetching: this data may be
          // older than what's on screen. Drop it; the next tick re-syncs.
          if (busyRef.current || versionAtStart !== mutationVersion.current) return;
          changed.forEach((t, i) => {
            applyRecords(t, lists[i], true);
            lastSummaryRef.current[t] = JSON.stringify(body[t]);
          });
          if (stale || force) lastFullAtRef.current = now;
        }

        failuresRef.current = 0;
        setLiveState("live"); // no-op re-render when already "live"
      } catch {
        failuresRef.current += 1;
        if (failuresRef.current >= OFFLINE_AFTER_FAILURES) setLiveState("offline");
      } finally {
        inFlightRef.current = false;
      }
    },
    [request, fetchList, applyRecords]
  );

  useEffect(() => {
    if (loading) return; // wait for the first full load

    lastFullAtRef.current = Date.now();
    const tick = () => {
      if (AppState.currentState === "active") pollOnce();
    };
    const timer = setInterval(tick, POLL_INTERVAL_MS);
    // Catch up immediately when the tab/app comes back to the foreground.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") pollOnce();
    });

    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [loading, pollOnce]);

  useEffect(
    () => () => {
      highlightTimers.current.forEach(clearTimeout);
    },
    []
  );

  const handleAdd = async (type: RosterType) => {
    if (uploading) return;

    let picked: DocumentPicker.DocumentPickerResult;
    try {
      picked = await DocumentPicker.getDocumentAsync({
        type: PICKER_MIME_TYPES,
        multiple: false,
        copyToCacheDirectory: true,
      });
    } catch {
      showToast("Could not open the file picker. Please try again.", "error");
      return;
    }

    if (picked.canceled || !picked.assets?.length) return;
    const asset = picked.assets[0];

    // Check on the device first so a wrong file fails instantly. The server
    // enforces the same rules again — this is only for a faster message.
    const extension = getExtension(asset.name);
    if (!config.allowedExtensions.includes(extension)) {
      showToast(
        `${extension ? extension.toUpperCase() : "That"} files aren't accepted. Choose a ${formatExtensionList(
          config.allowedExtensions
        )} file.`,
        "error"
      );
      return;
    }
    if (typeof asset.size === "number" && asset.size > config.maxFileSizeBytes) {
      showToast(
        `That file is ${formatBytes(asset.size)}. The limit is ${formatBytes(
          config.maxFileSizeBytes
        )}. Split the list into smaller files.`,
        "error"
      );
      return;
    }

    setUploading(type);
    busyRef.current = true;
    try {
      const form = new FormData();
      if (Platform.OS === "web") {
        const blob: Blob = (asset as any).file ?? (await (await fetch(asset.uri)).blob());
        (form as any).append("file", blob, asset.name);
      } else {
        form.append("file", {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
        } as any);
      }

      // No Content-Type header: fetch adds the multipart boundary itself.
      const response = await request(`/admin/user-data/${type}/upload`, {
        method: "POST",
        body: form,
      });
      const body = await readJson(response);

      if (!response.ok) {
        // Even a rejected file can carry row-level detail (e.g. "no valid rows").
        if (Array.isArray(body?.errors) && body.errors.length) {
          setResults((prev) => ({
            ...prev,
            [type]: {
              fileName: asset.name,
              added: 0,
              updated: 0,
              skipped: body.errorCount ?? body.errors.length,
              errorCount: body.errorCount ?? body.errors.length,
              errors: body.errors,
            },
          }));
        }
        throw new Error(
          body?.error ||
            (response.status === 413
              ? `That file is too large. The limit is ${formatBytes(config.maxFileSizeBytes)}.`
              : "Upload failed. Please try again.")
        );
      }

      setResults((prev) => ({ ...prev, [type]: body as UploadResult }));
      await loadList(type);

      const saved = (body.added || 0) + (body.updated || 0);
      showToast(
        body.skipped > 0
          ? `Saved ${saved} ${type}. ${body.skipped} row${body.skipped > 1 ? "s were" : " was"} skipped.`
          : `Saved ${saved} ${type}.`,
        body.skipped > 0 ? "info" : "success"
      );
    } catch (error: any) {
      showToast(error?.message || "Upload failed. Please try again.", "error");
    } finally {
      busyRef.current = false;
      mutationVersion.current += 1;
      setUploading(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { type, record } = deleteTarget;

    setDeleting(true);
    busyRef.current = true;
    try {
      const response = await request(
        `/admin/user-data/${type}/${encodeURIComponent(record.userId)}`,
        { method: "DELETE" }
      );
      const body = await readJson(response);
      if (!response.ok) throw new Error(body?.error || "Could not remove that record.");

      applyRecords(
        type,
        recordsRef.current[type].filter((r) => r.userId !== record.userId),
        false
      );
      showToast(`Removed ${record.firstName} ${record.lastName} from the list.`);
      setDeleteTarget(null);
    } catch (error: any) {
      showToast(error?.message || "Could not remove that record.", "error");
    } finally {
      busyRef.current = false;
      mutationVersion.current += 1;
      setDeleting(false);
    }
  };

  const maxSizeLabel = formatBytes(config.maxFileSizeBytes);
  const typesLabel = formatExtensionList(config.allowedExtensions);

  return (
    <View>
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>User Data Management</Text>
        {!loading && (
          <View style={[styles.livePill, liveState === "offline" && styles.livePillOffline]}>
            <View style={[styles.liveDot, liveState === "offline" && styles.liveDotOffline]} />
            <Text style={[styles.liveText, liveState === "offline" && styles.liveTextOffline]}>
              {liveState === "live" ? "Live" : "Reconnecting..."}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.pageSubtitle}>
        Upload the official student and teacher lists. Only people on these lists can create an
        account.
      </Text>

      <View style={styles.rulesBox}>
        <View style={styles.ruleRow}>
          <Ionicons name="list-outline" size={18} color="#8B0000" />
          <Text style={styles.ruleText}>
            <Text style={styles.ruleStrong}>Columns: </Text>
            First Name, Last Name, User ID, Birthday
          </Text>
        </View>
        <View style={styles.ruleRow}>
          <Ionicons name="document-attach-outline" size={18} color="#8B0000" />
          <Text style={styles.ruleText}>
            <Text style={styles.ruleStrong}>Accepted files: </Text>
            {typesLabel}, up to {maxSizeLabel}
          </Text>
        </View>
        <View style={styles.ruleRow}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#8B0000" />
          <Text style={styles.ruleText}>
            <Text style={styles.ruleStrong}>At sign-up: </Text>
            the User ID, name, and birthday must match the list, or the account is not created.
          </Text>
        </View>
        <View style={styles.ruleRow}>
          <Ionicons name="bulb-outline" size={18} color="#8B0000" />
          <Text style={styles.ruleText}>
            Excel or CSV files are read most reliably. PDF and Word files work best when the list
            is a table.
          </Text>
        </View>
      </View>

      <View style={[styles.cardsRow, isWide && styles.cardsRowWide]}>
        <RosterCard
          type="students"
          title="Students"
          singular="student"
          addLabel="Add Student Data"
          icon="school-outline"
          records={records.students}
          loading={loading}
          isUploading={uploading === "students"}
          uploadLocked={uploading !== null}
          result={results.students}
          isWide={isWide}
          highlightIds={justRegistered}
          onAdd={() => handleAdd("students")}
          onDelete={(record) => setDeleteTarget({ type: "students", record })}
        />
        <RosterCard
          type="teachers"
          title="Teachers"
          singular="teacher"
          addLabel="Add Teacher Data"
          icon="person-outline"
          records={records.teachers}
          loading={loading}
          isUploading={uploading === "teachers"}
          uploadLocked={uploading !== null}
          result={results.teachers}
          isWide={isWide}
          highlightIds={justRegistered}
          onAdd={() => handleAdd("teachers")}
          onDelete={(record) => setDeleteTarget({ type: "teachers", record })}
        />
      </View>

      <Modal
        visible={deleteTarget !== null}
        animationType="fade"
        transparent
        onRequestClose={() => !deleting && setDeleteTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => !deleting && setDeleteTarget(null)}
          />
          <View style={[styles.modalCard, isMobile && styles.modalCardMobile]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <Ionicons name="trash-outline" size={22} color="#8B0000" />
              </View>
              <Text style={styles.modalTitle}>Remove from list</Text>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.modalMessage}>
                Remove {deleteTarget?.record.firstName} {deleteTarget?.record.lastName} (ID{" "}
                {deleteTarget?.record.userId}) from the {deleteTarget?.type === "teachers" ? "teacher" : "student"}{" "}
                list? They won't be able to register unless you add them again.
                {deleteTarget?.record.registered
                  ? " Their existing account is not affected."
                  : ""}
              </Text>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => setDeleteTarget(null)}
                disabled={deleting}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDangerButton}
                onPress={confirmDelete}
                disabled={deleting}
                activeOpacity={0.85}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalDangerButtonText}>Remove</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <Toast
            visible={toast.visible && deleteTarget !== null}
            message={toast.message}
            type={toast.type}
            onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
          />
        </View>
      </Modal>

      <Toast
        visible={toast.visible && deleteTarget === null}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

// ─── Styles (same palette as the other admin screens) ────────────────────────

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2B1111",
    marginRight: 12,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E4F3E8",
  },
  livePillOffline: {
    backgroundColor: "#FBE9D0",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1E9B4F",
    marginRight: 6,
  },
  liveDotOffline: {
    backgroundColor: "#D98A1F",
  },
  liveText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E6B3A",
  },
  liveTextOffline: {
    color: "#8A5200",
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "#8A6F6F",
    marginBottom: 18,
    maxWidth: 640,
  },

  rulesBox: {
    backgroundColor: "#FAF5F5",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EBD4D4",
    padding: 16,
    marginBottom: 20,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 5,
  },
  ruleText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    lineHeight: 20,
    color: "#7A4A4A",
  },
  ruleStrong: {
    fontWeight: "800",
    color: "#2B1111",
  },

  cardsRow: {
    flexDirection: "column",
  },
  cardsRowWide: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EBD4D4",
    padding: 20,
    marginBottom: 20,
  },
  cardWide: {
    flex: 1,
    marginHorizontal: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F1E0E0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2B1111",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#8A6F6F",
    marginTop: 2,
  },

  primaryButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#8B0000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    marginLeft: 8,
  },

  resultBox: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EBD4D4",
    backgroundColor: "#FAF5F5",
    padding: 14,
  },
  resultFile: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2B1111",
    marginBottom: 8,
  },
  resultChips: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  resultChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#F1E0E0",
    marginRight: 8,
    marginBottom: 4,
  },
  resultChipGood: {
    backgroundColor: "#E4F3E8",
  },
  resultChipWarn: {
    backgroundColor: "#FBE9D0",
  },
  resultChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7A4A4A",
  },
  resultChipTextGood: {
    color: "#1E6B3A",
  },
  resultChipTextWarn: {
    color: "#8A5200",
  },
  resultNote: {
    fontSize: 12,
    lineHeight: 18,
    color: "#8A6F6F",
    marginTop: 6,
  },
  issuesBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EBD4D4",
  },
  issuesTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 6,
  },
  issueText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#7A4A4A",
    marginBottom: 3,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8B0000",
    marginTop: 4,
  },

  searchWrap: {
    marginTop: 16,
    marginBottom: 6,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EBD4D4",
    backgroundColor: "#FAF5F5",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#2B1111",
    paddingVertical: 0,
  },

  emptyBox: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2B1111",
    marginTop: 10,
    marginBottom: 4,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#8A6F6F",
    textAlign: "center",
    maxWidth: 320,
  },

  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3E6E6",
  },
  recordBody: {
    flex: 1,
    paddingRight: 10,
  },
  recordName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2B1111",
  },
  recordMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 4,
  },
  recordMeta: {
    fontSize: 12,
    color: "#8A6F6F",
    marginRight: 12,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#F3E6E6",
  },
  statusChipDone: {
    backgroundColor: "#E4F3E8",
  },
  statusChipFresh: {
    borderWidth: 1,
    borderColor: "#1E9B4F",
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8A6F6F",
  },
  statusChipTextDone: {
    color: "#1E6B3A",
  },
  deleteButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FAF5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  showMoreButton: {
    marginTop: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2BFBF",
    backgroundColor: "#FAF5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7A4A4A",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(43, 17, 17, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#EBD4D4",
    overflow: "hidden",
  },
  modalCardMobile: {
    maxWidth: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3E6E6",
  },
  modalIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F1E0E0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2B1111",
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: "#7A4A4A",
  },
  modalFooter: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 22,
    flexDirection: "row",
    justifyContent: "center",
  },
  modalSecondaryButton: {
    height: 46,
    paddingHorizontal: 32,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2BFBF",
    backgroundColor: "#FAF5F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  modalSecondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7A4A4A",
  },
  modalDangerButton: {
    height: 46,
    minWidth: 120,
    paddingHorizontal: 32,
    borderRadius: 14,
    backgroundColor: "#8B0000",
    alignItems: "center",
    justifyContent: "center",
  },
  modalDangerButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});