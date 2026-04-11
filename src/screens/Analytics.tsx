import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { buildStudentAnalytics } from '../analytics/analyticsService';
import {
  AnalyticsAssignment,
  RiskLevel,
  SubjectAnalyticsSummary,
  TrendDirection,
} from '../analytics/types';
import { AssignmentCourse } from './Assignments';

interface AnalyticsProps {
  courses: AssignmentCourse[];
  studentName: string;
}

const COLORS = {
  bg: '#F4F7FB',
  surface: '#FFFFFF',
  text: '#111827',
  subtext: '#6B7280',
  border: '#E5E7EB',
  primary: '#D32F2F',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  info: '#2563EB',
};

const chartConfig = {
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(211, 47, 47, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(17, 24, 39, ${opacity})`,
  fillShadowGradient: '#D32F2F',
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

const formatDueDate = (dueDate?: string) => {
  if (!dueDate) return 'No due date';

  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return dueDate;

  return parsed.toLocaleDateString();
};

const MetricCard = ({
  title,
  value,
  subtitle,
  accentColor,
  cardStyle,
  trend,
  trendDirection,
}: {
  title: string;
  value: string;
  subtitle?: string;
  accentColor?: string;
  cardStyle?: object;
  trend?: number;
  trendDirection?: TrendDirection;
}) => (
  <View
    style={[
      styles.metricCard,
      cardStyle,
      { borderLeftColor: accentColor || COLORS.primary },
    ]}
  >
    <Text style={styles.metricTitle}>{title}</Text>

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
    <View
      pointerEvents="none"
      style={[styles.floatingOverlay, { width: chartWidth, height: chartHeight }]}
    >
      {data.map((value: number, index: number) => {
        const clamped = Math.max(0, Math.min(100, Number(value) || 0));

        const x = horizontalInset + index * slotWidth + slotWidth / 2;
        const y = plotTopInset + (1 - clamped / 100) * plotHeight;

        return (
          <View
            key={`bar-label-${index}`}
            style={[
              styles.anchorLabelWrap,
              {
                left: x,
                top: Math.max(2, y - 24),
              },
            ]}
          >
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
    <View
      pointerEvents="none"
      style={[styles.floatingOverlay, { width: chartWidth, height: chartHeight }]}
    >
      {data.map((value: number, index: number) => {
        const clamped = Math.max(0, Math.min(100, Number(value) || 0));
        const courseCode = labels[index] || `Course ${index + 1}`;

        const x = horizontalInset + index * slotWidth + slotWidth / 2;
        const y = plotTopInset + (1 - clamped / 100) * plotHeight;

        return (
          <View
            key={`line-label-${index}`}
            style={[
              styles.anchorLabelWrapWide,
              {
                left: x,
                top: Math.max(2, y - 28),
              },
            ]}
          >
            <Text style={styles.floatingLabelText}>
              {courseCode} ({clamped}%)
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const Analytics: React.FC<AnalyticsProps> = ({ courses, studentName }) => {
  const { width } = useWindowDimensions();

  const isMobile = width < 768;
  const isTablet = width >= 768;
  const isDesktop = width >= 1200;
  const isChartGrid = width >= 900;

  const analytics = useMemo(
    () => buildStudentAnalytics(courses),
    [courses]
  );

  const overallRiskColor = getRiskColor(analytics.overallRisk);

  const subjectBarData = useMemo(() => {
    const labels = analytics.subjectSummaries.map(
      (subject: SubjectAnalyticsSummary) =>
        subject.courseCode.length > 8
          ? `${subject.courseCode.slice(0, 8)}…`
          : subject.courseCode
    );

    const data = analytics.subjectSummaries.map(
      (subject: SubjectAnalyticsSummary) => subject.average
    );

    return {
      labels,
      datasets: [
        {
          data: data.length ? data : [0],
        },
      ],
    };
  }, [analytics.subjectSummaries]);

  const predictedLineData = useMemo(() => {
    const labels = analytics.subjectSummaries.map(
      (subject: SubjectAnalyticsSummary) =>
        subject.courseCode.length > 8
          ? `${subject.courseCode.slice(0, 8)}…`
          : subject.courseCode
    );

    const data = analytics.subjectSummaries.map(
      (subject: SubjectAnalyticsSummary) => subject.predictedGrade
    );

    return {
      labels,
      datasets: [
        {
          data: data.length ? data : [0],
          strokeWidth: 3,
        },
      ],
      legend: ['Predicted Grade'],
    };
  }, [analytics.subjectSummaries]);

  const predictedLineFullLabels = useMemo(() => {
    return analytics.subjectSummaries.map(
      (subject: SubjectAnalyticsSummary) => subject.courseCode
    );
  }, [analytics.subjectSummaries]);

  const totalAssignments = useMemo(() => {
    return analytics.subjectSummaries.reduce(
      (sum: number, subject: SubjectAnalyticsSummary) =>
        sum + subject.totalAssignments,
      0
    );
  }, [analytics.subjectSummaries]);

  const totalGraded = useMemo(() => {
    return analytics.subjectSummaries.reduce(
      (sum: number, subject: SubjectAnalyticsSummary) =>
        sum + subject.gradedCount,
      0
    );
  }, [analytics.subjectSummaries]);

  const statusPieData = useMemo(() => {
    const pie = [
      {
        name: 'Graded',
        population: totalGraded,
        color: COLORS.success,
        legendFontColor: COLORS.text,
        legendFontSize: isMobile ? 0 : 12,
      },
      {
        name: 'Submitted',
        population: analytics.totalSubmittedAssignments,
        color: COLORS.info,
        legendFontColor: COLORS.text,
        legendFontSize: isMobile ? 0 : 12,
      },
      {
        name: 'Pending',
        population: analytics.totalPendingAssignments,
        color: COLORS.warning,
        legendFontColor: COLORS.text,
        legendFontSize: isMobile ? 0 : 12,
      },
      {
        name: 'Missing',
        population: analytics.totalMissingAssignments,
        color: COLORS.danger,
        legendFontColor: COLORS.text,
        legendFontSize: isMobile ? 0 : 12,
      },
    ].filter((item) => item.population > 0);

    return pie.length
      ? pie
      : [
          {
            name: 'No Data',
            population: 1,
            color: '#D1D5DB',
            legendFontColor: COLORS.text,
            legendFontSize: isMobile ? 0 : 12,
          },
        ];
  }, [
    analytics.totalPendingAssignments,
    analytics.totalSubmittedAssignments,
    analytics.totalMissingAssignments,
    totalGraded,
    isMobile,
  ]);

  const strongestColor =
    analytics.overallAverage >= 85
      ? COLORS.success
      : analytics.overallAverage >= 75
      ? COLORS.warning
      : COLORS.danger;

  const metricCardResponsiveStyle = isDesktop
    ? styles.metricCardDesktop
    : isTablet
    ? styles.metricCardTablet
    : styles.metricCardMobile;

  const screenPadding = 32;
  const gridGap = 16;
  const cardPadding = 32;

  const chartCardWidth = isChartGrid
    ? (width - screenPadding - gridGap) / 2
    : width - screenPadding;

  const chartInnerWidth = Math.max(chartCardWidth - cardPadding, 240);

  const minBarSlot = isTablet ? 72 : 58;
  const baseScrollableChartWidth = Math.max(
    analytics.subjectSummaries.length * minBarSlot,
    chartInnerWidth
  );

  const subjectChartWidth = baseScrollableChartWidth;
  const predictedChartWidth = baseScrollableChartWidth;
  const chartHeight = isDesktop ? 300 : isTablet ? 270 : 220;

  const pieChartWidth = isMobile ? 220 : chartInnerWidth;
  const pieChartHeight = isMobile ? 190 : isDesktop ? 250 : 220;
  const piePaddingLeft = isMobile ? '40' : isDesktop ? '24' : isTablet ? '18' : '10';

  const subjectValues = subjectBarData.datasets[0]?.data ?? [];
  const predictedValues = predictedLineData.datasets[0]?.data ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroEyebrow}>Student Analytics Dashboard</Text>
          <Text style={styles.heroTitle}>Academic Performance Overview</Text>
          <Text style={styles.heroSubtitle}>
            Welcome, {studentName}. Track performance trends, assignment status,
            and subject predictions in one dashboard.
          </Text>
        </View>

        <View style={styles.riskPillWrap}>
          <Text style={styles.riskPillLabel}>Current Risk</Text>
          <View
            style={[
              styles.riskPill,
              { backgroundColor: `${overallRiskColor}18` },
            ]}
          >
            <Text style={[styles.riskPillText, { color: overallRiskColor }]}>
              {analytics.overallRisk}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard
          title="Overall Average"
          value={
            analytics.overallAverage > 0 ? `${analytics.overallAverage}%` : 'N/A'
          }
          subtitle="Across graded assignments"
          accentColor={strongestColor}
          cardStyle={metricCardResponsiveStyle}
          trend={analytics.overallTrend}
          trendDirection={getTrendDirectionFromValue(analytics.overallTrend)}
        />
        <MetricCard
          title="Predicted Final Grade"
          value={
            analytics.predictedFinalGrade > 0
              ? `${analytics.predictedFinalGrade}%`
              : 'N/A'
          }
          subtitle="Based on current academic output"
          accentColor={COLORS.info}
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
        <MetricCard
          title="Submitted Assignments"
          value={`${analytics.totalSubmittedAssignments}`}
          subtitle="Awaiting grading"
          accentColor={COLORS.primary}
          cardStyle={metricCardResponsiveStyle}
        />
        <MetricCard
          title="Weakest Subject"
          value={analytics.weakestSubject}
          subtitle="Needs more focus"
          accentColor={COLORS.danger}
          cardStyle={[
            metricCardResponsiveStyle,
            isMobile && styles.fullWidthCard
          ]}
        />
        <MetricCard
          title="Strongest Subject"
          value={analytics.strongestSubject}
          subtitle="Best current standing"
          accentColor={COLORS.success}
          cardStyle={[
            metricCardResponsiveStyle,
            isMobile && styles.fullWidthCard
          ]}
        />
      </View>

      <View style={[styles.chartGrid, isChartGrid && styles.chartGridLarge]}>
        <View style={[styles.sectionCard, isChartGrid && styles.chartCardHalf]}>
          <Text style={styles.sectionTitle}>Subject Average Comparison</Text>
          <Text style={styles.sectionCaption}>
            Bar chart of your current average per course
          </Text>

          <View style={styles.chartContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              bounces
              contentContainerStyle={styles.chartScrollContent}
            >
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
                <FloatingBarLabels
                  data={subjectValues}
                  chartWidth={subjectChartWidth}
                  chartHeight={chartHeight}
                  isTablet={isTablet}
                  isDesktop={isDesktop}
                />
              </View>
            </ScrollView>
          </View>
        </View>

        <View style={[styles.sectionCard, isChartGrid && styles.chartCardHalf]}>
          <Text style={styles.sectionTitle}>Assignment Status Distribution</Text>
          <Text style={styles.sectionCaption}>
            Breakdown of graded, submitted, pending, and missing work
          </Text>

          <View style={styles.chartContainerCentered}>
            <PieChart
              data={statusPieData}
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
              {statusPieData.map(
                (
                  item: {
                    name: string;
                    population: number;
                    color: string;
                  }
                ) => (
                  <View key={item.name} style={styles.mobileLegendItem}>
                    <View
                      style={[
                        styles.mobileLegendDot,
                        { backgroundColor: item.color },
                      ]}
                    />
                    <Text style={styles.mobileLegendText}>
                      {item.population} {item.name}
                    </Text>
                  </View>
                )
              )}
            </View>
          )}

          <Text style={styles.chartFooterText}>
            Total assignments tracked: {totalAssignments}
          </Text>
        </View>

        <View style={[styles.sectionCard, isChartGrid && styles.chartCardHalf]}>
          <Text style={styles.sectionTitle}>Predicted Grade Trend</Text>
          <Text style={styles.sectionCaption}>
            Line chart of predicted grade per course
          </Text>

          <View style={styles.chartContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              bounces
              contentContainerStyle={styles.chartScrollContent}
            >
              <View style={{ width: predictedChartWidth, height: chartHeight }}>
                <LineChart
                  data={predictedLineData}
                  width={predictedChartWidth}
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
                <FloatingLineLabels
                  data={predictedValues}
                  labels={predictedLineFullLabels}
                  chartWidth={predictedChartWidth}
                  chartHeight={chartHeight}
                  isTablet={isTablet}
                  isDesktop={isDesktop}
                />
              </View>
            </ScrollView>
          </View>
        </View>

        <View style={[styles.sectionCard, isChartGrid && styles.chartCardHalf]}>
          <Text style={styles.sectionTitle}>Quick Insights</Text>
          <Text style={styles.sectionCaption}>
            Key interpretation of your current standing
          </Text>

          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Overall Risk</Text>
            <Text style={[styles.insightValue, { color: overallRiskColor }]}>
              {analytics.overallRisk}
            </Text>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Overall Trend</Text>
            <Text
              style={[
                styles.insightValue,
                {
                  color: getTrendColor(
                    getTrendDirectionFromValue(analytics.overallTrend)
                  ),
                },
              ]}
            >
              {getTrendSymbol(analytics.overallTrend)}{' '}
              {analytics.overallTrend > 0
                ? `+${analytics.overallTrend}`
                : analytics.overallTrend}
            </Text>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Best Subject</Text>
            <Text style={styles.insightValue}>{analytics.strongestSubject}</Text>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Needs Attention</Text>
            <Text style={styles.insightValue}>{analytics.weakestSubject}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Missing Work</Text>
        <Text style={styles.sectionCaption}>
          Assignments that passed the due date and were not submitted
        </Text>

        {analytics.missingAssignments.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateTitle}>No missing work</Text>
            <Text style={styles.emptyStateText}>
              Great job. You do not have any overdue unsubmitted assignments.
            </Text>
          </View>
        ) : (
          analytics.missingAssignments.map(
            (item: AnalyticsAssignment, index: number) => (
              <View
                key={`${item.id}-${index}`}
                style={styles.missingWorkCard}
              >
                <View style={styles.missingWorkTopRow}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.missingWorkTitle}>{item.title}</Text>
                    <Text style={styles.missingWorkMeta}>
                      {item.topic ? `${item.topic} • ` : ''}
                      Due: {formatDueDate(item.dueDate)}
                    </Text>
                  </View>

                  <View style={styles.missingBadge}>
                    <Text style={styles.missingBadgeText}>MISSING</Text>
                  </View>
                </View>
              </View>
            )
          )
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Per-Subject Details</Text>
        <Text style={styles.sectionCaption}>
          Detailed course-level analytics summary
        </Text>

        <View
          style={[
            styles.subjectGrid,
            isTablet && styles.subjectGridTablet,
            isDesktop && styles.subjectGridDesktop,
          ]}
        >
          {analytics.subjectSummaries.map((subject: SubjectAnalyticsSummary) => {
            const riskColor = getRiskColor(subject.riskLevel);

            return (
              <View
                key={subject.courseId}
                style={[
                  styles.subjectCard,
                  isTablet && styles.subjectCardTablet,
                  isDesktop && styles.subjectCardDesktop,
                ]}
              >
                <View style={styles.subjectTopRow}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.subjectTitle}>{subject.courseName}</Text>
                    <Text style={styles.subjectCode}>
                      {subject.courseCode} • {subject.instructor}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <View
                      style={[
                        styles.subjectRiskBadge,
                        { backgroundColor: `${riskColor}18` },
                      ]}
                    >
                      <Text
                        style={[styles.subjectRiskBadgeText, { color: riskColor }]}
                      >
                        {subject.riskLevel}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.subjectTrend,
                        { color: getTrendColor(subject.trendDirection) },
                      ]}
                    >
                      {subject.trendSymbol} {subject.trend > 0 ? '+' : ''}
                      {subject.trend}
                    </Text>
                  </View>
                </View>

                <View style={styles.subjectDivider} />

                <View style={styles.subjectInfoGrid}>
                  <View style={styles.subjectInfoItem}>
                    <Text style={styles.subjectInfoLabel}>Average</Text>
                    <Text style={styles.subjectInfoValue}>
                      {subject.average > 0 ? `${subject.average}%` : 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.subjectInfoItem}>
                    <Text style={styles.subjectInfoLabel}>Predicted Grade</Text>
                    <Text style={styles.subjectInfoValue}>
                      {subject.predictedGrade > 0
                        ? `${subject.predictedGrade}%`
                        : 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.subjectInfoItem}>
                    <Text style={styles.subjectInfoLabel}>Assignments</Text>
                    <Text style={styles.subjectInfoValue}>
                      {subject.totalAssignments}
                    </Text>
                  </View>

                  <View style={styles.subjectInfoItem}>
                    <Text style={styles.subjectInfoLabel}>Graded</Text>
                    <Text style={styles.subjectInfoValue}>
                      {subject.gradedCount}
                    </Text>
                  </View>

                  <View style={styles.subjectInfoItem}>
                    <Text style={styles.subjectInfoLabel}>Submitted</Text>
                    <Text style={styles.subjectInfoValue}>
                      {subject.submittedCount}
                    </Text>
                  </View>

                  <View style={styles.subjectInfoItem}>
                    <Text style={styles.subjectInfoLabel}>Pending</Text>
                    <Text style={styles.subjectInfoValue}>
                      {subject.pendingCount}
                    </Text>
                  </View>

                  <View style={styles.subjectInfoItem}>
                    <Text style={styles.subjectInfoLabel}>Missing</Text>
                    <Text style={styles.subjectInfoValue}>
                      {subject.missingCount}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Recommendations</Text>
        <Text style={styles.sectionCaption}>
          Suggested actions based on your analytics
        </Text>

        {analytics.recommendations.map((item: string, index: number) => (
          <View key={`${item}-${index}`} style={styles.recommendationRow}>
            <View style={styles.recommendationDot} />
            <Text style={styles.recommendationText}>{item}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default Analytics;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },

  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.subtext,
    lineHeight: 22,
  },

  riskPillWrap: {
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  riskPillLabel: {
    fontSize: 12,
    color: COLORS.subtext,
    marginBottom: 6,
    fontWeight: '600',
  },
  riskPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  riskPillText: {
    fontSize: 14,
    fontWeight: '800',
  },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 5,
  },

  metricCardMobile: {
    width: '48.5%',
  },
  metricCardTablet: {
    width: '32%',
  },
  metricCardDesktop: {
    width: '15.5%',
  },
  metricTitle: {
    fontSize: 13,
    color: COLORS.subtext,
    marginBottom: 8,
    marginLeft: 6,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
    marginLeft: 6,
    flexShrink: 1,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 6,
    lineHeight: 18,
  },
  trendBadge: {
    fontSize: 13,
    fontWeight: '800',
  },
  fullWidthCard: {
    width: '100%',
  },

  chartGrid: {
    flexDirection: 'column',
  },
  chartGridLarge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chartCardHalf: {
    width: '48.8%',
  },

  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionCaption: {
    fontSize: 13,
    color: COLORS.subtext,
    marginBottom: 12,
  },
  chartContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  chartContainerCentered: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  chartScrollContent: {
    paddingRight: 12,
    minWidth: '100%',
  },
  chartStyle: {
    marginTop: 0,
    borderRadius: 16,
  },
  chartFooterText: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.subtext,
    textAlign: 'center',
    fontWeight: '600',
  },

  floatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  anchorLabelWrap: {
    position: 'absolute',
    transform: [{ translateX: -18 }],
    minWidth: 36,
    alignItems: 'center',
  },
  anchorLabelWrapWide: {
    position: 'absolute',
    transform: [{ translateX: -42 }],
    minWidth: 84,
    alignItems: 'center',
  },
  floatingLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    textAlign: 'center',
  },

  mobileLegendWrap: {
    marginTop: 12,
    width: '100%',
    gap: 8,
  },
  mobileLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 8,
  },
  mobileLegendText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },

  insightCard: {
    backgroundColor: '#FCFCFD',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  insightLabel: {
    fontSize: 12,
    color: COLORS.subtext,
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },

  emptyStateCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FCFCFD',
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.success,
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 13,
    color: COLORS.subtext,
    lineHeight: 20,
  },

  missingWorkCard: {
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  missingWorkTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  missingWorkTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  missingWorkMeta: {
    fontSize: 12,
    color: COLORS.subtext,
    marginTop: 4,
  },
  missingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#DC2626',
  },
  missingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  subjectGrid: {
    flexDirection: 'column',
  },
  subjectGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  subjectGridDesktop: {
    justifyContent: 'space-between',
  },

  subjectCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#FCFCFD',
    width: '100%',
  },
  subjectCardTablet: {
    width: '48.5%',
  },
  subjectCardDesktop: {
    width: '32%',
  },

  subjectTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  subjectCode: {
    fontSize: 12,
    color: COLORS.subtext,
    marginTop: 2,
  },
  subjectRiskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  subjectRiskBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  subjectTrend: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '800',
  },
  subjectDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  subjectInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  subjectInfoItem: {
    width: '48%',
    marginBottom: 12,
  },
  subjectInfoLabel: {
    fontSize: 12,
    color: COLORS.subtext,
    marginBottom: 4,
  },
  subjectInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },

  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    marginTop: 6,
    marginRight: 10,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
});