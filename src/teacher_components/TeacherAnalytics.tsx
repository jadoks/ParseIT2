import React, { useMemo, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { buildTeacherAnalytics } from '../analytics/analyticsService';

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
  riskLevel: string;
  overallTrend?: number | string;
  latestGrade: number | null;
  highestScore: number | null;
  lowestScore: number | null;
  riskReason: string;
  recommendedIntervention: string;
  classLabel?: string;
};

interface TeacherAnalyticsProps {
  teacherName?: string;
  selectedCourseName?: string;
  selectedClass?: string;
  onChangeSelectedClass?: (value: string) => void;
  availableCourses?: TeacherCourseOption[];
  students?: TeacherStudentInput[];
}

const FALLBACK_STUDENTS: TeacherStudentInput[] = [
  {
    studentId: 's1',
    studentName: 'Maria Santos',
    courses: [
      {
        id: '1',
        name: 'Web Development 101',
        code: 'CS-101',
        courseCode: 'CS-101',
        instructor: 'Ramcee Jade L. Munoz',
        section: 'A',
        assignments: [
          { id: 'a1', title: 'HTML Quiz', status: 'graded', points: 92, maxPoints: 100, topic: 'HTML' },
          { id: 'a2', title: 'CSS Lab', status: 'graded', points: 89, maxPoints: 100, topic: 'CSS' },
          { id: 'a3', title: 'Landing Page Project', status: 'submitted', maxPoints: 100, topic: 'Project' },
        ],
      },
    ],
  },
  {
    studentId: 's2',
    studentName: 'John Reyes',
    courses: [
      {
        id: '1',
        name: 'Web Development 101',
        code: 'CS-101',
        courseCode: 'CS-101',
        instructor: 'Ramcee Jade L. Munoz',
        section: 'A',
        assignments: [
          { id: 'a1', title: 'HTML Quiz', status: 'graded', points: 74, maxPoints: 100, topic: 'HTML' },
          { id: 'a2', title: 'CSS Lab', status: 'pending', maxPoints: 100, topic: 'CSS' },
          { id: 'a3', title: 'Landing Page Project', status: 'pending', maxPoints: 100, topic: 'Project' },
        ],
      },
    ],
  },
  {
    studentId: 's3',
    studentName: 'Allan Reyes',
    courses: [
      {
        id: '2',
        name: 'Programming Logic',
        code: 'CS-102',
        courseCode: 'CS-102',
        instructor: 'Ramcee Jade L. Munoz',
        section: 'B',
        assignments: [
          { id: 'a1', title: 'Flowchart Quiz', status: 'graded', points: 85, maxPoints: 100, topic: 'Logic' },
          { id: 'a2', title: 'Pseudo Code Lab', status: 'graded', points: 81, maxPoints: 100, topic: 'Programming' },
          { id: 'a3', title: 'Algorithm Project', status: 'submitted', maxPoints: 100, topic: 'Project' },
        ],
      },
    ],
  },
  {
    studentId: 's4',
    studentName: 'Angela Cruz',
    courses: [
      {
        id: '2',
        name: 'Programming Logic',
        code: 'CS-102',
        courseCode: 'CS-102',
        instructor: 'Ramcee Jade L. Munoz',
        section: 'B',
        assignments: [
          { id: 'a1', title: 'Flowchart Quiz', status: 'graded', points: 61, maxPoints: 100, topic: 'Logic' },
          { id: 'a2', title: 'Pseudo Code Lab', status: 'graded', points: 58, maxPoints: 100, topic: 'Programming' },
          { id: 'a3', title: 'Algorithm Project', status: 'pending', maxPoints: 100, topic: 'Project' },
        ],
      },
    ],
  },
];

const palette = {
  bg: '#F4F7FB',
  surface: '#FFFFFF',
  border: '#E7EDF5',
  textStrong: '#102A43',
  text: '#334E68',
  textMuted: '#7B8794',
  primary: '#D32F2F',
  primarySoft: '#FDECEC',
  blue: '#2563EB',
  blueSoft: '#EAF2FF',
  green: '#059669',
  greenSoft: '#EAF8F3',
  orange: '#F59E0B',
  orangeSoft: '#FFF4E5',
  purple: '#7C3AED',
  purpleSoft: '#F3E8FF',
  red: '#EF4444',
  redSoft: '#FEECEC',
  slateBar: '#E8EEF5',
};

