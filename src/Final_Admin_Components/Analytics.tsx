import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  DimensionValue,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";

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
};

type SectionCardProps = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  widthValue?: DimensionValue;
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
};

function SummaryCard({
  label,
  value,
  trend,
  widthValue,
  tone = "default",
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
      <Text style={styles.summaryLabel}>{label}</Text>
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
            <Text style={styles.sectionCardTitle}>{title}</Text>
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
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "success" | "warning";
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statRowLabel}>{label}</Text>
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
}: {
  data: AdminAnalyticsPayload["trend"];
  width: number;
  completionRate: number;
  assignmentCompletionRate: number;
  departmentAverage: number;
}) {
  const isSmall = width < 768;
  const chartWidth = Math.max(
    300,
    Math.min(isSmall ? width - 70 : width - 140, isSmall ? 620 : 980)
  );
  const chartHeight = isSmall ? 250 : 280;
  const paddingLeft = 42;
  const paddingRight = 20;
  const paddingTop = 26;
  const paddingBottom = 54;
  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  const validData = data.filter(
    (item) => Number.isFinite(item.average) && item.count > 0
  );

  if (validData.length === 0) {
    return (
      <View style={styles.trendEmptyState}>
        <Ionicons name="analytics-outline" size={30} color="#A07C7C" />
        <Text style={styles.trendEmptyTitle}>No academic trend yet</Text>
        <Text style={styles.trendEmptyText}>
          The line chart will appear after graded submissions are available.
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
            Only one graded academic point is available. More graded submissions
            are needed to form a trend line.
          </Text>
        </View>

        <View style={styles.trendMetricGridInline}>
          <View style={styles.trendMetricCard}>
            <Text style={styles.trendMetricValue}>{completionRate}%</Text>
            <Text style={styles.trendMetricLabel}>Submission Completion</Text>
          </View>

          <View style={styles.trendMetricCard}>
            <Text style={styles.trendMetricValue}>
              {assignmentCompletionRate}%
            </Text>
            <Text style={styles.trendMetricLabel}>Grading Completion</Text>
          </View>

          <View style={styles.trendMetricCard}>
            <Text style={styles.trendMetricValue}>{departmentAverage}%</Text>
            <Text style={styles.trendMetricLabel}>Department Average</Text>
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
        <View>
          <Text style={styles.trendChartTitle}>Academic Performance Line</Text>
          <Text style={styles.trendChartSubtitle}>
            Based on graded submissions grouped by academic date
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
            fill="#FFF9F9"
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
                  stroke="#F3D4D4"
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
            stroke="#F3D4D4"
            strokeWidth={1}
          />
          <Line
            x1={paddingLeft}
            y1={chartHeight - paddingBottom}
            x2={chartWidth - paddingRight}
            y2={chartHeight - paddingBottom}
            stroke="#F3D4D4"
            strokeWidth={1}
          />

          <Path
            d={pathData}
            fill="none"
            stroke="#DC2626"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point, index) => {
            const showLabel = isSmall
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
                  fill="#DC2626"
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

export default function Analytics({ width, apiBaseUrl }: AnalyticsProps) {
  const windowSize = useWindowDimensions();
  const responsiveWidth = windowSize.width || width;
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;

  const [analytics, setAnalytics] =
    useState<AdminAnalyticsPayload>(emptyAnalytics);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const summaryWidth: DimensionValue = isMobile
    ? "100%"
    : isTablet
    ? "48.5%"
    : "23.5%";

  const halfWidth: DimensionValue = isMobile ? "100%" : "48.7%";

  const loadAdminAnalytics = async () => {
    const resolvedApiBaseUrl = apiBaseUrl || "http://localhost:5000";

    setIsLoading(true);
    setLoadError("");

    try {
      const response = await fetch(`${resolvedApiBaseUrl}/admin-analytics`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load admin analytics.");
      }

      setAnalytics(data?.data || emptyAnalytics);
    } catch (error: any) {
      console.log("LOAD ADMIN ANALYTICS ERROR =>", error);
      setLoadError(error?.message || "Failed to load admin analytics.");
      setAnalytics(emptyAnalytics);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminAnalytics();
  }, [apiBaseUrl]);

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

  return (
    <View>
      <View style={styles.heroRow}>
        <View style={[styles.heroCard, isMobile && styles.heroCardMobile]}>
          <View
            style={[styles.heroTextSection, isMobile && styles.heroTextMobile]}
          >
            <Text style={styles.heroEyebrow}>DEPARTMENT ANALYTICS</Text>
            <Text
              style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}
            >
              Administrative Performance Dashboard
            </Text>
            <Text style={styles.heroSubtitle}>
              Real-time Firebase analytics for student risk, section
              performance, subject difficulty, workload backlog, and
              semester-wide academic progress.
            </Text>
          </View>

          <Pressable
            style={styles.refreshButton}
            onPress={loadAdminAnalytics}
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
          label="At-Risk Students"
          value={`${analytics.summary.atRiskCount}`}
          trend={`${analytics.summary.highRiskCount} high • ${analytics.summary.moderateRiskCount} moderate`}
          widthValue={summaryWidth}
          tone={analytics.summary.atRiskCount > 0 ? "danger" : "success"}
        />
        <SummaryCard
          label="Pass Rate"
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
            Department-level academic monitoring from Firebase data
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.fullWidthAnalyticsRow}>
        <SectionCard
          widthValue="100%"
          title="Department Overview"
          subtitle="High-level academic status"
          icon={
            <Ionicons name="analytics-outline" size={24} color="#DC2626" />
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
                value={`${analytics.summary.departmentAverage}%`}
                tone={analytics.summary.departmentAverage >= 75 ? "success" : "danger"}
              />
            </View>
            <View style={[styles.departmentOverviewItem, isMobile && styles.departmentOverviewItemMobile]}>
              <StatRow
                label="At-Risk Population"
                value={`${analytics.summary.atRiskCount}`}
                tone={analytics.summary.atRiskCount > 0 ? "danger" : "success"}
              />
            </View>
            <View style={[styles.departmentOverviewItem, isMobile && styles.departmentOverviewItemMobile]}>
              <StatRow label="No Data Students" value={`${analytics.summary.noDataCount}`} />
            </View>
            <View style={[styles.departmentOverviewItem, isMobile && styles.departmentOverviewItemMobile]}>
              <StatRow label="Pass Rate" value={`${analytics.summary.passRate}%`} tone="success" />
            </View>
            <View style={[styles.departmentOverviewItem, isMobile && styles.departmentOverviewItemMobile]}>
              <StatRow label="Fail Rate" value={`${analytics.summary.failRate}%`} tone="danger" />
            </View>
          </View>
        </SectionCard>
        </View>

        <View style={styles.fullWidthAnalyticsRow}>
        <SectionCard
          widthValue="100%"
          title="Semester Performance Trend"
          subtitle={
            latestTrend
              ? `${latestTrend.label} latest average • ${trendDelta >= 0 ? "+" : ""}${trendDelta} pts`
              : "No graded trend data yet"
          }
          icon={
            <Ionicons name="trending-up-outline" size={24} color="#DC2626" />
          }
        >
          <AcademicTrendChart
            data={analytics.trend}
            width={responsiveWidth}
            completionRate={analytics.summary.completionRate}
            assignmentCompletionRate={analytics.summary.assignmentCompletionRate}
            departmentAverage={analytics.summary.departmentAverage}
          />

          {analytics.trend.filter(
            (item) => Number.isFinite(item.average) && item.count > 0
          ).length !== 1 ? (
            <View style={styles.trendMetricGrid}>
              <View style={styles.trendMetricCard}>
                <Text style={styles.trendMetricValue}>
                  {analytics.summary.completionRate}%
                </Text>
                <Text style={styles.trendMetricLabel}>Submission Completion</Text>
              </View>

              <View style={styles.trendMetricCard}>
                <Text style={styles.trendMetricValue}>
                  {analytics.summary.assignmentCompletionRate}%
                </Text>
                <Text style={styles.trendMetricLabel}>Grading Completion</Text>
              </View>

              <View style={styles.trendMetricCard}>
                <Text style={styles.trendMetricValue}>
                  {analytics.summary.departmentAverage}%
                </Text>
                <Text style={styles.trendMetricLabel}>Department Average</Text>
              </View>
            </View>
          ) : null}
        </SectionCard>
        </View>

        <SectionCard
          widthValue={halfWidth}
          title="Section Comparison"
          subtitle="Relative section performance from class averages"
          icon={
            <MaterialCommunityIcons
              name="google-classroom"
              size={24}
              color="#DC2626"
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
          subtitle="Performance by academic year"
          icon={
            <Ionicons name="school-outline" size={24} color="#DC2626" />
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
          subtitle="Subjects with low averages, missing work, or pending load"
          icon={<Ionicons name="book-outline" size={24} color="#DC2626" />}
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
          subtitle="Recommended admin and faculty actions"
          icon={<Ionicons name="medkit-outline" size={24} color="#DC2626" />}
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
          title="At-Risk Population"
          subtitle="Students requiring early academic intervention"
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
            <EmptyState text="No high or moderate risk students detected." />
          )}
        </SectionCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    marginBottom: 20,
  },

  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  heroCardMobile: {
    flexDirection: "column",
    alignItems: "flex-start",
  },

  heroTextSection: {
    flex: 1,
    marginRight: 20,
  },

  heroTextMobile: {
    marginRight: 0,
    marginBottom: 18,
  },

  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#DC2626",
    marginBottom: 8,
  },

  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 8,
  },

  heroTitleMobile: {
    fontSize: 22,
  },

  heroSubtitle: {
    fontSize: 14,
    color: "#8A6F6F",
    lineHeight: 22,
  },

  refreshButton: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  refreshButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 8,
  },

  errorBanner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    padding: 14,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  errorText: {
    flex: 1,
    marginLeft: 8,
    color: "#B91C1C",
    fontWeight: "700",
  },

  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  summaryCard: {
    minWidth: 180,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    padding: 18,
    marginBottom: 12,
  },

  summaryCardDanger: {
    backgroundColor: "#FFF7F7",
    borderColor: "#FCA5A5",
  },

  summaryCardSuccess: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },

  summaryCardWarning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },

  summaryLabel: {
    fontSize: 13,
    color: "#A07C7C",
    fontWeight: "600",
    marginBottom: 10,
  },

  summaryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 6,
  },

  summaryTrend: {
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "600",
  },

  summaryTrendDanger: {
    color: "#DC2626",
  },

  summaryTrendSuccess: {
    color: "#059669",
  },

  summaryTrendWarning: {
    color: "#D97706",
  },

  sectionHeader: {
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 4,
  },

  sectionSubtitle: {
    fontSize: 14,
    color: "#8A6F6F",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    padding: 20,
    marginBottom: 18,
    minWidth: 0,
  },

  sectionCardHeader: {
    marginBottom: 18,
  },

  sectionCardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  sectionCardHeaderLeftWide: {
    flexWrap: "wrap",
  },

  sectionCardHeaderTextWrap: {
    flex: 1,
  },

  sectionCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 6,
  },

  sectionCardSubtitle: {
    fontSize: 14,
    color: "#8A6F6F",
    lineHeight: 20,
  },

  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  statRow: {
    width: "100%",
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F8E3E3",
    backgroundColor: "#FFF9F9",
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  statRowLabel: {
    flex: 1,
    fontSize: 14,
    color: "#5F3B3B",
    fontWeight: "600",
    paddingRight: 12,
  },

  statRowValue: {
    fontSize: 14,
    color: "#2B1111",
    fontWeight: "800",
  },

  statRowValueDanger: {
    color: "#DC2626",
  },

  statRowValueSuccess: {
    color: "#059669",
  },

  statRowValueWarning: {
    color: "#D97706",
  },

  progressBlock: {
    marginBottom: 14,
  },

  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  progressLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5F3B3B",
    flex: 1,
    paddingRight: 10,
  },

  progressValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#DC2626",
  },

  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "#FDE8E8",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#DC2626",
  },

  suggestionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    backgroundColor: "#FFF9F9",
    padding: 14,
    marginBottom: 12,
  },

  suggestionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 6,
  },

  suggestionText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#7A4A4A",
  },

  riskGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },

  riskGridMobile: {
    flexDirection: "column",
    gap: 10,
  },

  riskCard: {
    flexGrow: 1,
    flexBasis: "48%",
    maxWidth: "49%",
    minWidth: 280,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginBottom: 0,
  },

  riskCardMobile: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    padding: 14,
  },

  riskCardHigh: {
    backgroundColor: "#FFF7F7",
    borderColor: "#FCA5A5",
  },

  riskTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 10,
  },

  riskTopRowMobile: {
    flexDirection: "column",
    alignItems: "stretch",
  },

  riskTextWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: 0,
  },

  riskTextWrapMobile: {
    width: "100%",
  },

  riskName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2B1111",
    marginBottom: 4,
  },

  riskSection: {
    fontSize: 13,
    color: "#8A6F6F",
    fontWeight: "600",
  },

  riskTagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
    gap: 6,
  },

  riskTag: {
    backgroundColor: "#FFF1F1",
    borderWidth: 1,
    borderColor: "#F3D4D4",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: "100%",
  },

  riskTagText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7A4A4A",
    flexShrink: 1,
  },

  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
    alignSelf: "flex-start",
  },

  riskBadgeMobile: {
    alignSelf: "flex-start",
  },

  riskBadgeHigh: {
    backgroundColor: "#FEE2E2",
  },

  riskBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#DC2626",
  },

  riskReason: {
    fontSize: 13,
    lineHeight: 20,
    color: "#7A4A4A",
    marginTop: 4,
  },

  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    backgroundColor: "#FFF9F9",
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  // ===== LAYOUT FIX (your request: separate rows) =====
fullWidthAnalyticsRow: {
  width: "100%",
  marginBottom: 12,
},

departmentOverviewGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: 10,
},

departmentOverviewGridMobile: {
  flexDirection: "column",
  gap: 0,
},

departmentOverviewItem: {
  flexGrow: 1,
  flexBasis: "31%",
  minWidth: 180,
  marginBottom: 0,
},

departmentOverviewItemMobile: {
  width: "100%",
  minWidth: 0,
  flexBasis: "auto",
  marginBottom: 0,
},

// ===== TREND CHART =====
trendChartShell: {
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#F3D4D4",
  backgroundColor: "#FFF9F9",
  padding: 12,
  marginBottom: 12,
},

trendChartHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 10,
},

trendChartTitle: {
  fontSize: 14,
  fontWeight: "900",
  color: "#2B1111",
},

trendChartSubtitle: {
  fontSize: 11,
  color: "#8A6F6F",
},

trendChartScrollGuard: {
  alignItems: "center",
  justifyContent: "center",
},

// ===== DELTA BADGE =====
trendDeltaPill: {
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 999,
},

trendDeltaPositive: {
  backgroundColor: "#DCFCE7",
},

trendDeltaNegative: {
  backgroundColor: "#FEE2E2",
},

trendDeltaText: {
  fontWeight: "900",
},

trendDeltaTextPositive: {
  color: "#047857",
},

