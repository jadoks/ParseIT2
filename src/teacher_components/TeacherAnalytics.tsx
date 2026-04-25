import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { buildTeacherAnalytics } from "../analytics/analyticsService";

type TeacherStudentInput = {
  studentId: string;
  studentName: string;
  courses: any[];
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
  primary: "#D32F2F",
  primarySoft: "#FDECEC",
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

const getAssignmentPercent = (assignment: any): number | null => {
  if (
    assignment?.status !== "graded" ||
    typeof assignment?.points !== "number"
  ) {
    return null;
  }

  const maxPoints =
    typeof assignment?.maxPoints === "number" && assignment.maxPoints > 0
      ? assignment.maxPoints
      : 100;

  return Math.round((assignment.points / maxPoints) * 100);
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
}: {
  title: string;
  subtitle?: string;
  rightNode?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) => (
  <View style={[styles.sectionCard, style]}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
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
}: {
  title: string;
  value: string | number;
  helper: string;
  icon: string;
  accent: string;
  softBg: string;
}) => (
  <View style={styles.metricCard}>
    <View style={styles.metricTopRow}>
      <View style={[styles.metricIconWrap, { backgroundColor: softBg }]}>
        <MaterialCommunityIcons name={icon} size={22} color={accent} />
      </View>
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
}: {
  value: string | number;
  label: string;
  accent: string;
  softBg: string;
  icon: string;
}) => (
  <View style={styles.miniStatCard}>
    <View style={[styles.miniStatIcon, { backgroundColor: softBg }]}>
      <MaterialCommunityIcons name={icon} size={18} color={accent} />
    </View>
    <Text style={styles.miniStatValue}>{value}</Text>
    <Text style={styles.miniStatLabel}>{label}</Text>
  </View>
);

const insightReason = ({
  average,
  pending,
  trend,
  graded,
}: {
  average: number;
  pending: number;
  trend: number;
  graded: number;
}) => {
  if (graded === 0) return "No graded submissions yet. Risk cannot be evaluated.";
  if (average < 75 && pending >= 2 && trend < 0)
    return "Low average, multiple missing tasks, and declining trend";
  if (average < 75 && pending >= 2)
    return "Low average and repeated missing tasks";
  if (average < 75) return "Average is below passing threshold";
  if (pending >= 2) return "Several missing assignments need completion";
  if (trend < 0) return "Recent performance trend is declining";
  return "Monitor for consistency and maintain current progress";
};

const insightIntervention = ({
  average,
  pending,
  trend,
  graded,
}: {
  average: number;
  pending: number;
  trend: number;
  graded: number;
}) => {
  if (graded === 0)
    return "Wait for graded submissions before assigning academic intervention.";
  if (average < 75 && pending >= 2)
    return "Schedule 1:1 remediation and set a submission recovery plan.";
  if (average < 75)
    return "Provide targeted tutoring and reassessment support.";
  if (pending >= 2)
    return "Follow up on missing tasks and set short-term deadlines.";
  if (trend < 0)
    return "Check recent learning barriers and monitor next assessment.";
  return "Sustain progress with light-touch monitoring.";
};

