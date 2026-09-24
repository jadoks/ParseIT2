import React, { useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { buildTeacherAnalytics } from "../analytics/analyticsService";
import { getScorePercent } from "../analytics/metrics";
import { AssignmentCourse } from "../screens/Assignments";
import { FONT_BODY, FONT_TITLE, WEIGHT_EMPHASIS, WEIGHT_TITLE } from '../theme/typography';

type TeacherStudentInput = {
  studentId: string;
  studentName: string;
  courses: AssignmentCourse[];
};

type TeacherCourseOption = {
  id: string;
  name: string;
  courseCode?: string;
  classCode?: string;
  section?: string;
  yearLevel?: string;
};

type TopicSummary = {
  topic: string;
  average: number;
  gradedCount: number;
  pendingCount: number;
};

type StudentInsight = {
  studentId: string;
  studentName: string;
  overallAverage: number;
  totalPendingAssignments: number;
  totalMissingAssignments: number;
  totalSubmittedAssignments: number;
  totalGradedAssignments: number;
  riskLevel: string;
  overallTrend?: number | string;
  latestGrade: number | null;
  highestScore: number | null;
  lowestScore: number | null;
  riskReason: string;
  recommendedIntervention: string;
  classLabel?: string;
  percentileRank: number;
  rank: number;
};

type TrendPoint = {
  label: string;
  average: number;
  count: number;
};

type AcademicInsight = {
  title: string;
  body: string;
  tone: "success" | "warning" | "danger" | "info";
  icon: string;
};

interface TeacherAnalyticsProps {
  teacherName?: string;
  selectedCourseName?: string;
  selectedClass?: string;
  onChangeSelectedClass?: (value: string) => void;
  availableCourses?: TeacherCourseOption[];
  students?: TeacherStudentInput[];
}

const palette = {
  bg: "#F4F7FB",
  surface: "#FFFFFF",
  border: "#E7EDF5",
  textStrong: "#102A43",
  text: "#334E68",
  textMuted: "#7B8794",
  primary: "#8B0000",
  primarySoft: "#F7EDED",
  blue: "#2563EB",
  blueSoft: "#EAF2FF",
  green: "#059669",
  greenSoft: "#EAF8F3",
  orange: "#F59E0B",
  orangeSoft: "#FFF4E5",
  purple: "#7C3AED",
  purpleSoft: "#F3E8FF",
  red: "#EF4444",
  redSoft: "#FEECEC",
  slateBar: "#E8EEF5",
};

const insightTone = {
  success: { bg: palette.greenSoft, color: palette.green },
  warning: { bg: palette.orangeSoft, color: palette.orange },
  danger: { bg: palette.redSoft, color: palette.red },
  info: { bg: palette.blueSoft, color: palette.blue },
};

type MetricKey =
  | "classMean"
  | "passingRate"
  | "completionRate"
  | "attentionIndex"
  | "highestScore"
  | "lowestScore"
  | "trendGraph"
  | "aiInsights"
  | "classOverview"
  | "topics"
  | "topStudents"
  | "percentile"
  | "riskStudents";

type MetricInfoItem = {
  label: string;
  live?: string; // the live number/value currently shown on screen
  formula: string; // how it is computed
  source: string; // where the data comes from, in plain language
  note?: string; // caveat worth knowing
};

type MetricInfo = {
  title: string;
  summary: string;
  items: MetricInfoItem[];
};

const InfoButton = ({
  onPress,
  color = palette.textMuted,
}: {
  onPress: () => void;
  color?: string;
}) => (
  <TouchableOpacity
    onPress={onPress}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    accessibilityRole="button"
    accessibilityLabel="How is this calculated?"
    style={styles.infoButton}
    activeOpacity={0.7}
  >
    <MaterialCommunityIcons name="help-circle-outline" size={17} color={color} />
  </TouchableOpacity>
);

const formatPercentWidth = (value: number, maxValue: number): `${number}%` => {
  if (maxValue <= 0) return "0%";
  const safe = Math.max((value / maxValue) * 100, value > 0 ? 4 : 0);
  return `${Math.min(safe, 100)}%`;
};

const normalizeText = (value: any) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const buildCourseOptionLabel = (course: TeacherCourseOption | any) => {
  const name = course?.name || "Untitled Class";
  const section = course?.section ? ` • Section ${course.section}` : "";
  return `${name}${section}`;
};

const getCourseClassLabel = (course: any) => {
  const name = course?.name || "";
  const section = course?.section ? ` • Section ${course.section}` : "";
  return `${name}${section}`;
};

const isGenericAllClass = (course: any) => {
  const label = normalizeText(getCourseClassLabel(course));
  const name = normalizeText(course?.name);
  return label === "all" || name === "all" || name === "all class";
};

const getNumericTime = (value: any, fallback = 0) => {
  if (!value) return fallback;
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (typeof value?._seconds === "number") return value._seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? fallback : parsed;
};

// Delegates to metrics.getScorePercent so this screen and analyticsService.ts
// always calculate an assignment's percentage the same way. Assignments with
// no valid max points are skipped (they used to be silently treated as /100).
const getAssignmentPercent = (assignment: any): number | null => {
  if (typeof assignment?.points !== "number") return null;
  return getScorePercent(assignment);
};

const getRiskPalette = (risk: string) => {
  if (risk === "No Data") {
    return {
      bg: palette.blueSoft,
      text: palette.blue,
      fill: palette.blue,
      icon: "database-search-outline",
    };
  }

  if (risk === "High") {
    return {
      bg: palette.redSoft,
      text: "#B42318",
      fill: palette.red,
      icon: "alert-circle",
    };
  }

  if (risk === "Moderate") {
    return {
      bg: palette.orangeSoft,
      text: "#B54708",
      fill: palette.orange,
      icon: "alert-outline",
    };
  }

  return {
    bg: palette.greenSoft,
    text: "#027A48",
    fill: "#22C55E",
    icon: "check-circle-outline",
  };
};

const getTrendMeta = (trend?: number | string) => {
  const value = typeof trend === "number" ? trend : 0;
  if (value > 0) {
    return {
      label: "Improving",
      icon: "trending-up",
      color: palette.green,
      bg: palette.greenSoft,
    };
  }
  if (value < 0) {
    return {
      label: "Declining",
      icon: "trending-down",
      color: palette.red,
      bg: palette.redSoft,
    };
  }
  return {
    label: "Stable",
    icon: "trending-neutral",
    color: palette.blue,
    bg: palette.blueSoft,
  };
};

const SectionCard = ({
  title,
  subtitle,
  rightNode,
  children,
  style,
  onInfoPress,
}: {
  title: string;
  subtitle?: string;
  rightNode?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onInfoPress?: () => void;
}) => (
  <View style={[styles.sectionCard, style]}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {onInfoPress ? <InfoButton onPress={onInfoPress} /> : null}
        </View>
        {subtitle ? (
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {rightNode}
    </View>
    {children}
  </View>
);

const MetricCard = ({
  title,
  value,
  helper,
  icon,
  accent,
  softBg,
  onInfoPress,
}: {
  title: string;
  value: string | number;
  helper: string;
  icon: string;
  accent: string;
  softBg: string;
  onInfoPress?: () => void;
}) => (
  <View style={styles.metricCard}>
    <View style={styles.metricTopRow}>
      <View style={[styles.metricIconWrap, { backgroundColor: softBg }]}>
        <MaterialCommunityIcons name={icon} size={22} color={accent} />
      </View>
      {onInfoPress ? <InfoButton onPress={onInfoPress} /> : null}
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricTitle}>{title}</Text>
    <Text style={styles.metricHelper}>{helper}</Text>
  </View>
);

const HorizontalBar = ({
  label,
  value,
  maxValue,
  color,
  rightText,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  rightText?: string;
}) => {
  const widthPercent = formatPercentWidth(value, maxValue);

  return (
    <View style={styles.barRow}>
      <View style={styles.barTextRow}>
        <Text style={styles.barLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.barRightValue}>{rightText ?? value}</Text>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: widthPercent, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
};

const CircularMiniStat = ({
  value,
  label,
  accent,
  softBg,
  icon,
  onInfoPress,
}: {
  value: string | number;
  label: string;
  accent: string;
  softBg: string;
  icon: string;
  onInfoPress?: () => void;
}) => (
  <View style={styles.miniStatCard}>
    <View style={styles.miniStatTopRow}>
      <View style={[styles.miniStatIcon, { backgroundColor: softBg }]}>
        <MaterialCommunityIcons name={icon} size={18} color={accent} />
      </View>
      {onInfoPress ? <InfoButton onPress={onInfoPress} /> : null}
    </View>
    <Text style={styles.miniStatValue}>{value}</Text>
    <Text style={styles.miniStatLabel}>{label}</Text>
  </View>
);

type InsightArgs = {
  average: number;
  pending: number;
  missing: number;
  trend: number;
  graded: number;
};

// Mirrors riskEngine.getRiskLevel/getRiskReason (average < 75 or 3+ missing =
// High; average < 85, 1+ missing or 3+ pending = Moderate) so the written
// reason always agrees with the risk level shown next to it.
const insightReason = ({ average, pending, missing, trend, graded }: InsightArgs) => {
  if (graded === 0 && missing === 0)
    return "No graded assignments yet. Assignment risk cannot be evaluated.";
  if (graded === 0)
    return "Missing assignments and no graded work recorded yet";
  if (average < 75 && missing >= 3 && trend < 0)
    return "Low assignment average, repeated missing assignments, and declining trend";
  if (average < 75 && missing >= 3)
    return "Low assignment average and repeated missing assignments";
  if (average < 75) return "Assignment average is below passing threshold";
  if (missing >= 3) return "Multiple missing assignments detected";
  if (missing >= 1) return "Missing assignments need completion";
  if (pending >= 3) return "Several pending assignments may become missing soon";
  if (average < 85) return "Performance is fair but still needs improvement";
  if (trend < 0) return "Recent assignment performance trend is declining";
  return "Monitor assignment consistency and maintain current progress";
};

const insightIntervention = ({ average, pending, missing, trend, graded }: InsightArgs) => {
  if (graded === 0 && missing === 0)
    return "Wait for graded assignments before assigning intervention.";
  if (graded === 0)
    return "Follow up on missing assignments and set short-term deadlines.";
  if (average < 75 && missing >= 1)
    return "Schedule 1:1 remediation and set an assignment submission recovery plan.";
  if (average < 75)
    return "Provide targeted tutoring and assignment reassessment support.";
  if (missing >= 1)
    return "Follow up on missing assignments and set short-term deadlines.";
  if (pending >= 3)
    return "Remind the student to submit pending assignments before their due dates.";
  if (trend < 0)
    return "Check recent learning barriers and monitor the next assignment.";
  return "Sustain assignment progress with light-touch monitoring.";
};

export default function TeacherAnalytics({
  teacherName = "Teacher",
  selectedCourseName = "Assignment Analytics",
  selectedClass = "All",
  onChangeSelectedClass,
  availableCourses = [],
  students = [],
}: TeacherAnalyticsProps) {
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  // Which "? how is this calculated" explanation is open (null = closed)
  const [activeInfo, setActiveInfo] = useState<MetricKey | null>(null);
  const classButtonRef = useRef<any>(null);
  // Real on-screen coordinates of the trigger button, captured right before
  // opening. Used to anchor the large-screen dropdown, which now renders in
  // a top-level Modal (see below) instead of a locally-positioned View, so
  // it can never end up stacked behind a header or other container again.
  const [classMenuLayout, setClassMenuLayout] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 600;
  const isTabletScreen = width >= 600 && width < 1024;
  // Matches Assignments.tsx's filter dropdown breakpoint: below this, use
  // the bottom-sheet Modal; at/above it, use a small anchored Modal menu
  // positioned under the button instead of the mobile full-width sheet.
  const isLargeScreen = width >= 768;

  // Measures the trigger button's real on-screen position right before
  // opening, so the large-screen Modal menu can be anchored exactly under
  // it. Rendering it as a Modal (not a locally-positioned View) means it's
  // painted through RN's top-level portal, so no ancestor's stacking
  // context, sticky header, or elevation can ever place it behind anything.
  const toggleClassDropdown = () => {
    if (showClassDropdown) {
      setShowClassDropdown(false);
      return;
    }
    if (isLargeScreen && classButtonRef.current?.measure) {
      classButtonRef.current.measure(
        (_x: number, _y: number, measuredWidth: number, measuredHeight: number, pageX: number, pageY: number) => {
          setClassMenuLayout({
            top: pageY + measuredHeight + 6,
            left: pageX,
            width: Math.max(measuredWidth, 260),
          });
          setShowClassDropdown(true);
        }
      );
    } else {
      setShowClassDropdown(true);
    }
  };
  const pagePadding = isSmallScreen ? 12 : isTabletScreen ? 16 : 18;
  const chartWidth = isSmallScreen
    ? Math.max(width - pagePadding * 2 - 40, 320)
    : Math.min(width - pagePadding * 2 - 64, 980);
  const chartHeight = isSmallScreen ? 210 : 240;
  const responsiveSectionStyle = isSmallScreen
    ? styles.sectionCardFull
    : styles.sectionCardHalf;
  const responsiveMetricStyle = isSmallScreen
    ? styles.metricsGridSingle
    : styles.metricsGrid;
  const responsiveHeroStyle = isSmallScreen ? styles.heroCardCompact : null;

  const classOptions = useMemo(() => {
    const seen = new Set<string>();
    const options = [{ label: "All Classes", value: "All" }];

    availableCourses.forEach((course) => {
      if (isGenericAllClass(course)) return;
      const label = buildCourseOptionLabel(course);
      if (!seen.has(label)) {
        seen.add(label);
        options.push({ label, value: label });
      }
    });

    return options;
  }, [availableCourses]);

  const filteredStudents = useMemo(() => {
    const normalizedSelectedClass = normalizeText(selectedClass);

    return students
      .map((student) => {
        const filteredCourses = (student.courses || []).filter((course) => {
          if (isGenericAllClass(course)) return false;
          if (!normalizedSelectedClass || normalizedSelectedClass === "all")
            return true;
          return (
            normalizeText(getCourseClassLabel(course)) ===
            normalizedSelectedClass
          );
        });

        return { ...student, courses: filteredCourses };
      })
      .filter((student) => student.courses.length > 0);
  }, [students, selectedClass]);

  const summary = useMemo(
    () => buildTeacherAnalytics(filteredStudents),
    [filteredStudents],
  );

  const allAssignments = useMemo(
    () =>
      filteredStudents.flatMap((student) =>
        student.courses.flatMap((course) =>
          (course.assignments || []).map((assignment: any, index: number) => ({
            ...assignment,
            studentId: student.studentId,
            studentName: student.studentName,
            courseName: course.name,
            classLabel: getCourseClassLabel(course),
            orderIndex: index,
          })),
        ),
      ),
    [filteredStudents],
  );

  const totalPending = useMemo(
    () =>
      summary.studentRows.reduce(
        (sum, student) => sum + student.totalPendingAssignments,
        0,
      ),
    [summary.studentRows],
  );

  const totalSubmitted = useMemo(
    () =>
      summary.studentRows.reduce(
        (sum, student) => sum + student.totalSubmittedAssignments,
        0,
      ),
    [summary.studentRows],
  );

  const totalGraded = useMemo(
    () =>
      summary.studentRows.reduce(
        (sum, student) => sum + student.totalGradedAssignments,
        0,
      ),
    [summary.studentRows],
  );

  const totalMissing = useMemo(
    () =>
      summary.studentRows.reduce(
        (sum, student) => sum + student.totalMissingAssignments,
        0,
      ),
    [summary.studentRows],
  );

  // Completed work (graded + submitted) against the full assigned workload
  // (graded + submitted + pending + missing).
  const completionRate = useMemo(() => {
    const workload = totalGraded + totalSubmitted + totalPending + totalMissing;
    if (workload === 0) return 0;
    return Math.round(((totalGraded + totalSubmitted) / workload) * 100);
  }, [totalGraded, totalSubmitted, totalPending, totalMissing]);

  const studentInsights = useMemo<StudentInsight[]>(() => {
    const baseRows = filteredStudents.map((student) => {
      const row = summary.studentRows.find(
        (item) => item.studentId === student.studentId,
      );
      const assignments = student.courses.flatMap(
        (course) => course.assignments || [],
      );
      const primaryCourse = student.courses[0];
      const gradedAssignments = assignments.filter(
        (assignment: any) =>
          assignment.status === "graded" &&
          typeof assignment.points === "number",
      );
      const latestGraded =
        [...gradedAssignments].sort((a: any, b: any) => {
          const aDate = getNumericTime(
            a.gradedAt || a.submittedAt || a.dueDate,
            0,
          );
          const bDate = getNumericTime(
            b.gradedAt || b.submittedAt || b.dueDate,
            0,
          );
          return bDate - aDate;
        })[0] ?? gradedAssignments[gradedAssignments.length - 1];
      const scores = gradedAssignments
        .map(getAssignmentPercent)
        .filter((value): value is number => value !== null);
      const average = row?.overallAverage ?? 0;
      const pending = row?.totalPendingAssignments ?? 0;
      const missing = row?.totalMissingAssignments ?? 0;
      const graded = row?.totalGradedAssignments ?? gradedAssignments.length;
      const trendNumber =
        typeof row?.overallTrend === "number" ? row.overallTrend : 0;

      return {
        studentId: student.studentId,
        studentName: student.studentName,
        classLabel: primaryCourse
          ? getCourseClassLabel(primaryCourse)
          : "Unassigned",
        overallAverage: average,
        totalPendingAssignments: row?.totalPendingAssignments ?? 0,
        totalMissingAssignments: missing,
        totalSubmittedAssignments: row?.totalSubmittedAssignments ?? 0,
        totalGradedAssignments: graded,
        riskLevel: row?.riskLevel ?? (graded === 0 ? "No Data" : "Low"),
        overallTrend: row?.overallTrend ?? 0,
        latestGrade: latestGraded ? getAssignmentPercent(latestGraded) : null,
        highestScore: scores.length ? Math.max(...scores) : null,
        lowestScore: scores.length ? Math.min(...scores) : null,
        riskReason: insightReason({ average, pending, missing, trend: trendNumber, graded }),
        recommendedIntervention: insightIntervention({
          average,
          pending,
          missing,
          trend: trendNumber,
          graded,
        }),
        percentileRank: 0,
        rank: 0,
      };
    });

    // Percentile/rank only compare students who actually have graded work, so
    // "No Data" students no longer count as 0% and drag everyone's P value.
    const evaluatedRows = baseRows.filter(
      (student) => student.totalGradedAssignments > 0,
    );
    const total = evaluatedRows.length;

    return baseRows.map((student) => {
      if (student.totalGradedAssignments === 0) {
        return { ...student, percentileRank: 0, rank: total + 1 };
      }
      const betterCount = evaluatedRows.filter(
        (item) => item.overallAverage > student.overallAverage,
      ).length;
      const lowerOrEqualCount = evaluatedRows.filter(
        (item) => item.overallAverage <= student.overallAverage,
      ).length;
      const rank = betterCount + 1;
      const percentileRank =
        total > 0 ? Math.round((lowerOrEqualCount / total) * 100) : 0;
      return { ...student, percentileRank, rank };
    });
  }, [filteredStudents, summary.studentRows]);

  const atRiskStudents = useMemo(
    () =>
      studentInsights
        .filter(
          (student) =>
            student.riskLevel === "High" || student.riskLevel === "Moderate",
        )
        .sort((a, b) => {
          const riskOrder = { High: 3, Moderate: 2, Low: 1, "No Data": 0 };
          const aRisk = riskOrder[a.riskLevel as keyof typeof riskOrder] ?? 0;
          const bRisk = riskOrder[b.riskLevel as keyof typeof riskOrder] ?? 0;
          if (bRisk !== aRisk) return bRisk - aRisk;
          if (b.totalPendingAssignments !== a.totalPendingAssignments) {
            return b.totalPendingAssignments - a.totalPendingAssignments;
          }
          return a.overallAverage - b.overallAverage;
        }),
    [studentInsights],
  );

  const topStudents = useMemo(
    () =>
      [...studentInsights]
        .filter((student) => student.totalGradedAssignments > 0)
        .sort((a, b) => b.overallAverage - a.overallAverage)
        .slice(0, 5),
    [studentInsights],
  );

  const percentileRows = useMemo(
    () =>
      [...studentInsights].sort(
        (a, b) => {
          if (a.totalGradedAssignments === 0 && b.totalGradedAssignments > 0) return 1;
          if (b.totalGradedAssignments === 0 && a.totalGradedAssignments > 0) return -1;
          return (
            b.percentileRank - a.percentileRank ||
            b.overallAverage - a.overallAverage
          );
        },
      ),
    [studentInsights],
  );

  const mostPendingStudents = useMemo(
    () =>
      [...studentInsights]
        .sort((a, b) => b.totalPendingAssignments - a.totalPendingAssignments)
        .slice(0, 5),
    [studentInsights],
  );

  const gradeBuckets = useMemo(() => {
    let excellent = 0;
    let good = 0;
    let fair = 0;
    let needsSupport = 0;

    studentInsights.forEach((student) => {
      if (student.totalGradedAssignments === 0) return;
      if (student.overallAverage >= 90) excellent += 1;
      else if (student.overallAverage >= 80) good += 1;
      else if (student.overallAverage >= 75) fair += 1;
      else needsSupport += 1;
    });

    return [
      { label: "90-100", value: excellent, color: "#22C55E" },
      { label: "80-89", value: good, color: "#3B82F6" },
      { label: "75-79", value: fair, color: "#F59E0B" },
      { label: "Below 75", value: needsSupport, color: "#EF4444" },
    ];
  }, [studentInsights]);

  const riskBuckets = useMemo(
    () => [
      {
        label: "No Data",
        value: summary.noDataCount ?? 0,
        color: "#2563EB",
      },
      { label: "High Assignment Risk", value: summary.highRiskCount, color: "#EF4444" },
      {
        label: "Moderate Assignment Risk",
        value: summary.moderateRiskCount,
        color: "#F59E0B",
      },
      { label: "Low Assignment Risk", value: summary.lowRiskCount, color: "#22C55E" },
    ],
    [
      summary.noDataCount,
      summary.highRiskCount,
      summary.moderateRiskCount,
      summary.lowRiskCount,
    ],
  );

  const topicSummaries = useMemo<TopicSummary[]>(() => {
    const topicMap = new Map<
      string,
      { total: number; count: number; pending: number }
    >();

    allAssignments.forEach((assignment: any) => {
      const topic = assignment.topic || assignment.title || "Uncategorized";
      const current = topicMap.get(topic) || { total: 0, count: 0, pending: 0 };

      if (
        assignment.status === "graded" &&
        typeof assignment.points === "number"
      ) {
        const percent = getAssignmentPercent(assignment);
        if (percent !== null) {
          current.total += percent;
          current.count += 1;
        }
      }

      if (assignment.status === "pending") current.pending += 1;
      topicMap.set(topic, current);
    });

    return Array.from(topicMap.entries())
      .map(([topic, value]) => ({
        topic,
        average: value.count > 0 ? Math.round(value.total / value.count) : 0,
        gradedCount: value.count,
        pendingCount: value.pending,
      }))
      .sort((a, b) => a.average - b.average);
  }, [allAssignments]);

  // Topics with no graded work yet have no average, so they are not ranked
  // (they used to show as 0% and crowd out real weak topics).
  const weakTopics = useMemo(
    () => topicSummaries.filter((topic) => topic.gradedCount > 0).slice(0, 5),
    [topicSummaries],
  );

  const classHighestScore = useMemo(() => {
    const scores = allAssignments
      .filter(
        (assignment: any) =>
          assignment.status === "graded" &&
          typeof assignment.points === "number",
      )
      .map(getAssignmentPercent)
      .filter((value): value is number => value !== null);
    return scores.length ? Math.max(...scores) : 0;
  }, [allAssignments]);

  const classLowestScore = useMemo(() => {
    const scores = allAssignments
      .filter(
        (assignment: any) =>
          assignment.status === "graded" &&
          typeof assignment.points === "number",
      )
      .map(getAssignmentPercent)
      .filter((value): value is number => value !== null);
    return scores.length ? Math.min(...scores) : 0;
  }, [allAssignments]);

  const maxAverage = useMemo(
    () =>
      Math.max(
        ...studentInsights.map((student) => student.overallAverage),
        100,
      ),
    [studentInsights],
  );
  const maxPending = useMemo(
    () =>
      Math.max(
        ...studentInsights.map((student) => student.totalPendingAssignments),
        1,
      ),
    [studentInsights],
  );
  const maxTopicAverage = useMemo(
    () => Math.max(...topicSummaries.map((topic) => topic.average), 100),
    [topicSummaries],
  );

  const attentionIndex = useMemo(() => {
    const evaluatedStudents =
      summary.totalStudents - (summary.noDataCount ?? 0);

    if (evaluatedStudents <= 0) return 0;

    // 🔥 FIX: each high-risk student is weighted x2 in the numerator, so the
    // theoretical maximum weighted score is evaluatedStudents * 2 (every
    // student high-risk) — not evaluatedStudents. Dividing by the plain
    // student count let this run past 100%, up to 200% when the whole
    // class was high-risk. Normalizing against the true max caps it at
    // 100% as intended.
    const maxWeightedScore = evaluatedStudents * 2;

    return Math.round(
      ((summary.highRiskCount * 2 + summary.moderateRiskCount) /
        maxWeightedScore) *
        100,
    );
  }, [
    summary.noDataCount,
    summary.highRiskCount,
    summary.moderateRiskCount,
    summary.totalStudents,
  ]);

  const passingRate = useMemo(() => {
    const evaluatedStudents = studentInsights.filter(
      (student) => student.totalGradedAssignments > 0,
    );

    if (evaluatedStudents.length === 0) return 0;

    const passed = evaluatedStudents.filter(
      (student) => student.overallAverage >= 75,
    ).length;

    return Math.round((passed / evaluatedStudents.length) * 100);
  }, [studentInsights]);

  const classHealth = useMemo(() => {
    const hasGraded = allAssignments.some(
      (assignment: any) => assignment.status === "graded",
    );

    if (summary.totalStudents === 0 || !hasGraded) return "No Data";
    if (summary.classAverage >= 85) return "Strong";
    if (summary.classAverage >= 75) return "Stable";
    return "Needs Attention";
  }, [summary.classAverage, summary.totalStudents, allAssignments]);

  const performanceTrend = useMemo<TrendPoint[]>(() => {
    const graded = allAssignments
      .filter(
        (assignment: any) =>
          assignment.status === "graded" &&
          typeof assignment.points === "number",
      )
      .sort((a: any, b: any) => {
        const aTime = getNumericTime(
          a.gradedAt || a.submittedAt || a.dueDate,
          a.orderIndex || 0,
        );
        const bTime = getNumericTime(
          b.gradedAt || b.submittedAt || b.dueDate,
          b.orderIndex || 0,
        );
        return aTime - bTime;
      });

    const bucketMap = new Map<
      string,
      { total: number; count: number; order: number }
    >();

    graded.forEach((assignment: any, index: number) => {
      const fallbackLabel = `A${Math.min(index + 1, 6)}`;
      const time = getNumericTime(
        assignment.gradedAt || assignment.submittedAt || assignment.dueDate,
        0,
      );
      const label = time
        ? new Date(time).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })
        : fallbackLabel;
      const current = bucketMap.get(label) || {
        total: 0,
        count: 0,
        order: index,
      };
      const percent = getAssignmentPercent(assignment);
      if (percent !== null) {
        current.total += percent;
        current.count += 1;
      }
      bucketMap.set(label, current);
    });

    const points = Array.from(bucketMap.entries())
      .sort((a, b) => a[1].order - b[1].order)
      .filter(([, value]) => value.count > 0)
      .map(([label, value]) => ({
        label,
        average: Math.round(value.total / value.count),
        count: value.count,
      }));

    return points.slice(-6);
  }, [allAssignments]);

  const trendDelta = useMemo(() => {
    if (performanceTrend.length < 2) return 0;
    return (
      performanceTrend[performanceTrend.length - 1].average -
      performanceTrend[0].average
    );
  }, [performanceTrend]);

  const academicInsights = useMemo<AcademicInsight[]>(() => {
    const insights: AcademicInsight[] = [];
    const mostCritical = atRiskStudents[0];
    const weakestTopic = weakTopics[0];

    if (summary.totalStudents === 0) {
      return [
        {
          title: "No enrolled students",
          body: "No enrolled students were found for this analytics scope. Add students to activate the dashboard.",
          tone: "info",
          icon: "account-search-outline",
        },
      ];
    }

    const hasGraded = allAssignments.some(
      (assignment: any) => assignment.status === "graded",
    );

    if (!hasGraded) {
      return [
        {
          title: "No graded assignments yet",
          body: "Students may have pending or submitted work, but no graded assignment records are available yet. Assignment risk indicators will activate after grading or when assignments become missing.",
          tone: "info",
          icon: "database-search-outline",
        },
      ];
    }

    if (trendDelta >= 5) {
      insights.push({
        title: "Positive assignment performance trajectory",
        body: `The class trend increased by ${trendDelta} percentage points across recent graded assignments, indicating improving assignment mastery.`,
        tone: "success",
        icon: "chart-line-variant",
      });
    } else if (trendDelta <= -5) {
      insights.push({
        title: "Declining assignment performance trend",
        body: `The class trend dropped by ${Math.abs(trendDelta)} percentage points. Review recent assignment difficulty and provide targeted reinforcement.`,
        tone: "danger",
        icon: "chart-line-variant",
      });
    } else {
      insights.push({
        title: "Stable assignment performance",
        body: "Recent graded assignments show a stable trend. Continue monitoring students near the assignment passing threshold.",
        tone: "info",
        icon: "chart-timeline-variant",
      });
    }

    // 🔥 FIX: attentionIndex now maxes out at 100 (previously 200, see the
    // attentionIndex calculation above), so this threshold was halved from
    // 40 to 20 to keep the same relative sensitivity — 40/200 and 20/100
    // both represent the same 20%-of-max trigger point.
    if (attentionIndex >= 20) {
      insights.push({
        title: "High assignment intervention load",
        body: `${attentionIndex}% attention index suggests a heavy support requirement. Prioritize high assignment-risk learners and missing assignments first.`,
        tone: "warning",
        icon: "account-alert-outline",
      });
    } else {
      insights.push({
        title: "Manageable assignment intervention load",
        body: `${attentionIndex}% attention index indicates the class is within a manageable monitoring range.`,
        tone: "success",
        icon: "shield-check-outline",
      });
    }

    if (weakestTopic && weakestTopic.gradedCount > 0) {
      insights.push({
        title: "Lowest performing assignment topic",
        body: `${weakestTopic.topic} has the lowest recorded average at ${weakestTopic.average}%. Consider remediation, examples, or a short formative assignment.`,
        tone: weakestTopic.average < 75 ? "danger" : "warning",
        icon: "book-alert-outline",
      });
    }

    if (mostCritical) {
      insights.push({
        title: "Priority student for assignment follow-up",
        body: `${mostCritical.studentName} is ranked as ${mostCritical.riskLevel.toLowerCase()} priority with ${mostCritical.totalPendingAssignments} pending assignment(s) and ${mostCritical.overallAverage}% assignment average.`,
        tone: mostCritical.riskLevel === "High" ? "danger" : "warning",
        icon: "account-heart-outline",
      });
    }

    return insights.slice(0, 4);
  }, [
    allAssignments,
    atRiskStudents,
    attentionIndex,
    summary.totalStudents,
    trendDelta,
    weakTopics,
  ]);

  // Explanations shown by the "?" icons. Every `live` value is read from the
  // same variables the dashboard renders, so the modal always matches the screen.
  const metricInfo = useMemo<Record<MetricKey, MetricInfo>>(() => {
    const evaluated = studentInsights.filter(
      (student) => student.totalGradedAssignments > 0,
    );
    const passed = evaluated.filter(
      (student) => student.overallAverage >= 75,
    ).length;
    const evaluatedForRisk = summary.totalStudents - (summary.noDataCount ?? 0);

    const assignmentPercent: MetricInfoItem = {
      label: "Step 1 - Assignment score (%)",
      formula:
        "Score earned ÷ total score of the assignment × 100, only for graded assignments. Assignments with no valid total score are skipped.",
      source:
        "Student Assignment Scores: the grade your teachers entered on each graded assignment, for every student in the selected class.",
    };

    const studentAverage: MetricInfoItem = {
      label: "Step 2 - Student overall average",
      formula:
        "Average of the student's assignment scores per subject, then the average of those subject averages (subjects with no graded work are skipped). Rounded to a whole number.",
      source:
        "Worked out from each student's own Student Assignment Scores, first per subject and then across subjects.",
      note: "Each subject counts equally, no matter how many assignments it has, and values are rounded at every step.",
    };

    return {
      classMean: {
        title: "Class Assignment Mean",
        summary:
          "The average of every student's overall assignment average in the selected class.",
        items: [
          assignmentPercent,
          studentAverage,
          {
            label: "Step 3 - Class mean",
            live: classHealth === "No Data" ? "No Data" : `${summary.classAverage}%`,
            formula:
              "Average of all students' overall averages. Students with 0 graded assignments are excluded.",
            source:
              "Worked out from every student's overall average (Step 2) in the selected class.",
            note: `Based on ${evaluated.length} of ${summary.totalStudents} student(s) that have graded work.`,
          },
        ],
      },
      passingRate: {
        title: "Assignment Passing Rate",
        summary: "The share of evaluated students whose overall average is 75% or higher.",
        items: [
          {
            label: "Passing rate",
            live: `${passingRate}%  (${passed} of ${evaluated.length})`,
            formula:
              "students with overall average >= 75 ÷ students with at least 1 graded assignment × 100, rounded.",
            source:
              "Each student's overall average (Step 2 of Class Assignment Mean). 75% is also the cut-off that puts a student in High risk.",
            note: "Students with no graded work are left out of both numbers.",
          },
        ],
      },
      completionRate: {
        title: "Assignment Completion Rate",
        summary: "How much of the total assigned workload has been completed.",
        items: [
          {
            label: "Completion rate",
            live: `${completionRate}%  (${totalGraded + totalSubmitted} of ${totalGraded + totalSubmitted + totalPending + totalMissing})`,
            formula:
              "(graded + submitted) ÷ (graded + submitted + pending + missing) × 100, rounded.",
            source:
              "Counted from every student's assignments in the selected class. Graded work and submitted work (including late) counts as completed. Work that is not yet due is pending. Work that is past its due date and not turned in is missing.",
            note: `Currently ${totalGraded} graded, ${totalSubmitted} submitted, ${totalPending} pending, ${totalMissing} missing.`,
          },
        ],
      },
      attentionIndex: {
        title: "Attention Index",
        summary: "How heavy the class's intervention load is, from 0% to 100%.",
        items: [
          {
            label: "Attention index",
            live: `${attentionIndex}%  (${summary.highRiskCount} high, ${summary.moderateRiskCount} moderate, ${evaluatedForRisk} evaluated)`,
            formula:
              "(High-risk students × 2 + Moderate-risk students) ÷ (evaluated students × 2) × 100, rounded. Evaluated = total students minus 'No Data' students.",
            source:
              "The number of High and Moderate risk students, as shown in the Class Overview card. Each student's level depends on their average and their missing and pending work (rules below).",
            note: "Risk level rules: High = average < 75 or 3+ missing. Moderate = average < 85, or 1+ missing, or 3+ pending. Otherwise Low. No Data = nothing graded and nothing missing. 100% means every evaluated student is High risk.",
          },
        ],
      },
      highestScore: {
        title: "Highest Assignment Score",
        summary: "The best single assignment score in the selected scope.",
        items: [
          {
            label: "Highest score",
            live: `${classHighestScore}%`,
            formula: "Maximum of all graded assignment scores (%) across all students and subjects in scope.",
            source:
              "The best score among all Student Assignment Scores of the students in the selected class.",
          },
        ],
      },
      lowestScore: {
        title: "Lowest Assignment Score",
        summary: "The weakest single assignment score in the selected scope.",
        items: [
          {
            label: "Lowest score",
            live: `${classLowestScore}%`,
            formula: "Minimum of all graded assignment scores (%) across all students and subjects in scope.",
            source:
              "The weakest score among all Student Assignment Scores of the students in the selected class.",
          },
        ],
      },
      trendGraph: {
        title: "Performance Trend",
        summary: "Class-wide average score over time, and how much it changed.",
        items: [
          {
            label: "Each point on the line",
            live: `${performanceTrend.length} point(s)`,
            formula:
              "Graded assignments are sorted by graded date (falls back to submitted date, then due date) and grouped by calendar day. Each point is the average score (%) of that day's graded assignments. Only the latest 6 points are shown.",
            source:
              "Student Assignment Scores of all students in the selected class, grouped by the day they were graded.",
          },
          {
            label: "Change badge (pts)",
            live: `${trendDelta >= 0 ? "+" : ""}${trendDelta} pts`,
            formula: "Last point's average minus first point's average (percentage points, not percent).",
            source: "The difference between the first and last point of the Performance Trend Line Graph.",
            note: "Needs at least 2 points, otherwise it shows 0.",
          },
        ],
      },
      aiInsights: {
        title: "AI-Generated Insights",
        summary: "Plain-language messages produced from the numbers on this dashboard.",
        items: [
          {
            label: "Where the percentages come from",
            live: `Attention ${attentionIndex}%, trend ${trendDelta >= 0 ? "+" : ""}${trendDelta} pts`,
            formula:
              "Rule-based: trend >= +5 pts is positive, <= -5 pts is declining; attention index >= 20% is 'high load'; the lowest topic average and the top-priority student's average are quoted as-is.",
            source:
              "Built from the Attention Index, the change shown on the Performance Trend Line Graph, the Lowest Performing Assignment Topics and the Assignment Risk Students list (see their own ? icons).",
            note: "These insights are written from fixed rules on this dashboard, not by a live AI model.",
          },
        ],
      },
      classOverview: {
        title: "Class Overview",
        summary: "How many students fall in each risk level and each average range.",
        items: [
          {
            label: "Risk bars",
            formula:
              "Count of students per risk level. Bar width = count ÷ total students × 100.",
            source: "Each student's risk level in the selected class, using the same rules as the Attention Index.",
          },
          {
            label: "Grade range bars",
            formula:
              "Each student's overall average is placed in 90-100, 80-89, 75-79 or Below 75. Students with no graded work are not counted. Bar width = count ÷ total students × 100.",
            source: "Each student's overall average (Step 2 of Class Assignment Mean).",
          },
        ],
      },
      topics: {
        title: "Lowest Performing Topics",
        summary: "Topics with the lowest average assignment score.",
        items: [
          {
            label: "Topic average (%)",
            live: weakTopics[0] ? `${weakTopics[0].topic}: ${weakTopics[0].average}%` : undefined,
            formula:
              "Assignments are grouped by topic (falls back to the assignment title, then 'Uncategorized'). Topic average = average of the graded scores (%) in that topic across all students. The 5 lowest are shown.",
            source: "Student Assignment Scores of all students in the selected class, grouped by assignment topic.",
            note: "Only topics with at least 1 graded assignment are ranked. Bars turn red below 75%.",
          },
        ],
      },
      topStudents: {
        title: "Top Performing Students",
        summary: "The five students with the highest overall assignment average.",
        items: [
          studentAverage,
          {
            label: "Ranking",
            live: `${topStudents.length} student(s) listed`,
            formula:
              "Students with at least 1 graded assignment, sorted by overall average, highest first. Rank = 1 + number of students with a strictly higher average, so ties share a rank.",
            source: "Each student's overall average (Step 2 of Class Assignment Mean), ranked from highest to lowest.",
          },
        ],
      },
      percentile: {
        title: "Percentile Ranking",
        summary: "Where each student stands compared with the other evaluated students in the selected class.",
        items: [
          {
            label: "Assignment average (%)",
            formula: "The student's overall average (Step 2 of Class Assignment Mean).",
            source: "Worked out from the student's own Student Assignment Scores (see Class Assignment Mean).",
          },
          {
            label: "Percentile (P)",
            live: `${studentInsights.filter((s) => s.totalGradedAssignments > 0).length} evaluated student(s)`,
            formula:
              "students whose average is <= this student's average ÷ evaluated students × 100, rounded. P80 means the student is at or above 80% of the group. The bar width equals this value.",
            source: "The overall averages of all evaluated students in the selected class, compared with each other.",
            note: "Students with no graded work are not part of the comparison. They show 'No Data' and no rank.",
          },
        ],
      },
      riskStudents: {
        title: "Assignment Risk Students",
        summary: "Students flagged High or Moderate, with the numbers behind each flag.",
        items: [
          {
            label: "Assignment Average (%)",
            formula: "The student's overall average (Step 2 of Class Assignment Mean).",
            source: "Worked out from the student's own Student Assignment Scores (see Class Assignment Mean).",
          },
          {
            label: "Percentile (P)",
            formula: "Same as the Student Assignment Percentile Ranking card: evaluated students at or below this average ÷ evaluated students × 100.",
            source: "The overall averages of all evaluated students in the selected class, compared with each other.",
          },
          {
            label: "Risk level, reason and trend chip",
            live: `${atRiskStudents.length} flagged`,
            formula:
              "Level rules: High = average below 75 or 3+ missing; Moderate = average below 85, 1+ missing, or 3+ pending. The written reason uses the same rules. Trend = last graded score minus first graded score, in date order; above 0 is Improving, below 0 is Declining.",
            source: "The student's average, missing work and pending work in the selected class, and their Student Assignment Scores in date order for the trend.",
          },
        ],
      },
    };
  }, [
    studentInsights,
    summary,
    classHealth,
    passingRate,
    completionRate,
    totalSubmitted,
    totalPending,
    totalGraded,
    totalMissing,
    attentionIndex,
    classHighestScore,
    classLowestScore,
    performanceTrend,
    trendDelta,
    weakTopics,
    topStudents,
    atRiskStudents,
  ]);

  const chartData = useMemo(() => {
    const fallback = performanceTrend.length
      ? performanceTrend
      : [{ label: "No Data", average: 0, count: 0 }];
    return {
      labels: fallback.map((item) => item.label),
      datasets: [
        {
          data: fallback.map((item) => item.average),
          strokeWidth: 3,
        },
      ],
    };
  }, [performanceTrend]);

  return (
    <>
      {/* "?" explanation modal - shared by every info icon on this screen */}
      <Modal
        visible={activeInfo !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveInfo(null)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.infoOverlay}
          onPress={() => setActiveInfo(null)}
        >
          <Pressable style={styles.infoSheet} onPress={() => {}}>
            {activeInfo ? (
              <>
                <View style={styles.infoHeader}>
                  <View style={styles.infoHeaderIcon}>
                    <MaterialCommunityIcons
                      name="help-circle-outline"
                      size={22}
                      color={palette.primary}
                    />
                  </View>
                  <View style={styles.infoHeaderText}>
                    <Text style={styles.infoTitle}>
                      {metricInfo[activeInfo].title}
                    </Text>
                    <Text style={styles.infoSummary}>
                      {metricInfo[activeInfo].summary}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setActiveInfo(null)}
                    hitSlop={10}
                    accessibilityLabel="Close explanation"
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={22}
                      color={palette.text}
                    />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.infoScroll}
                  showsVerticalScrollIndicator
                >
                  {metricInfo[activeInfo].items.map((item) => (
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

                      <Text style={styles.infoFieldLabel}>
                        WHERE THE DATA COMES FROM
                      </Text>
                      <Text style={styles.infoBody}>{item.source}</Text>

                      {item.note ? (
                        <View style={styles.infoNote}>
                          <MaterialCommunityIcons
                            name="information-outline"
                            size={16}
                            color={palette.blue}
                          />
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

      {/* ✅ On mobile/small screens the options list opens in a real
          top-level Modal (bottom sheet) since an inline absolutely
          positioned View sitting inside the ScrollView would get
          clipped/covered and can't be tapped. On large screens it opens as
          an inline menu anchored right under the button instead — same
          responsive pattern as Assignments.tsx's filter dropdown. */}
      {!isLargeScreen && (
        <Modal
          visible={showClassDropdown}
          transparent
          animationType="fade"
          onRequestClose={() => setShowClassDropdown(false)}
          statusBarTranslucent
        >
          <TouchableOpacity
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setShowClassDropdown(false)}
          >
            {/* Swallow taps on the sheet itself so they don't close the modal */}
            <TouchableOpacity
              style={styles.dropdownModal}
              activeOpacity={1}
              onPress={() => {}}
            >
              <View style={styles.dropdownModalHandle} />

              <View style={styles.dropdownModalHeader}>
                <Text style={styles.dropdownModalTitle}>Select Class</Text>
                <TouchableOpacity onPress={() => setShowClassDropdown(false)} hitSlop={8}>
                  <MaterialCommunityIcons name="close" size={22} color={palette.text} />
                </TouchableOpacity>
              </View>

              {/* 🔥 NEW: scrollable list with a visible scroll indicator, so a
                  long class list no longer overflows off-screen with no way
                  to reach the rest of it. */}
              <ScrollView
                style={styles.dropdownModalScroll}
                showsVerticalScrollIndicator={true}
              >
                {classOptions.map((option) => {
                  const isSelected = option.value === selectedClass;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.dropdownItem,
                        isSelected && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        onChangeSelectedClass?.(option.value);
                        setShowClassDropdown(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          isSelected && styles.dropdownItemTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {isSelected ? (
                        <MaterialCommunityIcons
                          name="check"
                          size={18}
                          color={palette.primary}
                        />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { padding: pagePadding }]}
      >
        <View style={[styles.heroCard, responsiveHeroStyle]}>
          <View style={styles.heroLeft}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroEyebrowBadge}>
                <MaterialCommunityIcons
                  name="chart-box-outline"
                  size={16}
                  color={palette.primary}
                />
                <Text style={styles.heroEyebrow}>
                  Assignment Analytics Report
                </Text>
              </View>

              <View
                style={[
                  styles.classDropdownContainer,
                  isLargeScreen && styles.classDropdownContainerLarge,
                ]}
              >
                <Pressable
                  ref={classButtonRef}
                  style={styles.classDropdownButton}
                  onPress={toggleClassDropdown}
                >
                  <View style={styles.classDropdownTextWrap}>
                    <Text style={styles.classDropdownLabel}>Selected Class</Text>
                    <Text style={styles.classDropdownValue} numberOfLines={1}>
                      {selectedClass === "All" ? "All Classes" : selectedClass}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name={showClassDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={palette.textStrong}
                  />
                </Pressable>
              </View>
            </View>

            {/* ✅ Large-screen dropdown menu — rendered as a real top-level
                Modal (like the mobile bottom sheet below) instead of a
                locally-positioned View, and anchored to the button's
                measured on-screen coordinates. A Modal paints through RN's
                own top-level portal, above the entire app — including any
                sticky header or other container — so, unlike a plain
                absolutely-positioned View, it can never end up trapped
                behind something else's stacking context again. */}
            {isLargeScreen && showClassDropdown && classMenuLayout ? (
              <Modal
                visible={showClassDropdown}
                transparent
                animationType="fade"
                onRequestClose={() => setShowClassDropdown(false)}
              >
                <TouchableOpacity
                  style={styles.classMenuModalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowClassDropdown(false)}
                >
                  <View
                    style={[
                      styles.classInlineDropdownMenu,
                      {
                        position: "absolute",
                        top: classMenuLayout.top,
                        left: classMenuLayout.left,
                        width: classMenuLayout.width,
                      },
                    ]}
                  >
                    <ScrollView
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={true}
                      style={styles.classInlineDropdownScroll}
                      persistentScrollbar={true}
                    >
                      {classOptions.map((option) => {
                        const isSelected = option.value === selectedClass;
                        return (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.classInlineDropdownItem,
                              isSelected && styles.classInlineDropdownItemActive,
                            ]}
                            onPress={() => {
                              onChangeSelectedClass?.(option.value);
                              setShowClassDropdown(false);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.classInlineDropdownItemText,
                                isSelected && styles.classInlineDropdownItemTextActive,
                              ]}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {option.label}
                            </Text>
                            {isSelected ? (
                              <MaterialCommunityIcons
                                name="check"
                                size={16}
                                color={palette.primary}
                              />
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>
            ) : null}

            <Text
              style={[
                styles.heroTitle,
                { fontSize: isSmallScreen ? 22 : isTabletScreen ? 24 : 28 },
              ]}
            >
              Teacher Assignment Performance Analytics
            </Text>
            <Text style={styles.heroDescription}>
              Monitor assignment grades, completion rates, learning gaps, and student progress through assignment-based analytics and AI-generated instructional insights.
            </Text>
          </View>

          <View
            style={[styles.heroRight, isSmallScreen && styles.heroRightCompact]}
          >
            <CircularMiniStat
              value={classHealth === "No Data" ? "No Data" : `${summary.classAverage}%`}
              label="Class Assignment Mean"
              onInfoPress={() => setActiveInfo("classMean")}
              accent={palette.primary}
              softBg={palette.primarySoft}
              icon="chart-line"
            />
            <CircularMiniStat
              value={`${passingRate}%`}
              label="Assignment Passing Rate"
              onInfoPress={() => setActiveInfo("passingRate")}
              accent={palette.green}
              softBg={palette.greenSoft}
              icon="school-outline"
            />
            <CircularMiniStat
              value={classHealth}
              label="Assignment Status"
              accent={palette.blue}
              softBg={palette.blueSoft}
              icon="shield-check-outline"
            />
          </View>
        </View>

        <View style={responsiveMetricStyle}>
          <MetricCard
            title="Total Students"
            value={summary.totalStudents}
            helper="Learners included in current assignment analytics scope"
            icon="account-group-outline"
            accent={palette.blue}
            softBg={palette.blueSoft}
          />
          <MetricCard
            title="Assignment Completion Rate"
            value={`${completionRate}%`}
            helper="Graded and submitted assignments against total assigned workload"
            onInfoPress={() => setActiveInfo("completionRate")}
            icon="check-decagram-outline"
            accent={palette.green}
            softBg={palette.greenSoft}
          />
          <MetricCard
            title="Assignment Risk"
            value={summary.highRiskCount + summary.moderateRiskCount}
            helper="Learners requiring assignment intervention"
            icon="alert-circle-outline"
            accent={palette.orange}
            softBg={palette.orangeSoft}
          />
          <MetricCard
            title="Attention Index"
            value={`${attentionIndex}%`}
            helper="Weighted assignment intervention pressure indicator"
            onInfoPress={() => setActiveInfo("attentionIndex")}
            icon="radar"
            accent={palette.primary}
            softBg={palette.primarySoft}
          />
        </View>

        <View style={responsiveMetricStyle}>
          <MetricCard
            title="Highest Assignment Score"
            value={`${classHighestScore}%`}
            helper="Highest assignment score recorded"
            onInfoPress={() => setActiveInfo("highestScore")}
            icon="arrow-up-bold-circle-outline"
            accent={palette.green}
            softBg={palette.greenSoft}
          />
          <MetricCard
            title="Lowest Assignment Score"
            value={`${classLowestScore}%`}
            helper="Lowest assignment score recorded"
            onInfoPress={() => setActiveInfo("lowestScore")}
            icon="arrow-down-bold-circle-outline"
            accent={palette.red}
            softBg={palette.redSoft}
          />
          <MetricCard
            title="Pending Assignments"
            value={totalPending}
            helper="Unfinished assignments affecting progress"
            icon="clipboard-text-clock-outline"
            accent={palette.purple}
            softBg={palette.purpleSoft}
          />
          <MetricCard
            title="Submitted Assignments"
            value={totalSubmitted}
            helper="Completed assignment submissions counted in monitoring"
            icon="file-check-outline"
            accent="#0891B2"
            softBg="#E0F7FF"
          />
        </View>

        <SectionCard
          title="Performance Trend Line Graph"
          onInfoPress={() => setActiveInfo("trendGraph")}
          subtitle="Average Assignment Scores Across Recent Graded Assignments"
          rightNode={
            <Text
              style={[
                styles.trendDelta,
                { color: trendDelta >= 0 ? palette.green : palette.red },
              ]}
            >
              {trendDelta >= 0 ? "+" : ""}
              {trendDelta} pts
            </Text>
          }
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <LineChart
              data={chartData}
              width={chartWidth}
              height={chartHeight}
              yAxisSuffix="%"
              yAxisInterval={1}
              chartConfig={{
                backgroundColor: palette.surface,
                backgroundGradientFrom: palette.surface,
                backgroundGradientTo: palette.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(51, 78, 104, ${opacity})`,
                propsForDots: {
                  r: "5",
                  strokeWidth: "2",
                  stroke: palette.blue,
                },
                propsForBackgroundLines: {
                  strokeDasharray: "4 6",
                  stroke: "#E6EEF8",
                },
              }}
              bezier
              style={styles.lineChart}
            />
          </ScrollView>
        </SectionCard>

        <SectionCard
          title="AI-Generated Assignment Insights"
          onInfoPress={() => setActiveInfo("aiInsights")}
          subtitle="AI-generated insights based on student assignment grades, completion status, and learning progress."
        >
          <View style={styles.aiGrid}>
            {academicInsights.map((insight) => {
              const tone = insightTone[insight.tone];
              return (
                <View key={insight.title} style={styles.aiCard}>
                  <View
                    style={[styles.aiIconWrap, { backgroundColor: tone.bg }]}
                  >
                    <MaterialCommunityIcons
                      name={insight.icon}
                      size={20}
                      color={tone.color}
                    />
                  </View>
                  <View style={styles.aiTextWrap}>
                    <Text style={styles.aiTitle}>{insight.title}</Text>
                    <Text style={styles.aiBody}>{insight.body}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </SectionCard>

        <View
          style={[styles.dualColumn, isSmallScreen && styles.dualColumnCompact]}
        >
          <SectionCard
            style={responsiveSectionStyle}
            title="Class Overview"
            onInfoPress={() => setActiveInfo("classOverview")}
            subtitle="Assignment grade distribution and assignment risk levels."
          >
            {riskBuckets.map((item) => (
              <HorizontalBar
                key={item.label}
                label={item.label}
                value={item.value}
                maxValue={summary.totalStudents || 1}
                color={item.color}
                rightText={`${item.value} student${item.value === 1 ? "" : "s"}`}
              />
            ))}
            <View style={styles.chartDivider} />
            {gradeBuckets.map((item) => (
              <HorizontalBar
                key={item.label}
                label={item.label}
                value={item.value}
                maxValue={summary.totalStudents || 1}
                color={item.color}
                rightText={`${item.value}`}
              />
            ))}
          </SectionCard>

          <SectionCard
            style={responsiveSectionStyle}
            title="Pending Assignment Monitoring"
            subtitle="Students with the heaviest unfinished assignment workload"
          >
            {mostPendingStudents.length === 0 ? (
              <Text style={styles.emptyText}>
                No pending assignments detected.
              </Text>
            ) : null}
            {mostPendingStudents.map((student) => (
              <HorizontalBar
                key={student.studentId}
                label={student.studentName}
                value={student.totalPendingAssignments}
                maxValue={maxPending}
                color={palette.purple}
                rightText={`${student.totalPendingAssignments}`}
              />
            ))}
          </SectionCard>
        </View>

        <View
          style={[styles.dualColumn, isSmallScreen && styles.dualColumnCompact]}
        >
          <SectionCard
            style={responsiveSectionStyle}
            title="Lowest Performing Assignment Topics"
            onInfoPress={() => setActiveInfo("topics")}
            subtitle="Topics with the lowest average assignment scores"
          >
            {weakTopics.length === 0 ? (
              <Text style={styles.emptyText}>No assignment topic data available yet.</Text>
            ) : (
              weakTopics.map((topic) => (
                <View key={topic.topic} style={styles.topicRow}>
                  <HorizontalBar
                    label={topic.topic}
                    value={topic.average}
                    maxValue={maxTopicAverage}
                    color={topic.average < 75 ? palette.red : palette.orange}
                    rightText={`${topic.average}%`}
                  />
                  <Text style={styles.topicMeta}>
                    Graded: {topic.gradedCount} • Pending: {topic.pendingCount}
                  </Text>
                </View>
              ))
            )}
          </SectionCard>

          <SectionCard
            style={responsiveSectionStyle}
            title="Top Performing Students"
            onInfoPress={() => setActiveInfo("topStudents")}
            subtitle="Highest-performing learners by assignment average"
          >
            {topStudents.length === 0 ? (
              <Text style={styles.emptyText}>No graded assignment records yet.</Text>
            ) : (
              topStudents.map((student) => (
                <HorizontalBar
                  key={student.studentId}
                  label={`#${student.rank} ${student.studentName}`}
                  value={student.overallAverage}
                  maxValue={maxAverage}
                  color={palette.blue}
                  rightText={`${student.overallAverage}%`}
                />
              ))
            )}
          </SectionCard>
        </View>

        <SectionCard
          title="Student Assignment Percentile Ranking"
          onInfoPress={() => setActiveInfo("percentile")}
          subtitle="Assignment standing based on overall assignment average within the selected scope"
        >
          {percentileRows.length === 0 ? (
            <Text style={styles.emptyText}>
              No student assignment ranking data available yet.
            </Text>
          ) : (
            <ScrollView
              style={styles.rankingScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {percentileRows.map((student) => {
                const risk = getRiskPalette(student.riskLevel);
                return (
                  <View
                    key={student.studentId}
                    style={[
                      styles.rankingRow,
                      isSmallScreen && styles.rankingRowCompact,
                    ]}
                  >
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankBadgeText}>
                        {student.totalGradedAssignments === 0
                          ? "–"
                          : `#${student.rank}`}
                      </Text>
                    </View>
                    <View style={styles.rankingInfo}>
                      <Text style={styles.rankingName}>
                        {student.studentName}
                      </Text>
                      <Text style={styles.rankingMeta}>
                        {student.classLabel} • Assignment Average{" "}
                        {student.totalGradedAssignments === 0
                          ? "No Data"
                          : `${student.overallAverage}%`}
                      </Text>
                      <View style={styles.percentileTrack}>
                        <View
                          style={[
                            styles.percentileFill,
                            {
                              width:
                                student.totalGradedAssignments === 0
                                  ? "0%"
                                  : `${student.percentileRank}%`,
                              backgroundColor: risk.fill,
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.percentileRight}>
                    <View
                      style={[
                        styles.percentilePill,
                        { backgroundColor: risk.bg },
                      ]}
                    >
                      <Text
                        style={[styles.percentileText, { color: risk.text }]}
                      >
                        {student.totalGradedAssignments === 0
                          ? "No Data"
                          : `P${student.percentileRank}`}
                      </Text>
                    </View>
                    <InfoButton onPress={() => setActiveInfo("percentile")} />
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </SectionCard>

        <SectionCard
          title="Assignment Risk Students"
          onInfoPress={() => setActiveInfo("riskStudents")}
          subtitle="Students identified through low assignment grades, missing assignments, and declining performance trends."
          rightNode={
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>
                {atRiskStudents.length} flagged
              </Text>
            </View>
          }
        >
          {atRiskStudents.length === 0 ? (
            <Text style={styles.emptyText}>
              No students are currently flagged for assignment intervention.
            </Text>
          ) : (
            <ScrollView
              style={styles.interventionScroll}
              contentContainerStyle={styles.interventionScrollContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              {atRiskStudents.map((student) => {
                const risk = getRiskPalette(student.riskLevel);
                const trend = getTrendMeta(student.overallTrend);
                return (
                  <View
                    key={student.studentId}
                    style={[
                      styles.interventionCard,
                      isSmallScreen && styles.interventionCardCompact,
                      { borderLeftColor: risk.fill },
                    ]}
                  >
                    <View
                      style={[
                        styles.interventionLeft,
                        isSmallScreen && styles.interventionLeftCompact,
                      ]}
                    >
                      <View
                        style={[
                          styles.avatarCircle,
                          { backgroundColor: risk.bg },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={risk.icon}
                          size={20}
                          color={risk.text}
                        />
                      </View>

                      <View style={styles.interventionTextWrapEnhanced}>
                        <View style={styles.nameAndTrendRow}>
                          <Text style={styles.interventionName}>
                            {student.studentName}
                          </Text>
                          <View
                            style={[
                              styles.trendChip,
                              { backgroundColor: trend.bg },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name={trend.icon}
                              size={14}
                              color={trend.color}
                            />
                            <Text
                              style={[
                                styles.trendChipText,
                                { color: trend.color },
                              ]}
                            >
                              {trend.label}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.interventionMeta}>
                          {student.classLabel} • Assignment Average{" "}
                          {student.totalGradedAssignments === 0
                            ? "No Data"
                            : `${student.overallAverage}%`}{" "}
                          • Percentile{" "}
                          {student.totalGradedAssignments === 0
                            ? "No Data"
                            : `P${student.percentileRank}`}{" "}
                          • Pending {student.totalPendingAssignments} • Missing{" "}
                          {student.totalMissingAssignments}
                        </Text>
                        <Text style={styles.reasonText}>
                          Assignment Risk Reason: {student.riskReason}
                        </Text>
                        <Text style={styles.recommendationText}>
                          Recommended Intervention:{" "}
                          {student.recommendedIntervention}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.riskPill,
                        isSmallScreen && styles.riskPillCompact,
                        { backgroundColor: risk.bg },
                      ]}
                    >
                      <Text style={[styles.riskPillText, { color: risk.text }]}>
                        {student.riskLevel}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </SectionCard>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  content: { gap: 14, paddingBottom: 36 },
  // 🔥 UPDATED: same mobile bottom-sheet Modal pattern as Assignments.tsx's
  // "Filter Assignments" dropdown — handle, header with close button, and a
  // scrollable list (with a visible scroll indicator) instead of a plain
  // View that could overflow off-screen with a long class list.
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    // Ensure this sits above every other container (heroCard elevation:3,
    // sectionCard elevation:2) on both native and web (react-native-web
    // doesn't always guarantee Modal paints above elevated siblings).
    zIndex: 9999,
    elevation: 24,
  },
  dropdownModal: {
    width: "100%",
    maxHeight: "70%",
    backgroundColor: palette.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    zIndex: 9999,
    elevation: 24,
  },
  dropdownModalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 14,
    backgroundColor: palette.border,
    marginBottom: 12,
  },
  dropdownModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  dropdownModalTitle: { fontFamily: FONT_TITLE, fontSize: 15, fontWeight: WEIGHT_TITLE, color: palette.text },
  dropdownModalScroll: { maxHeight: 320 },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownItemActive: { backgroundColor: palette.primarySoft },
  dropdownItemText: { fontFamily: FONT_BODY, fontSize: 14, color: palette.text, fontWeight: WEIGHT_EMPHASIS,},
  dropdownItemTextActive: { color: palette.primary },
  heroCard: {
    backgroundColor: palette.surface,
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: "row",
    gap: 18,
    flexWrap: "wrap",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroCardCompact: { borderRadius: 20, padding: 14, flexDirection: "column" },
  heroLeft: { flex: 1, minWidth: 0 },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  heroEyebrowBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: palette.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroEyebrow: { fontFamily: FONT_BODY,
    color: palette.primary,
    fontWeight: WEIGHT_EMPHASIS,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  // Wraps the trigger button + the large-screen inline menu so the menu can
  // be absolutely positioned right under the button. Matches Assignments.tsx's
  // filterDropdownContainer / filterDropdownContainerLarge pattern.
  classDropdownContainer: {
    position: "relative",
    width: "100%",
    maxWidth: 320,
    minWidth: 0,
    zIndex: 4000,
  },
  // Match the button's own maxWidth so the inline menu below it is never
  // narrower than the button/its longest option — a narrower menu was
  // forcing long class names to overflow past the rounded box edge instead
  // of truncating cleanly.
  classDropdownContainerLarge: { maxWidth: 320 },
  classDropdownButton: {
    minWidth: 0,
    width: "100%",
    maxWidth: 320,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "#FBFCFE",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    zIndex: 4001,
  },
  classDropdownTextWrap: { flex: 1 },
  classDropdownLabel: { fontFamily: FONT_BODY,
    fontSize: 11,
    color: palette.textMuted,
    fontWeight: WEIGHT_EMPHASIS,
    textTransform: "uppercase",
  },
  classDropdownValue: { fontFamily: FONT_BODY,
    fontSize: 14,
    color: palette.textStrong,
    fontWeight: WEIGHT_EMPHASIS,
    marginTop: 2,
  },
  // Transparent full-screen tap-catcher for the large-screen anchored Modal
  // menu — no dim/backdrop (unlike the mobile bottom sheet) since this is a
  // small anchored menu, not a sheet covering the screen.
  classMenuModalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  // ✅ Desktop/large-screen dropdown menu content, rendered inside the
  // top-level Modal above. Position/top/left/width are supplied inline at
  // render time from the button's measured on-screen coordinates.
  classInlineDropdownMenu: {
    position: "absolute",
    top: 54,
    left: 0,
    width: "100%",
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: "hidden",
    zIndex: 5000,
    maxHeight: 260,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  classInlineDropdownScroll: { maxHeight: 260, width: "100%" },
  classInlineDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    width: "100%",
    minWidth: 0,
    backgroundColor: palette.surface,
    paddingVertical: 10,
    // Extra right padding leaves room for the visible scrollbar so it
    // doesn't sit on top of the check icon or the last letters of the text.
    paddingLeft: 12,
    paddingRight: 18,
  },
  classInlineDropdownItemActive: { backgroundColor: palette.primarySoft },
  classInlineDropdownItemText: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    color: palette.text,
    flex: 1,
    minWidth: 0,
  },
  classInlineDropdownItemTextActive: { color: palette.primary, fontWeight: WEIGHT_EMPHASIS },
  heroTitle: { fontFamily: FONT_TITLE,
    lineHeight: 31,
    color: palette.textStrong,
    fontWeight: WEIGHT_TITLE,
    marginTop: 18,
  },
  heroSubtitle: { fontFamily: FONT_BODY,
    marginTop: 6,
    fontSize: 14,
    color: palette.text,
    
  },
  heroDescription: { fontFamily: FONT_BODY,
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: palette.textMuted,
    maxWidth: 760,
  },
  heroRight: {
    minWidth: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignContent: "flex-start",
    justifyContent: "flex-end",
  },
  heroRightCompact: { width: "100%", justifyContent: "space-between" },
  miniStatCard: {
    flexGrow: 1,
    flexBasis: 104,
    minHeight: 108,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 20,
    padding: 12,
    backgroundColor: "#FBFCFE",
  },
  miniStatIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  miniStatValue: { fontFamily: FONT_BODY, color: palette.textStrong, fontSize: 20, fontWeight: WEIGHT_EMPHASIS,},
  miniStatLabel: { fontFamily: FONT_BODY,
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: WEIGHT_EMPHASIS,
    marginTop: 3,
  },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricsGridSingle: { flexDirection: "column", gap: 12 },
  metricCard: {
    flex: 1,
    minWidth: 0,
    flexBasis: 190,
    backgroundColor: palette.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  metricTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: { fontFamily: FONT_BODY,
    marginTop: 14,
    fontSize: 28,
    color: palette.textStrong,
    fontWeight: WEIGHT_EMPHASIS,
  },
  metricTitle: { fontFamily: FONT_TITLE,
    marginTop: 4,
    color: palette.textStrong,
    fontSize: 14,
    fontWeight: WEIGHT_TITLE,
  },
  metricHelper: { fontFamily: FONT_BODY,
    marginTop: 6,
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: palette.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sectionCardHalf: { flex: 1, minWidth: 300 },
  sectionCardFull: { width: "100%", minWidth: 0 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 16,
  },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontFamily: FONT_TITLE, color: palette.textStrong, fontSize: 18, fontWeight: WEIGHT_TITLE,},
  sectionSubtitle: { fontFamily: FONT_BODY,
    color: palette.textMuted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  sectionBadge: {
    backgroundColor: palette.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  sectionBadgeText: { fontFamily: FONT_BODY, color: palette.primary, fontSize: 12, fontWeight: WEIGHT_EMPHASIS,},
  trendDelta: { fontFamily: FONT_BODY,
    fontWeight: WEIGHT_EMPHASIS,
    fontSize: 13,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  lineChart: { borderRadius: 18 },
  aiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  aiCard: {
    flex: 1,
    minWidth: 0,
    flexBasis: 260,
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#FBFCFE",
  },
  aiIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  aiTextWrap: { flex: 1 },
  aiTitle: { fontFamily: FONT_TITLE, color: palette.textStrong, fontSize: 14, fontWeight: WEIGHT_TITLE,},
  aiBody: { fontFamily: FONT_BODY, color: palette.text, fontSize: 12, lineHeight: 18, marginTop: 4 },
  dualColumn: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  dualColumnCompact: { flexDirection: "column", gap: 14 },
  barRow: { marginBottom: 14 },
  barTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 7,
  },
  barLabel: { fontFamily: FONT_BODY, flex: 1, color: palette.text, fontSize: 13, fontWeight: WEIGHT_EMPHASIS,},
  barRightValue: { fontFamily: FONT_BODY, color: palette.textMuted, fontSize: 12, fontWeight: WEIGHT_EMPHASIS,},
  barTrack: {
    height: 10,
    backgroundColor: palette.slateBar,
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 999 },
  chartDivider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: 10,
  },
  topicRow: { marginBottom: 8 },
  topicMeta: { fontFamily: FONT_BODY,
    marginTop: -6,
    marginBottom: 10,
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: WEIGHT_EMPHASIS,
  },
  rankingScroll: { maxHeight: 430 },
  rankingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  rankingRowCompact: { alignItems: "flex-start" },
  rankBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.blueSoft,
  },
  rankBadgeText: { fontFamily: FONT_BODY, color: palette.blue, fontWeight: WEIGHT_EMPHASIS, fontSize: 13 },
  rankingInfo: { flex: 1 },
  rankingName: { fontFamily: FONT_BODY, color: palette.textStrong, fontSize: 14, fontWeight: WEIGHT_TITLE,},
  rankingMeta: { fontFamily: FONT_BODY, color: palette.textMuted, fontSize: 12, marginTop: 3 },
  percentileTrack: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: palette.slateBar,
    overflow: "hidden",
  },
  percentileFill: { height: "100%", borderRadius: 999 },
  percentilePill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  percentileText: { fontFamily: FONT_BODY, fontSize: 12, fontWeight: WEIGHT_EMPHASIS,},
  interventionScroll: { maxHeight: 460 },
  interventionScrollContent: { gap: 12 },
  interventionCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderLeftWidth: 5,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#FBFCFE",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  interventionCardCompact: { flexDirection: "column" },
  interventionLeft: { flex: 1, flexDirection: "row", gap: 12 },
  interventionLeftCompact: { width: "100%" },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  interventionTextWrapEnhanced: { flex: 1 },
  nameAndTrendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  interventionName: { fontFamily: FONT_BODY,
    color: palette.textStrong,
    fontSize: 15,
    fontWeight: WEIGHT_TITLE,
  },
  trendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  trendChipText: { fontFamily: FONT_BODY, fontSize: 11, fontWeight: WEIGHT_EMPHASIS,},
  interventionMeta: { fontFamily: FONT_BODY,
    marginTop: 5,
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  reasonText: { fontFamily: FONT_BODY,
    marginTop: 8,
    color: palette.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: WEIGHT_EMPHASIS,
  },
  recommendationText: { fontFamily: FONT_BODY,
    marginTop: 4,
    color: palette.text,
    fontSize: 12,
    lineHeight: 18,
  },
  riskPill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  riskPillCompact: { alignSelf: "flex-start" },
  riskPillText: { fontFamily: FONT_BODY, fontSize: 12, fontWeight: WEIGHT_EMPHASIS,},
  emptyText: { fontFamily: FONT_BODY,
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: WEIGHT_EMPHASIS,
  },
  infoButton: { padding: 2, alignItems: "center", justifyContent: "center" },
  miniStatTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  percentileRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  infoSheet: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "85%",
    backgroundColor: palette.surface,
    borderRadius: 22,
    padding: 18,
  },
  infoHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  infoHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  infoHeaderText: { flex: 1 },
  infoTitle: { fontFamily: FONT_TITLE, color: palette.textStrong, fontSize: 17, fontWeight: WEIGHT_TITLE },
  infoSummary: { fontFamily: FONT_BODY, color: palette.textMuted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  infoScroll: { marginTop: 14 },
  infoItem: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#FBFCFE",
    marginBottom: 12,
  },
  infoItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  infoItemLabel: { fontFamily: FONT_TITLE, color: palette.textStrong, fontSize: 14, fontWeight: WEIGHT_TITLE, flexShrink: 1 },
  infoLivePill: { backgroundColor: palette.blueSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  infoLiveText: { fontFamily: FONT_BODY, color: palette.blue, fontSize: 12, fontWeight: WEIGHT_EMPHASIS },
  infoFieldLabel: { fontFamily: FONT_BODY, color: palette.textMuted, fontSize: 10, letterSpacing: 0.6, fontWeight: WEIGHT_EMPHASIS, marginTop: 12 },
  infoFormula: { fontFamily: FONT_BODY, color: palette.textStrong, fontSize: 13, lineHeight: 20, marginTop: 4 },
  infoBody: { fontFamily: FONT_BODY, color: palette.text, fontSize: 12, lineHeight: 18, marginTop: 4 },
  infoNote: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    backgroundColor: palette.blueSoft,
    borderRadius: 12,
    padding: 10,
  },
  infoNoteText: { fontFamily: FONT_BODY, flex: 1, color: palette.text, fontSize: 12, lineHeight: 18 },
});