import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  DimensionValue,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";

const apiFetch = (url: string, options: any = {}) =>
  fetch(url, {
    credentials: 'include',
    ...options,
  });

type AnalyticsProps = {
  width: number;
  apiBaseUrl?: string;
};

type SummaryCardProps = {
  label: string;
  value: string;
  trend: string;
  widthValue: DimensionValue;
  tone?: "default" | "danger" | "success" | "warning";
  onInfoPress?: () => void;
};

type SectionCardProps = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  widthValue?: DimensionValue;
  onInfoPress?: () => void;
};

type ProgressBarProps = {
  label: string;
  value: number;
  suffix?: string;
};

type AdminAnalyticsPayload = {
  generatedAt?: string;
  totals: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    monitoredStudents: number;
    evaluatedStudents: number;
    totalClassEnrollments?: number;
  };
  summary: {
    departmentAverage: number;
    atRiskCount: number;
    highRiskCount: number;
    moderateRiskCount: number;
    lowRiskCount: number;
    noDataCount: number;
    passRate: number;
    failRate: number;
    backlogCount: number;
    completionRate: number;
    assignmentCompletionRate: number;
    onTimeSubmissionRate: number;
    totalPendingAssignments: number;
    totalSubmittedAssignments: number;
    totalMissingAssignments: number;
    totalGradedAssignments: number;
  };
  sectionComparison: {
    label: string;
    value: number;
    students: number;
    enrollmentCount?: number;
    evaluatedStudents?: number;
    missing: number;
  }[];
  yearLevelComparison: {
    label: string;
    value: number;
    students: number;
    enrollmentCount?: number;
    evaluatedStudents?: number;
    missing: number;
  }[];
  subjectDifficulty: {
    subject: string;
    average: number;
    gradedCount: number;
    pendingCount: number;
    missingCount: number;
    difficulty: string;
  }[];
  atRiskStudents: {
    studentId: string;
    studentName: string;
    section: string;
    className: string;
    average: number;
    pendingCount: number;
    missingCount: number;
    gradedCount: number;
    riskLevel: string;
    reason: string;
  }[];
  trend: {
    label: string;
    average: number;
    count: number;
  }[];
  suggestions: {
    title: string;
    text: string;
  }[];
  availableSchoolYears?: string[];
  availableSemesters?: string[];
};

const emptyAnalytics: AdminAnalyticsPayload = {
  totals: {
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    monitoredStudents: 0,
    evaluatedStudents: 0,
    totalClassEnrollments: 0,
  },
  summary: {
    departmentAverage: 0,
    atRiskCount: 0,
    highRiskCount: 0,
    moderateRiskCount: 0,
    lowRiskCount: 0,
    noDataCount: 0,
    passRate: 0,
    failRate: 0,
    backlogCount: 0,
    completionRate: 0,
    assignmentCompletionRate: 0,
    onTimeSubmissionRate: 0,
    totalPendingAssignments: 0,
    totalSubmittedAssignments: 0,
    totalMissingAssignments: 0,
    totalGradedAssignments: 0,
  },
  sectionComparison: [],
  yearLevelComparison: [],
  subjectDifficulty: [],
  atRiskStudents: [],
  trend: [],
  suggestions: [],
  availableSchoolYears: [],
  availableSemesters: [],
};

type InfoKey =
  | "passRate"
  | "failRate"
  | "departmentAverage"
  | "trend"
  | "submissionCompletion"
  | "gradingCompletion"
  | "sectionComparison"
  | "yearComparison"
  | "subjectDifficulty"
  | "suggestions"
  | "riskPopulation";

type InfoItem = {
  label: string;
  live?: string; // the value currently shown on screen
  formula: string; // how it is computed
  source: string; // where the data comes from
  note?: string; // caveat worth knowing
};

type InfoContent = { title: string; summary: string; items: InfoItem[] };

function InfoButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="How is this calculated?"
      style={styles.infoButton}
    >
      <Ionicons name="help-circle-outline" size={18} color="#A07C7C" />
    </Pressable>
  );
}

function TrendMetricLabel({
  label,
  onInfoPress,
}: {
  label: string;
  onInfoPress: () => void;
}) {
  return (
    <View style={styles.trendMetricLabelRow}>
      <Text style={styles.trendMetricLabel}>{label}</Text>
      <InfoButton onPress={onInfoPress} />
    </View>
  );
}

function SummaryCard({
  label,
  value,
  trend,
  widthValue,
  tone = "default",
  onInfoPress,
}: SummaryCardProps) {
  return (
    <View
      style={[
        styles.summaryCard,
        { width: widthValue },
        tone === "danger" && styles.summaryCardDanger,
        tone === "success" && styles.summaryCardSuccess,
        tone === "warning" && styles.summaryCardWarning,
      ]}
    >
      <View style={styles.summaryLabelRow}>
        <Text style={[styles.summaryLabel, { marginBottom: 0 }]}>{label}</Text>
        {onInfoPress ? <InfoButton onPress={onInfoPress} /> : null}
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text
        style={[
          styles.summaryTrend,
          tone === "danger" && styles.summaryTrendDanger,
          tone === "success" && styles.summaryTrendSuccess,
          tone === "warning" && styles.summaryTrendWarning,
        ]}
      >
        {trend}
      </Text>
    </View>
  );
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
  widthValue = "100%",
  onInfoPress,
}: SectionCardProps) {
  return (
    <View style={[styles.sectionCard, { width: widthValue }]}>
      <View style={styles.sectionCardHeader}>
        <View
          style={[
            styles.sectionCardHeaderLeft,
            widthValue === "100%" && styles.sectionCardHeaderLeftWide,
          ]}
        >
          <View style={styles.iconBox}>{icon}</View>

          <View style={styles.sectionCardHeaderTextWrap}>
            <View style={styles.sectionCardTitleRow}>
              <Text style={[styles.sectionCardTitle, { marginBottom: 0, flexShrink: 1 }]}>{title}</Text>
              {onInfoPress ? <InfoButton onPress={onInfoPress} /> : null}
            </View>
            <Text style={styles.sectionCardSubtitle}>{subtitle}</Text>
          </View>
        </View>
      </View>

      {children}
    </View>
  );
}

