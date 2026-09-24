import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { buildStudentAnalytics } from '../analytics/analyticsService';
import {
  AnalyticsAssignment,
  RiskLevel,
  SubjectAnalyticsSummary,
  TrendDirection,
} from '../analytics/types';
import { FONT_BODY, FONT_TITLE, WEIGHT_EMPHASIS, WEIGHT_TITLE } from '../theme/typography';
import { AssignmentCourse } from './Assignments';

interface AnalyticsProps {
  courses: AssignmentCourse[];
  searchQuery?: string;
  studentName: string;
  completedActivityScores?: Record<
    string,
    {
      scorePercent: number | null;
      completed: boolean;
      mastered: boolean;
      topic?: string | null;
      completedAt?: string | null;
    }
  >;
}

const COLORS = {
  bg: '#F4F7FB',
  surface: '#FFFFFF',
  text: '#111827',
  subtext: '#6B7280',
  border: '#E5E7EB',
  primary: '#8B0000',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  info: '#2563EB',
};

const chartConfig = {
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(139,0,0, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(17, 24, 39, ${opacity})`,
  fillShadowGradient: '#8B0000',
  fillShadowGradientOpacity: 1,
  barPercentage: 0.62,
  propsForBackgroundLines: {
    stroke: '#E5E7EB',
    strokeDasharray: '',
  },
  propsForLabels: {
    fontSize: 10,
  },
};

const getRiskColor = (risk: RiskLevel) => {
  switch (risk) {
    case 'High':
      return COLORS.danger;
    case 'Moderate':
      return COLORS.warning;
    default:
      return COLORS.success;
  }
};

const getTrendColor = (direction: TrendDirection | string) => {
  switch (direction) {
    case 'up':
      return COLORS.success;
    case 'down':
      return COLORS.danger;
    default:
      return COLORS.subtext;
  }
};

const getTrendSymbol = (trend: number) => {
  if (trend > 2) return '↑';
  if (trend < -2) return '↓';
  return '→';
};

const getTrendDirectionFromValue = (trend: number): TrendDirection => {
  if (trend > 2) return 'up';
  if (trend < -2) return 'down';
  return 'stable';
};

const formatDueDate = (dueDate?: any) => {
  if (!dueDate) return 'No date';
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return String(dueDate);
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

type InfoKey =
  | 'overallAverage'
  | 'predictedGrade'
  | 'highestGrade'
  | 'completionRate'
  | 'subjectChart'
  | 'gradeDistribution'
  | 'scoreTrend'
  | 'recentGrades'
  | 'subjectAverage'
  | 'subjectHighest'
  | 'subjectLowest'
  | 'subjectCompletion'
  | 'subjectTrend';

type InfoItem = {
  label: string;
  live?: string; // the value currently shown on screen
  formula: string; // how it is computed
  source: string; // where the data comes from, in plain language
  note?: string; // caveat worth knowing
};

type InfoContent = { title: string; summary: string; items: InfoItem[] };

const InfoButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    accessibilityRole="button"
    accessibilityLabel="How is this calculated?"
    activeOpacity={0.7}
    style={styles.infoButton}
  >
    <MaterialCommunityIcons name="help-circle-outline" size={17} color={COLORS.subtext} />
  </TouchableOpacity>
);

const SectionTitle = ({ title, onInfoPress }: { title: string; onInfoPress: () => void }) => (
  <View style={styles.sectionTitleRow}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <InfoButton onPress={onInfoPress} />
  </View>
);

const InfoLabel = ({ label, onInfoPress }: { label: string; onInfoPress: () => void }) => (
  <View style={styles.infoLabelRow}>
    <Text style={styles.subjectInfoLabel}>{label}</Text>
    <InfoButton onPress={onInfoPress} />
  </View>
);

const MetricCard = ({
  title,
  value,
  subtitle,
  accentColor,
  cardStyle,
  trend,
  trendDirection,
  onInfoPress,
}: {
  title: string;
  value: string;
  subtitle?: string;
  accentColor?: string;
  cardStyle?: object;
  trend?: number;
  trendDirection?: TrendDirection;
  onInfoPress?: () => void;
}) => (
  <View
    style={[
      styles.metricCard,
      cardStyle,
      { borderLeftColor: accentColor || COLORS.primary },
    ]}
  >
    <View style={styles.metricTitleRow}>
      <Text style={[styles.metricTitle, { marginBottom: 0 }]}>{title}</Text>
      {onInfoPress ? <InfoButton onPress={onInfoPress} /> : null}
    </View>
    <View style={styles.metricRow}>
      <Text style={styles.metricValue}>{value}</Text>
      {trend !== undefined && (
        <Text
          style={[
            styles.trendBadge,
            { color: getTrendColor(trendDirection || 'stable') },
          ]}
        >
          {trend > 0 ? `+${trend}` : trend} {getTrendSymbol(trend)}
        </Text>
      )}
    </View>
    {subtitle ? <Text style={styles.metricSubtitle}>{subtitle}</Text> : null}
  </View>
);

const FloatingBarLabels = ({
  data,
  chartWidth,
  chartHeight,
  isTablet,
  isDesktop,
}: {
  data: number[];
  chartWidth: number;
  chartHeight: number;
  isTablet: boolean;
  isDesktop: boolean;
}) => {
  const itemCount = Math.max(data.length, 1);
  const horizontalInset = isDesktop ? 34 : isTablet ? 28 : 22;
  const plotTopInset = isDesktop ? 22 : isTablet ? 20 : 18;
  const plotBottomInset = isDesktop ? 42 : isTablet ? 38 : 34;
  const plotWidth = chartWidth - horizontalInset * 2;
  const plotHeight = chartHeight - plotTopInset - plotBottomInset;
  const slotWidth = plotWidth / itemCount;

  return (
    <View pointerEvents="none" style={[styles.floatingOverlay, { width: chartWidth, height: chartHeight }]}>
      {data.map((value: number, index: number) => {
        const clamped = Math.max(0, Math.min(100, Number(value) || 0));
        const x = horizontalInset + index * slotWidth + slotWidth / 2;
        const y = plotTopInset + (1 - clamped / 100) * plotHeight;
        return (
          <View key={`bar-label-${index}`} style={[styles.anchorLabelWrap, { left: x, top: Math.max(2, y - 24) }]}>
            <Text style={styles.floatingLabelText}>{clamped}%</Text>
          </View>
        );
      })}
    </View>
  );
};

const FloatingLineLabels = ({
  data,
  labels,
  chartWidth,
  chartHeight,
  isTablet,
  isDesktop,
}: {
  data: number[];
  labels: string[];
  chartWidth: number;
  chartHeight: number;
  isTablet: boolean;
  isDesktop: boolean;
}) => {
  const itemCount = Math.max(data.length, 1);
  const horizontalInset = isDesktop ? 34 : isTablet ? 28 : 22;
  const plotTopInset = isDesktop ? 22 : isTablet ? 20 : 18;
  const plotBottomInset = isDesktop ? 42 : isTablet ? 38 : 34;
  const plotWidth = chartWidth - horizontalInset * 2;
  const plotHeight = chartHeight - plotTopInset - plotBottomInset;
  const slotWidth = plotWidth / itemCount;

  return (
    <View pointerEvents="none" style={[styles.floatingOverlay, { width: chartWidth, height: chartHeight }]}>
      {data.map((value: number, index: number) => {
        const clamped = Math.max(0, Math.min(100, Number(value) || 0));
        const courseCode = labels[index] || `Item ${index + 1}`;
        const x = horizontalInset + index * slotWidth + slotWidth / 2;
        const y = plotTopInset + (1 - clamped / 100) * plotHeight;
        return (
          <View key={`line-label-${index}`} style={[styles.anchorLabelWrapWide, { left: x, top: Math.max(2, y - 28) }]}>
            <Text style={styles.floatingLabelText}>
              {courseCode.length > 12 ? `${courseCode.slice(0, 12)}…` : courseCode} ({clamped}%)
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const Analytics: React.FC<AnalyticsProps> = ({
  searchQuery = '',
  courses,
  studentName,
  completedActivityScores = {},
}) => {
  const { width } = useWindowDimensions();
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  // Which "?" explanation is open (null = closed). `subject` is set for the per-subject icons.
  const [activeInfo, setActiveInfo] = useState<{ key: InfoKey; subject?: SubjectAnalyticsSummary } | null>(null);
  const openInfo = (key: InfoKey, subject?: SubjectAnalyticsSummary) => setActiveInfo({ key, subject });

  const isMobile = width < 768;
  const isTablet = width >= 768;
  const isDesktop = width >= 1200;
  const isChartGrid = width >= 900;

const [showAllMissingWork, setShowAllMissingWork] = useState(false);

  const analytics = useMemo(() => buildStudentAnalytics(courses), [courses]);

  const overallRiskColor = getRiskColor(analytics.overallRisk);
  const [showAllRecentAssignments, setShowAllRecentAssignments] = useState(false);

  const subjectBarData = useMemo(() => {
    const labels = analytics.subjectSummaries.map((subject: SubjectAnalyticsSummary) =>
      subject.courseCode.length > 8 ? `${subject.courseCode.slice(0, 8)}…` : subject.courseCode
    );
    const data = analytics.subjectSummaries.map((subject: SubjectAnalyticsSummary) => subject.average);
    return {
      labels,
      datasets: [{ data: data.length ? data : [0] }],
    };
  }, [analytics.subjectSummaries]);

  const trendLineData = useMemo(() => {
    const trend = analytics.assignmentScoreTrend;
    const labels = trend.map((t) => (t.title.length > 8 ? `${t.title.slice(0, 8)}…` : t.title));
    const data = trend.map((t) => Math.round(t.score));
    return {
      labels,
      datasets: [{ data: data.length ? data : [0], strokeWidth: 3 }],
      legend: ['Score'],
    };
  }, [analytics.assignmentScoreTrend]);

  const trendFullLabels = useMemo(() => {
    return analytics.assignmentScoreTrend.map((t) => t.title);
  }, [analytics.assignmentScoreTrend]);

  const gradeDistributionPieData = useMemo(() => {
    const dist = analytics.gradeDistribution;
    const data = [
      { name: 'Excellent', population: dist.excellent, color: COLORS.success, legendFontColor: COLORS.text, legendFontSize: isMobile ? 0 : 12 },
      { name: 'Good', population: dist.good, color: COLORS.info, legendFontColor: COLORS.text, legendFontSize: isMobile ? 0 : 12 },
      { name: 'Average', population: dist.average, color: COLORS.warning, legendFontColor: COLORS.text, legendFontSize: isMobile ? 0 : 12 },
      { name: 'Needs Imp.', population: dist.needsImprovement, color: COLORS.danger, legendFontColor: COLORS.text, legendFontSize: isMobile ? 0 : 12 },
    ].filter((item) => item.population > 0);

    return data.length
      ? data
      : [{ name: 'No Data', population: 1, color: '#D1D5DB', legendFontColor: COLORS.text, legendFontSize: isMobile ? 0 : 12 }];
  }, [analytics.gradeDistribution, isMobile]);

  const strongestColor =
    analytics.overallAverage >= 85 ? COLORS.success : analytics.overallAverage >= 75 ? COLORS.warning : COLORS.danger;

  const metricCardResponsiveStyle = isDesktop ? styles.metricCardDesktop : isTablet ? styles.metricCardTablet : styles.metricCardMobile;

  const screenPadding = 32;
  const gridGap = 16;
  const cardPadding = 32;
  const chartCardWidth = isChartGrid ? (width - screenPadding - gridGap) / 2 : width - screenPadding;
  const chartInnerWidth = Math.max(chartCardWidth - cardPadding, 240);

  const minBarSlot = isTablet ? 72 : 58;
  const subjectChartWidth = Math.max(analytics.subjectSummaries.length * minBarSlot, chartInnerWidth);
  const trendChartWidth = Math.max(analytics.assignmentScoreTrend.length * minBarSlot, chartInnerWidth);
  
  const chartHeight = isDesktop ? 300 : isTablet ? 270 : 220;
  const pieChartWidth = isMobile ? 220 : chartInnerWidth;
  const pieChartHeight = isMobile ? 190 : isDesktop ? 250 : 220;
  const piePaddingLeft = isMobile ? '40' : isDesktop ? '24' : isTablet ? '18' : '10';

  const subjectValues = subjectBarData.datasets[0]?.data ?? [];
  const trendValues = trendLineData.datasets[0]?.data ?? [];

  const sortedSubjectSummaries = useMemo(() => {
    const riskPriority: Record<string, number> = { High: 4, Moderate: 3, Low: 2, 'No Data': 1 };
    return [...analytics.subjectSummaries].sort((a: SubjectAnalyticsSummary, b: SubjectAnalyticsSummary) => {
      const riskDifference = (riskPriority[b.riskLevel] ?? 0) - (riskPriority[a.riskLevel] ?? 0);
      if (riskDifference !== 0) return riskDifference;
      if (a.missingCount !== b.missingCount) return b.missingCount - a.missingCount;
      if (a.pendingCount !== b.pendingCount) return b.pendingCount - a.pendingCount;
      if (a.gradedCount === 0 && b.gradedCount > 0) return 1;
      if (b.gradedCount === 0 && a.gradedCount > 0) return -1;
      return a.average - b.average;
    });
  }, [analytics.subjectSummaries]);

  const visibleSubjectSummaries = showAllSubjects ? sortedSubjectSummaries : sortedSubjectSummaries.slice(0, 3);
  const hasMoreSubjects = sortedSubjectSummaries.length > 3;
  const hiddenSubjectCount = Math.max(sortedSubjectSummaries.length - 3, 0);

  // ---- "?" explanations. Every `live` value is read from the same data the screen renders. ----
  const dist = analytics.gradeDistribution;
  const completionPct =
    analytics.totalAssignmentsCount > 0
      ? Math.round((analytics.totalGradedAssignments / analytics.totalAssignmentsCount) * 100)
      : 0;

  const assignmentScoreItem: InfoItem = {
    label: 'Assignment score (%)',
    formula:
      'Score earned ÷ total score of the assignment × 100, only for graded assignments that have a valid score and a total score above 0.',
    source:
      'Your graded assignments on the Assignments screen (the score your teacher entered on each one). Averages use the score rounded to a whole number; the highest grade, grade distribution, score trend and recent grades use the exact score.',
  };

  const subjectAverageItem: InfoItem = {
    label: 'Subject average',
    formula: 'Average of the rounded scores (%) of the graded assignments in one course.',
    source: 'Your graded assignments in that course, from the Assignments screen. Shown in the Subject Average Comparison card and in each Per-Subject Details card.',
  };

  const infoContent: Record<Exclude<InfoKey, 'subjectAverage' | 'subjectHighest' | 'subjectLowest' | 'subjectCompletion' | 'subjectTrend'>, InfoContent> = {
    overallAverage: {
      title: 'Overall Average',
      summary: 'Your average across all subjects that have at least one graded assignment.',
      items: [
        assignmentScoreItem,
        subjectAverageItem,
        {
          label: 'Overall average',
          live: analytics.overallAverage > 0 ? `${Math.round(analytics.overallAverage)}%` : 'N/A',
          formula: 'Average of your subject averages (subjects with no graded work are skipped), rounded.',
          source: 'Your subject averages, as shown in the Subject Average Comparison card and the Per-Subject Details cards.',
          note: 'Each subject counts equally, no matter how many assignments it has. Values are rounded at each step.',
        },
        {
          label: 'Trend badge (pts)',
          live: `${analytics.overallTrend > 0 ? '+' : ''}${analytics.overallTrend} pts`,
          formula: 'Your last graded score minus your first graded score, in date order (percentage points, not percent).',
          source: 'The scores in your Assignment Score Trend chart: the last point minus the first point.',
          note: 'Arrow: ↑ above +2, ↓ below -2, → in between.',
        },
      ],
    },
    predictedGrade: {
      title: 'Predicted Final Grade',
      summary: 'A simple estimate of where your grade is heading based on your current standing.',
      items: [
        {
          label: 'Predicted grade',
          live: analytics.predictedFinalGrade > 0 ? `${Math.round(analytics.predictedFinalGrade)}%` : 'N/A',
          formula:
            'overall average − (pending × 1) − (missing × 3) + (submitted × 1), kept between 0 and 100 and rounded. Shows N/A if nothing is graded yet.',
          source: 'Your Overall Average, together with your counts of pending assignments, missing work and submitted assignments still waiting for a grade.',
          note: `Right now: average ${analytics.overallAverage}%, ${analytics.totalPendingAssignments} pending, ${analytics.totalMissingAssignments} missing, ${analytics.totalSubmittedAssignments} submitted. This is a fixed-rule estimate, not a real grade forecast: each missing assignment costs 3 points, each pending costs 1, and each submitted-but-ungraded adds 1.`,
        },
      ],
    },
    highestGrade: {
      title: 'Highest Assignment Grade',
      summary: 'Your best single assignment score.',
      items: [
        assignmentScoreItem,
        {
          label: 'Highest assignment grade',
          live: analytics.highestAssignmentGrade > 0 ? `${Math.round(analytics.highestAssignmentGrade)}%` : 'N/A',
          formula: 'Maximum assignment score (%) across all graded assignments in all your courses.',
          source: 'Your graded assignments in all your courses (the same scores listed in Recent Assignment Grades).',
          note: 'Shows N/A when there are no graded assignments (or the best score is 0%).',
        },
      ],
    },
    completionRate: {
      title: 'Completion Rate',
      summary: 'How much of your assigned work has been graded.',
      items: [
        {
          label: 'Completion rate',
          live:
            analytics.totalAssignmentsCount > 0
              ? `${completionPct}%  (${analytics.totalGradedAssignments} of ${analytics.totalAssignmentsCount})`
              : 'N/A',
          formula: 'graded assignments ÷ total assignments × 100, rounded.',
          source: 'Your assignments across all courses on the Assignments screen: graded assignments out of all assignments (the count shown under the card).',
          note: 'Only graded work counts as complete. Submitted (or late) work still waiting for a grade, pending work and missing work are counted as not complete yet.',
        },
      ],
    },
    subjectChart: {
      title: 'Subject Average Comparison',
      summary: 'One bar per course showing your current average in it.',
      items: [
        subjectAverageItem,
        {
          label: 'Bar label (%)',
          live: `${analytics.subjectSummaries.length} course(s)`,
          formula: 'The subject average, limited to 0-100 for display.',
          source: 'The Average shown in each Per-Subject Details card, one bar per course.',
          note: 'A course with no graded work yet has no average and shows as 0%.',
        },
      ],
    },
    gradeDistribution: {
      title: 'Grade Distribution',
      summary: 'How many of your graded assignments fall in each score band.',
      items: [
        assignmentScoreItem,
        {
          label: 'Score bands',
          live: `${dist.excellent} excellent, ${dist.good} good, ${dist.average} average, ${dist.needsImprovement} needs improvement`,
          formula: 'Excellent = 90% and above. Good = 80-89%. Average = 70-79%. Needs Improvement = below 70%. Each slice is a count of assignments, not a percentage.',
          source: 'Your graded assignments (the same ones listed in Recent Assignment Grades). Each assignment is counted once, using its exact score.',
          note: 'Risk levels use 75% as the cut-off, so a 72% is "Average" here but still pulls a subject toward High risk.',
        },
      ],
    },
    scoreTrend: {
      title: 'Assignment Score Trend',
      summary: 'Your graded assignment scores from oldest to newest.',
      items: [
        assignmentScoreItem,
        {
          label: 'Each point on the line',
          live: `${analytics.assignmentScoreTrend.length} graded assignment(s)`,
          formula: 'One point per graded assignment, sorted by graded date (falls back to submitted date). The label shows the score rounded to a whole percent.',
          source: 'Your graded assignments from oldest to newest (the same scores listed in Recent Assignment Grades).',
          note: 'Assignments with no date are placed at the end of the line.',
        },
      ],
    },
    recentGrades: {
      title: 'Recent Assignment Grades',
      summary: 'The score you earned on each graded assignment.',
      items: [
        assignmentScoreItem,
        {
          label: 'Score color',
          live: `${analytics.recentGradedAssignments.length} graded assignment(s)`,
          formula: 'Green = 90% and above, blue = 80-89%, amber = 70-79%, red = below 70%.',
          source: 'Your graded assignments on the Assignments screen. The colors are only a visual guide to the score.',
          note: 'The list is ordered by assignment ID (newest ID first) to match the Assignments screen, not strictly by graded date.',
        },
      ],
    },
  };

  const getSubjectInfo = (key: InfoKey, subject: SubjectAnalyticsSummary): InfoContent => {
    const scope = `in ${subject.courseName}`;
    switch (key) {
      case 'subjectAverage':
        return {
          title: `Average - ${subject.courseName}`,
          summary: `Your average ${scope}.`,
          items: [
            assignmentScoreItem,
            {
              ...subjectAverageItem,
              live: subject.average > 0 ? `${Math.round(subject.average)}%  (${subject.gradedCount} graded)` : 'N/A',
              note: 'Shows N/A when nothing is graded yet in this course.',
            },
          ],
        };
      case 'subjectHighest':
        return {
          title: `Highest Grade - ${subject.courseName}`,
          summary: `Your best assignment score ${scope}.`,
          items: [
            assignmentScoreItem,
            {
              label: 'Highest grade',
              live: subject.highestGrade > 0 ? `${Math.round(subject.highestGrade)}%` : 'N/A',
              formula: 'Maximum assignment score (%) among the graded assignments in this course.',
              source: 'Your graded assignments in this course, from the Assignments screen.',
              note: 'Shows N/A when the course has no graded work (or the best score is 0%).',
            },
          ],
        };
      case 'subjectLowest':
        return {
          title: `Lowest Grade - ${subject.courseName}`,
          summary: `Your weakest assignment score ${scope}.`,
          items: [
            assignmentScoreItem,
            {
              label: 'Lowest grade',
              live: subject.lowestGrade > 0 ? `${Math.round(subject.lowestGrade)}%` : 'N/A',
              formula: 'Minimum assignment score (%) among the graded assignments in this course.',
              source: 'Your graded assignments in this course, from the Assignments screen.',
              note: 'Shows N/A when the course has no graded work, and also when your lowest score is exactly 0%.',
            },
          ],
        };
      case 'subjectCompletion':
        return {
          title: `Completion Rate - ${subject.courseName}`,
          summary: `How much of the assigned work ${scope} has been graded.`,
          items: [
            {
              label: 'Completion rate',
              live:
                subject.totalAssignments > 0
                  ? `${subject.gradedCount}/${subject.totalAssignments} (${Math.round((subject.gradedCount / subject.totalAssignments) * 100)}%)`
                  : 'N/A',
              formula: 'graded assignments ÷ total assignments in this course × 100, rounded.',
              source: 'The Assignments screen count for this course: graded assignments out of all assignments in the course.',
              note: 'Only graded work counts. Submitted, pending and missing assignments are not complete yet.',
            },
          ],
        };
      default:
        return {
          title: `Trend - ${subject.courseName}`,
          summary: `How your scores ${scope} have moved.`,
          items: [
            {
              label: 'Trend (pts)',
              live: `${subject.trendSymbol} ${subject.trend > 0 ? '+' : ''}${subject.trend} pts`,
              formula: 'Last graded score minus first graded score in this course (percentage points, not percent).',
              source: 'The first and last graded scores in this course, taken in the order the course lists its assignments.',
              note: 'Arrow: ↑ above +2, ↓ below -2, → in between. Scores are taken in the order the course lists its assignments, and you need at least 2 graded scores.',
            },
          ],
        };
    }
  };

  const activeContent: InfoContent | null = activeInfo
    ? activeInfo.subject
      ? getSubjectInfo(activeInfo.key, activeInfo.subject)
      : infoContent[activeInfo.key as keyof typeof infoContent]
    : null;

  return (
    <>
      <Modal visible={activeContent !== null} transparent animationType="fade" onRequestClose={() => setActiveInfo(null)} statusBarTranslucent>
        <Pressable style={styles.infoOverlay} onPress={() => setActiveInfo(null)}>
          <Pressable style={styles.infoSheet} onPress={() => {}}>
            {activeContent ? (
              <>
                <View style={styles.infoHeader}>
                  <View style={styles.infoHeaderIcon}>
                    <MaterialCommunityIcons name="help-circle-outline" size={22} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoTitle}>{activeContent.title}</Text>
                    <Text style={styles.infoSummary}>{activeContent.summary}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setActiveInfo(null)} hitSlop={10} accessibilityLabel="Close explanation">
                    <MaterialCommunityIcons name="close" size={22} color={COLORS.text} />
                  </TouchableOpacity>
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
                          <MaterialCommunityIcons name="information-outline" size={16} color={COLORS.info} />
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

    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Section */}
      <View style={styles.heroCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroEyebrow}>Student Analytics Dashboard</Text>
          <Text style={styles.heroTitle}>Academic Performance Overview</Text>
          <Text style={styles.heroSubtitle}>
            Welcome, {studentName}. Track performance trends, assignment status, and subject predictions in one dashboard.
          </Text>
        </View>
        <View style={styles.riskPillWrap}>
          <Text style={styles.riskPillLabel}>Assignment Risk</Text>
          <View style={[styles.riskPill, { backgroundColor: `${overallRiskColor}18` }]}>
            <Text style={[styles.riskPillText, { color: overallRiskColor }]}>{analytics.overallRisk}</Text>
          </View>
        </View>
      </View>

      {/* Metric Cards */}
      <View style={styles.metricsGrid}>
        <MetricCard
          title="Overall Average"
          value={analytics.overallAverage > 0 ? `${Math.round(analytics.overallAverage)}%` : 'N/A'}
          subtitle="Across graded assignments"
          onInfoPress={() => openInfo('overallAverage')}
          accentColor={strongestColor}
          cardStyle={metricCardResponsiveStyle}
          trend={analytics.overallTrend}
          trendDirection={getTrendDirectionFromValue(analytics.overallTrend)}
        />
        <MetricCard
          title="Predicted Final Grade"
          value={analytics.predictedFinalGrade > 0 ? `${Math.round(analytics.predictedFinalGrade)}%` : 'N/A'}
          subtitle="Based on current academic output"
          onInfoPress={() => openInfo('predictedGrade')}
          accentColor={COLORS.info}
          cardStyle={metricCardResponsiveStyle}
        />
        <MetricCard
          title="Highest Assignment Grade"
          value={analytics.highestAssignmentGrade > 0 ? `${Math.round(analytics.highestAssignmentGrade)}%` : 'N/A'}
          subtitle="Across all graded assignments"
          onInfoPress={() => openInfo('highestGrade')}
          accentColor={COLORS.success}
          cardStyle={metricCardResponsiveStyle}
        />
        <MetricCard
          title="Completion Rate"
          value={
            analytics.totalAssignmentsCount > 0
              ? `${Math.round((analytics.totalGradedAssignments / analytics.totalAssignmentsCount) * 100)}%`
              : 'N/A'
          }
          subtitle={`${analytics.totalGradedAssignments} / ${analytics.totalAssignmentsCount} assignments`}
          onInfoPress={() => openInfo('completionRate')}
          accentColor={COLORS.primary}
          cardStyle={metricCardResponsiveStyle}
        />
        <MetricCard
          title="Pending Assignments"
          value={`${analytics.totalPendingAssignments}`}
          subtitle="Not yet overdue"
          accentColor={COLORS.warning}
          cardStyle={metricCardResponsiveStyle}
        />
        <MetricCard
          title="Missing Work"
          value={`${analytics.totalMissingAssignments}`}
          subtitle="Past due and not submitted"
          accentColor={COLORS.danger}
          cardStyle={metricCardResponsiveStyle}
        />
      </View>

      {/* Charts Grid */}
      <View style={[styles.chartGrid, isChartGrid && styles.chartGridLarge]}>
        {/* Subject Average Comparison */}
        <View style={[styles.sectionCard, isChartGrid && styles.chartCardHalf]}>
          <SectionTitle title="Subject Average Comparison" onInfoPress={() => openInfo('subjectChart')} />
          <Text style={styles.sectionCaption}>Bar chart of your current average per course</Text>
          <View style={styles.chartContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator bounces contentContainerStyle={styles.chartScrollContent}>
              <View style={{ width: subjectChartWidth, height: chartHeight }}>
                <BarChart
                  data={subjectBarData}
                  width={subjectChartWidth}
                  height={chartHeight}
                  fromZero
                  yAxisLabel=""
                  yAxisSuffix=""
                  withHorizontalLabels={false}
                  withVerticalLabels
                  chartConfig={chartConfig}
                  style={styles.chartStyle}
                  segments={5}
                />
                <FloatingBarLabels data={subjectValues} chartWidth={subjectChartWidth} chartHeight={chartHeight} isTablet={isTablet} isDesktop={isDesktop} />
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Grade Distribution */}
        <View style={[styles.sectionCard, isChartGrid && styles.chartCardHalf]}>
          <SectionTitle title="Grade Distribution" onInfoPress={() => openInfo('gradeDistribution')} />
          <Text style={styles.sectionCaption}>Breakdown of your grades across all assignments</Text>
          <View style={styles.chartContainerCentered}>
            <PieChart
              data={gradeDistributionPieData}
              width={pieChartWidth}
              height={pieChartHeight}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft={piePaddingLeft}
              absolute={!isMobile}
              hasLegend={!isMobile}
            />
          </View>
          {isMobile && (
            <View style={styles.mobileLegendWrap}>
              {gradeDistributionPieData.map((item: { name: string; population: number; color: string }) => (
                <View key={item.name} style={styles.mobileLegendItem}>
                  <View style={[styles.mobileLegendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.mobileLegendText}>{item.population} {item.name}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.chartFooterText}>Total graded assignments: {analytics.totalGradedAssignments}</Text>
        </View>

        {/* Assignment Score Trend */}
        <View style={[styles.sectionCard, isChartGrid && styles.chartCardHalf]}>
          <SectionTitle title="Assignment Score Trend" onInfoPress={() => openInfo('scoreTrend')} />
          <Text style={styles.sectionCaption}>Line chart of your scores in chronological order</Text>
          <View style={styles.chartContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator bounces contentContainerStyle={styles.chartScrollContent}>
              <View style={{ width: trendChartWidth, height: chartHeight }}>
                <LineChart
                  data={trendLineData}
                  width={trendChartWidth}
                  height={chartHeight}
                  fromZero
                  yAxisLabel=""
                  yAxisSuffix=""
                  withHorizontalLabels={false}
                  withVerticalLabels
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chartStyle}
                  segments={5}
                />
                <FloatingLineLabels data={trendValues} labels={trendFullLabels} chartWidth={trendChartWidth} chartHeight={chartHeight} isTablet={isTablet} isDesktop={isDesktop} />
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Quick Insights */}
        <View style={[styles.sectionCard, isChartGrid && styles.chartCardHalf]}>
          <Text style={styles.sectionTitle}>Quick Insights</Text>
          <Text style={styles.sectionCaption}>Key interpretation of your current standing</Text>
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Highest Subject</Text>
            <Text style={styles.insightValue}>{analytics.strongestSubject}</Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Lowest Subject</Text>
            <Text style={styles.insightValue}>{analytics.weakestSubject}</Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Most Improved Subject</Text>
            <Text style={styles.insightValue}>{analytics.mostImprovedSubject}</Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Assignments Completed</Text>
            <Text style={styles.insightValue}>{analytics.totalGradedAssignments}</Text>
          </View>
        </View>
      </View>

            {/* Recent Assignment Grades */}
      <View style={styles.sectionCard}>
        <SectionTitle title="Recent Assignment Grades" onInfoPress={() => openInfo('recentGrades')} />
        <Text style={styles.sectionCaption}>Your latest graded assignments</Text>
        {analytics.recentGradedAssignments.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateTitle}>No graded assignments yet</Text>
            <Text style={styles.emptyStateText}>Your graded assignments will appear here once they are marked.</Text>
          </View>
        ) : (
          <>
            {analytics.recentGradedAssignments
              .slice(0, showAllRecentAssignments ? undefined : 5)
              .map((item) => {
                const scoreColor =
                  item.score >= 90 ? COLORS.success : item.score >= 80 ? COLORS.info : item.score >= 70 ? COLORS.warning : COLORS.danger;
                return (
                  <View key={item.id} style={styles.recentAssignmentCard}>
                    <View style={styles.recentAssignmentTopRow}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={styles.recentAssignmentTitle}>{item.title}</Text>
                        <Text style={styles.recentAssignmentMeta}>
                          {item.courseName}{item.gradedAt ? ` • ${formatDueDate(item.gradedAt)}` : ''}
                        </Text>
                      </View>
                      <View style={styles.recentAssignmentScoreWrap}>
                        <Text style={[styles.recentAssignmentScore, { color: scoreColor }]}>
                          {Math.round(item.score)}%
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: `${COLORS.success}18` }]}>
                          <Text style={[styles.statusBadgeText, { color: COLORS.success }]}>GRADED</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            
            {/* Replace the existing TouchableOpacity block with this */}
            {!showAllRecentAssignments && analytics.recentGradedAssignments.length >= 5 && (
              <TouchableOpacity
                style={styles.seeAllButton}
                activeOpacity={0.85}
                onPress={() => setShowAllRecentAssignments((prev) => !prev)}
              >
                <Text style={styles.seeAllButtonText}>
                  See All ({analytics.recentGradedAssignments.length})
                </Text>
              </TouchableOpacity>
            )}

            {showAllRecentAssignments && (
              <TouchableOpacity
                style={styles.seeAllButton}
                activeOpacity={0.85}
                onPress={() => setShowAllRecentAssignments(false)}
              >
                <Text style={styles.seeAllButtonText}>Show Less</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Missing Work */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Missing Work</Text>
        <Text style={styles.sectionCaption}>Assignments that passed the due date and were not submitted</Text>
        {analytics.missingAssignments.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateTitle}>No missing work</Text>
            <Text style={styles.emptyStateText}>Great job. You do not have any overdue unsubmitted assignments.</Text>
          </View>
        ) : (
          <>
            {analytics.missingAssignments
              .slice(0, showAllMissingWork ? undefined : 5) // ✅ Show first 5 or all
              .map((item: AnalyticsAssignment, index: number) => (
                <View key={`${item.id}-${index}`} style={styles.missingWorkCard}>
                  <View style={styles.missingWorkTopRow}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={styles.missingWorkTitle}>{item.title}</Text>
                      <Text style={styles.missingWorkMeta}>
                        {item.topic ? `${item.topic} • ` : ''}Due: {formatDueDate(item.dueDate)}
                      </Text>
                    </View>
                    <View style={styles.missingBadge}>
                      <Text style={styles.missingBadgeText}>MISSING</Text>
                    </View>
                  </View>
                </View>
              ))}
            
            {/* See All / Show Less Button */}
            {!showAllMissingWork && analytics.missingAssignments.length > 5 && (
              <TouchableOpacity
                style={styles.seeAllButton}
                activeOpacity={0.85}
                onPress={() => setShowAllMissingWork(true)}
              >
                <Text style={styles.seeAllButtonText}>
                  See All ({analytics.missingAssignments.length})
                </Text>
              </TouchableOpacity>
            )}

            {showAllMissingWork && analytics.missingAssignments.length > 5 && (
              <TouchableOpacity
                style={styles.seeAllButton}
                activeOpacity={0.85}
                onPress={() => setShowAllMissingWork(false)}
              >
                <Text style={styles.seeAllButtonText}>Show Less</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Per-Subject Details */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Per-Subject Details</Text>
        <Text style={styles.sectionCaption}>Subjects are ranked by assignment risk. Highest assignment-risk subjects are shown first.</Text>
        <View style={styles.subjectSectionHeaderRow}>
          <Text style={styles.subjectCountText}>
            {visibleSubjectSummaries.length} of {analytics.subjectSummaries.length} subjects shown
          </Text>
          {hasMoreSubjects ? (
            <TouchableOpacity activeOpacity={0.85} style={styles.seeAllButton} onPress={() => setShowAllSubjects((prev) => !prev)}>
              <Text style={styles.seeAllButtonText}>{showAllSubjects ? 'Show Less' : `See All (${hiddenSubjectCount})`}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={[styles.subjectGrid, isTablet && styles.subjectGridTablet, isDesktop && styles.subjectGridDesktop]}>
          {visibleSubjectSummaries.map((subject: SubjectAnalyticsSummary) => {
            const riskColor = getRiskColor(subject.riskLevel);
            return (
              <View key={subject.courseId} style={[styles.subjectCard, isTablet && styles.subjectCardTablet, isDesktop && styles.subjectCardDesktop]}>
                <View style={styles.subjectTopRow}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.subjectTitle}>{subject.courseName}</Text>
                    <Text style={styles.subjectCode}>{subject.courseCode} • {subject.instructor}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={[styles.subjectRiskBadge, { backgroundColor: `${riskColor}18` }]}>
                      <Text style={[styles.subjectRiskBadgeText, { color: riskColor }]}>{subject.riskLevel}</Text>
                    </View>
                    <View style={styles.infoLabelRow}>
                      <Text style={[styles.subjectTrend, { color: getTrendColor(subject.trendDirection) }]}>
                        {subject.trendSymbol} {subject.trend > 0 ? '+' : ''}{subject.trend}
                      </Text>
                      <InfoButton onPress={() => openInfo('subjectTrend', subject)} />
                    </View>
                  </View>
                </View>
                <View style={styles.subjectDivider} />
                <View style={styles.subjectInfoGrid}>
                  <View style={styles.subjectInfoItem}>
                    <InfoLabel label="Average" onInfoPress={() => openInfo('subjectAverage', subject)} />
                    <Text style={styles.subjectInfoValue}>{subject.average > 0 ? `${Math.round(subject.average)}%` : 'N/A'}</Text>
                  </View>
                  <View style={styles.subjectInfoItem}>
                    <InfoLabel label="Highest Grade" onInfoPress={() => openInfo('subjectHighest', subject)} />
                    <Text style={styles.subjectInfoValue}>{subject.highestGrade > 0 ? `${Math.round(subject.highestGrade)}%` : 'N/A'}</Text>
                  </View>
                  <View style={styles.subjectInfoItem}>
                    <InfoLabel label="Lowest Grade" onInfoPress={() => openInfo('subjectLowest', subject)} />
                    <Text style={styles.subjectInfoValue}>{subject.lowestGrade > 0 ? `${Math.round(subject.lowestGrade)}%` : 'N/A'}</Text>
                  </View>
                  <View style={styles.subjectInfoItem}>
                    <InfoLabel label="Completion Rate" onInfoPress={() => openInfo('subjectCompletion', subject)} />
                    <Text style={styles.subjectInfoValue}>
                      {subject.totalAssignments > 0
                        ? `${subject.gradedCount}/${subject.totalAssignments} (${Math.round((subject.gradedCount / subject.totalAssignments) * 100)}%)`
                        : 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Recommendations */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Recommendations</Text>
        <Text style={styles.sectionCaption}>Suggested actions based on your analytics</Text>
        {analytics.recommendations.map((item: string, index: number) => (
          <View key={`${item}-${index}`} style={styles.recommendationRow}>
            <View style={styles.recommendationDot} />
            <Text style={styles.recommendationText}>{item}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
    </>
  );
};

export default Analytics;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 32 },
  heroCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  heroEyebrow: { fontFamily: FONT_BODY, fontSize: 12, fontWeight: WEIGHT_EMPHASIS, color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  heroTitle: { fontFamily: FONT_TITLE, fontSize: 24, fontWeight: WEIGHT_TITLE, color: COLORS.text, marginBottom: 6 },
  heroSubtitle: { fontFamily: FONT_BODY, fontSize: 14, color: COLORS.subtext, lineHeight: 22 },
  riskPillWrap: { marginTop: 16, alignSelf: 'flex-start' },
  riskPillLabel: { fontFamily: FONT_BODY, fontSize: 12, color: COLORS.subtext, marginBottom: 6, fontWeight: WEIGHT_EMPHASIS },
  riskPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, alignSelf: 'flex-start' },
  riskPillText: { fontFamily: FONT_BODY, fontSize: 14, fontWeight: WEIGHT_EMPHASIS },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  metricCard: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 5 },
  metricCardMobile: { width: '48.5%' },
  metricCardTablet: { width: '32%' },
  metricCardDesktop: { width: '15.5%' },
  metricTitle: { fontFamily: FONT_TITLE, fontSize: 13, color: COLORS.subtext, marginBottom: 8, marginLeft: 6 },
  metricRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricValue: { fontFamily: FONT_BODY, fontSize: 20, fontWeight: WEIGHT_EMPHASIS, color: COLORS.text, marginBottom: 4, marginLeft: 6, flexShrink: 1 },
  metricSubtitle: { fontFamily: FONT_BODY, fontSize: 12, color: '#9CA3AF', marginLeft: 6, lineHeight: 18 },
  trendBadge: { fontFamily: FONT_BODY, fontSize: 13, fontWeight: WEIGHT_EMPHASIS },
  chartGrid: { flexDirection: 'column' },
  chartGridLarge: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  chartCardHalf: { width: '48.8%' },
  sectionCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontFamily: FONT_TITLE, fontSize: 18, fontWeight: WEIGHT_TITLE, color: COLORS.text, marginBottom: 4 },
  sectionCaption: { fontFamily: FONT_BODY, fontSize: 13, color: COLORS.subtext, marginBottom: 12 },
  chartContainer: { width: '100%', overflow: 'hidden' },
  chartContainerCentered: { alignItems: 'center', justifyContent: 'center', width: '100%' },
  chartScrollContent: { paddingRight: 12, minWidth: '100%' },
  chartStyle: { marginTop: 0, borderRadius: 16 },
  chartFooterText: { fontFamily: FONT_BODY, marginTop: 8, fontSize: 13, color: COLORS.subtext, textAlign: 'center', fontWeight: WEIGHT_EMPHASIS },
  floatingOverlay: { position: 'absolute', top: 0, left: 0 },
  anchorLabelWrap: { position: 'absolute', transform: [{ translateX: -18 }], minWidth: 36, alignItems: 'center' },
  anchorLabelWrapWide: { position: 'absolute', transform: [{ translateX: -42 }], minWidth: 84, alignItems: 'center' },
  floatingLabelText: { fontFamily: FONT_BODY, fontSize: 10, fontWeight: WEIGHT_EMPHASIS, color: COLORS.text, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 12, overflow: 'hidden', textAlign: 'center' },
  mobileLegendWrap: { marginTop: 12, width: '100%', gap: 8 },
  mobileLegendItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  mobileLegendDot: { width: 10, height: 10, borderRadius: 999, marginRight: 8 },
  mobileLegendText: { fontFamily: FONT_BODY, fontSize: 13, color: COLORS.text, fontWeight: WEIGHT_EMPHASIS },
  insightCard: { backgroundColor: '#FCFCFD', borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14, marginBottom: 10 },
  insightLabel: { fontFamily: FONT_BODY, fontSize: 12, color: COLORS.subtext, marginBottom: 4 },
  insightValue: { fontFamily: FONT_BODY, fontSize: 16, fontWeight: WEIGHT_EMPHASIS, color: COLORS.text },
  emptyStateCard: { borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: 16, padding: 16, backgroundColor: '#FCFCFD' },
  emptyStateTitle: { fontFamily: FONT_TITLE, fontSize: 15, fontWeight: WEIGHT_TITLE, color: COLORS.success, marginBottom: 6 },
  emptyStateText: { fontFamily: FONT_BODY, fontSize: 13, color: COLORS.subtext, lineHeight: 20 },
  recentAssignmentCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, marginBottom: 10, backgroundColor: '#FCFCFD' },
  recentAssignmentTopRow: { flexDirection: 'row', alignItems: 'center' },
  recentAssignmentTitle: { fontFamily: FONT_TITLE, fontSize: 15, fontWeight: WEIGHT_TITLE, color: COLORS.text },
  recentAssignmentMeta: { fontFamily: FONT_BODY, fontSize: 12, color: COLORS.subtext, marginTop: 4 },
  recentAssignmentScoreWrap: { alignItems: 'flex-end' },
  recentAssignmentScore: { fontFamily: FONT_BODY, fontSize: 20, fontWeight: WEIGHT_EMPHASIS },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginTop: 6 },
  statusBadgeText: { fontFamily: FONT_BODY, fontSize: 10, fontWeight: WEIGHT_EMPHASIS },
  missingWorkCard: { borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', borderRadius: 16, padding: 14, marginBottom: 10 },
  missingWorkTopRow: { flexDirection: 'row', alignItems: 'center' },
  missingWorkTitle: { fontFamily: FONT_TITLE, fontSize: 15, fontWeight: WEIGHT_TITLE, color: COLORS.text },
  missingWorkMeta: { fontFamily: FONT_BODY, fontSize: 12, color: COLORS.subtext, marginTop: 4 },
  missingBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#DC2626' },
  missingBadgeText: { fontFamily: FONT_BODY, fontSize: 11, fontWeight: WEIGHT_EMPHASIS, color: '#FFFFFF' },
  subjectSectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  subjectCountText: { fontFamily: FONT_BODY, flex: 1, fontSize: 13, color: COLORS.subtext, fontWeight: WEIGHT_EMPHASIS },
  seeAllButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F8F0F0', borderWidth: 1, borderColor: '#E8CCCC' , alignItems: 'center'},
  seeAllButtonText: { fontFamily: FONT_BODY, fontSize: 13, fontWeight: WEIGHT_EMPHASIS, color: COLORS.primary },
  subjectGrid: { flexDirection: 'column' },
  subjectGridTablet: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  subjectGridDesktop: { justifyContent: 'space-between' },
  subjectCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, marginBottom: 12, backgroundColor: '#FCFCFD', width: '100%' },
  subjectCardTablet: { width: '48.5%' },
  subjectCardDesktop: { width: '32%' },
  subjectTopRow: { flexDirection: 'row', alignItems: 'center' },
  subjectTitle: { fontFamily: FONT_BODY, fontSize: 16, fontWeight: WEIGHT_TITLE, color: COLORS.text },
  subjectCode: { fontFamily: FONT_BODY, fontSize: 12, color: COLORS.subtext, marginTop: 2 },
  subjectRiskBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  subjectRiskBadgeText: { fontFamily: FONT_BODY, fontSize: 12, fontWeight: WEIGHT_EMPHASIS },
  subjectTrend: { fontFamily: FONT_BODY, marginTop: 6, fontSize: 13, fontWeight: WEIGHT_EMPHASIS },
  subjectDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  subjectInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  subjectInfoItem: { width: '48%', marginBottom: 12 },
  subjectInfoLabel: { fontFamily: FONT_BODY, fontSize: 12, color: COLORS.subtext, marginBottom: 4 },
  subjectInfoValue: { fontFamily: FONT_BODY, fontSize: 14, fontWeight: WEIGHT_EMPHASIS, color: COLORS.text },
  recommendationRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  recommendationDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: COLORS.primary, marginTop: 6, marginRight: 10 },
  recommendationText: { fontFamily: FONT_BODY, flex: 1, fontSize: 14, color: '#374151', lineHeight: 22 },
  infoButton: { padding: 2, alignItems: 'center', justifyContent: 'center' },
  metricTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  infoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  infoSheet: { width: '100%', maxWidth: 560, maxHeight: '85%', backgroundColor: COLORS.surface, borderRadius: 22, padding: 18 },
  infoHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoHeaderIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#F7EDED', alignItems: 'center', justifyContent: 'center' },
  infoTitle: { fontFamily: FONT_TITLE, color: COLORS.text, fontSize: 17, fontWeight: WEIGHT_TITLE },
  infoSummary: { fontFamily: FONT_BODY, color: COLORS.subtext, fontSize: 13, lineHeight: 19, marginTop: 3 },
  infoScroll: { marginTop: 14 },
  infoItem: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, backgroundColor: '#FBFCFE', marginBottom: 12 },
  infoItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  infoItemLabel: { fontFamily: FONT_TITLE, color: COLORS.text, fontSize: 14, fontWeight: WEIGHT_TITLE, flexShrink: 1 },
  infoLivePill: { backgroundColor: '#EAF2FF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  infoLiveText: { fontFamily: FONT_BODY, color: COLORS.info, fontSize: 12, fontWeight: WEIGHT_EMPHASIS },
  infoFieldLabel: { fontFamily: FONT_BODY, color: COLORS.subtext, fontSize: 10, letterSpacing: 0.6, fontWeight: WEIGHT_EMPHASIS, marginTop: 12 },
  infoFormula: { fontFamily: FONT_BODY, color: COLORS.text, fontSize: 13, lineHeight: 20, marginTop: 4 },
  infoBody: { fontFamily: FONT_BODY, color: '#374151', fontSize: 12, lineHeight: 18, marginTop: 4 },
  infoNote: { flexDirection: 'row', gap: 8, marginTop: 12, backgroundColor: '#EAF2FF', borderRadius: 12, padding: 10 },
  infoNoteText: { fontFamily: FONT_BODY, flex: 1, color: '#374151', fontSize: 12, lineHeight: 18 },
});