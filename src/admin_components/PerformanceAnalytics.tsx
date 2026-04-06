import React, { useState } from 'react';
import { DimensionValue, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Updated Data: Students are consistent within a section across all subjects
const academicData: any = {
  '1st Year': {
    '1A - Microsoft': [
      { 
        id: 101, title: 'Introduction to Computing', progress: '95%', 
        students: [{ name: 'Alice Tan', score: 95 }, { name: 'Bob Reyes', score: 92 }, { name: 'Charlie Day', score: 88 }, { name: 'Daisy Go', score: 91 }, { name: 'Ethan Sy', score: 94 }] 
      },
      { 
        id: 102, title: 'Computer Programming 1', progress: '88%', 
        students: [{ name: 'Alice Tan', score: 82 }, { name: 'Bob Reyes', score: 78 }, { name: 'Charlie Day', score: 80 }, { name: 'Daisy Go', score: 75 }, { name: 'Ethan Sy', score: 70 }] 
      },
      { 
        id: 103, title: 'Discrete Mathematics', progress: '90%', 
        students: [{ name: 'Alice Tan', score: 88 }, { name: 'Bob Reyes', score: 85 }, { name: 'Charlie Day', score: 82 }, { name: 'Daisy Go', score: 80 }, { name: 'Ethan Sy', score: 77 }] 
      }
    ],
    '1B - Apple': [
      { 
        id: 104, title: 'Introduction to Computing', progress: '92%', 
        students: [{ name: 'Liam N.', score: 90 }, { name: 'Emma W.', score: 88 }, { name: 'Noah S.', score: 85 }, { name: 'Olivia H.', score: 82 }, { name: 'James B.', score: 85 }] 
      },
      { 
        id: 105, title: 'Computer Programming 1', progress: '80%', 
        students: [{ name: 'Liam N.', score: 75 }, { name: 'Emma W.', score: 72 }, { name: 'Noah S.', score: 78 }, { name: 'Olivia H.', score: 70 }, { name: 'James B.', score: 74 }] 
      },
      { 
        id: 106, title: 'Discrete Mathematics', progress: '85%', 
        students: [{ name: 'Liam N.', score: 80 }, { name: 'Emma W.', score: 82 }, { name: 'Noah S.', score: 84 }, { name: 'Olivia H.', score: 78 }, { name: 'James B.', score: 81 }] 
      }
    ]
  },
  '2nd Year': {
    '2A - Google': [
      { 
        id: 201, title: 'Data Structures', progress: '75%', 
        students: [{ name: 'Ben J.', score: 98 }, { name: 'Clara M.', score: 96 }, { name: 'Dan K.', score: 95 }, { name: 'Eva L.', score: 94 }, { name: 'Fred P.', score: 97 }] 
      },
      { 
        id: 202, title: 'Networking 1', progress: '70%', 
        students: [{ name: 'Ben J.', score: 85 }, { name: 'Clara M.', score: 82 }, { name: 'Dan K.', score: 88 }, { name: 'Eva L.', score: 84 }, { name: 'Fred P.', score: 86 }] 
      },
      { 
        id: 203, title: 'Object Oriented Prog', progress: '82%', 
        students: [{ name: 'Ben J.', score: 90 }, { name: 'Clara M.', score: 91 }, { name: 'Dan K.', score: 89 }, { name: 'Eva L.', score: 92 }, { name: 'Fred P.', score: 88 }] 
      }
    ],
    '2B - Meta': [
      { 
        id: 204, title: 'Data Structures', progress: '72%', 
        students: [{ name: 'Quinn S.', score: 75 }, { name: 'Rose T.', score: 78 }, { name: 'Seth U.', score: 72 }, { name: 'Tara V.', score: 74 }, { name: 'Ugo W.', score: 70 }] 
      },
      { 
        id: 205, title: 'Networking 1', progress: '65%', 
        students: [{ name: 'Quinn S.', score: 80 }, { name: 'Rose T.', score: 82 }, { name: 'Seth U.', score: 79 }, { name: 'Tara V.', score: 81 }, { name: 'Ugo W.', score: 78 }] 
      },
      { 
        id: 206, title: 'Object Oriented Prog', progress: '78%', 
        students: [{ name: 'Quinn S.', score: 85 }, { name: 'Rose T.', score: 84 }, { name: 'Seth U.', score: 86 }, { name: 'Tara V.', score: 83 }, { name: 'Ugo W.', score: 87 }] 
      }
    ]
  },
  '3rd Year': {
    '3A - Amazon': [
      { 
        id: 301, title: 'Information Assurance', progress: '60%', 
        students: [{ name: 'Flo H.', score: 92 }, { name: 'Gus I.', score: 94 }, { name: 'Hope J.', score: 91 }, { name: 'Ian K.', score: 93 }, { name: 'Joy L.', score: 90 }] 
      },
      { 
        id: 302, title: 'System Integration', progress: '55%', 
        students: [{ name: 'Flo H.', score: 88 }, { name: 'Gus I.', score: 86 }, { name: 'Hope J.', score: 87 }, { name: 'Ian K.', score: 89 }, { name: 'Joy L.', score: 85 }] 
      },
      { 
        id: 303, title: 'Database Management 2', progress: '65%', 
        students: [{ name: 'Flo H.', score: 95 }, { name: 'Gus I.', score: 92 }, { name: 'Hope J.', score: 94 }, { name: 'Ian K.', score: 91 }, { name: 'Joy L.', score: 93 }] 
      }
    ],
    '3B - Oracle': [
      { 
        id: 304, title: 'Information Assurance', progress: '58%', 
        students: [{ name: 'Uma W.', score: 80 }, { name: 'Val X.', score: 82 }, { name: 'Wes Y.', score: 78 }, { name: 'Xander Z.', score: 79 }, { name: 'Yolanda A.', score: 81 }] 
      },
      { 
        id: 305, title: 'System Integration', progress: '50%', 
        students: [{ name: 'Uma W.', score: 75 }, { name: 'Val X.', score: 77 }, { name: 'Wes Y.', score: 74 }, { name: 'Xander Z.', score: 76 }, { name: 'Yolanda A.', score: 73 }] 
      },
      { 
        id: 306, title: 'Database Management 2', progress: '62%', 
        students: [{ name: 'Uma W.', score: 85 }, { name: 'Val X.', score: 83 }, { name: 'Wes Y.', score: 86 }, { name: 'Xander Z.', score: 84 }, { name: 'Yolanda A.', score: 87 }] 
      }
    ]
  },
  '4th Year': {
    '4A - Tesla': [
      { 
        id: 401, title: 'Capstone Project 2', progress: '100%', 
        students: [{ name: 'Jon L.', score: 99 }, { name: 'Kai M.', score: 98 }, { name: 'Leo N.', score: 100 }, { name: 'Mia O.', score: 97 }, { name: 'Noel P.', score: 99 }] 
      },
      { 
        id: 402, title: 'Social & Prof. Issues', progress: '95%', 
        students: [{ name: 'Jon L.', score: 92 }, { name: 'Kai M.', score: 94 }, { name: 'Leo N.', score: 91 }, { name: 'Mia O.', score: 93 }, { name: 'Noel P.', score: 90 }] 
      },
      { 
        id: 403, title: 'Emerging Technologies', progress: '90%', 
        students: [{ name: 'Jon L.', score: 96 }, { name: 'Kai M.', score: 95 }, { name: 'Leo N.', score: 97 }, { name: 'Mia O.', score: 94 }, { name: 'Noel P.', score: 95 }] 
      }
    ],
    '4B - NVIDIA': [
      { 
        id: 404, title: 'Capstone Project 2', progress: '95%', 
        students: [{ name: 'Abe R.', score: 88 }, { name: 'Bea S.', score: 85 }, { name: 'Cal T.', score: 87 }, { name: 'Dan U.', score: 89 }, { name: 'Eve V.', score: 86 }] 
      },
      { 
        id: 405, title: 'Social & Prof. Issues', progress: '90%', 
        students: [{ name: 'Abe R.', score: 82 }, { name: 'Bea S.', score: 80 }, { name: 'Cal T.', score: 84 }, { name: 'Dan U.', score: 81 }, { name: 'Eve V.', score: 83 }] 
      },
      { 
        id: 406, title: 'Emerging Technologies', progress: '85%', 
        students: [{ name: 'Abe R.', score: 90 }, { name: 'Bea S.', score: 88 }, { name: 'Cal T.', score: 89 }, { name: 'Dan U.', score: 87 }, { name: 'Eve V.', score: 91 }] 
      }
    ]
  }
};

export const PerformanceAnalytics = () => {
  const [selectedYear, setSelectedYear] = useState('1st Year');
  const years = Object.keys(academicData);
  const sections = Object.keys(academicData[selectedYear]);
  const [selectedSection, setSelectedSection] = useState(sections[0]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setSelectedSection(Object.keys(academicData[year])[0]);
    setExpandedId(null);
  };

  const calculateMeanGrade = (students: any[]) => {
    const total = students.reduce((sum, s) => sum + s.score, 0);
    const avg = total / students.length;
    
    if (avg >= 97) return "1.00";
    if (avg >= 94) return "1.25";
    if (avg >= 91) return "1.50";
    if (avg >= 88) return "1.75";
    if (avg >= 85) return "2.00";
    if (avg >= 80) return "2.25";
    if (avg >= 75) return "3.00";
    return "5.00";
  };

  const currentSubjects = academicData[selectedYear][selectedSection];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* YEAR TABS */}
      <View style={styles.filterWrapper}>
        <Text style={styles.filterLabel}>ACADEMIC YEAR</Text>
        <View style={styles.tabRow}>
          {years.map(y => (
            <TouchableOpacity key={y} onPress={() => handleYearChange(y)} 
              style={[styles.tabItem, selectedYear === y && styles.activeTab]}>
              <Text style={[styles.tabText, selectedYear === y && styles.activeTabText]}>{y.split(' ')[0]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* SECTION TABS */}
      <View style={styles.filterWrapper}>
        <Text style={styles.filterLabel}>BSIT SECTION</Text>
        <View style={styles.tabRow}>
          {sections.map(s => (
            <TouchableOpacity key={s} onPress={() => {setSelectedSection(s); setExpandedId(null);}} 
              style={[styles.secItem, selectedSection === s && styles.activeSec]}>
              <Text style={[styles.secText, selectedSection === s && styles.activeSecText]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* SUBJECT CARDS */}
      {currentSubjects.map((subject: any) => {
        const isExpanded = expandedId === subject.id;
        const meanGrade = calculateMeanGrade(subject.students);

        return (
          <View key={subject.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{subject.title}</Text>
              <Text style={styles.subText}>{selectedSection} • Analytics</Text>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: subject.progress as DimensionValue }]} />
              </View>
              <Text style={styles.progressText}>Subject Progress: {subject.progress}</Text>
            </View>

            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.gradeLabel}>MEAN GRADE</Text>
                <Text style={styles.gradeValue}>{meanGrade}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setExpandedId(isExpanded ? null : subject.id)}
                style={[styles.actionBtn, isExpanded && styles.activeActionBtn]}>
                <Text style={[styles.actionBtnText, isExpanded && styles.activeActionBtnText]}>
                  {isExpanded ? 'Hide Details' : 'View Students'}
                </Text>
              </TouchableOpacity>
            </View>

            {isExpanded && (
              <View style={styles.studentList}>
                <Text style={styles.listTitle}>Enrolled Student Performance</Text>
                {subject.students.map((student: any, idx: number) => (
                  <View key={idx} style={styles.studentRow}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentScore}>{student.score}%</Text>
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
  container: { flex: 1, padding: 20, backgroundColor: '#F8FAFC' },
  filterWrapper: { marginBottom: 15 },
  filterLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', marginBottom: 8, letterSpacing: 1 },
  tabRow: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 10, padding: 4 },
  tabItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#1E293B' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  activeTabText: { color: '#FFF' },
  secItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  activeSec: { backgroundColor: '#FFF', elevation: 2 },
  secText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  activeSecText: { color: '#ff4d4d' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 15, elevation: 3, borderLeftWidth: 5, borderLeftColor: '#ff4d4d' },
  cardHeader: { marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  subText: { fontSize: 11, color: '#94A3B8' },
  progressContainer: { marginBottom: 15 },
  progressBarBg: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, marginBottom: 5 },
  progressBarFill: { height: 6, backgroundColor: '#ff4d4d', borderRadius: 3 },
  progressText: { fontSize: 10, color: '#64748B' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gradeLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '900' },
  gradeValue: { color: '#1E293B', fontSize: 24, fontWeight: '800' },
  actionBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  activeActionBtn: { backgroundColor: '#1E293B', borderColor: '#1E293B' },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: '#1E293B' },
  activeActionBtnText: { color: '#FFF' },
  studentList: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  listTitle: { fontSize: 11, fontWeight: '800', color: '#94A3B8', marginBottom: 10, textTransform: 'uppercase' },
  studentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingVertical: 2 },
  studentName: { fontSize: 13, color: '#334155' },
  studentScore: { fontSize: 13, fontWeight: '700', color: '#ff4d4d' }
});