import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';

// --- DATA BLOCK ---
const academicData: any = {
  '1st Year': {
    '1A - Amazon': [
      { id: 101, title: 'Intro to Computing', students: [{ name: 'Alice Tan', score: 95 }, { name: 'Bob Reyes', score: 92 }, { name: 'Charlie Day', score: 88 }, { name: 'Daisy Go', score: 91 }, { name: 'Ethan Sy', score: 94 }] },
      { id: 102, title: 'Programming 1', students: [{ name: 'Alice Tan', score: 82 }, { name: 'Bob Reyes', score: 78 }, { name: 'Charlie Day', score: 80 }, { name: 'Daisy Go', score: 75 }, { name: 'Ethan Sy', score: 70 }] },
      { id: 103, title: 'Discrete Math', students: [{ name: 'Alice Tan', score: 88 }, { name: 'Bob Reyes', score: 85 }, { name: 'Charlie Day', score: 82 }, { name: 'Daisy Go', score: 80 }, { name: 'Ethan Sy', score: 77 }] }
    ],
    '1B - Microsoft': [
      { id: 104, title: 'Intro to Computing', students: [{ name: 'Liam N.', score: 90 }, { name: 'Emma W.', score: 88 }, { name: 'Noah S.', score: 85 }, { name: 'Olivia H.', score: 82 }, { name: 'James B.', score: 85 }] },
      { id: 105, title: 'Programming 1', students: [{ name: 'Liam N.', score: 75 }, { name: 'Emma W.', score: 72 }, { name: 'Noah S.', score: 78 }, { name: 'Olivia H.', score: 70 }, { name: 'James B.', score: 74 }] },
      { id: 106, title: 'Discrete Math', students: [{ name: 'Liam N.', score: 80 }, { name: 'Emma W.', score: 82 }, { name: 'Noah S.', score: 84 }, { name: 'Olivia H.', score: 78 }, { name: 'James B.', score: 81 }] }
    ]
  },
  '2nd Year': {
    '2A - Google': [
      { id: 201, title: 'Data Structures', students: [{ name: 'Ben J.', score: 98 }, { name: 'Clara M.', score: 96 }, { name: 'Dan K.', score: 95 }, { name: 'Eva L.', score: 94 }, { name: 'Fred P.', score: 97 }] },
      { id: 202, title: 'Networking 1', students: [{ name: 'Ben J.', score: 85 }, { name: 'Clara M.', score: 82 }, { name: 'Dan K.', score: 88 }, { name: 'Eva L.', score: 84 }, { name: 'Fred P.', score: 86 }] },
      { id: 203, title: 'OOP', students: [{ name: 'Ben J.', score: 90 }, { name: 'Clara M.', score: 91 }, { name: 'Dan K.', score: 89 }, { name: 'Eva L.', score: 92 }, { name: 'Fred P.', score: 88 }] }
    ],
    '2B - Apple': [
      { id: 204, title: 'Data Structures', students: [{ name: 'Quinn S.', score: 75 }, { name: 'Rose T.', score: 78 }, { name: 'Seth U.', score: 72 }, { name: 'Tara V.', score: 74 }, { name: 'Ugo W.', score: 70 }] },
      { id: 205, title: 'Networking 1', students: [{ name: 'Quinn S.', score: 80 }, { name: 'Rose T.', score: 82 }, { name: 'Seth U.', score: 79 }, { name: 'Tara V.', score: 81 }, { name: 'Ugo W.', score: 78 }] },
      { id: 206, title: 'OOP', students: [{ name: 'Quinn S.', score: 85 }, { name: 'Rose T.', score: 84 }, { name: 'Seth U.', score: 86 }, { name: 'Tara V.', score: 83 }, { name: 'Ugo W.', score: 87 }] }
    ]
  },
  '3rd Year': {
    '3A - Meta': [
      { id: 301, title: 'Info Assurance', students: [{ name: 'Flo H.', score: 92 }, { name: 'Gus I.', score: 94 }, { name: 'Hope J.', score: 91 }, { name: 'Ian K.', score: 93 }, { name: 'Joy L.', score: 90 }] },
      { id: 302, title: 'Sys Integration', students: [{ name: 'Flo H.', score: 88 }, { name: 'Gus I.', score: 86 }, { name: 'Hope J.', score: 87 }, { name: 'Ian K.', score: 89 }, { name: 'Joy L.', score: 85 }] },
      { id: 303, title: 'Database 2', students: [{ name: 'Flo H.', score: 95 }, { name: 'Gus I.', score: 92 }, { name: 'Hope J.', score: 94 }, { name: 'Ian K.', score: 91 }, { name: 'Joy L.', score: 93 }] }
    ],
    '3B - Oracle': [
      { id: 304, title: 'Info Assurance', students: [{ name: 'Uma W.', score: 80 }, { name: 'Val X.', score: 82 }, { name: 'Wes Y.', score: 78 }, { name: 'Xander Z.', score: 79 }, { name: 'Yolanda A.', score: 81 }] },
      { id: 305, title: 'Sys Integration', students: [{ name: 'Uma W.', score: 75 }, { name: 'Val X.', score: 77 }, { name: 'Wes Y.', score: 74 }, { name: 'Xander Z.', score: 76 }, { name: 'Yolanda A.', score: 73 }] },
      { id: 306, title: 'Database 2', students: [{ name: 'Uma W.', score: 85 }, { name: 'Val X.', score: 83 }, { name: 'Wes Y.', score: 86 }, { name: 'Xander Z.', score: 84 }, { name: 'Yolanda A.', score: 87 }] }
    ]
  },
  '4th Year': {
    '4A - Tesla': [
      { id: 401, title: 'Capstone 2', students: [{ name: 'Jon L.', score: 99 }, { name: 'Kai M.', score: 98 }, { name: 'Leo N.', score: 100 }, { name: 'Mia O.', score: 97 }, { name: 'Noel P.', score: 99 }] },
      { id: 402, title: 'Social Issues', students: [{ name: 'Jon L.', score: 92 }, { name: 'Kai M.', score: 94 }, { name: 'Leo N.', score: 91 }, { name: 'Mia O.', score: 93 }, { name: 'Noel P.', score: 90 }] },
      { id: 403, title: 'Emerging Tech', students: [{ name: 'Jon L.', score: 96 }, { name: 'Kai M.', score: 95 }, { name: 'Leo N.', score: 97 }, { name: 'Mia O.', score: 94 }, { name: 'Noel P.', score: 95 }] }
    ],
    '4B - NVIDIA': [
      { id: 404, title: 'Capstone 2', students: [{ name: 'Abe R.', score: 88 }, { name: 'Bea S.', score: 85 }, { name: 'Cal T.', score: 87 }, { name: 'Dan U.', score: 89 }, { name: 'Eve V.', score: 86 }] },
      { id: 405, title: 'Social Issues', students: [{ name: 'Abe R.', score: 82 }, { name: 'Bea S.', score: 80 }, { name: 'Cal T.', score: 84 }, { name: 'Dan U.', score: 81 }, { name: 'Eve V.', score: 83 }] },
      { id: 406, title: 'Emerging Tech', students: [{ name: 'Abe R.', score: 90 }, { name: 'Bea S.', score: 88 }, { name: 'Cal T.', score: 89 }, { name: 'Dan U.', score: 87 }, { name: 'Eve V.', score: 91 }] }
    ]
  }
};

