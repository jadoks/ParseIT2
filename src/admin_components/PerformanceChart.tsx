import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';

type StudentScore = {
  name: string;
  score: number;
};

type SubjectRecord = {
  id: number;
  title: string;
  progress: string;
  students: StudentScore[];
};

type SectionRecord = {
  [sectionName: string]: SubjectRecord[];
};

type AcademicData = {
  [yearLevel: string]: SectionRecord;
};

// Keep aligned with PerformanceAnalytics.tsx
const academicData: AcademicData = {
  '1st Year': {
    '1A - Microsoft': [
      {
        id: 101,
        title: 'Introduction to Computing',
        progress: '95%',
        students: [
          { name: 'Alice Tan', score: 95 },
          { name: 'Bob Reyes', score: 92 },
          { name: 'Charlie Day', score: 88 },
          { name: 'Daisy Go', score: 91 },
          { name: 'Ethan Sy', score: 94 },
        ],
      },
      {
        id: 102,
        title: 'Computer Programming 1',
        progress: '88%',
        students: [
          { name: 'Alice Tan', score: 82 },
          { name: 'Bob Reyes', score: 78 },
          { name: 'Charlie Day', score: 80 },
          { name: 'Daisy Go', score: 75 },
          { name: 'Ethan Sy', score: 70 },
        ],
      },
      {
        id: 103,
        title: 'Discrete Mathematics',
        progress: '90%',
        students: [
          { name: 'Alice Tan', score: 88 },
          { name: 'Bob Reyes', score: 85 },
          { name: 'Charlie Day', score: 82 },
          { name: 'Daisy Go', score: 80 },
          { name: 'Ethan Sy', score: 77 },
        ],
      },
    ],
    '1B - Apple': [
      {
        id: 104,
        title: 'Introduction to Computing',
        progress: '92%',
        students: [
          { name: 'Liam N.', score: 90 },
          { name: 'Emma W.', score: 88 },
          { name: 'Noah S.', score: 85 },
          { name: 'Olivia H.', score: 82 },
          { name: 'James B.', score: 85 },
        ],
      },
      {
        id: 105,
        title: 'Computer Programming 1',
        progress: '80%',
        students: [
          { name: 'Liam N.', score: 75 },
          { name: 'Emma W.', score: 72 },
          { name: 'Noah S.', score: 78 },
          { name: 'Olivia H.', score: 70 },
          { name: 'James B.', score: 74 },
        ],
      },
      {
        id: 106,
        title: 'Discrete Mathematics',
        progress: '85%',
        students: [
          { name: 'Liam N.', score: 80 },
          { name: 'Emma W.', score: 82 },
          { name: 'Noah S.', score: 84 },
          { name: 'Olivia H.', score: 78 },
          { name: 'James B.', score: 81 },
        ],
      },
    ],
  },
  '2nd Year': {
    '2A - Google': [
      {
        id: 201,
        title: 'Data Structures',
        progress: '75%',
        students: [
          { name: 'Ben J.', score: 98 },
          { name: 'Clara M.', score: 96 },
          { name: 'Dan K.', score: 95 },
          { name: 'Eva L.', score: 94 },
          { name: 'Fred P.', score: 97 },
        ],
      },
      {
        id: 202,
        title: 'Networking 1',
        progress: '70%',
        students: [
          { name: 'Ben J.', score: 85 },
          { name: 'Clara M.', score: 82 },
          { name: 'Dan K.', score: 88 },
          { name: 'Eva L.', score: 84 },
          { name: 'Fred P.', score: 86 },
        ],
      },
      {
        id: 203,
        title: 'Object Oriented Prog',
        progress: '82%',
        students: [
          { name: 'Ben J.', score: 90 },
          { name: 'Clara M.', score: 91 },
          { name: 'Dan K.', score: 89 },
          { name: 'Eva L.', score: 92 },
          { name: 'Fred P.', score: 88 },
        ],
      },
    ],
    '2B - Meta': [
      {
        id: 204,
        title: 'Data Structures',
        progress: '72%',
        students: [
          { name: 'Quinn S.', score: 75 },
          { name: 'Rose T.', score: 78 },
          { name: 'Seth U.', score: 72 },
          { name: 'Tara V.', score: 74 },
          { name: 'Ugo W.', score: 70 },
        ],
      },
      {
        id: 205,
        title: 'Networking 1',
        progress: '65%',
        students: [
          { name: 'Quinn S.', score: 80 },
          { name: 'Rose T.', score: 82 },
          { name: 'Seth U.', score: 79 },
          { name: 'Tara V.', score: 81 },
          { name: 'Ugo W.', score: 78 },
        ],
      },
      {
        id: 206,
        title: 'Object Oriented Prog',
        progress: '78%',
        students: [
          { name: 'Quinn S.', score: 85 },
          { name: 'Rose T.', score: 84 },
          { name: 'Seth U.', score: 86 },
          { name: 'Tara V.', score: 83 },
          { name: 'Ugo W.', score: 87 },
        ],
      },
    ],
  },
  '3rd Year': {
    '3A - Amazon': [
      {
        id: 301,
        title: 'Information Assurance',
        progress: '60%',
        students: [
          { name: 'Flo H.', score: 92 },
          { name: 'Gus I.', score: 94 },
          { name: 'Hope J.', score: 91 },
          { name: 'Ian K.', score: 93 },
          { name: 'Joy L.', score: 90 },
        ],
      },
      {
        id: 302,
        title: 'System Integration',
        progress: '55%',
        students: [
          { name: 'Flo H.', score: 88 },
          { name: 'Gus I.', score: 86 },
          { name: 'Hope J.', score: 87 },
          { name: 'Ian K.', score: 89 },
          { name: 'Joy L.', score: 85 },
        ],
      },
      {
        id: 303,
        title: 'Database Management 2',
        progress: '65%',
        students: [
          { name: 'Flo H.', score: 95 },
          { name: 'Gus I.', score: 92 },
          { name: 'Hope J.', score: 94 },
          { name: 'Ian K.', score: 91 },
          { name: 'Joy L.', score: 93 },
        ],
      },
    ],
    '3B - Oracle': [
      {
        id: 304,
        title: 'Information Assurance',
        progress: '58%',
        students: [
          { name: 'Uma W.', score: 80 },
          { name: 'Val X.', score: 82 },
          { name: 'Wes Y.', score: 78 },
          { name: 'Xander Z.', score: 79 },
          { name: 'Yolanda A.', score: 81 },
        ],
      },
      {
        id: 305,
        title: 'System Integration',
        progress: '50%',
        students: [
          { name: 'Uma W.', score: 75 },
          { name: 'Val X.', score: 77 },
          { name: 'Wes Y.', score: 74 },
          { name: 'Xander Z.', score: 76 },
          { name: 'Yolanda A.', score: 73 },
        ],
      },
      {
        id: 306,
        title: 'Database Management 2',
        progress: '62%',
        students: [
          { name: 'Uma W.', score: 85 },
          { name: 'Val X.', score: 83 },
          { name: 'Wes Y.', score: 86 },
          { name: 'Xander Z.', score: 84 },
          { name: 'Yolanda A.', score: 87 },
        ],
      },
    ],
  },
  '4th Year': {
    '4A - Tesla': [
      {
        id: 401,
        title: 'Capstone Project 2',
        progress: '100%',
        students: [
          { name: 'Jon L.', score: 99 },
          { name: 'Kai M.', score: 98 },
          { name: 'Leo N.', score: 100 },
          { name: 'Mia O.', score: 97 },
          { name: 'Noel P.', score: 99 },
        ],
      },
      {
        id: 402,
        title: 'Social & Prof. Issues',
        progress: '95%',
        students: [
          { name: 'Jon L.', score: 92 },
          { name: 'Kai M.', score: 94 },
          { name: 'Leo N.', score: 91 },
          { name: 'Mia O.', score: 93 },
          { name: 'Noel P.', score: 90 },
        ],
      },
      {
        id: 403,
        title: 'Emerging Technologies',
        progress: '90%',
        students: [
          { name: 'Jon L.', score: 96 },
          { name: 'Kai M.', score: 95 },
          { name: 'Leo N.', score: 97 },
          { name: 'Mia O.', score: 94 },
          { name: 'Noel P.', score: 95 },
        ],
      },
    ],
    '4B - NVIDIA': [
      {
        id: 404,
        title: 'Capstone Project 2',
        progress: '95%',
        students: [
          { name: 'Abe R.', score: 88 },
          { name: 'Bea S.', score: 85 },
          { name: 'Cal T.', score: 87 },
          { name: 'Dan U.', score: 89 },
          { name: 'Eve V.', score: 86 },
        ],
      },
      {
        id: 405,
        title: 'Social & Prof. Issues',
        progress: '90%',
        students: [
          { name: 'Abe R.', score: 82 },
          { name: 'Bea S.', score: 80 },
          { name: 'Cal T.', score: 84 },
          { name: 'Dan U.', score: 81 },
          { name: 'Eve V.', score: 83 },
        ],
      },
      {
        id: 406,
        title: 'Emerging Technologies',
        progress: '85%',
        students: [
          { name: 'Abe R.', score: 90 },
          { name: 'Bea S.', score: 88 },
          { name: 'Cal T.', score: 89 },
          { name: 'Dan U.', score: 87 },
          { name: 'Eve V.', score: 91 },
        ],
      },
    ],
  },
};

