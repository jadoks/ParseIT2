import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AdminAcademicData } from '../AdminApp';

interface PerformanceAnalyticsProps {
  academicData: AdminAcademicData;
}

const toNumberProgress = (progress: string): number =>
  Number(progress.replace('%', ''));

const gradeEquivalent = (avg: number): string => {
  if (avg >= 97) return '1.00';
  if (avg >= 94) return '1.25';
  if (avg >= 91) return '1.50';
  if (avg >= 88) return '1.75';
  if (avg >= 85) return '2.00';
  if (avg >= 80) return '2.25';
  if (avg >= 75) return '3.00';
  return '5.00';
};

const getAverage = (values: number[]): number => {
  if (!values.length) return 0;
  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
  );
};

const getRiskLevel = (avg: number, progress: number) => {
  if (avg < 75 || progress < 60) return 'High';
  if (avg < 85 || progress < 80) return 'Moderate';
  return 'Low';
};

export const PerformanceAnalytics: React.FC<PerformanceAnalyticsProps> = ({
  academicData,
}) => {
  const years = Object.keys(academicData);
  const [selectedYear, setSelectedYear] = useState<string>(years[0]);

  const sections = Object.keys(academicData[selectedYear]);
  const [selectedSection, setSelectedSection] = useState<string>(sections[0]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setSelectedSection(Object.keys(academicData[year])[0]);
    setExpandedId(null);
  };

  const currentSubjects = academicData[selectedYear][selectedSection];

  const departmentMetrics = useMemo(() => {
    const yearComparison = years.map((year) => {
      const yearSections = academicData[year];
      const allScores = Object.values(yearSections)
        .flat()
        .flatMap((subject) => subject.students.map((student) => student.score));

      return {
        year,
        average: getAverage(allScores),
      };
    });

    const sectionComparison = Object.entries(academicData[selectedYear]).map(
      ([sectionName, sectionSubjects]) => {
        const scores = sectionSubjects.flatMap((subject) =>
          subject.students.map((student) => student.score)
        );

        return {
          section: sectionName,
          average: getAverage(scores),
        };
      }
    );

    const subjectTrend = currentSubjects.map((subject) => {
      const avg = getAverage(subject.students.map((student) => student.score));
      return {
        title: subject.title,
        average: avg,
        progress: toNumberProgress(subject.progress),
        riskLevel: getRiskLevel(avg, toNumberProgress(subject.progress)),
      };
    });

    const allScoresAcrossSelectedYear = Object.values(academicData[selectedYear])
      .flat()
      .flatMap((subject) => subject.students.map((student) => student.score));

    const allSectionStudents = Object.values(academicData[selectedYear]).reduce(
      (acc, sectionSubjects) => {
        const studentMap = new Map<string, number[]>();

        sectionSubjects.forEach((subject) => {
          subject.students.forEach((student) => {
            const existing = studentMap.get(student.name) || [];
            studentMap.set(student.name, [...existing, student.score]);
          });
        });

        return acc + studentMap.size;
      },
      0
    );

    const atRiskCount = currentSubjects.reduce((count, subject) => {
      const progressValue = toNumberProgress(subject.progress);

      return (
        count +
        subject.students.filter(
          (student) => getRiskLevel(student.score, progressValue) !== 'Low'
        ).length
      );
    }, 0);

    const passCount = allScoresAcrossSelectedYear.filter(
      (score) => score >= 75
    ).length;
    const failCount = allScoresAcrossSelectedYear.filter(
      (score) => score < 75
    ).length;

    const backlogCount = Object.values(academicData[selectedYear])
      .flat()
      .filter((subject) => toNumberProgress(subject.progress) < 80).length;

    const gradeDistribution = {
      Excellent: allScoresAcrossSelectedYear.filter((score) => score >= 90)
        .length,
      Good: allScoresAcrossSelectedYear.filter(
        (score) => score >= 85 && score < 90
      ).length,
      Average: allScoresAcrossSelectedYear.filter(
        (score) => score >= 75 && score < 85
      ).length,
      Poor: allScoresAcrossSelectedYear.filter((score) => score < 75).length,
    };

    const departmentAverage = getAverage(allScoresAcrossSelectedYear);

    return {
      departmentAverage,
      totalStudentsMonitored: allSectionStudents,
      atRiskCount,
      passCount,
      failCount,
      passRate:
        passCount + failCount === 0
          ? 0
          : Number(((passCount / (passCount + failCount)) * 100).toFixed(1)),
      failRate:
        passCount + failCount === 0
          ? 0
          : Number(((failCount / (passCount + failCount)) * 100).toFixed(1)),
      backlogCount,
      sectionComparison,
      yearComparison,
      subjectTrend,
      gradeDistribution,
    };
  }, [academicData, currentSubjects, selectedYear, years]);

  const selectedSectionOverview = useMemo(() => {
    const sectionScores = currentSubjects.flatMap((subject) =>
      subject.students.map((student) => student.score)
    );

    const highest = Math.max(...sectionScores);
    const lowest = Math.min(...sectionScores);

    return {
      average: getAverage(sectionScores),
      highest,
      lowest,
    };
  }, [currentSubjects]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageEyebrow}>ADMIN ACADEMIC ANALYTICS</Text>
      <Text style={styles.pageTitle}>Department Performance Overview</Text>
      <Text style={styles.pageSubtitle}>
        Track department-wide progress, identify at-risk populations, compare
        sections, and monitor subject-level academic trends.
      </Text>

      <View style={styles.filterWrapper}>
        <Text style={styles.filterLabel}>ACADEMIC YEAR</Text>
        <View style={styles.tabRow}>
          {years.map((year) => (
            <TouchableOpacity
              key={year}
              onPress={() => handleYearChange(year)}
              style={[
                styles.tabItem,
                selectedYear === year && styles.activeTab,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedYear === year && styles.activeTabText,
                ]}
              >
                {year.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.filterWrapper}>
        <Text style={styles.filterLabel}>BSIT SECTION</Text>
        <View style={styles.sectionRow}>
          {sections.map((section) => (
            <TouchableOpacity
              key={section}
              onPress={() => {
                setSelectedSection(section);
                setExpandedId(null);
              }}
              style={[
                styles.secItem,
                selectedSection === section && styles.activeSec,
              ]}
            >
              <Text
                style={[
                  styles.secText,
                  selectedSection === section && styles.activeSecText,
                ]}
              >
                {section}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.blockTitle}>Department Overview</Text>
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, styles.metricCardWide]}>
          <Text style={styles.metricLabel}>Department Average</Text>
          <Text style={styles.metricValueRed}>
            {departmentMetrics.departmentAverage}%
          </Text>
          <Text style={styles.metricSubtext}>
            Overall academic standing for {selectedYear}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Students Monitored</Text>
          <Text style={styles.metricValueDark}>
            {departmentMetrics.totalStudentsMonitored}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>At-Risk Count</Text>
          <Text style={styles.metricValueDanger}>
            {departmentMetrics.atRiskCount}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Pass / Fail Rate</Text>
          <Text style={styles.metricValueDark}>
            {departmentMetrics.passRate}% / {departmentMetrics.failRate}%
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Backlog Count</Text>
          <Text style={styles.metricValueWarning}>
            {departmentMetrics.backlogCount}
          </Text>
          <Text style={styles.metricSubtext}>
            Subjects with progress below 80%
          </Text>
        </View>
      </View>

      <Text style={styles.blockTitle}>Section Comparison</Text>
      <View style={styles.panel}>
        {departmentMetrics.sectionComparison.map((item) => (
          <View key={item.section} style={styles.rowCard}>
            <View>
              <Text style={styles.rowTitle}>{item.section}</Text>
              <Text style={styles.rowSubtext}>
                Section-level average performance
              </Text>
            </View>
            <Text style={styles.rowValue}>{item.average}%</Text>
          </View>
        ))}
      </View>

      <Text style={styles.blockTitle}>Year-Level Comparison</Text>
      <View style={styles.panel}>
        {departmentMetrics.yearComparison.map((item) => (
          <View key={item.year} style={styles.rowCard}>
            <View>
              <Text style={styles.rowTitle}>{item.year}</Text>
              <Text style={styles.rowSubtext}>
                Average across all subjects in the year level
              </Text>
            </View>
            <Text style={styles.rowValue}>{item.average}%</Text>
          </View>
        ))}
      </View>

      <Text style={styles.blockTitle}>Subject Difficulty Trend</Text>
      <View style={styles.panel}>
        {departmentMetrics.subjectTrend.map((subject) => (
          <View key={subject.title} style={styles.subjectCard}>
            <View style={styles.subjectHeader}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.subjectTitle}>{subject.title}</Text>
                <Text style={styles.subjectSub}>
                  Progress {subject.progress}% • Average {subject.average}%
                </Text>
              </View>

              <View
                style={[
                  styles.riskBadge,
                  subject.riskLevel === 'High'
                    ? styles.riskHigh
                    : subject.riskLevel === 'Moderate'
                    ? styles.riskModerate
                    : styles.riskLow,
                ]}
              >
                <Text
                  style={[
                    styles.riskBadgeText,
                    subject.riskLevel === 'High'
                      ? styles.riskTextHigh
                      : subject.riskLevel === 'Moderate'
                      ? styles.riskTextModerate
                      : styles.riskTextLow,
                  ]}
                >
                  {subject.riskLevel}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.blockTitle}>Grade Distribution</Text>
      <View style={styles.metricsGrid}>
        {Object.entries(departmentMetrics.gradeDistribution).map(
          ([bucket, count]) => (
            <View key={bucket} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{bucket}</Text>
              <Text style={styles.metricValueDark}>{count}</Text>
            </View>
          )
        )}
      </View>

      <Text style={styles.blockTitle}>Selected Section Snapshot</Text>
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Section Average</Text>
          <Text style={styles.metricValueDark}>
            {selectedSectionOverview.average}%
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Highest Score</Text>
          <Text style={styles.metricValueDark}>
            {selectedSectionOverview.highest}%
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Lowest Score</Text>
          <Text style={styles.metricValueDark}>
            {selectedSectionOverview.lowest}%
          </Text>
        </View>
      </View>

      <Text style={styles.blockTitle}>Subject Details</Text>
      {currentSubjects.map((subject) => {
        const isExpanded = expandedId === subject.id;
        const progressValue = toNumberProgress(subject.progress);
        const averageScore = getAverage(
          subject.students.map((student) => student.score)
        );
        const meanGrade = gradeEquivalent(averageScore);
        const riskLevel = getRiskLevel(averageScore, progressValue);

        return (
          <View key={subject.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{subject.title}</Text>
              <Text style={styles.subText}>
                {selectedSection} • Subject Progress: {subject.progress}
              </Text>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progressValue}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                Completion / semester progress: {progressValue}%
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.gradeLabel}>MEAN GRADE</Text>
                <Text style={styles.gradeValue}>{meanGrade}</Text>
              </View>

              <View style={styles.inlineStats}>
                <Text style={styles.inlineStatText}>Avg: {averageScore}%</Text>
                <Text style={styles.inlineStatText}>Risk: {riskLevel}</Text>
              </View>

              <TouchableOpacity
                onPress={() => setExpandedId(isExpanded ? null : subject.id)}
                style={[
                  styles.actionBtn,
                  isExpanded && styles.activeActionBtn,
                ]}
              >
                <Text
                  style={[
                    styles.actionBtnText,
                    isExpanded && styles.activeActionBtnText,
                  ]}
                >
                  {isExpanded ? 'Hide Details' : 'View Students'}
                </Text>
              </TouchableOpacity>
            </View>

            {isExpanded && (
              <View style={styles.studentList}>
                <Text style={styles.listTitle}>Enrolled Student Performance</Text>
                {subject.students.map((student, idx) => (
                  <View key={`${student.name}-${idx}`} style={styles.studentRow}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text
                      style={[
                        styles.studentScore,
                        student.score < 75 && styles.studentScoreDanger,
                      ]}
                    >
                      {student.score}%
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  pageEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
    marginTop: 8,
    marginBottom: 18,
  },

  filterWrapper: {
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    marginBottom: 8,
    letterSpacing: 1,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#1E293B',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  activeTabText: {
    color: '#FFF',
  },

  sectionRow: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F7',
    borderRadius: 10,
    padding: 4,
  },
  secItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeSec: {
    backgroundColor: '#FFF',
    elevation: 2,
  },
  secText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  activeSecText: {
    color: '#ff4d4d',
  },

  blockTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 6,
    marginBottom: 12,
  },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricCardWide: {
    width: '100%',
    borderLeftWidth: 5,
    borderLeftColor: '#ff4d4d',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  metricValueRed: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ff4d4d',
  },
  metricValueDark: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricValueDanger: {
    fontSize: 24,
    fontWeight: '800',
    color: '#DC2626',
  },
  metricValueWarning: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F59E0B',
  },
  metricSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },

  panel: {
    marginBottom: 18,
  },
  rowCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  rowSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
  },
  rowValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ff4d4d',
  },

  subjectCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  subjectSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },

  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  riskHigh: {
    backgroundColor: '#FEE2E2',
  },
  riskModerate: {
    backgroundColor: '#FEF3C7',
  },
  riskLow: {
    backgroundColor: '#DCFCE7',
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  riskTextHigh: {
    color: '#DC2626',
  },
  riskTextModerate: {
    color: '#D97706',
  },
  riskTextLow: {
    color: '#16A34A',
  },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 5,
    borderLeftColor: '#ff4d4d',
  },
  cardHeader: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  subText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    marginBottom: 5,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#ff4d4d',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    color: '#64748B',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gradeLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '900',
  },
  gradeValue: {
    color: '#1E293B',
    fontSize: 24,
    fontWeight: '800',
  },
  inlineStats: {
    alignItems: 'flex-start',
    flex: 1,
    marginLeft: 16,
  },
  inlineStatText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 3,
  },
  actionBtn: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  activeActionBtn: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  activeActionBtnText: {
    color: '#FFF',
  },
  studentList: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  listTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 2,
  },
  studentName: {
    fontSize: 13,
    color: '#334155',
  },
  studentScore: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ff4d4d',
  },
  studentScoreDanger: {
    color: '#DC2626',
  },
});