function ProgressBar({ label, value, suffix = "%" }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <View style={styles.progressBlock}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressValue}>
          {safeValue}
          {suffix}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${safeValue}%` }]} />
      </View>
    </View>
  );
}

function StatRow({
  label,
  value,
  tone = "default",
  onInfoPress,
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "success" | "warning";
  onInfoPress?: () => void;
}) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statRowLabelWrap}>
        <Text style={[styles.statRowLabel, { flex: 0, paddingRight: 0, flexShrink: 1 }]}>{label}</Text>
        {onInfoPress ? <InfoButton onPress={onInfoPress} /> : null}
      </View>
      <Text
        style={[
          styles.statRowValue,
          tone === "danger" && styles.statRowValueDanger,
          tone === "success" && styles.statRowValueSuccess,
          tone === "warning" && styles.statRowValueWarning,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function StudentRiskItem({
  name,
  section,
  average,
  reason,
  riskLevel,
  isMobile = false,
}: {
  name: string;
  section: string;
  average: string;
  reason: string;
  riskLevel: string;
  isMobile?: boolean;
}) {
  const isHigh = riskLevel === "High";

  return (
    <View
      style={[
        styles.riskCard,
        isMobile && styles.riskCardMobile,
        isHigh && styles.riskCardHigh,
      ]}
    >
      <View style={[styles.riskTopRow, isMobile && styles.riskTopRowMobile]}>
        <View style={[styles.riskTextWrap, isMobile && styles.riskTextWrapMobile]}>
          <Text style={styles.riskName}>{name}</Text>
          <View style={styles.riskTagContainer}>
            {section
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
              .map((item, index) => (
                <View key={`${item}-${index}`} style={styles.riskTag}>
                  <Text style={styles.riskTagText}>{item}</Text>
                </View>
              ))}
          </View>
        </View>

        <View
          style={[
            styles.riskBadge,
            isMobile && styles.riskBadgeMobile,
            isHigh && styles.riskBadgeHigh,
          ]}
        >
          <Text style={styles.riskBadgeText}>{average}</Text>
        </View>
      </View>

      <Text style={styles.riskReason}>{reason}</Text>
    </View>
  );
}

function AcademicTrendChart({
  data,
  width,
  completionRate,
  assignmentCompletionRate,
  departmentAverage,
  onInfo,
}: {
  data: AdminAnalyticsPayload["trend"];
  width: number;
  completionRate: number;
  assignmentCompletionRate: number;
  departmentAverage: number;
  onInfo: (key: InfoKey) => void;
}) {
  const isSmall = width < 768;
  const isVerySmall = width < 480;

  // Calculate available width considering parent paddings
  // SectionCard padding: 20 * 2 = 40
  // trendChartShell padding: 12 * 2 = 24
  // Total horizontal padding = 64
  const availableWidth = Math.max(250, width - 64);
  const chartWidth = availableWidth;
  
  const chartHeight = isSmall ? 250 : 280;
  
  // Adjust paddings dynamically for very small screens to maximize graph space
  const paddingLeft = isVerySmall ? 28 : isSmall ? 36 : 42;
  const paddingRight = isVerySmall ? 8 : isSmall ? 12 : 20;
  const paddingTop = 26;
  const paddingBottom = isSmall ? 40 : 54;
  
  const graphWidth = Math.max(0, chartWidth - paddingLeft - paddingRight);
  const graphHeight = Math.max(0, chartHeight - paddingTop - paddingBottom);

  const validData = data.filter(
    (item) => Number.isFinite(item.average) && item.count > 0
  );

  if (validData.length === 0) {
    return (
      <View style={styles.trendEmptyState}>
        <Ionicons name="analytics-outline" size={30} color="#A07C7C" />
        <Text style={styles.trendEmptyTitle}>No assignment trend yet</Text>
        <Text style={styles.trendEmptyText}>
          The line chart will appear after graded assignments are available.
        </Text>
      </View>
    );
  }

  if (validData.length === 1) {
    return (
      <View style={styles.trendOneRow}>
        <View style={styles.singleTrendCard}>
          <Text style={styles.singleTrendLabel}>{validData[0].label}</Text>
          <Text style={styles.singleTrendValue}>{validData[0].average}%</Text>
          <Text style={styles.singleTrendText}>
            Only one graded assignment point is available. More graded assignments
            are needed to form a trend line.
          </Text>
        </View>

        <View style={styles.trendMetricGridInline}>
          <View style={styles.trendMetricCard}>
            <Text style={styles.trendMetricValue}>{completionRate}%</Text>
            <TrendMetricLabel label="Submission Completion" onInfoPress={() => onInfo("submissionCompletion")} />
          </View>

          <View style={styles.trendMetricCard}>
            <Text style={styles.trendMetricValue}>
              {assignmentCompletionRate}%
            </Text>
            <TrendMetricLabel label="Grading Completion" onInfoPress={() => onInfo("gradingCompletion")} />
          </View>

          <View style={styles.trendMetricCard}>
            <Text style={styles.trendMetricValue}>{departmentAverage}%</Text>
            <TrendMetricLabel label="Institution Average" onInfoPress={() => onInfo("departmentAverage")} />
          </View>
        </View>
      </View>
    );
  }

  const values = validData.map((item) => item.average);
  const minValue = Math.max(0, Math.min(...values, 75) - 5);
  const maxValue = Math.min(100, Math.max(...values, 90) + 5);
  const range = Math.max(maxValue - minValue, 1);

  const xForIndex = (index: number) =>
    paddingLeft + (index / (validData.length - 1)) * graphWidth;

  const yForValue = (value: number) =>
    paddingTop + ((maxValue - value) / range) * graphHeight;

  const points = validData.map((item, index) => ({
    ...item,
    x: xForIndex(index),
    y: yForValue(item.average),
  }));

  const pathData = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const guideValues = [
    maxValue,
    Math.round((maxValue + minValue) / 2),
    minValue,
  ];

  const latest = validData[validData.length - 1];
  const first = validData[0];
  const delta = latest.average - first.average;

  return (
    <View style={styles.trendChartShell}>
      <View style={styles.trendChartHeader}>
        {/* Wrapped in a flex view to prevent title from pushing the delta pill off-screen */}
        <View style={styles.trendChartHeaderLeft}>
          <Text style={styles.trendChartTitle}>Assignment Performance Line</Text>
          <Text style={styles.trendChartSubtitle}>
            Average assignment grades across graded submissions over time
          </Text>
        </View>

        <View
          style={[
            styles.trendDeltaPill,
            delta >= 0 ? styles.trendDeltaPositive : styles.trendDeltaNegative,
          ]}
        >
          <Text
            style={[
              styles.trendDeltaText,
              delta >= 0
                ? styles.trendDeltaTextPositive
                : styles.trendDeltaTextNegative,
            ]}
          >
            {delta >= 0 ? "+" : ""}
            {delta} pts
          </Text>
        </View>
      </View>

      <View style={styles.trendChartScrollGuard}>
        <Svg width={chartWidth} height={chartHeight}>
          <Rect
            x={0}
            y={0}
            width={chartWidth}
            height={chartHeight}
            rx={18}
            fill="#FAF5F5"
          />

          {guideValues.map((value) => {
            const y = yForValue(value);

            return (
              <React.Fragment key={`guide-${value}`}>
                <Line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="#EBD4D4"
                  strokeWidth={1}
                  strokeDasharray="5 6"
                />
                <SvgText
                  x={paddingLeft - 10}
                  y={y + 4}
                  fontSize="11"
                  fill="#8A6F6F"
                  textAnchor="end"
                >
                  {`${value}%`}
                </SvgText>
              </React.Fragment>
            );
          })}

          <Line
            x1={paddingLeft}
            y1={paddingTop}
            x2={paddingLeft}
            y2={chartHeight - paddingBottom}
            stroke="#EBD4D4"
            strokeWidth={1}
          />
          <Line
            x1={paddingLeft}
            y1={chartHeight - paddingBottom}
            x2={chartWidth - paddingRight}
            y2={chartHeight - paddingBottom}
            stroke="#EBD4D4"
            strokeWidth={1}
          />

          <Path
            d={pathData}
            fill="none"
            stroke="#8B0000"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point, index) => {
            // Show fewer labels on very small screens to prevent text overlap
            const showLabel = isVerySmall
              ? index === 0 || index === points.length - 1
              : isSmall
              ? index === 0 ||
                index === points.length - 1 ||
                index % Math.ceil(points.length / 3) === 0
              : true;

            return (
              <React.Fragment key={`${point.label}-${index}`}>
                <Circle
                  cx={point.x}
                  cy={point.y}
                  r={5}
                  fill="#8B0000"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
                <SvgText
                  x={point.x}
                  y={Math.max(point.y - 12, 14)}
                  fontSize="11"
                  fontWeight="700"
                  fill="#2B1111"
                  textAnchor="middle"
                >
                  {`${point.average}%`}
                </SvgText>

                {showLabel ? (
                  <SvgText
                    x={point.x}
                    y={chartHeight - paddingBottom + 24}
                    fontSize="10"
                    fill="#7A4A4A"
                    textAnchor="middle"
                  >
                    {point.label}
                  </SvgText>
                ) : null}
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="analytics-outline" size={26} color="#A07C7C" />
      <Text style={styles.emptyStateText}>{text}</Text>
    </View>
  );
}

// ===== DROPDOWN MODAL COMPONENT =====
function DropdownModal({
  label,
  selectedValue,
  options,
  onSelect,
  isMobile,
  onOpenChange, // 🔥 NEW — lets the parent know when this dropdown opens/closes
}: {
  label: string;
  selectedValue: string;
  options: string[];
  onSelect: (value: string) => void;
  isMobile: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}) {
  const [visible, setVisible] = useState(false);
  const displayValue = selectedValue || `All ${label}`;

  const open = () => {
    setVisible(true);
    onOpenChange?.(true);
  };

  const close = () => {
    setVisible(false);
    onOpenChange?.(false);
  };

  return (
    <View style={[styles.filterGroup, isMobile && styles.filterGroupMobile]}>
      <Text style={styles.filterLabel}>{label}</Text>
      <Pressable
        style={styles.dropdownButton}
        onPress={open}
      >
        <Text style={styles.dropdownButtonText} numberOfLines={1}>
          {displayValue}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#7A4A4A" />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select {label}</Text>
            
            <ScrollView style={styles.modalOptionsContainer} showsVerticalScrollIndicator={false}>
              <Pressable
                style={[styles.modalOption, !selectedValue && styles.modalOptionActive]}
                onPress={() => {
                  onSelect("");
                  close();
                }}
              >
                <Text style={[styles.modalOptionText, !selectedValue && styles.modalOptionTextActive]}>
                  All {label}
                </Text>
                {!selectedValue && <Ionicons name="checkmark" size={20} color="#8B0000" />}
              </Pressable>

              {options.map((item) => (
                <Pressable
                  key={item}
                  style={[styles.modalOption, selectedValue === item && styles.modalOptionActive]}
                  onPress={() => {
                    onSelect(item);
                    close();
                  }}
                >
                  <Text style={[styles.modalOptionText, selectedValue === item && styles.modalOptionTextActive]} numberOfLines={1}>
                    {item}
                  </Text>
                  {selectedValue === item && <Ionicons name="checkmark" size={20} color="#8B0000" />}
                </Pressable>
              ))}
            </ScrollView>

            <Pressable style={styles.modalCancelButton} onPress={close}>
              <Text style={styles.modalCancelText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function Analytics({ width, apiBaseUrl }: AnalyticsProps) {
  const windowSize = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Prioritize exact container width from onLayout, then prop, then window width
  const responsiveWidth = containerWidth > 0 
    ? containerWidth 
    : (width && width > 0 ? width : windowSize.width);
    
  const isMobile = responsiveWidth < 768;
  const isTablet = responsiveWidth >= 768 && responsiveWidth < 1100;

  const [analytics, setAnalytics] =
    useState<AdminAnalyticsPayload>(emptyAnalytics);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  // Which "?" explanation is open (null = closed)
  const [activeInfo, setActiveInfo] = useState<InfoKey | null>(null);
  const openInfo = (key: InfoKey) => setActiveInfo(key);

  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [availableSchoolYears, setAvailableSchoolYears] = useState<string[]>([]);
  const [availableSemesters, setAvailableSemesters] = useState<string[]>([]);

  // 🔥 Tracks whether either filter dropdown is open, so the silent poll
  // below doesn't refresh (and reset scroll/selection) mid-pick.
  const isSchoolYearDropdownOpenRef = React.useRef(false);
  const isSemesterDropdownOpenRef = React.useRef(false);

  const summaryWidth: DimensionValue = isMobile
    ? "100%"
    : isTablet
    ? "48.5%"
    : "23.5%";

  const halfWidth: DimensionValue = isMobile ? "100%" : "48.7%";

  const loadAdminAnalytics = async (opts?: { silent?: boolean }) => {
    const resolvedApiBaseUrl = apiBaseUrl || "http://localhost:5000";
    const silent = opts?.silent ?? false;

    if (!silent) {
      setIsLoading(true);
      setLoadError("");
    }

    try {
      const params = new URLSearchParams();
      if (selectedSchoolYear) params.append("schoolYear", selectedSchoolYear);
      if (selectedSemester) params.append("semester", selectedSemester);
      
      const queryString = params.toString() ? `?${params.toString()}` : "";
      const response = await apiFetch(`${resolvedApiBaseUrl}/admin-analytics${queryString}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load admin analytics.");
      }

      setAnalytics(data?.data || emptyAnalytics);
      
      if (data?.data?.availableSchoolYears) {
        const sortedYears = [...data.data.availableSchoolYears].sort((a: string, b: string) => b.localeCompare(a));
        setAvailableSchoolYears(sortedYears);
      }
       if (data?.data?.availableSemesters) {
        setAvailableSemesters(
          data.data.availableSemesters.filter(
            (sem: string) => sem.toLowerCase() !== "summer"
          )
        );
      }
    } catch (error: any) {
      console.log(
        silent ? "SILENT REFRESH ANALYTICS ERROR =>" : "LOAD ADMIN ANALYTICS ERROR =>",
        error
      );
      if (!silent) {
        setLoadError(error?.message || "Failed to load admin analytics.");
        setAnalytics(emptyAnalytics);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminAnalytics();
  }, [apiBaseUrl, selectedSchoolYear, selectedSemester]);

  // 🔥 Silent background refresh — keeps the dashboard's numbers current
  // without flashing the loading/refresh-button state. Paused while either
  // filter dropdown is open, so a refresh never scrolls/reorders options
  // mid-pick.
  useEffect(() => {
    const REFRESH_INTERVAL_MS = 15000; // dashboards can afford a slower cadence than tables

    const interval = setInterval(() => {
      if (isSchoolYearDropdownOpenRef.current || isSemesterDropdownOpenRef.current) return;
      loadAdminAnalytics({ silent: true });
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [apiBaseUrl, selectedSchoolYear, selectedSemester]);

  const topSections = useMemo(
    () => analytics.sectionComparison.slice(0, 8),
    [analytics.sectionComparison]
  );

  const topYears = useMemo(
    () => analytics.yearLevelComparison.slice(0, 6),
    [analytics.yearLevelComparison]
  );

  const latestTrend = analytics.trend[analytics.trend.length - 1];
  const firstTrend = analytics.trend[0];
  const trendDelta =
    latestTrend && firstTrend ? latestTrend.average - firstTrend.average : 0;

  // ---- "?" explanations. `live` values are read from the same payload the screen renders.
  // Formulas mirror GET /admin-analytics in server.js. ----
  const sm = analytics.summary;
  const workload =
    sm.totalPendingAssignments +
    sm.totalSubmittedAssignments +
    sm.totalMissingAssignments +
    sm.totalGradedAssignments;
  const rows = "one row per student x assignment, across every student enrolled in the selected classes";

  const scoreItem: InfoItem = {
    label: "Step 1 - Assignment score (%)",
    formula:
      "score earned ÷ the assignment's total score × 100, rounded, for submissions with status \"graded\". If an assignment has no total score set, it is treated as 100.",
    source: "server.js -> GET /admin-analytics, using getPercentFromScore() on the classSubmissions and classAssignments collections.",
  };
  const studentAvgItem: InfoItem = {
    label: "Step 2 - Student average",
    formula:
      "For each class a student is enrolled in: average of that student's graded scores, rounded. The student's overall average is the average of those per-class averages (classes with graded work only), rounded.",
    source: "studentRiskMap / studentRows in GET /admin-analytics (server.js).",
    note: "Each class counts equally, no matter how many assignments it has.",
  };

  const infoContent: Record<InfoKey, InfoContent> = {
    passRate: {
      title: "Pass Rate",
      summary: "The share of evaluated students whose overall average meets the passing mark.",
      items: [
        scoreItem,
        studentAvgItem,
        {
          label: "Pass rate",
          live: `${sm.passRate}%  (of ${analytics.totals.evaluatedStudents} evaluated students)`,
          formula: "students with overall average >= 75 ÷ students with at least 1 graded assignment × 100, rounded.",
          source: "passingStudents / evaluatedStudents in GET /admin-analytics (server.js).",
          note: "Students with no graded work are left out. The card turns green at 75% or higher (that color rule is in this screen, not the server).",
        },
      ],
    },
    failRate: {
      title: "Fail Rate (below passing)",
      summary: "The share of evaluated students whose overall average is under the passing mark.",
      items: [
        scoreItem,
        studentAvgItem,
        {
          label: "Fail rate",
          live: `${sm.failRate}%`,
          formula: "students with overall average < 75 ÷ students with at least 1 graded assignment × 100, rounded.",
          source: "failedStudents / evaluatedStudents in GET /admin-analytics (server.js).",
          note: "Pass and fail are rounded separately, so they can add up to 99% or 101%.",
        },
      ],
    },
    departmentAverage: {
      title: "Department / Institution Average",
      summary: "The average grade of all evaluated students in the selected school year and semester.",
      items: [
        scoreItem,
        studentAvgItem,
        {
          label: "Department average",
          live: `${sm.departmentAverage}%`,
          formula: "Average of every evaluated student's overall average, rounded. Students with no graded work are excluded.",
          source: "departmentAverage in GET /admin-analytics (server.js).",
          note: "Every student counts equally, regardless of how many classes or assignments they have.",
        },
      ],
    },
    trend: {
      title: "Semester Performance Trend",
      summary: "Average assignment grade over time across all graded work, and how much it changed.",
      items: [
        {
          label: "Each point on the line",
          live: `${analytics.trend.length} point(s)`,
          formula:
            "Graded submissions are grouped by calendar day (graded date, else submitted date, else assignment due date, else created date). Each point is the average score (%) of that day's graded submissions. Only the latest 8 days are returned.",
          source: "trendMap -> trend in GET /admin-analytics (server.js). The point label comes from normalizeAnalyticsDateLabel().",
          note: "Labels show month and day only, so the same date in two different years would be merged. Submissions with no date show as 'Activity N' at the end.",
        },
        {
          label: "Change badge (pts)",
          live: `${trendDelta >= 0 ? "+" : ""}${trendDelta} pts`,
          formula: "Last point's average minus first point's average (percentage points, not percent).",
          source: "trendDelta in this screen, from analytics.trend.",
          note: "Needs at least 2 points, otherwise no line is drawn.",
        },
      ],
    },
    submissionCompletion: {
      title: "Submission Completion",
      summary: "How much of the total assigned workload has been turned in (including graded work).",
      items: [
        {
          label: "Submission completion",
          live: `${sm.completionRate}%  (${sm.totalSubmittedAssignments + sm.totalGradedAssignments} of ${workload})`,
          formula: "(submitted + graded) ÷ (pending + submitted + missing + graded) × 100, rounded.",
          source: `Totals counted in GET /admin-analytics (server.js): ${rows}.`,
          note: `Currently ${sm.totalGradedAssignments} graded, ${sm.totalSubmittedAssignments} submitted, ${sm.totalPendingAssignments} pending, ${sm.totalMissingAssignments} missing. Missing = due date has passed and no submission; pending = not yet due and no submission.`,
        },
      ],
    },
    gradingCompletion: {
      title: "Grading Completion",
      summary: "How much of the total assigned workload has actually been graded.",
      items: [
        {
          label: "Grading completion",
          live: `${sm.assignmentCompletionRate}%  (${sm.totalGradedAssignments} of ${workload})`,
          formula: "graded ÷ (pending + submitted + missing + graded) × 100, rounded.",
          source: `Totals counted in GET /admin-analytics (server.js): ${rows}.`,
          note: "Graded work whose score can't be read as a number is left out of every total.",
        },
      ],
    },
    sectionComparison: {
      title: "Section Comparison",
      summary: "Average grade per section, lowest first.",
      items: [
        scoreItem,
        {
          label: "Section average (%)",
          live: `${Math.min(analytics.sectionComparison.length, 8)} of ${analytics.sectionComparison.length} section(s) shown`,
          formula:
            "For each class: the average of its evaluated students' class averages. A section's value = the sum of (class average × evaluated students) ÷ total evaluated students across its classes, rounded.",
          source: "sectionMap -> sectionComparison in GET /admin-analytics (server.js).",
          note: "Sorted lowest average first, sections with no graded work (0%) last; the 8 lowest are shown. '(N unique • M enrollments)' counts distinct students vs. class enrollment records.",
        },
      ],
    },
    yearComparison: {
      title: "Year-Level Comparison",
      summary: "Average grade per year level.",
      items: [
        scoreItem,
        {
          label: "Year-level average (%)",
          live: `${Math.min(analytics.yearLevelComparison.length, 6)} of ${analytics.yearLevelComparison.length} year level(s) shown`,
          formula:
            "Same method as Section Comparison, grouped by the class's year level: the average of the classes' averages, weighted by evaluated students, rounded.",
          source: "yearMap -> yearLevelComparison in GET /admin-analytics (server.js).",
          note: "Year levels are listed alphabetically and only the first 6 are shown. A year level with no graded work shows 0%.",
        },
      ],
    },
    subjectDifficulty: {
      title: "Subject Difficulty Trend",
      summary: "Subjects ranked by how hard students are finding them.",
      items: [
        scoreItem,
        {
          label: "Subject average (%)",
          live: `${Math.min(analytics.subjectDifficulty.length, 6)} of ${analytics.subjectDifficulty.length} subject(s) shown`,
          formula:
            "Average of all graded scores (%) for assignments sharing the same header (falls back to the class name), across all students. Each graded submission counts equally.",
          source: "subjectMap -> subjectDifficulty in GET /admin-analytics (server.js).",
          note: "'Subject' here is the assignment header, so it may not match your course names. A subject with no graded work shows (0%).",
        },
        {
          label: "Difficulty label",
          formula:
            "High Difficulty = has graded work and average < 75. Otherwise Moderate = any missing work or 3+ pending. Otherwise No Data (nothing graded) or Stable.",
          source: "subjectDifficulty in GET /admin-analytics (server.js).",
        },
      ],
    },
    suggestions: {
      title: "Intervention Suggestions",
      summary: "Short recommendations built from the numbers on this dashboard.",
      items: [
        {
          label: "Where the percentages come from",
          live: `${analytics.suggestions.length} suggestion(s)`,
          formula:
            "Priority Section quotes the section with the lowest average (see Section Comparison). Faculty Recommendation names the top-ranked subject in Subject Difficulty. System Recommendation counts High + Moderate risk students.",
          source: "suggestions in GET /admin-analytics (server.js).",
          note: "These are fixed rules on the server, not a live AI model.",
        },
      ],
    },
    riskPopulation: {
      title: "Assignment Risk Population",
      summary: "Students flagged High or Moderate risk, with their average.",
      items: [
        scoreItem,
        studentAvgItem,
        {
          label: "Risk level",
          live: `${analytics.atRiskStudents.length} shown of ${sm.atRiskCount} flagged`,
          formula:
            "High = average < 75 or 3+ missing. Moderate = average < 85, or 1+ missing, or 3+ pending. Low otherwise. No Data = nothing graded and nothing missing. Counts are totals across all of the student's classes.",
          source: "getAdminRiskLevel() and atRiskStudents in GET /admin-analytics (server.js).",
          note: "Only the 8 highest-priority students are listed (High first, then most missing, then lowest average). The reason text checks missing work first, so a student with a low average and 1 missing assignment shows only the missing reason.",
        },
      ],
    },
  };
  const activeContent = activeInfo ? infoContent[activeInfo] : null;

  return (
    // Added onLayout to capture the exact width of the container
    <View onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      <Modal
        visible={activeContent !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveInfo(null)}
        statusBarTranslucent
      >
        <Pressable style={styles.infoOverlay} onPress={() => setActiveInfo(null)}>
          <Pressable style={styles.infoSheet} onPress={() => {}}>
            {activeContent ? (
              <>
                <View style={styles.infoHeader}>
                  <View style={styles.infoHeaderIcon}>
                    <Ionicons name="help-circle-outline" size={22} color="#8B0000" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoTitle}>{activeContent.title}</Text>
                    <Text style={styles.infoSummary}>{activeContent.summary}</Text>
                  </View>
                  <Pressable onPress={() => setActiveInfo(null)} hitSlop={10} accessibilityLabel="Close explanation">
                    <Ionicons name="close" size={22} color="#5F3B3B" />
                  </Pressable>
                </View>
                <ScrollView style={styles.infoScroll} showsVerticalScrollIndicator>
                  {activeContent.items.map((item) => (
                    <View key={item.label} style={styles.infoItem}>
                      <View style={styles.infoItemHeader}>
                        <Text style={styles.infoItemLabel}>{item.label}</Text>
                        {item.live ? (
                          <View style={styles.infoLivePill}>
                            <Text style={styles.infoLiveText}>{item.live}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.infoFieldLabel}>HOW IT IS COMPUTED</Text>
                      <Text style={styles.infoFormula}>{item.formula}</Text>
                      <Text style={styles.infoFieldLabel}>WHERE THE DATA COMES FROM</Text>
                      <Text style={styles.infoBody}>{item.source}</Text>
                      {item.note ? (
                        <View style={styles.infoNote}>
                          <Ionicons name="information-circle-outline" size={16} color="#8B0000" />
                          <Text style={styles.infoNoteText}>{item.note}</Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </ScrollView>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.heroRow}>
        <View style={[styles.heroCard, isMobile && styles.heroCardMobile]}>
          <View
            style={[styles.heroTextSection, isMobile && styles.heroTextMobile]}
          >
            <Text style={styles.heroEyebrow}>ASSIGNMENT ANALYTICS</Text>
            <Text
              style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}
            >
              Administrative Performance Dashboard
            </Text>
            <Text style={styles.heroSubtitle}>
              Real-time assignment analytics across all classes, providing insights into student performance, assignment completion, subject difficulty, and institution-wide learning trends.
            </Text>
          </View>

          <Pressable
            style={styles.refreshButton}
            onPress={() => loadAdminAnalytics()}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.refreshButtonText}>
              {isLoading ? "Loading" : "Refresh"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* FILTER ROW WITH DROPDOWN MODALS */}
      <View style={[styles.filterRow, isMobile && styles.filterRowMobile]}>
        <DropdownModal
          label="School Year"
          selectedValue={selectedSchoolYear}
          options={availableSchoolYears}
          onSelect={setSelectedSchoolYear}
          isMobile={isMobile}
          onOpenChange={(isOpen) => { isSchoolYearDropdownOpenRef.current = isOpen; }}
        />
        <DropdownModal
          label="Semester"
          selectedValue={selectedSemester}
          options={availableSemesters}
          onSelect={setSelectedSemester}
          isMobile={isMobile}
          onOpenChange={(isOpen) => { isSemesterDropdownOpenRef.current = isOpen; }}
        />
      </View>

      {loadError ? (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={18} color="#DC2626" />
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : null}

      <View style={styles.summaryRow}>
        <SummaryCard
          label="Students Monitored"
          value={`${analytics.totals.totalStudents}`}
          trend={`${analytics.totals.monitoredStudents} enrolled • ${analytics.totals.evaluatedStudents} graded`}
          widthValue={summaryWidth}
        />
        <SummaryCard
          label="Assignment Risk Students"
          value={`${analytics.summary.atRiskCount}`}
          trend={`${analytics.summary.highRiskCount} high • ${analytics.summary.moderateRiskCount} moderate`}
          widthValue={summaryWidth}
          tone={analytics.summary.atRiskCount > 0 ? "danger" : "success"}
        />
        <SummaryCard
          label="Pass Rate"
          onInfoPress={() => openInfo("passRate")}
          value={`${analytics.summary.passRate}%`}
          trend={`${analytics.summary.failRate}% below passing`}
          widthValue={summaryWidth}
          tone={analytics.summary.passRate >= 75 ? "success" : "warning"}
        />
        <SummaryCard
          label="Class Backlogs"
          value={`${analytics.summary.backlogCount}`}
          trend={`${analytics.summary.totalMissingAssignments} missing • ${analytics.summary.totalPendingAssignments} pending`}
          widthValue={summaryWidth}
          tone={analytics.summary.backlogCount > 0 ? "warning" : "success"}
        />
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Performance Insights</Text>
          <Text style={styles.sectionSubtitle}>
            Institution-wide insights generated from student assignment grades and assignment completion records.
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.fullWidthAnalyticsRow}>
        <SectionCard
          widthValue="100%"
          title="Department Overview"
          subtitle="Institution-wide assignment performance summary"
          icon={
            <Ionicons name="analytics-outline" size={24} color="#8B0000" />
          }
        >
          <View style={[styles.departmentOverviewGrid, isMobile && styles.departmentOverviewGridMobile]}>
            <View style={[styles.departmentOverviewItem, isMobile && styles.departmentOverviewItemMobile]}>
              <StatRow label="Total Students" value={`${analytics.totals.totalStudents}`} />
            </View>
            <View style={[styles.departmentOverviewItem, isMobile && styles.departmentOverviewItemMobile]}>
              <StatRow label="Total Teachers" value={`${analytics.totals.totalTeachers}`} />
            </View>
            <View style={[styles.departmentOverviewItem, isMobile && styles.departmentOverviewItemMobile]}>
              <StatRow label="Total Classes" value={`${analytics.totals.totalClasses}`} />
            </View>
            <View style={[styles.departmentOverviewItem, isMobile && styles.departmentOverviewItemMobile]}>
              <StatRow
                label="Class Enrollments"
                value={`${analytics.totals.totalClassEnrollments ?? 0}`}
              />
            </View>
            <View style={[styles.departmentOverviewItem, isMobile && styles.departmentOverviewItemMobile]}>
              <StatRow
                label="Department Average"
                onInfoPress={() => openInfo("departmentAverage")}
                value={`${analytics.summary.departmentAverage}%`}
                tone={analytics.summary.departmentAverage >= 75 ? "success" : "danger"}
              />
            </View>
            <View style={[styles.departmentOverviewItem, isMobile && styles.departmentOverviewItemMobile]}>
              <StatRow
                label="Assignment Risk Population"
                value={`${analytics.summary.atRiskCount}`}
                tone={analytics.summary.atRiskCount > 0 ? "danger" : "success"}
              />
            </View>
            <View style={[styles.departmentOverviewItem, isMobile && styles.departmentOverviewItemMobile]}>
              <StatRow label="No Data Students" value={`${analytics.summary.noDataCount}`} />
            </View>
            <View style={[styles.departmentOverviewItem, isMobile && styles.departmentOverviewItemMobile]}>
              <StatRow label="Pass Rate" value={`${analytics.summary.passRate}%`} tone="success" onInfoPress={() => openInfo("passRate")} />
            </View>
            <View style={[styles.departmentOverviewItem, isMobile && styles.departmentOverviewItemMobile]}>
              <StatRow label="Fail Rate" value={`${analytics.summary.failRate}%`} tone="danger" onInfoPress={() => openInfo("failRate")} />
            </View>
          </View>
        </SectionCard>
        </View>

        <View style={styles.fullWidthAnalyticsRow}>
        <SectionCard
          widthValue="100%"
          title="Semester Performance Trend"
          onInfoPress={() => openInfo("trend")}
          subtitle={
            latestTrend
              ? `${latestTrend.label} latest average • ${trendDelta >= 0 ? "+" : ""}${trendDelta} pts`
              : "No graded trend data yet"
          }
          icon={
            <Ionicons name="trending-up-outline" size={24} color="#8B0000" />
          }
        >
          <AcademicTrendChart
            data={analytics.trend}
            width={responsiveWidth}
            completionRate={analytics.summary.completionRate}
            assignmentCompletionRate={analytics.summary.assignmentCompletionRate}
            departmentAverage={analytics.summary.departmentAverage}
            onInfo={openInfo}
          />

          {analytics.trend.filter(
            (item) => Number.isFinite(item.average) && item.count > 0
          ).length !== 1 ? (
            <View style={styles.trendMetricGrid}>
              <View style={styles.trendMetricCard}>
                <Text style={styles.trendMetricValue}>
                  {analytics.summary.completionRate}%
                </Text>
                <TrendMetricLabel label="Submission Completion" onInfoPress={() => openInfo("submissionCompletion")} />
              </View>

              <View style={styles.trendMetricCard}>
                <Text style={styles.trendMetricValue}>
                  {analytics.summary.assignmentCompletionRate}%
                </Text>
                <TrendMetricLabel label="Grading Completion" onInfoPress={() => openInfo("gradingCompletion")} />
              </View>

              <View style={styles.trendMetricCard}>
                <Text style={styles.trendMetricValue}>
                  {analytics.summary.departmentAverage}%
                </Text>
                <TrendMetricLabel label="Institution Average" onInfoPress={() => openInfo("departmentAverage")} />
              </View>
            </View>
          ) : null}
        </SectionCard>
        </View>

        <SectionCard
          widthValue={halfWidth}
          title="Section Comparison"
          onInfoPress={() => openInfo("sectionComparison")}
          subtitle="Compare average assignment grades across sections"
          icon={
            <MaterialCommunityIcons
              name="google-classroom"
              size={24}
              color="#8B0000"
            />
          }
        >
          {topSections.length ? (
            topSections.map((item) => (
              <ProgressBar
                key={item.label}
                label={`${item.label} (${item.students} unique • ${item.enrollmentCount ?? item.students} enrollments)`}
                value={item.value}
              />
            ))
          ) : (
            <EmptyState text="No section analytics available yet." />
          )}
        </SectionCard>

        <SectionCard
          widthValue={halfWidth}
          title="Year-Level Comparison"
          onInfoPress={() => openInfo("yearComparison")}
          subtitle="Compare assignment performance across year levels"
          icon={
            <Ionicons name="school-outline" size={24} color="#8B0000" />
          }
        >
          {topYears.length ? (
            topYears.map((item) => (
              <ProgressBar
                key={item.label}
                label={`${item.label} (${item.students} unique • ${item.enrollmentCount ?? item.students} enrollments)`}
                value={item.value}
              />
            ))
          ) : (
            <EmptyState text="No year-level analytics available yet." />
          )}
        </SectionCard>

        <SectionCard
          widthValue={halfWidth}
          title="Subject Difficulty Trend"
          onInfoPress={() => openInfo("subjectDifficulty")}
          subtitle="Subjects identified through low assignment grades, missing submissions, and pending assignments"
          icon={<Ionicons name="book-outline" size={24} color="#8B0000" />}
        >
          {analytics.subjectDifficulty.length ? (
            analytics.subjectDifficulty.slice(0, 6).map((subject) => (
              <StatRow
                key={subject.subject}
                label={`${subject.subject} (${subject.average}%)`}
                value={subject.difficulty}
                tone={
                  subject.difficulty === "High Difficulty"
                    ? "danger"
                    : subject.difficulty === "Moderate Difficulty"
                    ? "warning"
                    : "success"
                }
              />
            ))
          ) : (
            <EmptyState text="No subject difficulty data yet." />
          )}
        </SectionCard>

        <SectionCard
          widthValue={halfWidth}
          title="Intervention Suggestions"
          onInfoPress={() => openInfo("suggestions")}
          subtitle="AI-generated recommendations based on institution-wide assignment performance"
          icon={<Ionicons name="medkit-outline" size={24} color="#8B0000" />}
        >
          {analytics.suggestions.map((item) => (
            <View style={styles.suggestionCard} key={item.title}>
              <Text style={styles.suggestionTitle}>{item.title}</Text>
              <Text style={styles.suggestionText}>{item.text}</Text>
            </View>
          ))}
        </SectionCard>

        <SectionCard
          widthValue="100%"
          title="Assignment Risk Population"
          onInfoPress={() => openInfo("riskPopulation")}
          subtitle="Students identified through low assignment grades, missing assignments, and incomplete coursework"
          icon={<Ionicons name="warning-outline" size={24} color="#DC2626" />}
        >
          {analytics.atRiskStudents.length ? (
            <View style={[styles.riskGrid, isMobile && styles.riskGridMobile]}>
              {analytics.atRiskStudents.map((student) => (
                <StudentRiskItem
                  key={`${student.studentId}-${student.className}`}
                  name={student.studentName}
                  section={`${student.section} • ${student.className}`}
                  average={
                    student.gradedCount > 0 ? `${student.average}%` : "No Data"
                  }
                  riskLevel={student.riskLevel}
                  reason={student.reason}
                  isMobile={isMobile}
                />
              ))}
            </View>
          ) : (
            <EmptyState text="No high or moderate assignment-risk students detected." />
          )}
        </SectionCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: { marginBottom: 20 },
  heroCard: {
    backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: "#EBD4D4",
    padding: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  heroCardMobile: { flexDirection: "column", alignItems: "flex-start" },
  heroTextSection: { flex: 1, marginRight: 20 },
  heroTextMobile: { marginRight: 0, marginBottom: 18 },
  heroEyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 1.2, color: "#8B0000", marginBottom: 8 },
  heroTitle: { fontSize: 28, fontWeight: "800", color: "#2B1111", marginBottom: 8 },
  heroTitleMobile: { fontSize: 22 },
  heroSubtitle: { fontSize: 14, color: "#8A6F6F", lineHeight: 22 },
  refreshButton: {
    minHeight: 46, paddingHorizontal: 18, borderRadius: 14, backgroundColor: "#8B0000",
    flexDirection: "row", alignItems: "center", justifyContent: "center",
  },
  refreshButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800", marginLeft: 8 },
  errorBanner: {
    borderRadius: 16, borderWidth: 1, borderColor: "#FCA5A5", backgroundColor: "#FEF2F2",
    padding: 14, marginBottom: 18, flexDirection: "row", alignItems: "center",
  },
  errorText: { flex: 1, marginLeft: 8, color: "#B91C1C", fontWeight: "700" },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 24 },
  summaryCard: {
    minWidth: 180, backgroundColor: "#FFFFFF", borderRadius: 20, borderWidth: 1,
    borderColor: "#EBD4D4", padding: 18, marginBottom: 12,
  },
  summaryCardDanger: { backgroundColor: "#FFF7F7", borderColor: "#FCA5A5" },
  summaryCardSuccess: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  summaryCardWarning: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  summaryLabel: { fontSize: 13, color: "#A07C7C", fontWeight: "600", marginBottom: 10 },
  summaryValue: { fontSize: 28, fontWeight: "800", color: "#2B1111", marginBottom: 6 },
  summaryTrend: { fontSize: 13, color: "#8B0000", fontWeight: "600" },
  summaryTrendDanger: { color: "#DC2626" },
  summaryTrendSuccess: { color: "#059669" },
  summaryTrendWarning: { color: "#D97706" },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 22, fontWeight: "800", color: "#2B1111", marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: "#8A6F6F" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  sectionCard: {
    backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: "#EBD4D4",
    padding: 20, marginBottom: 18, minWidth: 0,
  },
  sectionCardHeader: { marginBottom: 18 },
  sectionCardHeaderLeft: { flexDirection: "row", alignItems: "center" },
  sectionCardHeaderLeftWide: { flexWrap: "wrap" },
  sectionCardHeaderTextWrap: { flex: 1 },
  sectionCardTitle: { fontSize: 18, fontWeight: "800", color: "#2B1111", marginBottom: 6 },
  sectionCardSubtitle: { fontSize: 14, color: "#8A6F6F", lineHeight: 20 },
  iconBox: {
    width: 56, height: 56, borderRadius: 18, backgroundColor: "#F1E0E0",
    alignItems: "center", justifyContent: "center", marginRight: 14,
  },
  statRow: {
    width: "100%", minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: "#F3E6E6",
    backgroundColor: "#FAF5F5", paddingHorizontal: 14, marginBottom: 10,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  statRowLabel: { flex: 1, fontSize: 14, color: "#5F3B3B", fontWeight: "600", paddingRight: 12 },
  statRowValue: { fontSize: 14, color: "#2B1111", fontWeight: "800" },
  statRowValueDanger: { color: "#DC2626" },
  statRowValueSuccess: { color: "#059669" },
  statRowValueWarning: { color: "#D97706" },
  progressBlock: { marginBottom: 14 },
  progressLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressLabel: { fontSize: 14, fontWeight: "700", color: "#5F3B3B", flex: 1, paddingRight: 10 },
  progressValue: { fontSize: 13, fontWeight: "800", color: "#8B0000" },
  progressTrack: { height: 12, borderRadius: 999, backgroundColor: "#F5E9E9", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: "#8B0000" },
  suggestionCard: {
    borderRadius: 16, borderWidth: 1, borderColor: "#EBD4D4", backgroundColor: "#FAF5F5",
    padding: 14, marginBottom: 12,
  },
  suggestionTitle: { fontSize: 14, fontWeight: "800", color: "#2B1111", marginBottom: 6 },
  suggestionText: { fontSize: 14, lineHeight: 21, color: "#7A4A4A" },
  riskGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  riskGridMobile: { flexDirection: "column", gap: 10 },
  riskCard: {
    flexGrow: 1, flexBasis: "48%", maxWidth: "49%", minWidth: 280, borderRadius: 18,
    borderWidth: 1, borderColor: "#EBD4D4", backgroundColor: "#FFFFFF", padding: 16, marginBottom: 0,
  },
  riskCardMobile: { width: "100%", maxWidth: "100%", minWidth: 0, padding: 14 },
  riskCardHigh: { backgroundColor: "#FFF7F7", borderColor: "#FCA5A5" },
  riskTopRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 10, gap: 10,
  },
  riskTopRowMobile: { flexDirection: "column", alignItems: "stretch" },
  riskTextWrap: { flex: 1, minWidth: 0, paddingRight: 0 },
  riskTextWrapMobile: { width: "100%" },
  riskName: { fontSize: 15, fontWeight: "800", color: "#2B1111", marginBottom: 4 },
  riskSection: { fontSize: 13, color: "#8A6F6F", fontWeight: "600" },
  riskTagContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 6, gap: 6 },
  riskTag: {
    backgroundColor: "#F7EDED", borderWidth: 1, borderColor: "#EBD4D4", borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5, maxWidth: "100%",
  },
  riskTagText: { fontSize: 12, fontWeight: "700", color: "#7A4A4A", flexShrink: 1 },
  riskBadge: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#FEF3C7",
    alignSelf: "flex-start",
  },
  riskBadgeMobile: { alignSelf: "flex-start" },
  riskBadgeHigh: { backgroundColor: "#FEE2E2" },
  riskBadgeText: { fontSize: 12, fontWeight: "800", color: "#DC2626" },
  riskReason: { fontSize: 13, lineHeight: 20, color: "#7A4A4A", marginTop: 4 },
  emptyState: {
    borderRadius: 16, borderWidth: 1, borderColor: "#EBD4D4", backgroundColor: "#FAF5F5",
    padding: 18, alignItems: "center", justifyContent: "center",
  },
  emptyStateText: { marginTop: 8, textAlign: "center", color: "#8A6F6F", fontWeight: "700" },
  fullWidthAnalyticsRow: { width: "100%", marginBottom: 12 },
  departmentOverviewGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  departmentOverviewGridMobile: { flexDirection: "column", gap: 0 },
  departmentOverviewItem: { flexGrow: 1, flexBasis: "31%", minWidth: 180, marginBottom: 0 },
  departmentOverviewItemMobile: { width: "100%", minWidth: 0, flexBasis: "auto", marginBottom: 0 },
  trendChartShell: {
    borderRadius: 16, borderWidth: 1, borderColor: "#EBD4D4", backgroundColor: "#FAF5F5",
    padding: 12, marginBottom: 12,
  },
  trendChartHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10, alignItems: "flex-start" },
  trendChartHeaderLeft: { flex: 1, marginRight: 10, flexShrink: 1 }, // Added to prevent title overlap
  trendChartTitle: { fontSize: 14, fontWeight: "900", color: "#2B1111" },
  trendChartSubtitle: { fontSize: 11, color: "#8A6F6F" },
  trendChartScrollGuard: { alignItems: "center", justifyContent: "center" },
  trendDeltaPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, flexShrink: 0 }, // Prevents pill from squishing
  trendDeltaPositive: { backgroundColor: "#DCFCE7" },
  trendDeltaNegative: { backgroundColor: "#FEE2E2" },
  trendDeltaText: { fontWeight: "900" },
  trendDeltaTextPositive: { color: "#047857" },
  trendDeltaTextNegative: { color: "#DC2626" },
  trendOneRow: {
    flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between",
    alignItems: "stretch", gap: 10,
  },
  trendMetricGridInline: {
    flex: 1, minWidth: 0, flexDirection: "row", flexWrap: "wrap", // Removed minWidth: 360 to allow wrapping
    justifyContent: "space-between", gap: 10,
  },
  trendEmptyState: { alignItems: "center", justifyContent: "center", padding: 20 },
  trendEmptyTitle: { fontSize: 14, fontWeight: "800", color: "#2B1111" },
  trendEmptyText: { fontSize: 12, color: "#7A4A4A", textAlign: "center" },
  singleTrendCard: {
    flex: 1, minWidth: 200, padding: 16, borderRadius: 14, backgroundColor: "#FAF5F5", // Reduced minWidth from 260
    borderWidth: 1, borderColor: "#EBD4D4",
  },
  singleTrendLabel: { fontSize: 12, color: "#8A6F6F" },
  singleTrendValue: { fontSize: 28, fontWeight: "900", color: "#8B0000" },
  singleTrendText: { fontSize: 12, color: "#7A4A4A" },
  trendMetricGrid: {
    flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between",
    gap: 10, marginTop: 10,
  },
  trendMetricCard: {
    flex: 1, minWidth: 120, padding: 10, borderRadius: 12, backgroundColor: "#FFFFFF", // Reduced minWidth from 140
    borderWidth: 1, borderColor: "#EBD4D4",
  },
  trendMetricValue: { fontSize: 16, fontWeight: "900", color: "#8B0000" },
  trendMetricLabel: { fontSize: 11, color: "#7A4A4A" },

  // ===== DROPDOWN & MODAL STYLES =====
  filterRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 20,
    backgroundColor: "#FFFFFF", borderRadius: 20, borderWidth: 1, borderColor: "#EBD4D4", padding: 16,
  },
  filterRowMobile: { flexDirection: "column" },
  filterGroup: { flex: 1, minWidth: 250 },
  filterGroupMobile: { width: "100%" },
  filterLabel: { fontSize: 13, fontWeight: "800", color: "#5F3B3B", marginBottom: 8 },
  
  dropdownButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
    backgroundColor: "#FAF5F5", borderWidth: 1, borderColor: "#EBD4D4",
  },
  dropdownButtonText: { fontSize: 14, fontWeight: "700", color: "#5F3B3B", flex: 1, marginRight: 8 },
  
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center",
    alignItems: "center", padding: 20,
  },
  modalContent: {
    width: "100%", maxWidth: 400, backgroundColor: "#FFFFFF", borderRadius: 24,
    padding: 20, borderWidth: 1, borderColor: "#EBD4D4", maxHeight: "80%",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#2B1111", marginBottom: 16, textAlign: "center" },
  modalOptionsContainer: { maxHeight: 400, marginBottom: 16 },
  modalOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8,
    backgroundColor: "#FAF5F5", borderWidth: 1, borderColor: "#EBD4D4",
  },
  modalOptionActive: { backgroundColor: "#F1E0E0", borderColor: "#8B0000" },
  modalOptionText: { fontSize: 14, fontWeight: "700", color: "#5F3B3B", flex: 1 },
  modalOptionTextActive: { color: "#8B0000" },
  modalCancelButton: {
    paddingVertical: 12, borderRadius: 12, backgroundColor: "#EBD4D4", alignItems: "center",
  },
  modalCancelText: { fontSize: 14, fontWeight: "800", color: "#7A4A4A" },

  // ===== "?" INFO ICON + EXPLANATION MODAL =====
  infoButton: { padding: 2, alignItems: "center", justifyContent: "center" },
  summaryLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionCardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  statRowLabelWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, paddingRight: 12 },
  trendMetricLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoOverlay: { flex: 1, backgroundColor: "rgba(43, 17, 17, 0.45)", justifyContent: "center", alignItems: "center", padding: 16 },
  infoSheet: { width: "100%", maxWidth: 560, maxHeight: "85%", backgroundColor: "#FFFFFF", borderRadius: 22, padding: 18 },
  infoHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  infoHeaderIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#F1E0E0", alignItems: "center", justifyContent: "center" },
  infoTitle: { fontSize: 17, fontWeight: "800", color: "#2B1111" },
  infoSummary: { fontSize: 13, lineHeight: 19, color: "#8A6F6F", marginTop: 3 },
  infoScroll: { marginTop: 14 },
  infoItem: { borderWidth: 1, borderColor: "#EBD4D4", borderRadius: 16, padding: 14, backgroundColor: "#FAF5F5", marginBottom: 12 },
  infoItemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 },
  infoItemLabel: { fontSize: 14, fontWeight: "800", color: "#2B1111", flexShrink: 1 },
  infoLivePill: { backgroundColor: "#F1E0E0", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  infoLiveText: { fontSize: 12, fontWeight: "800", color: "#8B0000" },
  infoFieldLabel: { fontSize: 10, letterSpacing: 0.6, fontWeight: "800", color: "#A07C7C", marginTop: 12 },
  infoFormula: { fontSize: 13, lineHeight: 20, color: "#2B1111", marginTop: 4 },
  infoBody: { fontSize: 12, lineHeight: 18, color: "#5F3B3B", marginTop: 4 },
  infoNote: { flexDirection: "row", gap: 8, marginTop: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EBD4D4", borderRadius: 12, padding: 10 },
  infoNoteText: { flex: 1, fontSize: 12, lineHeight: 18, color: "#5F3B3B" },
});