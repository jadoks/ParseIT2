import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const JourneyHeader = require('../../assets/images/myjourney-header-template-1.png');

const Grades = () => {
  const [studentId, setStudentId] = useState('');
  const [showGrades, setShowGrades] = useState(false);

  const gradeData = [
    { code: 'AP 1', desc: 'Multimedia', unit: 3.0, grade: 1.4 },
    { code: 'CC 111', desc: 'Introduction to Computing', unit: 3.0, grade: 2.0 },
    { code: 'CC 112', desc: 'Programming 1 (Lecture)', unit: 2.0, grade: 1.4 },
    { code: 'CC 112L', desc: 'Programming 1 (Laboratory)', unit: 3.0, grade: 1.4 },
    { code: 'GEC-MMW', desc: 'Mathematics in the Modern World', unit: 3.0, grade: 1.6 },
    { code: 'GEC-RPH', desc: 'Readings in Philippine History', unit: 3.0, grade: 1.6 },
    { code: 'GEE-TEM', desc: 'The Entrepreneurial Mind', unit: 3.0, grade: 1.9 },
    { code: 'NSTP 1', desc: 'National Service Training Program 1', unit: 3.0, grade: 1.3 },
    { code: 'PATHFIT 1', desc: 'Physical Activities Towards Health and Fitness 1', unit: 2.0, grade: 1.1 },
  ];

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* INPUT SECTION */}
        <View style={styles.leftAlignWrapper}>
          <Text style={styles.mainTitle}>Grades</Text>
          <Text style={styles.subTitle}>View your student grades</Text>

          <View style={styles.row}>
            <View style={styles.dropdown}>
              <Text style={styles.dropdownText}>S.Y 2025 - 2026</Text>
              <Ionicons name="chevron-down" size={18} color="black" />
            </View>
            <View style={styles.dropdown}>
              <Text style={styles.dropdownText}>First Semester</Text>
              <Ionicons name="chevron-down" size={18} color="black" />
            </View>
          </View>

          <TextInput
            placeholder="Enter Student ID"
            placeholderTextColor="#999"
            value={studentId}
            onChangeText={setStudentId}
            style={styles.mainInput}
            keyboardType="numeric"
          />

          <TouchableOpacity 
            style={styles.journeyButton}
            onPress={() => setShowGrades(true)}
          >
            <Text style={styles.journeyButtonText}>Show My Journey</Text>
          </TouchableOpacity>
        </View>

        {/* RESULTS SECTION */}
        {showGrades && (
          <View style={styles.centeredResultWrapper}>
            <View style={styles.reportCard}>
              
              <View style={styles.uniHeader}>
                <Image source={JourneyHeader} style={styles.headerImage} resizeMode="contain" />
              </View>

              {/* UPDATED STUDENT INFO SECTION: Now with two horizontal rows */}
              <View style={styles.studentInfoContainer}>
                {/* First Row: Student ID and Full Name */}
                <View style={styles.infoRow}>
                  <View style={styles.infoBlock}>
                      <Text style={styles.infoLabel}>STUDENT ID</Text>
                      <Text style={styles.infoValue}>7210714</Text>
                  </View>
                  <View style={[styles.infoBlock, {marginLeft: 40}]}>
                      <Text style={styles.infoLabel}>FULL NAME</Text>
                      <Text style={styles.infoValue}>Lagoy, Stephanie Jane</Text>
                  </View>
                </View>

                {/* Second Row: School Year and Semester */}
                <View style={[styles.infoRow, {marginTop: 20}]}>
                  <View style={styles.infoBlock}>
                      <Text style={styles.infoLabel}>SCHOOL YEAR</Text>
                      <Text style={styles.infoValue}>2025 - 2026</Text>
                  </View>
                  <View style={[styles.infoBlock, {marginLeft: 40}]}>
                      <Text style={styles.infoLabel}>SEMESTER</Text>
                      <Text style={styles.infoValue}>First Semester</Text>
                  </View>
                </View>
              </View>

              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerText, { width: '15%' }]}>CODE</Text>
                  <Text style={[styles.headerText, { flex: 1 }]}>DESCRIPTION</Text>
                  <Text style={[styles.headerText, { width: '10%', textAlign: 'center' }]}>UNIT</Text>
                  <Text style={[styles.headerText, { width: '10%', textAlign: 'center' }]}>GRADE</Text>
                </View>
                
                {gradeData.map((item, index) => (
                  <View key={index} style={[styles.tableRow, index % 2 === 1 && {backgroundColor: '#F9F9F9'}]}>
                    <Text style={[styles.cellText, { width: '15%', fontWeight: '600' }]}>{item.code}</Text>
                    <Text style={[styles.cellText, { flex: 1 }]}>{item.desc}</Text>
                    <Text style={[styles.cellText, { width: '10%', textAlign: 'center' }]}>{item.unit.toFixed(1)}</Text>
                    <Text style={[styles.cellText, { width: '10%', textAlign: 'center', fontWeight: 'bold', color: '#B22222' }]}>{item.grade.toFixed(1)}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.buttonActionRow}>
                <TouchableOpacity style={styles.getLinkButton} onPress={() => Alert.alert("Link Copied")}>
                    <Ionicons name="link-outline" size={20} color="white" style={{marginRight: 8}} />
                    <Text style={styles.getLinkText}>Get Link</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 80 },
  leftAlignWrapper: { paddingHorizontal: 30, alignItems: 'flex-start' },
  mainTitle: { fontSize: 42, fontWeight: '800', color: '#000' },
  subTitle: { fontSize: 18, color: '#666', marginBottom: 40 },
  row: { flexDirection: 'row', marginBottom: 20, gap: 15 },
  dropdown: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#000', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, minWidth: 150 
  },
  dropdownText: { fontSize: 13, color: '#333' },
  mainInput: { borderWidth: 1, borderColor: '#0d0d0d', borderRadius: 12, width: '100%', maxWidth: 300, height: 55, paddingHorizontal: 15, fontSize: 18, marginBottom: 25 },
  journeyButton: { backgroundColor: '#B22222', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 25, marginBottom: 30 },
  journeyButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  
  centeredResultWrapper: { width: '100%', alignItems: 'center', paddingHorizontal: 20 },
  reportCard: { width: '100%', maxWidth: 1500, padding: 40, borderWidth: 1, borderColor: '#DDD', borderRadius: 15, backgroundColor: '#FFF', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  uniHeader: { alignItems: 'center', marginBottom: 40 },
  headerImage: { width: '100%', height: 180, maxWidth: 1100 },
  
  // New Container for the info rows
  studentInfoContainer: { marginBottom: 30, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  infoRow: { flexDirection: 'row' },
  infoBlock: { minWidth: 120 },
  infoLabel: { fontSize: 10, color: '#999', fontWeight: 'bold', letterSpacing: 1 },
  infoValue: { fontSize: 16, fontWeight: '700', color: '#222', marginTop: 2 },
  
  table: { width: '100%', borderWidth: 1, borderColor: '#000' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#B22222', padding: 15 },
  headerText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE', alignItems: 'center' },
  cellText: { fontSize: 14, color: '#444' },
  
  buttonActionRow: { marginTop: 30, alignItems: 'center' },
  getLinkButton: { flexDirection: 'row', backgroundColor: '#B22222', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, alignItems: 'center' },
  getLinkText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});

export default Grades;