// Distinct color palettes per Year Level
const YEAR_PALETTES: any = {
  '1st Year': ['#0EA5E9', '#0284C7', '#0369A1'], // Blues
  '2nd Year': ['#10B981', '#059669', '#047857'], // Greens
  '3rd Year': ['#F59E0B', '#D97706', '#B45309'], // Oranges/Ambers
  '4th Year': ['#8B5CF6', '#7C3AED', '#6D28D9'], // Purples
};

const RenderDetailedBar = ({ value, label, index, yearKey }: { value: number, label: string, index: number, yearKey: string }) => {
  const heightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: value,
      duration: 1200,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: false,
    }).start();
  }, [value]);

  const getGPA = (v: number) => {
    if (v >= 97) return "1.00";
    if (v >= 94) return "1.25";
    if (v >= 91) return "1.50";
    if (v >= 88) return "1.75";
    if (v >= 85) return "2.00";
    if (v >= 80) return "2.25";
    return "3.00";
  };

  // Get color based on year palette
  const yearColors = YEAR_PALETTES[yearKey] || ['#64748B'];
  const barColor = yearColors[index % yearColors.length];

  return (
    <View style={styles.barColumn}>
      <View style={styles.barTrack}>
        <Animated.View 
          style={[
            styles.barFill, 
            { 
              height: heightAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              backgroundColor: barColor 
            }
          ]} 
        >
          <View style={styles.textContainer}>
            <Text style={styles.barLabelText}>{value}%</Text>
            <Text style={styles.barSubText}>{getGPA(value)}</Text>
          </View>
        </Animated.View>
      </View>
      <Text style={styles.xAxisLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
};

export const PerformanceChart = () => {
  const years = Object.keys(academicData);

  const getMergedSubjectData = (year: string) => {
    const sections = academicData[year];
    const subjectsMap: any = {};

    Object.values(sections).forEach((subjList: any) => {
      subjList.forEach((subj: any) => {
        if (!subjectsMap[subj.title]) subjectsMap[subj.title] = { sum: 0, count: 0 };
        subj.students.forEach((s: any) => {
          subjectsMap[subj.title].sum += s.score;
          subjectsMap[subj.title].count++;
        });
      });
    });

    return Object.keys(subjectsMap).map(key => ({
      title: key,
      avg: Math.round(subjectsMap[key].sum / subjectsMap[key].count)
    }));
  };

  const getYearSummary = (subjectData: any[]) => {
    const totalAvg = subjectData.reduce((acc, curr) => acc + curr.avg, 0) / subjectData.length;
    let status = "Excellent";
    let remark = "Students demonstrate deep technical understanding.";
    
    if (totalAvg < 85) {
      status = "Developing";
      remark = "Foundational skills are solid; focus on advanced implementation.";
    } else if (totalAvg < 92) {
      status = "Proficient";
      remark = "Strong consistent performance across the curriculum.";
    }

    return { avg: totalAvg.toFixed(1), status, remark };
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.mainTitle}>BSIT Subject Statistics</Text>
      <Text style={styles.mainSub}>Detailed mean summation (Section A + B Combined)</Text>

      {years.map((year, idx) => {
        const subjectData = getMergedSubjectData(year);
        const summary = getYearSummary(subjectData);

        return (
          <View key={idx} style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.cardYearTitle}>{year}</Text>
              <View style={[styles.statusBadge, { backgroundColor: summary.status === 'Excellent' ? '#DCFCE7' : '#F1F5F9' }]}>
                <Text style={[styles.statusText, { color: summary.status === 'Excellent' ? '#166534' : '#475569' }]}>{summary.status}</Text>
              </View>
            </View>
            
            <View style={styles.graphLayout}>
              <View style={styles.yAxis}>
                {['100', '75', '50', '25', '0'].map((tick, i) => (
                  <Text key={i} style={styles.yText}>{tick}%</Text>
                ))}
              </View>

              <View style={styles.chartFrame}>
                <View style={styles.barsContainer}>
                  {subjectData.map((item, i) => (
                    <RenderDetailedBar key={i} value={item.avg} label={item.title} index={i} yearKey={year} />
                  ))}
                </View>
              </View>
            </View>

            {/* Year Summary Section */}
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Academic Summary</Text>
              <Text style={styles.summaryText}>
                The overall average is <Text style={styles.boldText}>{summary.avg}%</Text>. {summary.remark}
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9', padding: 15 },
  mainTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', textAlign: 'center', marginTop: 10 },
  mainSub: { fontSize: 11, color: '#64748B', textAlign: 'center', marginBottom: 25 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardYearTitle: { fontSize: 14, fontWeight: '800', color: '#334155', textTransform: 'uppercase', letterSpacing: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  graphLayout: { flexDirection: 'row', height: 200 },
  yAxis: { justifyContent: 'space-between', paddingRight: 10, paddingBottom: 40, alignItems: 'flex-end' },
  yText: { fontSize: 10, color: '#94A3B8', fontWeight: '700' },
  chartFrame: { flex: 1, borderLeftWidth: 1.5, borderBottomWidth: 1.5, borderColor: '#CBD5E1', paddingLeft: 5 },
  barsContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  barColumn: { width: '28%', alignItems: 'center', height: '100%' },
  barTrack: { width: '60%', height: '100%', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6, alignItems: 'center', paddingTop: 6 },
  textContainer: { alignItems: 'center' },
  barLabelText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  barSubText: { color: 'rgba(255,255,255,0.85)', fontSize: 8, fontWeight: '700', marginTop: 1 },
  xAxisLabel: { fontSize: 9, color: '#475569', fontWeight: '800', textAlign: 'center', marginTop: 10, height: 30 },
  summaryContainer: { marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  summaryTitle: { fontSize: 11, fontWeight: '900', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 },
  summaryText: { fontSize: 12, color: '#334155', lineHeight: 18 },
  boldText: { fontWeight: '800', color: '#0F172A' }
});