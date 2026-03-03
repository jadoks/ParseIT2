import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const Grades = () => {
  const [studentId, setStudentId] = useState('');
  const [showGrades, setShowGrades] = useState(false);

  // Sample data based on your screenshot for "Lagoy, Stephanie Jane"
  const gradeData = [
    { code: 'AP 1', desc: 'Multimedia', unit: '3.0', grade: '1.4' },
    { code: 'CC 111', desc: 'Introduction to Computing', unit: '3.0', grade: '2.0' },
    { code: 'CC 112', desc: 'Programming 1 (Lecture)', unit: '2.0', grade: '1.4' },
    { code: 'CC 112L', desc: 'Programming 1 (Laboratory)', unit: '3.0', grade: '1.4' },
    { code: 'GEC-MMW', desc: 'Mathematics in the Modern World', unit: '3.0', grade: '1.6' },
    { code: 'GEC-RPH', desc: 'Readings in Philippine History', unit: '3.0', grade: '1.6' },
    { code: 'GEE-TEM', desc: 'The Entrepreneurial Mind', unit: '3.0', grade: '1.9' },
    { code: 'NSTP 1', desc: 'National Service Training Program 1', unit: '3.0', grade: '1.3' },
    { code: 'PATHFIT 1', desc: 'Physical Activities Towards Health and Fitness 1', unit: '2.0', grade: '1.1' },
  ];

  return (
    <View style={styles.screen}>
      {/* Header Area */}
      <View style={styles.headerRow}>
        <TouchableOpacity>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>View Student Grades</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Selection Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderText}>Search Parameters</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.inputRow}>
              <View style={[styles.input, styles.dropdownPlaceholder]}>
                <Text style={styles.subText}>S.Y. 2021 - 2022</Text>
                <Ionicons name="chevron-down" size={16} color="#666" />
              </View>
              <View style={[styles.input, styles.dropdownPlaceholder]}>
                <Text style={styles.subText}>First Semester</Text>
                <Ionicons name="chevron-down" size={16} color="#666" />
              </View>
            </View>

            <TextInput
              placeholder="Search Student ID"
              value={studentId}
              onChangeText={setStudentId}
              style={[styles.input, { marginBottom: 15 }]}
              keyboardType="numeric"
            />

            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => setShowGrades(true)}
            >
              <Text style={styles.buttonText}>Show My Journey</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Grades Result Section */}
        {showGrades && (
          <View style={styles.reportCard}>
            {/* Header branding similar to the screenshot */}
            <View style={styles.reportHeader}>
               <Text style={styles.uniName}>Republic of the Philippines</Text>
               <Text style={styles.uniBranch}>CEBU TECHNOLOGICAL UNIVERSITY</Text>
               <Text style={styles.uniAddress}>ARGAO CAMPUS</Text>
            </View>

            <View style={styles.studentInfoBox}>
              <Text style={styles.infoText}>Student ID: 7210714</Text>
              <Text style={styles.infoText}>Student Name: Lagoy, Stephanie Jane</Text>
              <Text style={styles.infoText}>School Year: S.Y. 2021 - 2022 (First Semester)</Text>
            </View>

            {/* Grades Table */}
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { width: 60 }]}>Subject</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Description</Text>
                <Text style={[styles.tableHeaderText, { width: 35 }]}>Unit</Text>
                <Text style={[styles.tableHeaderText, { width: 40 }]}>Grade</Text>
              </View>

              {gradeData.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.cellText, { width: 60 }]}>{item.code}</Text>
                  <Text style={[styles.cellText, { flex: 1 }]}>{item.desc}</Text>
                  <Text style={[styles.cellText, { width: 35, textAlign: 'center' }]}>{item.unit}</Text>
                  <Text style={[styles.cellText, { width: 40, textAlign: 'center', fontWeight: 'bold' }]}>{item.grade}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={[styles.primaryButton, { marginTop: 20 }]}>
              <Text style={styles.buttonText}>Get Link</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginLeft: 15,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    marginBottom: 20,
  },
  cardHeader: {
    backgroundColor: '#fff2f2',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cardHeaderText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#D32F2F',
  },
  cardContent: {
    padding: 15,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 45,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  dropdownPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryButton: {
    backgroundColor: '#D32F2F',
    height: 48,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  subText: {
    color: '#444',
    fontSize: 13,
  },
  /* Report Card Styling */
  reportCard: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 15,
    borderRadius: 4,
  },
  reportHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  uniName: { fontSize: 10, color: '#333' },
  uniBranch: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  uniAddress: { fontSize: 9, color: '#555' },
  studentInfoBox: {
    marginBottom: 15,
  },
  infoText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: '#000',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#D32F2F',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  tableHeaderText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#666',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  cellText: {
    fontSize: 9,
    color: '#000',
    paddingHorizontal: 2,
  },
});

export default Grades;