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

const schoolYears = ['S.Y. 2021 - 2022', 'S.Y. 2025 - 2026'];
const semesters = ['First Semester', 'Second Semester'];

const studentDatabase = {
  '1': {
    studentId: '7210714',
    fullName: 'Lagoy, Stephanie Jane',
    schoolYear: 'S.Y. 2021 - 2022',
    semester: 'First Semester',
    grades: [
      { code: 'AP 1', desc: 'Multimedia', unit: 3.0, grade: 1.4 },
      { code: 'CC 111', desc: 'Introduction to Computing', unit: 3.0, grade: 2.0 },
      { code: 'CC 112', desc: 'Programming 1 (Lecture)', unit: 2.0, grade: 1.4 },
      { code: 'CC 112L', desc: 'Programming 1 (Laboratory)', unit: 3.0, grade: 1.4 },
      { code: 'GEC-MMW', desc: 'Mathematics in the Modern World', unit: 3.0, grade: 1.6 },
      { code: 'GEC-RPH', desc: 'Readings in Philippine History', unit: 3.0, grade: 1.6 },
      { code: 'GEE-TEM', desc: 'The Entrepreneurial Mind', unit: 3.0, grade: 1.9 },
      { code: 'NSTP 1', desc: 'National Service Training Program 1', unit: 3.0, grade: 1.3 },
      { code: 'PATHFIT 1', desc: 'Physical Activities Towards Health and Fitness 1', unit: 2.0, grade: 1.1 },
    ],
  },
};

type GradeItem = {
  code: string;
  desc: string;
  unit: number;
  grade: number;
};

type StudentRecord = {
  studentId: string;
  fullName: string;
  schoolYear: string;
  semester: string;
  grades: GradeItem[];
};

type DropdownKey = 'schoolYear' | 'semester' | null;

type InlineDropdownProps = {
  options: string[];
  selectedValue: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
};

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'sans-serif',
});

