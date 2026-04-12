import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
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
  'S.Y. 2021 - 2022',
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
  isPhone?: boolean;
};

type TableCellProps = {
  width: number;
  text: string;
  isHeader?: boolean;
  isLast?: boolean;
  centered?: boolean;
  bold?: boolean;
  numberOfLines?: number;
  mobile?: boolean;
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
  isPhone = false,
}: InlineDropdownProps) => {
  return (
    <View
      style={[
        styles.dropdownWrapper,
        fullWidth ? styles.dropdownWrapperFull : { width },
        isOpen && styles.dropdownWrapperActive,
      ]}
    >
      <TouchableOpacity
        style={[styles.dropdown, isPhone && styles.dropdownMobile]}
        onPress={onToggle}
        activeOpacity={0.8}
      >
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
        <View style={[styles.dropdownMenu, isPhone && styles.dropdownMenuMobile]}>
          <View style={styles.dropdownMenuContent}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.dropdownItem,
                  index === options.length - 1 && styles.lastDropdownItem,
                ]}
                onPress={() => onSelect(option)}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownItemText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const TableCell = ({
  width,
  text,
  isHeader = false,
  isLast = false,
  centered = false,
  bold = false,
  numberOfLines,
  mobile = false,
}: TableCellProps) => {
  return (
    <View
      style={[
        styles.tableCell,
        isHeader ? styles.tableHeaderCell : styles.tableBodyCell,
        { width },
        isLast ? styles.tableCellLast : styles.tableCellDivider,
        centered && styles.tableCellCentered,
      ]}
    >
      <Text
        numberOfLines={numberOfLines}
        style={[
          isHeader ? styles.headerText : styles.cellText,
          mobile && (isHeader ? styles.mobileHeaderText : styles.mobileCellText),
          centered && styles.centerText,
          bold && styles.gradeText,
        ]}
      >
        {text}
      </Text>
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

  const mobileCardWidth = Math.min(width - 40, 320);
  const mobileCardInnerWidth = mobileCardWidth - 24;

  const mobileTableWidths = useMemo(() => {
    const subject = 50;
    const unit = 60;
    const grade = 50;
    const description = Math.max(120, mobileCardInnerWidth - (subject + unit + grade));

    return {
      subject,
      description,
      unit,
      grade,
      total: subject + description + unit + grade,
    };
  }, [mobileCardInnerWidth]);

  const webTableWidth = 900;
  const webHeaderWidth = 900;
  const reportMinWidth = isPhone ? mobileTableWidths.total : webTableWidth;

  const [studentId, setStudentId] = useState('');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('S.Y. 2021 - 2022');
  const [selectedSemester, setSelectedSemester] = useState('First Semester');
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [showGrades, setShowGrades] = useState(false);
  const [studentRecord, setStudentRecord] = useState<StudentRecord | null>(null);

  const closeDropdowns = () => {
    if (openDropdown !== null) {
      setOpenDropdown(null);
    }
  };

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
      <View style={styles.flexOne}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          bounces={Platform.OS === 'ios'}
          overScrollMode="always"
          onScrollBeginDrag={closeDropdowns}
          scrollEventThrottle={16}
        >
          <View
            style={[
              styles.leftAlignWrapper,
              { paddingHorizontal: contentHorizontalPadding },
            ]}
          >
            <View style={[styles.headerBlock, isPhone && styles.headerBlockMobile]}>
              <Text style={[styles.mainTitle, { fontSize: titleSize }]}>Grades</Text>
              <Text style={styles.subTitle}>View your student grades</Text>
            </View>

            <View style={[styles.controlsCard, isPhone && styles.controlsCardMobile]}>
              {isStackedLayout ? (
                <View style={styles.stackedControls}>
                  <InlineDropdown
                    options={schoolYears}
                    selectedValue={selectedSchoolYear}
                    isOpen={openDropdown === 'schoolYear'}
                    fullWidth
                    isPhone={isPhone}
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
                    isPhone={isPhone}
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
                    style={[styles.mainInputFull, isPhone && styles.mainInputMobile]}
                    keyboardType="numeric"
                  />

                  <TouchableOpacity
                    style={[styles.journeyButtonFull, isPhone && styles.journeyButtonMobile]}
                    onPress={handleShowJourney}
                  >
                    <Text
                      style={[
                        styles.journeyButtonText,
                        isPhone && styles.journeyButtonTextMobile,
                      ]}
                    >
                      Show My Journey
                    </Text>
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
                { paddingHorizontal: isPhone ? 20 : 20 },
              ]}
            >
              {isPhone ? (
                <View
                  style={[
                    styles.mobileReportCard,
                    { width: mobileCardWidth, maxWidth: mobileCardWidth },
                  ]}
                >
                  <View style={styles.uniHeader}>
                    <Image
                      source={JourneyHeader}
                      style={[styles.headerImage, styles.headerImageMobile]}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.mobileStudentInfo}>
                    <Text style={[styles.studentLine, styles.studentLineMobile]}>
                      Student ID: {studentRecord.studentId}
                    </Text>
                    <Text style={[styles.studentLine, styles.studentLineMobile]}>
                      Student Name: {studentRecord.fullName}
                    </Text>

                    <Text style={[styles.schoolYearLine, styles.schoolYearLineMobile]}>
                      School Year: {studentRecord.schoolYear} ({studentRecord.semester})
                    </Text>
                  </View>

                  <View style={styles.mobileTableWrap}>
                    <View style={[styles.table, { width: reportMinWidth }]}>
                      <View style={styles.tableHeader}>
                        <TableCell
                          width={mobileTableWidths.subject}
                          text="Subject"
                          isHeader
                          mobile
                        />
                        <TableCell
                          width={mobileTableWidths.description}
                          text="Description"
                          isHeader
                          mobile
                        />
                        <TableCell
                          width={mobileTableWidths.unit}
                          text="Unit"
                          isHeader
                          mobile
                          centered
                        />
                        <TableCell
                          width={mobileTableWidths.grade}
                          text="Grade"
                          isHeader
                          mobile
                          centered
                          isLast
                        />
                      </View>

                      {studentRecord.grades.map((item, index) => (
                        <View
                          key={index}
                          style={[
                            styles.tableRow,
                            index === studentRecord.grades.length - 1 && styles.lastTableRow,
                          ]}
                        >
                          <TableCell
                            width={mobileTableWidths.subject}
                            text={item.code}
                            mobile
                            numberOfLines={1}
                          />
                          <TableCell
                            width={mobileTableWidths.description}
                            text={item.desc}
                            mobile
                            numberOfLines={2}
                          />
                          <TableCell
                            width={mobileTableWidths.unit}
                            text={item.unit.toFixed(1)}
                            mobile
                            centered
                            numberOfLines={1}
                          />
                          <TableCell
                            width={mobileTableWidths.grade}
                            text={item.grade.toFixed(1)}
                            mobile
                            centered
                            bold
                            numberOfLines={1}
                            isLast
                          />
                        </View>
                      ))}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.getLinkButton, styles.getLinkButtonMobile]}
                    onPress={() => Alert.alert('Success', 'Journey displayed successfully')}
                  >
                    <Text style={styles.getLinkText}>Get Link</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.reportCard, isLargeScreen && styles.reportCardLarge]}>
                  <View style={[styles.uniHeader, styles.webHeaderWrap, { width: webHeaderWidth }]}>
                    <Image
                      source={JourneyHeader}
                      style={[styles.headerImage, styles.headerImageWeb]}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={[styles.webContentWrap, { width: webTableWidth }]}>
                    <Text style={styles.studentLine}>
                      Student ID: {studentRecord.studentId}
                    </Text>
                    <Text style={styles.studentLine}>
                      Student Name: {studentRecord.fullName}
                    </Text>

                    <Text style={styles.schoolYearLine}>
                      School Year: {studentRecord.schoolYear} ({studentRecord.semester})
                    </Text>

                    <View style={[styles.table, { width: webTableWidth }]}>
                      <View style={styles.tableHeader}>
                        <TableCell width={130} text="Subject" isHeader />
                        <TableCell width={470} text="Description" isHeader />
                        <TableCell width={80} text="Unit" isHeader centered />
                        <TableCell width={220} text="Grade" isHeader centered isLast />
                      </View>

                      {studentRecord.grades.map((item, index) => (
                        <View
                          key={index}
                          style={[
                            styles.tableRowWeb,
                            index === studentRecord.grades.length - 1 && styles.lastTableRow,
                          ]}
                        >
                          <TableCell width={130} text={item.code} numberOfLines={1} />
                          <TableCell width={470} text={item.desc} numberOfLines={2} />
                          <TableCell
                            width={80}
                            text={item.unit.toFixed(1)}
                            centered
                            numberOfLines={1}
                          />
                          <TableCell
                            width={220}
                            text={item.grade.toFixed(1)}
                            centered
                            bold
                            numberOfLines={1}
                            isLast
                          />
                        </View>
                      ))}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.getLinkButton}
                    onPress={() => Alert.alert('Success', 'Journey displayed successfully')}
                  >
                    <Text style={styles.getLinkText}>Get Link</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
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
    flexGrow: 1,
  },

  leftAlignWrapper: {
  alignItems: 'flex-start',
  overflow: 'visible',
  zIndex: 5000,
},
  headerBlock: {
    marginTop: 30,
    marginBottom: 30,
  },

  headerBlockMobile: {
    marginTop: 20,
    marginBottom: 18,
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
  zIndex: 5000, // keep dropdown area above report/photo
  elevation: 50,
},

  controlsCardMobile: {
    width: '100%',
    maxWidth: 210,
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
    elevation: 0,
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
    width: '100%',
    zIndex: 1,
    elevation: 0,
  },

  dropdownWrapperActive: {
  zIndex: 9999, // opened dropdown always above everything
  elevation: 100,
},

  dropdownWrapperFull: {
    width: '100%',
  },

  dropdown: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    zIndex: 4001,
    elevation: 0,
  },

  dropdownMobile: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
  },

  dropdownText: {
    fontSize: 12,
    color: '#000',
    flexShrink: 1,
    marginRight: 8,
    fontFamily,
  },

  dropdownMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CFCFCF',
    overflow: 'hidden',
    zIndex: 5000,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },

  dropdownMenuMobile: {
    top: 52,
    left: 0,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },

  dropdownMenuContent: {
    backgroundColor: '#FFFFFF',
  },

  dropdownItem: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
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

  mainInputMobile: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
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

  journeyButtonMobile: {
    height: 48,
    borderRadius: 12,
  },

  journeyButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily,
  },

  journeyButtonTextMobile: {
    fontSize: 13,
  },

  centeredResultWrapper: {
  width: '100%',
  alignItems: 'center',
  zIndex: 1, // send report/photo behind
  elevation: 0,
},

  reportCard: {
  width: '100%',
  maxWidth: 980,
  backgroundColor: '#FFF',
  paddingHorizontal: 8,
  paddingTop: 8,
  paddingBottom: 18,
  alignItems: 'center',
  zIndex: 1,
  elevation: 0,
},

  reportCardLarge: {
    paddingHorizontal: 16,
  },

  mobileReportCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E7E7',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
    overflow: 'hidden',
  },

  mobileStudentInfo: {
    width: '100%',
  },

  mobileTableWrap: {
    width: '100%',
  },

  uniHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },

  webHeaderWrap: {
    alignSelf: 'center',
    marginBottom: 8,
  },

  webContentWrap: {
    alignSelf: 'center',
  },

  headerImage: {
    width: '100%',
  },

  headerImageMobile: {
    height: 78,
    width: '100%',
  },

  headerImageWeb: {
    width: '100%',
    height: 150,
  },

  studentLine: {
    fontSize: 14,
    color: '#222',
    marginBottom: 2,
    fontWeight: '600',
    fontFamily,
  },

  studentLineMobile: {
    fontSize: 13,
    lineHeight: 20,
    width: '100%',
    flexWrap: 'wrap',
  },

  schoolYearLine: {
    fontSize: 14,
    color: '#222',
    marginTop: 24,
    marginBottom: 6,
    fontWeight: '600',
    fontFamily,
  },

  schoolYearLineMobile: {
    marginTop: 18,
    marginBottom: 10,
    lineHeight: 20,
    fontSize: 13,
    width: '100%',
    flexWrap: 'wrap',
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
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#BDBDBD',
  },

  tableRowWeb: {
    flexDirection: 'row',
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#BDBDBD',
  },

  lastTableRow: {
    borderBottomWidth: 0,
  },

  tableCell: {
    justifyContent: 'center',
  },

  tableHeaderCell: {
    backgroundColor: '#B71C1C',
  },

  tableBodyCell: {
    backgroundColor: '#FFF',
  },

  tableCellDivider: {
    borderRightWidth: 1,
    borderRightColor: '#BDBDBD',
  },

  tableCellLast: {
    borderRightWidth: 1,
    borderRightColor: '#BDBDBD',
  },

  tableCellCentered: {
    alignItems: 'center',
  },

  headerText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 8,
    paddingHorizontal: 6,
    textAlign: 'center',
    fontFamily,
  },

  mobileHeaderText: {
    fontSize: 11,
    paddingHorizontal: 4,
  },

  cellText: {
    fontSize: 14,
    color: '#222',
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontFamily,
  },

  mobileCellText: {
    fontSize: 10,
    paddingHorizontal: 4,
  },

  centerText: {
    textAlign: 'center',
  },

  gradeText: {
    fontWeight: '700',
  },

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

  getLinkButtonMobile: {
    width: '100%',
    marginTop: 18,
    height: 46,
    borderRadius: 12,
  },

  getLinkText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily,
  },
});

export default Grades;