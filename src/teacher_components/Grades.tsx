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
  useWindowDimensions,
  View,
} from 'react-native';

const JourneyHeader = require('../../assets/images/myjourney-header-template-1.png');

const schoolYears = [
  'S.Y. 2023 - 2024',
  'S.Y. 2024 - 2025',
  'S.Y. 2025 - 2026',
  'S.Y. 2026 - 2027',
];
const semesters = ['First Semester', 'Second Semester', 'Summer'];

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
  fullWidth?: boolean;
  width?: number;
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
  fullWidth = false,
  width = 170,
}: InlineDropdownProps) => {
  return (
    <View
      style={[
        styles.dropdownWrapper,
        fullWidth ? styles.dropdownWrapperFull : { width },
      ]}
    >
      <TouchableOpacity style={styles.dropdown} onPress={onToggle} activeOpacity={0.8}>
        <Text style={styles.dropdownText} numberOfLines={1}>
          {selectedValue}
        </Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#000"
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
  const { width } = useWindowDimensions();

  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isLargeScreen = width >= 1024;
  const isStackedLayout = width < 640;

  const contentHorizontalPadding = isPhone ? 20 : isTablet ? 28 : 40;
  const titleSize = isPhone ? 32 : isTablet ? 36 : 36;
  const reportMinWidth = isPhone ? 760 : 900;

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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          <View
            style={[
              styles.leftAlignWrapper,
              { paddingHorizontal: contentHorizontalPadding },
            ]}
          >
            <View style={styles.headerBlock}>
              <Text style={[styles.mainTitle, { fontSize: titleSize }]}>Grades</Text>
              <Text style={styles.subTitle}>View your student grades</Text>
            </View>

            <View style={styles.controlsCard}>
              {isStackedLayout ? (
                <View style={styles.stackedControls}>
                  <InlineDropdown
                    options={schoolYears}
                    selectedValue={selectedSchoolYear}
                    isOpen={openDropdown === 'schoolYear'}
                    fullWidth
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
                    fullWidth
                    onToggle={() =>
                      setOpenDropdown(openDropdown === 'semester' ? null : 'semester')
                    }
                    onSelect={(value) => {
                      setSelectedSemester(value);
                      setOpenDropdown(null);
                    }}
                    width={160}
                  />

                  <TextInput
                    placeholder="Enter Student ID"
                    placeholderTextColor="#999"
                    value={studentId}
                    onChangeText={setStudentId}
                    style={styles.mainInputFull}
                    keyboardType="numeric"
                  />

                  <TouchableOpacity style={styles.journeyButtonFull} onPress={handleShowJourney}>
                    <Text style={styles.journeyButtonText}>Show My Journey</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.controlsGrid}>
                  <View style={[styles.controlsGridRow, styles.controlsGridRowTop]}>
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
                      width={170}
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
                      width={160}
                    />
                  </View>

                  <View style={[styles.controlsGridRow, styles.controlsGridRowBottom]}>
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
                </View>
              )}
            </View>
          </View>

          {showGrades && studentRecord && (
            <View
              style={[
                styles.centeredResultWrapper,
                { paddingHorizontal: isPhone ? 12 : 20 },
              ]}
            >
              <View style={[styles.reportCard, isLargeScreen && styles.reportCardLarge]}>
                <View style={styles.uniHeader}>
                  <Image
                    source={JourneyHeader}
                    style={[styles.headerImage, { height: isPhone ? 90 : 120 }]}
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

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={isPhone}
                  contentContainerStyle={styles.tableScrollContent}
                >
                  <View style={[styles.table, { minWidth: reportMinWidth }]}>
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
                </ScrollView>

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
  flexOne: { flex: 1 },

  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  scrollContent: {
    paddingBottom: 60,
  },

  leftAlignWrapper: {
    alignItems: 'flex-start',
    overflow: 'visible',
  },

  headerBlock: {
    marginTop: 30,
    marginBottom: 30,
  },

  mainTitle: {
    fontWeight: 'bold',
    color: '#000',
    fontFamily,
  },

  subTitle: {
    fontSize: 14,
    color: '#444',
    marginTop: 2,
    fontFamily,
  },

  controlsCard: {
    marginBottom: 25,
    width: '100%',
    maxWidth: 420,
  },

  controlsGrid: {
    width: '100%',
    gap: 20,
  },

  controlsGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },

  controlsGridRowTop: {
    zIndex: 3000,
  },

  controlsGridRowBottom: {
    zIndex: 1,
  },

  stackedControls: {
    width: '100%',
    gap: 12,
    zIndex: 999,
  },

  dropdownWrapper: {
    position: 'relative',
    zIndex: 4000,
    backgroundColor: '#FFF',
  },

  dropdownWrapperFull: {
    width: '100%',
  },

  dropdown: {
    height: 40,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
  },

  dropdownText: {
    flex: 1,
    fontSize: 12,
    color: '#000',
    fontFamily,
    marginRight: 8,
  },

  dropdownMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CFCFCF',
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    overflow: 'hidden',
    zIndex: 9999,
  },

  dropdownItem: {
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },

  lastDropdownItem: {
    borderBottomWidth: 0,
  },

  dropdownItemText: {
    fontSize: 13,
    color: '#000',
    fontFamily,
  },

  mainInput: {
    width: 170,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#000',
    backgroundColor: '#FFF',
    fontFamily,
  },

  mainInputFull: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#000',
    backgroundColor: '#FFF',
    fontFamily,
  },

  journeyButton: {
    width: 170,
    backgroundColor: '#B71C1C',
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  journeyButtonFull: {
    width: '100%',
    backgroundColor: '#B71C1C',
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  journeyButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily,
  },

  centeredResultWrapper: {
    width: '100%',
    alignItems: 'center',
  },

  reportCard: {
    width: '100%',
    maxWidth: 980,
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 18,
  },

  reportCardLarge: {
    paddingHorizontal: 16,
  },

  uniHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },

  headerImage: {
    width: '100%',
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

  tableScrollContent: {
    paddingBottom: 4,
  },

  table: {
    borderWidth: 1,
    borderColor: '#BDBDBD',
    backgroundColor: '#FFF',
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#B71C1C',
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
    paddingVertical: 8,
    paddingHorizontal: 6,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#BDBDBD',
    fontFamily,
  },

  cellText: {
    fontSize: 14,
    color: '#222',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: '#BDBDBD',
    fontFamily,
  },

  gradeText: {
    fontWeight: '700',
  },

  subjectCol: { width: 130 },
  descCol: { width: 470 },
  unitCol: { width: 80, textAlign: 'center' },
  gradeCol: { width: 90, textAlign: 'center', borderRightWidth: 0 },

  getLinkButton: {
    marginTop: 30,
    backgroundColor: '#B71C1C',
    paddingHorizontal: 20,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },

  getLinkText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily,
  },
});

export default Grades;