const InlineDropdown = ({
  options,
  selectedValue,
  isOpen,
  onToggle,
  onSelect,
}: InlineDropdownProps) => {
  return (
    <View style={styles.dropdownWrapper}>
      <TouchableOpacity style={styles.dropdown} onPress={onToggle} activeOpacity={0.8}>
        <Text style={styles.dropdownText}>{selectedValue}</Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#333"
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownMenu}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.dropdownItem,
                index === options.length - 1 && styles.lastDropdownItem,
              ]}
              onPress={() => onSelect(option)}
            >
              <Text style={styles.dropdownItemText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const Grades = () => {
  const [studentId, setStudentId] = useState('');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('S.Y. 2021 - 2022');
  const [selectedSemester, setSelectedSemester] = useState('First Semester');
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [showGrades, setShowGrades] = useState(false);
  const [studentRecord, setStudentRecord] = useState<StudentRecord | null>(null);

  const handleShowJourney = () => {
    const trimmedId = studentId.trim();
    const foundStudent = studentDatabase[trimmedId as keyof typeof studentDatabase];

    if (!trimmedId) {
      Alert.alert('Missing Student ID', 'Please enter a student ID.');
      setShowGrades(false);
      setStudentRecord(null);
      return;
    }

    if (!foundStudent) {
      Alert.alert('Student Not Found', 'Only student ID 1 will display the journey.');
      setShowGrades(false);
      setStudentRecord(null);
      return;
    }

    if (
      foundStudent.schoolYear !== selectedSchoolYear ||
      foundStudent.semester !== selectedSemester
    ) {
      Alert.alert(
        'No Record Found',
        'This student has no journey record for the selected school year and semester.'
      );
      setShowGrades(false);
      setStudentRecord(null);
      return;
    }

    setStudentRecord(foundStudent);
    setShowGrades(true);
    setOpenDropdown(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.flexOne}
        onPress={() => setOpenDropdown(null)}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.leftAlignWrapper}>
            <Text style={styles.mainTitle}>Grades</Text>
            <Text style={styles.subTitle}>View your student grades</Text>

            <View style={styles.row}>
              <InlineDropdown
                options={schoolYears}
                selectedValue={selectedSchoolYear}
                isOpen={openDropdown === 'schoolYear'}
                onToggle={() =>
                  setOpenDropdown(openDropdown === 'schoolYear' ? null : 'schoolYear')
                }
                onSelect={(value) => {
                  setSelectedSchoolYear(value);
                  setOpenDropdown(null);
                }}
              />

              <InlineDropdown
                options={semesters}
                selectedValue={selectedSemester}
                isOpen={openDropdown === 'semester'}
                onToggle={() =>
                  setOpenDropdown(openDropdown === 'semester' ? null : 'semester')
                }
                onSelect={(value) => {
                  setSelectedSemester(value);
                  setOpenDropdown(null);
                }}
              />
            </View>

            <TextInput
              placeholder="Enter Student ID"
              placeholderTextColor="#999"
              value={studentId}
              onChangeText={setStudentId}
              style={styles.mainInput}
              keyboardType="numeric"
            />

            <TouchableOpacity style={styles.journeyButton} onPress={handleShowJourney}>
              <Text style={styles.journeyButtonText}>Show My Journey</Text>
            </TouchableOpacity>
          </View>

          {showGrades && studentRecord && (
            <View style={styles.centeredResultWrapper}>
              <View style={styles.reportCard}>
                <View style={styles.uniHeader}>
                  <Image
                    source={JourneyHeader}
                    style={styles.headerImage}
                    resizeMode="contain"
                  />
                </View>

                <Text style={styles.studentLine}>
                  Student ID: {studentRecord.studentId}
                </Text>
                <Text style={styles.studentLine}>
                  Student Name: {studentRecord.fullName}
                </Text>

                <Text style={styles.schoolYearLine}>
                  School Year: {studentRecord.schoolYear} ({studentRecord.semester})
                </Text>

                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.headerText, styles.subjectCol]}>Subject</Text>
                    <Text style={[styles.headerText, styles.descCol]}>Description</Text>
                    <Text style={[styles.headerText, styles.unitCol]}>Unit</Text>
                    <Text style={[styles.headerText, styles.gradeCol]}>Grade</Text>
                  </View>

                  {studentRecord.grades.map((item, index) => (
                    <View key={index} style={styles.tableRow}>
                      <Text style={[styles.cellText, styles.subjectCol]}>{item.code}</Text>
                      <Text style={[styles.cellText, styles.descCol]}>{item.desc}</Text>
                      <Text style={[styles.cellText, styles.unitCol]}>
                        {item.unit.toFixed(1)}
                      </Text>
                      <Text style={[styles.cellText, styles.gradeCol, styles.gradeText]}>
                        {item.grade.toFixed(1)}
                      </Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.getLinkButton}
                  onPress={() => Alert.alert('Success', 'Journey displayed successfully')}
                >
                  <Text style={styles.getLinkText}>Get Link</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  leftAlignWrapper: {
    paddingHorizontal: 30,
    alignItems: 'flex-start',
    overflow: 'visible',
  },
  mainTitle: {
    marginTop: 30,
    fontSize: 40,          // bigger like the image
  fontWeight: '900',     // extra bold
  color: '#000',
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'sans-serif',
  }),
  letterSpacing: -0.5,   // tighter look like "Honors"
},
  subTitle: {
    fontSize: 14,
    color: '#444',
    marginBottom: 30,
    fontFamily,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 15,
    alignItems: 'flex-start',
    zIndex: 999,
  },
  dropdownWrapper: {
    width: 180,
    position: 'relative',
    zIndex: 1000,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 46,
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
    fontFamily,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 2000,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  lastDropdownItem: {
    borderBottomWidth: 0,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
    fontFamily,
  },
  mainInput: {
    borderWidth: 1,
    borderColor: '#0d0d0d',
    borderRadius: 10,
    width: '100%',
    maxWidth: 300,
    height: 52,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 25,
    fontFamily,
  },
  journeyButton: {
    backgroundColor: '#B22222',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 22,
    marginBottom: 30,
  },
  journeyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily,
  },
  centeredResultWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  reportCard: {
    width: '100%',
    maxWidth: 800,
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 18,
  },
  uniHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerImage: {
    width: '100%',
    height: 120,
  },
  studentLine: {
    fontSize: 14,
    color: '#222',
    marginBottom: 2,
    fontWeight: '600',
    fontFamily,
  },
  schoolYearLine: {
    fontSize: 14,
    color: '#222',
    marginTop: 24,
    marginBottom: 6,
    fontWeight: '600',
    fontFamily,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#BDBDBD',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#B22222',
    borderBottomWidth: 1,
    borderBottomColor: '#BDBDBD',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#BDBDBD',
    minHeight: 50,
    alignItems: 'center',
  },
  headerText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 6,
    paddingHorizontal: 4,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#BDBDBD',
    fontFamily,
  },
  cellText: {
    fontSize: 14,
    color: '#222',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#BDBDBD',
    textAlignVertical: 'center',
    fontFamily,
  },
  gradeText: {
    fontWeight: 'bold',
    marginTop: 30,
  },
  subjectCol: {
    width: '17%',
  },
  descCol: {
    width: '66%',
  },
  unitCol: {
    width: '7%',
    textAlign: 'center',
  },
  gradeCol: {
    width: '10%',
    textAlign: 'center',
    borderRightWidth: 0,
  },
  getLinkButton: {
    marginTop: 38,
    backgroundColor: '#B22222',
    borderRadius: 6,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getLinkText: {
    color: '#FFF',
    fontSize: 21,
    fontWeight: '700',
    fontFamily,
  },
});

export default Grades;