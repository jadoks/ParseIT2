import React, { useMemo } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

type GradeRecord = {
  term: string;
  grade: number; // 0-100
};

type Student = {
  id: string;
  name: string;
  grades: GradeRecord[]; // chronological order
};

// Sample/mock data — replace with real data source as needed
const SAMPLE_STUDENTS: Student[] = [
  { id: 's1', name: 'Alice Ramos', grades: [
    { term: 'T1', grade: 78 }, { term: 'T2', grade: 74 }, { term: 'T3', grade: 69 }
  ]},
  { id: 's2', name: 'Ben Cruz', grades: [
    { term: 'T1', grade: 92 }, { term: 'T2', grade: 88 }, { term: 'T3', grade: 90 }
  ]},
  { id: 's3', name: 'Carla Mendoza', grades: [
    { term: 'T1', grade: 61 }, { term: 'T2', grade: 58 }, { term: 'T3', grade: 55 }
  ]},
  { id: 's4', name: 'David Lee', grades: [
    { term: 'T1', grade: 45 }, { term: 'T2', grade: 48 }, { term: 'T3', grade: 47 }
  ]},
  { id: 's5', name: 'Ella Santos', grades: [
    { term: 'T1', grade: 80 }, { term: 'T2', grade: 78 }, { term: 'T3', grade: 76 }
  ]},
];

// Utilities
const average = (arr: number[]) => arr.reduce((s, x) => s + x, 0) / (arr.length || 1);

// Simple linear regression slope and intercept for (x = index, y = grade)
const linearRegression = (y: number[]) => {
  const n = y.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  const xMean = (n - 1) / 2; // mean of [0..n-1]
  const yMean = average(y);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - xMean;
    num += dx * (y[i] - yMean);
    den += dx * dx;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
};

const detectAtRisk = (grades: GradeRecord[]) => {
  const values = grades.map(g => g.grade);
  const avg = average(values);
  const { slope } = linearRegression(values);
  const latest = values[values.length - 1] ?? 0;

  // Heuristics for at-risk:
  // - average below 60
  // - OR consistent decline (negative slope) and latest < 70
  const lowAverage = avg < 60;
  const declining = slope < -0.5 && latest < 70;
  return { lowAverage, declining, avg, slope, latest };
};

const forecastNext = (grades: GradeRecord[]) => {
  const values = grades.map(g => g.grade);
  const { slope, intercept } = linearRegression(values);
  const nextIndex = values.length; // predict for next term
  const predicted = slope * nextIndex + intercept;
  return Math.max(0, Math.min(100, predicted));
};

const Analytics = () => {
  const students = SAMPLE_STUDENTS;

  const enriched = useMemo(() => {
    return students.map(s => {
      const { lowAverage, declining, avg, slope, latest } = detectAtRisk(s.grades);
      const forecast = forecastNext(s.grades);
      const status = lowAverage || declining ? 'At Risk' : 'OK';
      const riskReason = lowAverage ? 'Low average' : (declining ? 'Declining grades' : 'Good standing');
      return { ...s, avg: Math.round(avg * 10) / 10, slope: Math.round(slope * 10) / 10, latest, forecast: Math.round(forecast * 10) / 10, status, riskReason };
    }).sort((a, b) => (a.status === 'At Risk' ? -1 : 1));
  }, [students]);

  const total = enriched.length;
  const atRiskCount = enriched.filter(s => s.status === 'At Risk').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>Converts raw grade data into meaningful insights to identify at-risk students and forecast potential academic difficulties.</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryNumber}>{total}</Text>
          <Text style={styles.summaryLabel}>Students</Text>
        </View>
        <View style={[styles.summaryBox, styles.riskBox]}>
          <Text style={styles.summaryNumber}>{atRiskCount}</Text>
          <Text style={styles.summaryLabel}>At-Risk</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Student Insights</Text>

      <FlatList
        data={enriched}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.card, item.status === 'At Risk' && styles.cardRisk]}>
            <View style={styles.cardHeader}>
              <Text style={styles.studentName}>{item.name}</Text>
              <Text style={styles.status}>{item.status}</Text>
            </View>
            <Text style={styles.meta}>Avg: {item.avg} • Latest: {item.latest} • Forecast: {item.forecast}</Text>
            <Text style={styles.reason}>{item.riskReason}</Text>

            <View style={styles.sparklineRow}>
              {item.grades.map((g, i) => (
                <View key={i} style={[styles.bar, { height: Math.max(6, g.grade / 2) }]} />
              ))}
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: '#666', marginBottom: 18 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  summaryBox: { flex: 1, backgroundColor: '#f7f7f7', padding: 12, borderRadius: 10, alignItems: 'center' },
  riskBox: { backgroundColor: '#ffe9e9' },
  summaryNumber: { fontSize: 22, fontWeight: '700' },
  summaryLabel: { color: '#666' },
  sectionTitle: { marginTop: 6, marginBottom: 12, fontSize: 18, fontWeight: '600' },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  cardRisk: { borderColor: '#f5c6c6', backgroundColor: '#fff5f5' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  studentName: { fontSize: 16, fontWeight: '700' },
  status: { fontWeight: '700', color: '#d32f2f' },
  meta: { color: '#666', marginBottom: 6 },
  reason: { color: '#444', marginBottom: 8 },
  sparklineRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bar: { width: 10, backgroundColor: '#e53935', borderRadius: 4, marginRight: 6 },
});

export default Analytics;