const formatPercentWidth = (value: number, maxValue: number): `${number}%` => {
  if (maxValue <= 0) return '0%';
  const safe = Math.max((value / maxValue) * 100, 4);
  return `${safe}%`;
};

const normalizeText = (value: any) => String(value ?? '').trim().toLowerCase();

const buildCourseOptionLabel = (course: TeacherCourseOption | any) => {
  const name = course?.name || 'Untitled Class';
  const section = course?.section ? ` • Section ${course.section}` : '';
  return `${name}${section}`;
};

const getCourseClassLabel = (course: any) => {
  const name = course?.name || '';
  const section = course?.section ? ` • Section ${course.section}` : '';
  return `${name}${section}`;
};

const isGenericAllClass = (course: any) => {
  const label = normalizeText(getCourseClassLabel(course));
  const name = normalizeText(course?.name);
  return (
    label === 'all' ||
    name === 'all' ||
    name === 'all class'
  );
};

const getRiskPalette = (risk: string) => {
  if (risk === 'High') {
    return {
      bg: palette.redSoft,
      text: '#B42318',
      fill: palette.red,
      icon: 'alert-circle',
    };
  }

  if (risk === 'Moderate') {
    return {
      bg: palette.orangeSoft,
      text: '#B54708',
      fill: palette.orange,
      icon: 'alert-outline',
    };
  }

  return {
    bg: palette.greenSoft,
    text: '#027A48',
    fill: '#22C55E',
    icon: 'check-circle-outline',
  };
};

const getTrendMeta = (trend?: number | string) => {
  const value = typeof trend === 'number' ? trend : 0;
  if (value > 0) {
    return {
      label: 'Improving',
      icon: 'trending-up',
      color: palette.green,
      bg: palette.greenSoft,
    };
  }
  if (value < 0) {
    return {
      label: 'Declining',
      icon: 'trending-down',
      color: palette.red,
      bg: palette.redSoft,
    };
  }
  return {
    label: 'Stable',
    icon: 'trending-neutral',
    color: palette.blue,
    bg: palette.blueSoft,
  };
};

const SectionCard = ({
  title,
  subtitle,
  rightNode,
  children,
}: {
  title: string;
  subtitle?: string;
  rightNode?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
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
            {
              width: widthPercent,
              backgroundColor: color,
            },
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
}: {
  average: number;
  pending: number;
  trend: number;
}) => {
  if (average < 75 && pending >= 2 && trend < 0) {
    return 'Low average, multiple missing tasks, and declining trend';
  }
  if (average < 75 && pending >= 2) {
    return 'Low average and repeated missing tasks';
  }
  if (average < 75) {
    return 'Average is below passing threshold';
  }
  if (pending >= 2) {
    return 'Several missing assignments need completion';
  }
  if (trend < 0) {
    return 'Recent performance trend is declining';
  }
  return 'Monitor for consistency and maintain current progress';
};

const insightIntervention = ({
  average,
  pending,
  trend,
}: {
  average: number;
  pending: number;
  trend: number;
}) => {
  if (average < 75 && pending >= 2) {
    return 'Schedule 1:1 remediation and set a submission recovery plan.';
  }
  if (average < 75) {
    return 'Provide targeted tutoring and reassessment support.';
  }
  if (pending >= 2) {
    return 'Follow up on missing tasks and set short-term deadlines.';
  }
  if (trend < 0) {
    return 'Check recent learning barriers and monitor next assessment.';
  }
  return 'Sustain progress with light-touch monitoring.';
};