export default function TeacherAnalytics({
  teacherName = "Teacher",
  selectedCourseName = "Academic Analytics",
  selectedClass = "All",
  onChangeSelectedClass,
  availableCourses = [],
  students = [],
}: TeacherAnalyticsProps) {
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 600;
  const isTabletScreen = width >= 600 && width < 1024;
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

  const completionRate = useMemo(() => {
    const total = totalPending + totalSubmitted;
    if (total === 0) return 0;
    return Math.round((totalSubmitted / total) * 100);
  }, [totalPending, totalSubmitted]);

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
        totalSubmittedAssignments: row?.totalSubmittedAssignments ?? 0,
        totalGradedAssignments: graded,
        riskLevel: row?.riskLevel ?? (graded === 0 ? "No Data" : "Low"),
        overallTrend: row?.overallTrend ?? 0,
        latestGrade: latestGraded ? getAssignmentPercent(latestGraded) : null,
        highestScore: scores.length ? Math.max(...scores) : null,
        lowestScore: scores.length ? Math.min(...scores) : null,
        riskReason: insightReason({ average, pending, trend: trendNumber, graded }),
        recommendedIntervention: insightIntervention({
          average,
          pending,
          trend: trendNumber,
          graded,
        }),
        percentileRank: 0,
        rank: 0,
      };
    });

    const sortedDescending = [...baseRows].sort(
      (a, b) => b.overallAverage - a.overallAverage,
    );
    const total = sortedDescending.length;

    return baseRows.map((student) => {
      const betterCount = sortedDescending.filter(
        (item) => item.overallAverage > student.overallAverage,
      ).length;
      const lowerOrEqualCount = sortedDescending.filter(
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
      { label: "High Risk", value: summary.highRiskCount, color: "#EF4444" },
      {
        label: "Moderate Risk",
        value: summary.moderateRiskCount,
        color: "#F59E0B",
      },
      { label: "Low Risk", value: summary.lowRiskCount, color: "#22C55E" },
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

  const weakTopics = useMemo(
    () => topicSummaries.slice(0, 5),
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

    return Math.round(
      ((summary.highRiskCount * 2 + summary.moderateRiskCount) /
        evaluatedStudents) *
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
          title: "No graded submissions yet",
          body: "Students may have pending or submitted work, but no graded records are available yet. Risk indicators will activate after grading or when assignments become missing.",
          tone: "info",
          icon: "database-search-outline",
        },
      ];
    }

    if (trendDelta >= 5) {
      insights.push({
        title: "Positive performance trajectory",
        body: `The class trend increased by ${trendDelta} percentage points across recent graded activities, indicating improving mastery.`,
        tone: "success",
        icon: "chart-line-variant",
      });
    } else if (trendDelta <= -5) {
      insights.push({
        title: "Declining performance trend",
        body: `The class trend dropped by ${Math.abs(trendDelta)} percentage points. Review recent assessment difficulty and provide targeted reinforcement.`,
        tone: "danger",
        icon: "chart-line-variant",
      });
    } else {
      insights.push({
        title: "Stable class performance",
        body: "Recent graded activities show a stable trend. Continue monitoring students near the passing threshold.",
        tone: "info",
        icon: "chart-timeline-variant",
      });
    }

    if (attentionIndex >= 40) {
      insights.push({
        title: "High intervention load",
        body: `${attentionIndex}% attention index suggests a heavy support requirement. Prioritize high-risk learners and missing submissions first.`,
        tone: "warning",
        icon: "account-alert-outline",
      });
    } else {
      insights.push({
        title: "Manageable intervention load",
        body: `${attentionIndex}% attention index indicates the class is within a manageable monitoring range.`,
        tone: "success",
        icon: "shield-check-outline",
      });
    }

    if (weakestTopic && weakestTopic.gradedCount > 0) {
      insights.push({
        title: "Lowest mastery topic",
        body: `${weakestTopic.topic} has the lowest recorded average at ${weakestTopic.average}%. Consider remediation, examples, or a short formative quiz.`,
        tone: weakestTopic.average < 75 ? "danger" : "warning",
        icon: "book-alert-outline",
      });
    }

    if (mostCritical) {
      insights.push({
        title: "Priority learner for follow-up",
        body: `${mostCritical.studentName} is ranked as ${mostCritical.riskLevel.toLowerCase()} priority with ${mostCritical.totalPendingAssignments} pending task(s) and ${mostCritical.overallAverage}% average.`,
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
      <Modal
        visible={showClassDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClassDropdown(false)}
      >
        <Pressable
         
          style={styles.dropdownOverlay}
          onPress={() => setShowClassDropdown(false)}
        >
          <View style={styles.dropdownModal}>
            {classOptions.map((option) => {
              const isSelected = option.value === selectedClass;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.dropdownItem,
                    isSelected && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    onChangeSelectedClass?.(option.value);
                    setShowClassDropdown(false);
                  }}
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
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

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
                  Academic Analytics Report
                </Text>
              </View>

              <Pressable
                style={styles.classDropdownButton}
                onPress={() => setShowClassDropdown(true)}
              >
                <View style={styles.classDropdownTextWrap}>
                  <Text style={styles.classDropdownLabel}>Selected Class</Text>
                  <Text style={styles.classDropdownValue} numberOfLines={1}>
                    {selectedClass === "All" ? "All Classes" : selectedClass}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={20}
                  color={palette.textStrong}
                />
              </Pressable>
            </View>

            <Text style={styles.heroTitle}>
              Teacher Academic Performance Analytics
            </Text>
            <Text style={styles.heroSubtitle}>
              {teacherName} • {selectedCourseName}
            </Text>
            <Text style={styles.heroDescription}>
              Academic-format monitoring for class performance trends,
              percentile ranking, learning gaps, risk profile, and AI-generated
              instructional recommendations.
            </Text>
          </View>

          <View
            style={[styles.heroRight, isSmallScreen && styles.heroRightCompact]}
          >
            <CircularMiniStat
              value={classHealth === "No Data" ? "No Data" : `${summary.classAverage}%`}
              label="Class Mean"
              accent={palette.primary}
              softBg={palette.primarySoft}
              icon="chart-line"
            />
            <CircularMiniStat
              value={`${passingRate}%`}
              label="Passing Rate"
              accent={palette.green}
              softBg={palette.greenSoft}
              icon="school-outline"
            />
            <CircularMiniStat
              value={classHealth}
              label="Academic Status"
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
            helper="Learners included in current analytics scope"
            icon="account-group-outline"
            accent={palette.blue}
            softBg={palette.blueSoft}
          />
          <MetricCard
            title="Completion Rate"
            value={`${completionRate}%`}
            helper="Submitted work against total active workload"
            icon="check-decagram-outline"
            accent={palette.green}
            softBg={palette.greenSoft}
          />
          <MetricCard
            title="At-Risk Students"
            value={summary.highRiskCount + summary.moderateRiskCount}
            helper="Learners requiring academic support"
            icon="alert-circle-outline"
            accent={palette.orange}
            softBg={palette.orangeSoft}
          />
          <MetricCard
            title="Attention Index"
            value={`${attentionIndex}%`}
            helper="Weighted intervention pressure indicator"
            icon="radar"
            accent={palette.primary}
            softBg={palette.primarySoft}
          />
        </View>

        <View style={responsiveMetricStyle}>
          <MetricCard
            title="Highest Score"
            value={classHighestScore}
            helper="Highest graded percentage recorded"
            icon="arrow-up-bold-circle-outline"
            accent={palette.green}
            softBg={palette.greenSoft}
          />
          <MetricCard
            title="Lowest Score"
            value={classLowestScore}
            helper="Lowest graded percentage recorded"
            icon="arrow-down-bold-circle-outline"
            accent={palette.red}
            softBg={palette.redSoft}
          />
          <MetricCard
            title="Pending Tasks"
            value={totalPending}
            helper="Unfinished work affecting progress"
            icon="clipboard-text-clock-outline"
            accent={palette.purple}
            softBg={palette.purpleSoft}
          />
          <MetricCard
            title="Submitted Tasks"
            value={totalSubmitted}
            helper="Completed submissions counted in monitoring"
            icon="file-check-outline"
            accent="#0891B2"
            softBg="#E0F7FF"
          />
        </View>

        <SectionCard
          title="Performance Trend Line Graph"
          subtitle="Class average across recent graded activities"
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
          title="AI-Generated Academic Insights"
          subtitle="Rule-based instructional insights generated from the current analytics data"
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
            subtitle="Risk profile and grade distribution"
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
            title="Submission Monitoring"
            subtitle="Students with the heaviest unfinished workload"
          >
            {mostPendingStudents.length === 0 ? (
              <Text style={styles.emptyText}>
                No pending submissions detected.
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
            title="Topic Mastery"
            subtitle="Weak topics by class performance average"
          >
            {weakTopics.length === 0 ? (
              <Text style={styles.emptyText}>No topic data available yet.</Text>
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
            subtitle="Highest-performing learners by average"
          >
            {topStudents.length === 0 ? (
              <Text style={styles.emptyText}>No graded records yet.</Text>
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
          title="Student Percentile Ranking"
          subtitle="Academic standing based on overall average within the selected scope"
        >
          {percentileRows.length === 0 ? (
            <Text style={styles.emptyText}>
              No student ranking data available yet.
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
                      <Text style={styles.rankBadgeText}>#{student.rank}</Text>
                    </View>
                    <View style={styles.rankingInfo}>
                      <Text style={styles.rankingName}>
                        {student.studentName}
                      </Text>
                      <Text style={styles.rankingMeta}>
                        {student.classLabel} • Average{" "}
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
                  </View>
                );
              })}
            </ScrollView>
          )}
        </SectionCard>

        <SectionCard
          title="At-Risk Students"
          subtitle="Students requiring immediate academic attention"
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
              No students are currently flagged for intervention.
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
                          {student.classLabel} • Average{" "}
                          {student.totalGradedAssignments === 0
                            ? "No Data"
                            : `${student.overallAverage}%`}{" "}
                          • Percentile{" "}
                          {student.totalGradedAssignments === 0
                            ? "No Data"
                            : `P${student.percentileRank}`}{" "}
                          • Pending {student.totalPendingAssignments}
                        </Text>
                        <Text style={styles.reasonText}>
                          Risk Reason: {student.riskReason}
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
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(16, 42, 67, 0.22)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 90,
    paddingHorizontal: 16,
  },
  dropdownModal: {
    width: 320,
    maxWidth: "90%",
    backgroundColor: palette.surface,
    borderRadius: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownItemActive: { backgroundColor: palette.primarySoft },
  dropdownItemText: { fontSize: 14, color: palette.text, fontWeight: "700" },
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
  heroEyebrow: {
    color: palette.primary,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
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
  },
  classDropdownTextWrap: { flex: 1 },
  classDropdownLabel: {
    fontSize: 11,
    color: palette.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  classDropdownValue: {
    fontSize: 14,
    color: palette.textStrong,
    fontWeight: "800",
    marginTop: 2,
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 31,
    color: palette.textStrong,
    fontWeight: "900",
    marginTop: 18,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: palette.text,
    fontWeight: "700",
  },
  heroDescription: {
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
  miniStatValue: { color: palette.textStrong, fontSize: 20, fontWeight: "900" },
  miniStatLabel: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: "700",
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
  metricValue: {
    marginTop: 14,
    fontSize: 28,
    color: palette.textStrong,
    fontWeight: "900",
  },
  metricTitle: {
    marginTop: 4,
    color: palette.textStrong,
    fontSize: 14,
    fontWeight: "800",
  },
  metricHelper: {
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
  sectionTitle: { color: palette.textStrong, fontSize: 18, fontWeight: "900" },
  sectionSubtitle: {
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
  sectionBadgeText: { color: palette.primary, fontSize: 12, fontWeight: "800" },
  trendDelta: {
    fontWeight: "900",
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
  aiTitle: { color: palette.textStrong, fontSize: 14, fontWeight: "900" },
  aiBody: { color: palette.text, fontSize: 12, lineHeight: 18, marginTop: 4 },
  dualColumn: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  dualColumnCompact: { flexDirection: "column", gap: 14 },
  barRow: { marginBottom: 14 },
  barTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 7,
  },
  barLabel: { flex: 1, color: palette.text, fontSize: 13, fontWeight: "800" },
  barRightValue: { color: palette.textMuted, fontSize: 12, fontWeight: "800" },
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
  topicMeta: {
    marginTop: -6,
    marginBottom: 10,
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: "700",
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
  rankBadgeText: { color: palette.blue, fontWeight: "900", fontSize: 13 },
  rankingInfo: { flex: 1 },
  rankingName: { color: palette.textStrong, fontSize: 14, fontWeight: "900" },
  rankingMeta: { color: palette.textMuted, fontSize: 12, marginTop: 3 },
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
  percentileText: { fontSize: 12, fontWeight: "900" },
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
  interventionName: {
    color: palette.textStrong,
    fontSize: 15,
    fontWeight: "900",
  },
  trendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  trendChipText: { fontSize: 11, fontWeight: "800" },
  interventionMeta: {
    marginTop: 5,
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  reasonText: {
    marginTop: 8,
    color: palette.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  recommendationText: {
    marginTop: 4,
    color: palette.text,
    fontSize: 12,
    lineHeight: 18,
  },
  riskPill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  riskPillCompact: { alignSelf: "flex-start" },
  riskPillText: { fontSize: 12, fontWeight: "900" },
  emptyText: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
  },
});