const COLORS = {
  primary: '#ff4d4d',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  info: '#2563EB',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  card: '#FFFFFF',
  bg: '#F8FAFC',
};

const chartConfig = {
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(255, 77, 77, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
  fillShadowGradient: '#ff4d4d',
  fillShadowGradientOpacity: 1,
  barPercentage: 0.55,
  propsForBackgroundLines: {
    stroke: '#E2E8F0',
    strokeDasharray: '',
  },
  propsForLabels: {
    fontSize: 10,
  },
};

const toNumberProgress = (progress: string): number =>
  Number(progress.replace('%', ''));

const getAverage = (values: number[]): number => {
  if (!values.length) return 0;
  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
  );
};

const getRiskLevel = (avg: number, progress: number): 'High' | 'Moderate' | 'Low' => {
  if (avg < 75 || progress < 60) return 'High';
  if (avg < 85 || progress < 80) return 'Moderate';
  return 'Low';
};

const PerformanceChart = () => {
  const years = Object.keys(academicData);
  const [selectedYear, setSelectedYear] = useState<string>(years[0]);

  const sections = Object.keys(academicData[selectedYear]);
  const [selectedSection, setSelectedSection] = useState<string>(sections[0]);

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setSelectedSection(Object.keys(academicData[year])[0]);
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

    const gradeDistribution = {
      Excellent: allScoresAcrossSelectedYear.filter((score) => score >= 90).length,
      Good: allScoresAcrossSelectedYear.filter(
        (score) => score >= 85 && score < 90
      ).length,
      Average: allScoresAcrossSelectedYear.filter(
        (score) => score >= 75 && score < 85
      ).length,
      Poor: allScoresAcrossSelectedYear.filter((score) => score < 75).length,
    };

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

    return {
      totalStudentsMonitored: allSectionStudents,
      atRiskCount,
      yearComparison,
      sectionComparison,
      subjectTrend,
      gradeDistribution,
    };
  }, [currentSubjects, selectedYear, years]);

  const yearAverageData = useMemo(() => {
    const labels = departmentMetrics.yearComparison.map((item) =>
      item.year.split(' ')[0]
    );
    const values = departmentMetrics.yearComparison.map((item) => item.average);

    return {
      labels,
      datasets: [{ data: values.length ? values : [0] }],
    };
  }, [departmentMetrics.yearComparison]);

  const sectionAverageData = useMemo(() => {
    const labels = departmentMetrics.sectionComparison.map((item) =>
      item.section.replace(' - ', '\n')
    );
    const values = departmentMetrics.sectionComparison.map((item) => item.average);

    return {
      labels,
      datasets: [{ data: values.length ? values : [0] }],
    };
  }, [departmentMetrics.sectionComparison]);

  const subjectTrendData = useMemo(() => {
    const labels = departmentMetrics.subjectTrend.map((item) =>
      item.title.length > 10 ? `${item.title.slice(0, 10)}…` : item.title
    );
    const values = departmentMetrics.subjectTrend.map((item) => item.average);

    return {
      labels,
      datasets: [
        {
          data: values.length ? values : [0],
          strokeWidth: 3,
        },
      ],
      legend: ['Subject Average'],
    };
  }, [departmentMetrics.subjectTrend]);

  const riskPopulationData = useMemo(() => {
    const safeCount =
      departmentMetrics.totalStudentsMonitored - departmentMetrics.atRiskCount;

    return [
      {
        name: 'At-Risk',
        population: Math.max(departmentMetrics.atRiskCount, 0),
        color: COLORS.danger,
        legendFontColor: COLORS.text,
        legendFontSize: 12,
      },
      {
        name: 'Stable',
        population: Math.max(safeCount, 0),
        color: COLORS.success,
        legendFontColor: COLORS.text,
        legendFontSize: 12,
      },
    ].filter((item) => item.population > 0);
  }, [departmentMetrics.atRiskCount, departmentMetrics.totalStudentsMonitored]);

  const gradeDistributionData = useMemo(() => {
    const distribution = departmentMetrics.gradeDistribution;

    return {
      labels: ['Excellent', 'Good', 'Average', 'Poor'],
      datasets: [
        {
          data: [
            distribution.Excellent,
            distribution.Good,
            distribution.Average,
            distribution.Poor,
          ],
        },
      ],
    };
  }, [departmentMetrics.gradeDistribution]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>ADMIN ANALYTICS CHARTS</Text>
      <Text style={styles.title}>Visual Performance Insights</Text>
      <Text style={styles.subtitle}>
        Department-wide charts for year comparison, section performance, subject
        trends, risk population, and grade distribution.
      </Text>

      <View style={styles.filterWrapper}>
        <Text style={styles.filterLabel}>ACADEMIC YEAR</Text>
        <View style={styles.tabRow}>
          {years.map((year) => (
            <TouchableOpacity
              key={year}
              onPress={() => handleYearChange(year)}
              style={[styles.tabItem, selectedYear === year && styles.activeTab]}
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
              onPress={() => setSelectedSection(section)}
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

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Students Monitored</Text>
          <Text style={styles.metricValue}>{departmentMetrics.totalStudentsMonitored}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>At-Risk Population</Text>
          <Text style={[styles.metricValue, { color: COLORS.danger }]}>
            {departmentMetrics.atRiskCount}
          </Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Year-Level Comparison</Text>
        <Text style={styles.chartCaption}>Average performance per year level</Text>
        <BarChart
          data={yearAverageData}
          width={330}
          height={240}
          fromZero
          yAxisLabel=""
          yAxisSuffix="%"
          chartConfig={chartConfig}
          style={styles.chart}
          segments={5}
        />
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Section Comparison</Text>
        <Text style={styles.chartCaption}>Average performance per section</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={sectionAverageData}
            width={Math.max(360, sectionAverageData.labels.length * 90)}
            height={250}
            fromZero
            yAxisLabel=""
            yAxisSuffix="%"
            chartConfig={chartConfig}
            style={styles.chart}
            segments={5}
          />
        </ScrollView>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Subject Difficulty Trend</Text>
        <Text style={styles.chartCaption}>
          Subject averages in the selected section
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={subjectTrendData}
            width={Math.max(360, subjectTrendData.labels.length * 90)}
            height={250}
            fromZero
            yAxisLabel=""
            yAxisSuffix="%"
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            segments={5}
          />
        </ScrollView>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>At-Risk Population</Text>
        <Text style={styles.chartCaption}>
          Distribution of at-risk versus stable students
        </Text>
        <PieChart
          data={
            riskPopulationData.length
              ? riskPopulationData
              : [
                  {
                    name: 'No Data',
                    population: 1,
                    color: '#CBD5E1',
                    legendFontColor: COLORS.text,
                    legendFontSize: 12,
                  },
                ]
          }
          width={330}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="18"
          absolute
        />
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Grade Distribution</Text>
        <Text style={styles.chartCaption}>
          Excellent, good, average, and poor grade bands
        </Text>
        <BarChart
          data={yearAverageData}
          width={330}
          height={240}
          fromZero
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={chartConfig}
          style={styles.chart}
          segments={5}
        />
      </View>

      <View style={styles.listCard}>
        <Text style={styles.chartTitle}>Selected Section Subject Snapshot</Text>
        <Text style={styles.chartCaption}>
          Current risk and progress per subject
        </Text>

        {departmentMetrics.subjectTrend.map((subject) => (
          <View key={subject.title} style={styles.subjectRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.subjectTitle}>{subject.title}</Text>
              <Text style={styles.subjectMeta}>
                Avg {subject.average}% • Progress {subject.progress}%
              </Text>
            </View>

            <View
              style={[
                styles.badge,
                subject.riskLevel === 'High'
                  ? styles.badgeDanger
                  : subject.riskLevel === 'Moderate'
                  ? styles.badgeWarning
                  : styles.badgeSuccess,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  subject.riskLevel === 'High'
                    ? styles.badgeTextDanger
                    : subject.riskLevel === 'Moderate'
                    ? styles.badgeTextWarning
                    : styles.badgeTextSuccess,
                ]}
              >
                {subject.riskLevel}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default PerformanceChart;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.muted,
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
    color: COLORS.primary,
  },

  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  metricCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },

  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  chartTitle: {
    alignSelf: 'flex-start',
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  chartCaption: {
    alignSelf: 'flex-start',
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 12,
  },
  chart: {
    borderRadius: 16,
  },

  listCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  subjectTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  subjectMeta: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeDanger: {
    backgroundColor: '#FEE2E2',
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  badgeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  badgeTextDanger: {
    color: COLORS.danger,
  },
  badgeTextWarning: {
    color: '#D97706',
  },
  badgeTextSuccess: {
    color: COLORS.success,
  },
});