export default function TeacherAnalytics({
  teacherName = 'Ramcee Jade L. Munoz',
  selectedCourseName = 'Academic Analytics',
  selectedClass = 'All',
  onChangeSelectedClass,
  availableCourses = [],
  students = FALLBACK_STUDENTS,
}: TeacherAnalyticsProps) {
  const [showClassDropdown, setShowClassDropdown] = useState(false);

  const classOptions = useMemo(() => {
    const seen = new Set<string>();
    const options = [{ label: 'All Classes', value: 'All' }];

    availableCourses.forEach((course) => {
      if (isGenericAllClass(course)) return;

      const label = buildCourseOptionLabel(course);
      if (!seen.has(label)) {
        seen.add(label);
        options.push({
          label,
          value: label,
        });
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

          if (!normalizedSelectedClass || normalizedSelectedClass === 'all') {
            return true;
          }

          const classLabel = normalizeText(getCourseClassLabel(course));
          return classLabel === normalizedSelectedClass;
        });

        return {
          ...student,
          courses: filteredCourses,
        };
      })
      .filter((student) => student.courses.length > 0);
  }, [students, selectedClass]);

  const summary = useMemo(() => buildTeacherAnalytics(filteredStudents), [filteredStudents]);

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
          }))
        )
      ),
    [filteredStudents]
  );

  const totalPending = useMemo(
    () =>
      summary.studentRows.reduce(
        (sum, student) => sum + student.totalPendingAssignments,
        0
      ),
    [summary.studentRows]
  );

  const totalSubmitted = useMemo(
    () =>
      summary.studentRows.reduce(
        (sum, student) => sum + student.totalSubmittedAssignments,
        0
      ),
    [summary.studentRows]
  );

  const completionRate = useMemo(() => {
    const total = totalPending + totalSubmitted;
    if (total === 0) return 0;
    return Math.round((totalSubmitted / total) * 100);
  }, [totalPending, totalSubmitted]);

  const studentInsights = useMemo<StudentInsight[]>(() => {
    return filteredStudents.map((student) => {
      const row = summary.studentRows.find((item) => item.studentId === student.studentId);
      const assignments = student.courses.flatMap((course) => course.assignments || []);
      const primaryCourse = student.courses[0];

      const gradedAssignments = assignments.filter(
        (assignment: any) =>
          assignment.status === 'graded' &&
          typeof assignment.points === 'number'
      );

      const latestGraded = [...gradedAssignments].sort((a: any, b: any) => {
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return bDate - aDate;
      })[0] ?? gradedAssignments[gradedAssignments.length - 1];

      const scores = gradedAssignments.map((assignment: any) => assignment.points);

      const highestScore = scores.length ? Math.max(...scores) : null;
      const lowestScore = scores.length ? Math.min(...scores) : null;
      const latestGrade = latestGraded?.points ?? null;
      const trendNumber =
        typeof row?.overallTrend === 'number' ? row.overallTrend : 0;

      const average = row?.overallAverage ?? 0;
      const pending = row?.totalPendingAssignments ?? 0;

      return {
        studentId: student.studentId,
        studentName: student.studentName,
        classLabel: primaryCourse ? getCourseClassLabel(primaryCourse) : 'Unassigned',
        overallAverage: average,
        totalPendingAssignments: row?.totalPendingAssignments ?? 0,
        totalSubmittedAssignments: row?.totalSubmittedAssignments ?? 0,
        riskLevel: row?.riskLevel ?? 'Low',
        overallTrend: row?.overallTrend ?? 0,
        latestGrade,
        highestScore,
        lowestScore,
        riskReason: insightReason({
          average,
          pending,
          trend: trendNumber,
        }),
        recommendedIntervention: insightIntervention({
          average,
          pending,
          trend: trendNumber,
        }),
      };
    });
  }, [filteredStudents, summary.studentRows]);

  const atRiskStudents = useMemo(
    () =>
      studentInsights
        .filter(
          (student) =>
            student.riskLevel === 'High' || student.riskLevel === 'Moderate'
        )
        .sort((a, b) => {
          const riskOrder = { High: 2, Moderate: 1, Low: 0 };
          const aRisk = riskOrder[a.riskLevel as keyof typeof riskOrder] ?? 0;
          const bRisk = riskOrder[b.riskLevel as keyof typeof riskOrder] ?? 0;

          if (bRisk !== aRisk) return bRisk - aRisk;
          if (b.totalPendingAssignments !== a.totalPendingAssignments) {
            return b.totalPendingAssignments - a.totalPendingAssignments;
          }
          return a.overallAverage - b.overallAverage;
        }),
    [studentInsights]
  );

  const topStudents = useMemo(
    () =>
      [...studentInsights]
        .sort((a, b) => b.overallAverage - a.overallAverage)
        .slice(0, 5),
    [studentInsights]
  );

  const sortedStudents = useMemo(
    () => [...studentInsights].sort((a, b) => a.overallAverage - b.overallAverage),
    [studentInsights]
  );

  const mostPendingStudents = useMemo(
    () =>
      [...studentInsights]
        .sort((a, b) => b.totalPendingAssignments - a.totalPendingAssignments)
        .slice(0, 5),
    [studentInsights]
  );

  const gradeBuckets = useMemo(() => {
    let excellent = 0;
    let good = 0;
    let fair = 0;
    let needsSupport = 0;

    studentInsights.forEach((student) => {
      if (student.overallAverage >= 90) excellent += 1;
      else if (student.overallAverage >= 80) good += 1;
      else if (student.overallAverage >= 75) fair += 1;
      else needsSupport += 1;
    });

    return [
      { label: '90–100', value: excellent, color: '#22C55E' },
      { label: '80–89', value: good, color: '#3B82F6' },
      { label: '75–79', value: fair, color: '#F59E0B' },
      { label: 'Below 75', value: needsSupport, color: '#EF4444' },
    ];
  }, [studentInsights]);

  const riskBuckets = useMemo(
    () => [
      { label: 'High Risk', value: summary.highRiskCount, color: '#EF4444' },
      { label: 'Moderate Risk', value: summary.moderateRiskCount, color: '#F59E0B' },
      { label: 'Low Risk', value: summary.lowRiskCount, color: '#22C55E' },
    ],
    [summary.highRiskCount, summary.moderateRiskCount, summary.lowRiskCount]
  );

  const topicSummaries = useMemo<TopicSummary[]>(() => {
    const topicMap = new Map<
      string,
      { total: number; count: number; pending: number }
    >();

    allAssignments.forEach((assignment: any) => {
      const topic = assignment.topic || 'Uncategorized';
      const current = topicMap.get(topic) || { total: 0, count: 0, pending: 0 };

      if (assignment.status === 'graded' && typeof assignment.points === 'number') {
        current.total += assignment.points;
        current.count += 1;
      }

      if (assignment.status === 'pending') {
        current.pending += 1;
      }

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

  const weakTopics = useMemo(() => topicSummaries.slice(0, 5), [topicSummaries]);

  const classHighestScore = useMemo(() => {
    const scores = allAssignments
      .filter(
        (assignment: any) =>
          assignment.status === 'graded' && typeof assignment.points === 'number'
      )
      .map((assignment: any) => assignment.points);
    return scores.length ? Math.max(...scores) : 0;
  }, [allAssignments]);

  const classLowestScore = useMemo(() => {
    const scores = allAssignments
      .filter(
        (assignment: any) =>
          assignment.status === 'graded' && typeof assignment.points === 'number'
      )
      .map((assignment: any) => assignment.points);
    return scores.length ? Math.min(...scores) : 0;
  }, [allAssignments]);

  const maxAverage = useMemo(() => {
    const values = studentInsights.map((student) => student.overallAverage);
    return Math.max(...values, 100);
  }, [studentInsights]);

  const maxPending = useMemo(() => {
    const values = studentInsights.map((student) => student.totalPendingAssignments);
    return Math.max(...values, 1);
  }, [studentInsights]);

  const maxTopicAverage = useMemo(() => {
    const values = topicSummaries.map((topic) => topic.average);
    return Math.max(...values, 100);
  }, [topicSummaries]);

  const attentionIndex = useMemo(() => {
    if (summary.totalStudents === 0) return 0;
    return Math.round(
      ((summary.highRiskCount * 2 + summary.moderateRiskCount) /
        summary.totalStudents) *
        100
    );
  }, [summary.highRiskCount, summary.moderateRiskCount, summary.totalStudents]);

  const passingRate = useMemo(() => {
    if (summary.totalStudents === 0) return 0;
    const passed = studentInsights.filter(
      (student) => student.overallAverage >= 75
    ).length;
    return Math.round((passed / summary.totalStudents) * 100);
  }, [studentInsights, summary.totalStudents]);

  const classHealth = useMemo(() => {
    if (summary.classAverage >= 85) return 'Strong';
    if (summary.classAverage >= 75) return 'Stable';
    return 'Needs Attention';
  }, [summary.classAverage]);

  return (
    <>
      <Modal
        visible={showClassDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClassDropdown(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.dropdownOverlay}
          onPress={() => setShowClassDropdown(false)}
        >
          <View style={styles.dropdownModal}>
            {classOptions.map((option) => {
              const isSelected = option.value === selectedClass;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
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
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroEyebrowRow}>
                <View style={styles.heroEyebrowBadge}>
                  <MaterialCommunityIcons
                    name="chart-box-outline"
                    size={16}
                    color={palette.primary}
                  />
                  <Text style={styles.heroEyebrow}>Teacher Analytics Dashboard</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.classDropdownButton}
                onPress={() => setShowClassDropdown(true)}
              >
                <View style={styles.classDropdownTextWrap}>
                  <Text style={styles.classDropdownLabel}>Selected Class</Text>
                  <Text style={styles.classDropdownValue} numberOfLines={1}>
                    {selectedClass === 'All' ? 'All Classes' : selectedClass}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={20}
                  color={palette.textStrong}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.heroTitle}>Academic Performance Overview</Text>
            <Text style={styles.heroSubtitle}>
              {teacherName} • {selectedCourseName}
            </Text>
            <Text style={styles.heroDescription}>
              Review class outcomes, identify intervention priorities, monitor submission gaps,
              and surface weak learning topics for early intervention.
            </Text>
          </View>

          <View style={styles.heroRight}>
            <CircularMiniStat
              value={`${summary.classAverage}%`}
              label="Class Average"
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
              label="Class Health"
              accent={palette.blue}
              softBg={palette.blueSoft}
              icon="shield-check-outline"
            />
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Students"
            value={summary.totalStudents}
            helper="Students under your current monitoring scope"
            icon="account-group-outline"
            accent={palette.blue}
            softBg={palette.blueSoft}
          />
          <MetricCard
            title="Completion Rate"
            value={`${completionRate}%`}
            helper="Completed work compared with active workload"
            icon="check-decagram-outline"
            accent={palette.green}
            softBg={palette.greenSoft}
          />
          <MetricCard
            title="At-Risk Students"
            value={summary.highRiskCount + summary.moderateRiskCount}
            helper="Students who need closer academic support"
            icon="alert-circle-outline"
            accent={palette.orange}
            softBg={palette.orangeSoft}
          />
          <MetricCard
            title="Attention Index"
            value={`${attentionIndex}%`}
            helper="Weighted pressure level for intervention planning"
            icon="radar"
            accent={palette.primary}
            softBg={palette.primarySoft}
          />
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            title="Highest Score"
            value={classHighestScore}
            helper="Best graded score recorded in class"
            icon="arrow-up-bold-circle-outline"
            accent={palette.green}
            softBg={palette.greenSoft}
          />
          <MetricCard
            title="Lowest Score"
            value={classLowestScore}
            helper="Lowest graded score requiring attention"
            icon="arrow-down-bold-circle-outline"
            accent={palette.red}
            softBg={palette.redSoft}
          />
          <MetricCard
            title="Pending Tasks"
            value={totalPending}
            helper="Unfinished work currently affecting class progress"
            icon="clipboard-text-clock-outline"
            accent={palette.purple}
            softBg={palette.purpleSoft}
          />
          <MetricCard
            title="Submitted Tasks"
            value={totalSubmitted}
            helper="Tasks submitted and ready for tracking or grading"
            icon="file-check-outline"
            accent="#0891B2"
            softBg="#E0F7FF"
          />
        </View>

        <View style={styles.dualColumn}>
          <SectionCard
            title="Class Overview"
            subtitle="Overall student risk and grade segmentation"
          >
            {riskBuckets.map((item) => (
              <HorizontalBar
                key={item.label}
                label={item.label}
                value={item.value}
                maxValue={summary.totalStudents || 1}
                color={item.color}
                rightText={`${item.value} student${item.value === 1 ? '' : 's'}`}
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
            title="Submission Monitoring"
            subtitle="Students with the heaviest unfinished workload"
          >
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

        <View style={styles.dualColumn}>
          <SectionCard
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
            title="Top Performing Students"
            subtitle="Highest-performing learners by average"
          >
            {topStudents.length === 0 ? (
              <Text style={styles.emptyText}>No graded records yet.</Text>
            ) : (
              topStudents.map((student) => (
                <HorizontalBar
                  key={student.studentId}
                  label={student.studentName}
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
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {atRiskStudents.map((student) => {
                const risk = getRiskPalette(student.riskLevel);
                const trend = getTrendMeta(student.overallTrend);

                return (
                  <View
                    key={student.studentId}
                    style={[
                      styles.interventionCard,
                      { borderLeftColor: risk.fill },
                    ]}
                  >
                    <View style={styles.interventionLeft}>
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

                          <View style={[styles.trendChip, { backgroundColor: trend.bg }]}>
                            <MaterialCommunityIcons
                              name={trend.icon}
                              size={14}
                              color={trend.color}
                            />
                            <Text style={[styles.trendChipText, { color: trend.color }]}>
                              {trend.label}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.interventionMeta}>
                          {student.classLabel} • Average {student.overallAverage}% • Latest Grade {student.latestGrade ?? 'N/A'} • Missing {student.totalPendingAssignments}
                        </Text>

                        <Text style={styles.reasonText}>
                          Risk Reason: {student.riskReason}
                        </Text>

                        <Text style={styles.recommendationText}>
                          Recommended Intervention: {student.recommendedIntervention}
                        </Text>

                        <View
                          style={[
                            styles.priorityTag,
                            { backgroundColor: risk.bg },
                          ]}
                        >
                          <Text style={[styles.priorityText, { color: risk.text }]}>
                            {student.riskLevel} Priority
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.interventionActions}>
                      <View style={[styles.riskPill, { backgroundColor: risk.bg }]}>
                        <Text style={[styles.riskPillText, { color: risk.text }]}>
                          {student.riskLevel}
                        </Text>
                      </View>

                      <View style={styles.actionButtons}>
                        <View style={styles.actionBtn}>
                          <MaterialCommunityIcons
                            name="eye-outline"
                            size={16}
                            color="#2563EB"
                          />
                          <Text style={styles.actionText}>View</Text>
                        </View>

                        <View style={styles.actionBtn}>
                          <MaterialCommunityIcons
                            name="message-text-outline"
                            size={16}
                            color="#059669"
                          />
                          <Text style={styles.actionText}>Message</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </SectionCard>

        <SectionCard
          title="Intervention Suggestions"
          subtitle="Recommended faculty response aligned with early intervention"
        >
          {atRiskStudents.length === 0 ? (
            <Text style={styles.emptyText}>
              No intervention actions needed at the moment.
            </Text>
          ) : (
            atRiskStudents.slice(0, 5).map((student) => (
              <View key={student.studentId} style={styles.suggestionRow}>
                <View style={styles.suggestionIconWrap}>
                  <MaterialCommunityIcons
                    name="lightbulb-on-outline"
                    size={18}
                    color={palette.orange}
                  />
                </View>
                <View style={styles.suggestionTextWrap}>
                  <Text style={styles.suggestionTitle}>{student.studentName}</Text>
                  <Text style={styles.suggestionBody}>
                    {student.recommendedIntervention}
                  </Text>
                </View>
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard
          title="Student Performance Table"
          subtitle="Average, latest grade, trend, missing tasks, and risk detail"
        >
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.flex2]}>Student</Text>
            <Text style={styles.tableHeaderText}>Average</Text>
            <Text style={styles.tableHeaderText}>Latest</Text>
            <Text style={styles.tableHeaderText}>Missing</Text>
            <Text style={styles.tableHeaderText}>Risk</Text>
          </View>

          {sortedStudents.map((student) => {
            const risk = getRiskPalette(student.riskLevel);

            return (
              <View key={student.studentId} style={styles.tableRow}>
                <View style={[styles.flex2]}>
                  <Text style={styles.tableCell} numberOfLines={1}>
                    {student.studentName}
                  </Text>
                  <Text style={styles.tableSubCell} numberOfLines={1}>
                    {student.classLabel} • {student.riskReason}
                  </Text>
                </View>
                <Text style={styles.tableCell}>{student.overallAverage}%</Text>
                <Text style={styles.tableCell}>{student.latestGrade ?? 'N/A'}</Text>
                <Text style={styles.tableCell}>{student.totalPendingAssignments}</Text>
                <View style={[styles.tableCell, styles.riskCell]}>
                  <View style={[styles.riskDot, { backgroundColor: risk.fill }]} />
                  <Text style={styles.riskCellText}>{student.riskLevel}</Text>
                </View>
              </View>
            );
          })}
        </SectionCard>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  heroCard: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 22,
    marginBottom: 16,
  },
  heroLeft: {
    marginBottom: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  heroEyebrowRow: {
    flexDirection: 'row',
  },
  heroEyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroEyebrow: {
    marginLeft: 6,
    color: palette.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  classDropdownButton: {
    minWidth: 220,
    maxWidth: 320,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  classDropdownTextWrap: {
    flex: 1,
  },
  classDropdownLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.textMuted,
    textTransform: 'uppercase',
  },
  classDropdownValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: palette.textStrong,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dropdownModal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 8,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownItemActive: {
    backgroundColor: palette.primarySoft,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 14,
    color: palette.textStrong,
    fontWeight: '600',
  },
  dropdownItemTextActive: {
    color: palette.primary,
    fontWeight: '800',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: palette.textStrong,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
  },
  heroDescription: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: palette.textMuted,
    maxWidth: 680,
  },
  heroRight: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  miniStatCard: {
    minWidth: 110,
    backgroundColor: '#F8FBFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  miniStatIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  miniStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.textStrong,
  },
  miniStatLabel: {
    marginTop: 4,
    fontSize: 12,
    color: palette.textMuted,
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    minWidth: 180,
    flexGrow: 1,
    flexBasis: 220,
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
  },
  metricTopRow: {
    marginBottom: 12,
  },
  metricIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '800',
    color: palette.textStrong,
  },
  metricTitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: palette.text,
  },
  metricHelper: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: palette.textMuted,
  },
  dualColumn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    
  },
  sectionCard: {
    flex: 1,
    minWidth: 300,
    backgroundColor: palette.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.textStrong,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: palette.textMuted,
  },
  sectionBadge: {
    backgroundColor: palette.primarySoft,
    borderRadius: 999,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.primary,
  },
  barRow: {
    marginBottom: 14,
  },
  barTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
  },
  barLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: palette.text,
  },
  barRightValue: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textStrong,
  },
  barTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: palette.slateBar,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  chartDivider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: 10,
  },
  topicRow: {
    marginBottom: 10,
  },
  topicMeta: {
    marginTop: 2,
    fontSize: 12,
    color: palette.textMuted,
  },
  emptyText: {
    fontSize: 14,
    color: palette.textMuted,
  },
  interventionScroll: {
    maxHeight: 380,
  },
  interventionScrollContent: {
    paddingRight: 4,
  },
  interventionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
  },
  interventionLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  interventionTextWrapEnhanced: {
    flex: 1,
  },
  nameAndTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  interventionName: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.textStrong,
  },
  interventionMeta: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: palette.textMuted,
  },
  reasonText: {
    marginTop: 6,
    fontSize: 12,
    color: palette.text,
    lineHeight: 17,
    fontWeight: '600',
  },
  recommendationText: {
    marginTop: 5,
    fontSize: 12,
    color: palette.textMuted,
    lineHeight: 17,
  },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  trendChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  priorityTag: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  interventionActions: {
    alignItems: 'flex-end',
    gap: 8,
    marginLeft: 12,
  },
  riskPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  riskPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F4F7FB',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334E68',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  suggestionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: palette.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.textStrong,
  },
  suggestionBody: {
    marginTop: 3,
    fontSize: 12,
    color: palette.textMuted,
    lineHeight: 17,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5EAF1',
    marginBottom: 4,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    color: palette.textStrong,
    fontWeight: '500',
  },
  tableSubCell: {
    marginTop: 3,
    fontSize: 11,
    color: palette.textMuted,
  },
  flex2: {
    flex: 2,
  },
  riskCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  riskCellText: {
    fontSize: 13,
    color: palette.textStrong,
    fontWeight: '600',
  },
});