trendDeltaTextNegative: {
  color: "#DC2626",
},

trendOneRow: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  alignItems: "stretch",
  gap: 10,
},

trendMetricGridInline: {
  flex: 1.45,
  minWidth: 360,
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: 10,
},

// ===== EMPTY / SINGLE STATES =====
trendEmptyState: {
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
},

trendEmptyTitle: {
  fontSize: 14,
  fontWeight: "800",
  color: "#2B1111",
},

trendEmptyText: {
  fontSize: 12,
  color: "#7A4A4A",
  textAlign: "center",
},

singleTrendCard: {
  flex: 1,
  minWidth: 260,
  padding: 16,
  borderRadius: 14,
  backgroundColor: "#FFF9F9",
  borderWidth: 1,
  borderColor: "#F3D4D4",
},

singleTrendLabel: {
  fontSize: 12,
  color: "#8A6F6F",
},

singleTrendValue: {
  fontSize: 28,
  fontWeight: "900",
  color: "#DC2626",
},

singleTrendText: {
  fontSize: 12,
  color: "#7A4A4A",
},

// ===== METRICS GRID =====
trendMetricGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: 10,
  marginTop: 10,
},

trendMetricCard: {
  flex: 1,
  minWidth: 140,
  padding: 10,
  borderRadius: 12,
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "#F3D4D4",
},

trendMetricValue: {
  fontSize: 16,
  fontWeight: "900",
  color: "#DC2626",
},

trendMetricLabel: {
  fontSize: 11,
  color: "#7A4A4A",
},

  emptyStateText: {
    marginTop: 8,
    textAlign: "center",
    color: "#8A6F6F",
    fontWeight: "700",
  },
});
