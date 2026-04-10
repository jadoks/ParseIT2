import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const headerImage = require('../../assets/images/myjourney-header-template-1.png');

type Student = {
  name: string;
  id: string;
  unit: string;
  gpa: string;
  section: string;
  yearLevel: string;
};

type GeneratedSection = {
  yearLevel: string;
  sectionName: string;
  students: Student[];
};

type DropdownName = 'schoolYear' | 'semester';

type DropdownProps = {
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  width?: number;
  visible: boolean;
  onToggle: () => void;
};

function CustomDropdown({
  value,
  options,
  onSelect,
  width = 160,
  visible,
  onToggle,
}: DropdownProps) {
  return (
    <View style={[styles.dropdownContainer, { width }]}>
      <TouchableOpacity
        style={[styles.dropdownButton, { width }]}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <Text style={styles.dropdownButtonText}>{value}</Text>
        <Ionicons
          name={visible ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#000"
        />
      </TouchableOpacity>

      {visible ? (
        <View style={[styles.inlineDropdownMenu, { width }]}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.dropdownItem}
              onPress={() => onSelect(option)}
              activeOpacity={0.8}
            >
              <Text style={styles.dropdownItemText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

type PreviewProps = {
  visible: boolean;
  onClose: () => void;
  adviser: string;
  generatedSections: GeneratedSection[];
  schoolYear: string;
  semester: string;
};

function HonorRollPreviewModal({
  visible,
  onClose,
  adviser,
  generatedSections,
  schoolYear,
  semester,
}: PreviewProps) {
  const handleGetLink = async () => {
    const generatedLink = `https://honorroll.example.com/view?sy=${encodeURIComponent(
      schoolYear
    )}&semester=${encodeURIComponent(semester)}`;

    const supported = await Linking.canOpenURL(generatedLink);

    if (supported) {
      Linking.openURL(generatedLink);
    } else {
      Alert.alert('Link Generated', generatedLink);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.previewWrapper}>
          <View style={styles.previewTopBar}>
            <Text style={styles.previewTitle}>Honor List</Text>
            <TouchableOpacity onPress={onClose} style={styles.previewCloseBtn}>
              <Text style={styles.previewCloseText}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.previewScrollView}
            contentContainerStyle={styles.previewScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {generatedSections.length === 0 ? (
              <View style={styles.previewEmptyRow}>
                <Text style={styles.previewEmptyText}>
                  No generated honor list yet.
                </Text>
              </View>
            ) : (
              generatedSections.map((section, sectionIndex) => (
                <View
                  key={`${section.sectionName}-${sectionIndex}`}
                  style={styles.previewCard}
                >
                  <Image source={headerImage} style={styles.previewHeaderImage} />

                  <View style={styles.previewBody}>
                    <Text style={styles.previewCongrats}>Congratulations</Text>

                    <View style={styles.previewMetaBox}>
                      <Text style={styles.previewMetaText}>
                        Section: {section.sectionName}
                      </Text>
                      <Text style={styles.previewMetaText}>Adviser: {adviser}</Text>
                      <Text style={styles.previewMetaText}>
                        Academic Year: {schoolYear}
                      </Text>
                      <Text style={styles.previewMetaText}>
                        Semester: {semester}
                      </Text>
                      <Text style={styles.previewMetaText}>
                        Total No. of Honor Students: {section.students.length}
                      </Text>
                    </View>

                    <View style={styles.previewTable}>
                      <View style={styles.previewTableHeader}>
                        <Text style={[styles.previewHeaderCell, { width: 45 }]}>
                          NO.
                        </Text>
                        <Text style={[styles.previewHeaderCell, { flex: 1 }]}>
                          NAME OF STUDENT
                        </Text>
                        <Text style={[styles.previewHeaderCell, { width: 70 }]}>
                          GWA
                        </Text>
                      </View>

                      {section.students.map((student, index) => (
                        <View key={student.id} style={styles.previewTableRow}>
                          <Text style={[styles.previewRowCell, { width: 45 }]}>
                            {index + 1}
                          </Text>
                          <Text style={[styles.previewRowCell, { flex: 1 }]}>
                            {student.name}
                          </Text>
                          <Text style={[styles.previewRowCell, { width: 70 }]}>
                            {student.gpa}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.previewBottomAccent} />
                </View>
              ))
            )}

            <TouchableOpacity style={styles.getLinkBtn} onPress={handleGetLink}>
              <Text style={styles.getLinkBtnText}>Get Link</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function HonorsScreen() {
  const academicYears = [
    'S.Y 2023 - 2024',
    'S.Y 2024 - 2025',
    'S.Y 2025 - 2026',
    'S.Y 2026 - 2027',
  ];

  const semesters = ['First Semester', 'Second Semester', 'Summer'];

  const [schoolYear, setSchoolYear] = useState('S.Y 2025 - 2026');
  const [semester, setSemester] = useState('First Semester');
  const [generatedSections, setGeneratedSections] = useState<GeneratedSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<GeneratedSection | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownName | null>(null);

  const adviser = 'Tristan Mondisico';

  const allStudents: Student[] = [
    { name: 'Alvarez, Tangal', id: '1', unit: '25', gpa: '1.500', section: '1A', yearLevel: 'First Year' },
    { name: 'Almonia, Emo Cyril', id: '2', unit: '24', gpa: '1.520', section: '1A', yearLevel: 'First Year' },
    { name: 'Rivera, Hannah', id: '3', unit: '23', gpa: '1.410', section: '1B', yearLevel: 'First Year' },
    { name: 'Dela Cruz, Joshua', id: '4', unit: '25', gpa: '1.780', section: '1B', yearLevel: 'First Year' },

    { name: 'Sarmiento, Jade Anne', id: '5', unit: '26', gpa: '1.430', section: '2A', yearLevel: 'Second Year' },
    { name: 'Reyes, Mark Daniel', id: '6', unit: '25', gpa: '1.610', section: '2A', yearLevel: 'Second Year' },
    { name: 'Torres, Angela Mae', id: '7', unit: '23', gpa: '1.720', section: '2B', yearLevel: 'Second Year' },
    { name: 'Lopez, Maria', id: '8', unit: '24', gpa: '1.400', section: '2B', yearLevel: 'Second Year' },

    { name: 'Santos, Kevin', id: '9', unit: '22', gpa: '1.300', section: '3A', yearLevel: 'Third Year' },
    { name: 'Garcia, Nina', id: '10', unit: '23', gpa: '1.650', section: '3A', yearLevel: 'Third Year' },
    { name: 'Fernandez, Carlo', id: '11', unit: '24', gpa: '1.890', section: '3B', yearLevel: 'Third Year' },
    { name: 'Mendoza, Claire', id: '12', unit: '25', gpa: '1.550', section: '3B', yearLevel: 'Third Year' },

    { name: 'Aquino, Paolo', id: '13', unit: '21', gpa: '1.600', section: '4A', yearLevel: 'Fourth Year' },
    { name: 'Gonzales, Bea', id: '14', unit: '24', gpa: '1.450', section: '4A', yearLevel: 'Fourth Year' },
    { name: 'Villanueva, Sean', id: '15', unit: '23', gpa: '1.700', section: '4B', yearLevel: 'Fourth Year' },
    { name: 'Navarro, Kate', id: '16', unit: '24', gpa: '1.320', section: '4B', yearLevel: 'Fourth Year' },
  ];

  const handleGenerateHonorRoll = () => {
    const groupedMap: Record<string, GeneratedSection> = {};

    allStudents
      .filter((student) => Number(student.gpa) <= 2.0)
      .forEach((student) => {
        const key = `${student.yearLevel}-${student.section}`;

        if (!groupedMap[key]) {
          groupedMap[key] = {
            yearLevel: student.yearLevel,
            sectionName: student.section,
            students: [],
          };
        }

        groupedMap[key].students.push(student);
      });

    const orderedYearLevels = [
      'First Year',
      'Second Year',
      'Third Year',
      'Fourth Year',
    ];

    const orderedSections = Object.values(groupedMap).sort((a, b) => {
      const yearCompare =
        orderedYearLevels.indexOf(a.yearLevel) - orderedYearLevels.indexOf(b.yearLevel);

      if (yearCompare !== 0) return yearCompare;

      return a.sectionName.localeCompare(b.sectionName);
    });

    setGeneratedSections(orderedSections);
    setSelectedSection(null);
    setPreviewVisible(false);

    if (orderedSections.length === 0) {
      Alert.alert('No Results', 'No honor roll students found.');
    }
  };

  const handleOpenHonorList = (section: GeneratedSection) => {
    setSelectedSection(section);
    setPreviewVisible(true);
  };

  const handleDropdownToggle = (dropdownName: DropdownName) => {
    setOpenDropdown((prev) => (prev === dropdownName ? null : dropdownName));
  };

  const handleSchoolYearSelect = (value: string) => {
    setSchoolYear(value);
    setOpenDropdown(null);
  };

  const handleSemesterSelect = (value: string) => {
    setSemester(value);
    setOpenDropdown(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Honors</Text>
        </View>

        <View style={styles.subHeader}>
          <Text style={styles.mainHeading}>Generate Honor Roll</Text>
          <Text style={styles.subHeadingText}>
            Automatically generate honor roll by section and year level
          </Text>
        </View>

        <View style={styles.controlsCard}>
          <View style={styles.controlsRow}>
            <CustomDropdown
              value={schoolYear}
              options={academicYears}
              onSelect={handleSchoolYearSelect}
              visible={openDropdown === 'schoolYear'}
              onToggle={() => handleDropdownToggle('schoolYear')}
              width={170}
            />

            <CustomDropdown
              value={semester}
              options={semesters}
              onSelect={handleSemesterSelect}
              visible={openDropdown === 'semester'}
              onToggle={() => handleDropdownToggle('semester')}
              width={160}
            />

            <TouchableOpacity
              style={styles.generateBtn}
              onPress={handleGenerateHonorRoll}
            >
              <Text style={styles.generateBtnText}>Generate Honor Roll</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, { flex: 1.2 }]}>Year Level</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>Section</Text>
          <Text style={[styles.headerCell, { flex: 1.2 }]}>Honor Students</Text>
          <Text style={[styles.headerCell, { width: 100, textAlign: 'center' }]}>
            Action
          </Text>
        </View>

        {generatedSections.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Click Generate Honor Roll to display each level and section.
            </Text>
          </View>
        ) : (
          generatedSections.map((item, index) => (
            <View key={`${item.sectionName}-${index}`} style={styles.tableRow}>
              <Text style={[styles.cellText, { flex: 1.2 }]}>
                {item.yearLevel}
              </Text>
              <Text style={[styles.cellText, { flex: 1 }]}>
                {item.sectionName}
              </Text>
              <Text style={[styles.cellText, { flex: 1.2 }]}>
                {item.students.length}
              </Text>

              <View style={{ width: 100, alignItems: 'center' }}>
                <TouchableOpacity
                  style={styles.openBtn}
                  onPress={() => handleOpenHonorList(item)}
                >
                  <Text style={styles.openBtnText}>Open</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <HonorRollPreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        adviser={adviser}
        generatedSections={selectedSection ? [selectedSection] : []}
        schoolYear={schoolYear}
        semester={semester}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 40,
    paddingTop: 30,
    paddingBottom: 40,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000',
  },
  infoIcon: {
    color: '#B71C1C',
    fontSize: 18,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },

  subHeader: {
    marginTop: 15,
    marginBottom: 30,
  },
  mainHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  subHeadingText: {
    fontSize: 14,
    color: '#444',
    marginTop: 2,
  },

  controlsCard: {
    marginBottom: 25,
    zIndex: 3000,
    elevation: 30,
  },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 15,
    flexWrap: 'wrap',
    zIndex: 3000,
    elevation: 30,
  },

  dropdownContainer: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    zIndex: 4000,
    elevation: 35,
  },

  dropdownButton: {
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
    elevation: 36,
  },
  dropdownButtonText: {
    fontSize: 12,
    color: '#000',
  },

  inlineDropdownMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CFCFCF',
    elevation: 40,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    overflow: 'hidden',
    zIndex: 5000,
  },

  dropdownItem: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#000',
  },

  generateBtn: {
    backgroundColor: '#B71C1C',
    minWidth: 190,
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 10,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    zIndex: 1,
    elevation: 0,
  },
  headerCell: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    zIndex: 1,
    elevation: 0,
  },
  cellText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '400',
  },

  openBtn: {
    backgroundColor: '#B71C1C',
    minWidth: 70,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  openBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    zIndex: 1,
    elevation: 0,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  previewWrapper: {
    width: '100%',
    maxWidth: 800,
    maxHeight: '92%',
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
  },
  previewCloseBtn: {
    backgroundColor: '#B71C1C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  previewCloseText: {
    color: '#FFF',
    fontWeight: '700',
  },

  previewScrollView: {
    flex: 1,
    ...(Platform.OS === 'web'
      ? ({
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        } as any)
      : {}),
  },

  previewScrollContent: {
    padding: 20,
    alignItems: 'center',
  },

  previewCard: {
    width: '100%',
    maxWidth: 800,
    backgroundColor: '#e8dbc4',
    borderWidth: 3,
    borderColor: '#f0d98a',
    overflow: 'hidden',
    marginBottom: 20,
  },
  previewHeaderImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  previewBody: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30,
  },
  previewCongrats: {
    textAlign: 'center',
    color: '#6b2f2f',
    fontSize: 34,
    fontStyle: 'italic',
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 16,
  },
  previewMetaBox: {
    marginBottom: 12,
  },
  previewMetaText: {
    color: '#5c3a34',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  previewTable: {
    marginTop: 10,
  },
  previewTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e61c23',
    borderWidth: 1,
    borderColor: '#fff',
  },
  previewHeaderCell: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#fff',
  },
  previewTableRow: {
    flexDirection: 'row',
    backgroundColor: '#e61c23',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#fff',
  },
  previewRowCell: {
    color: '#fff',
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#fff',
  },
  previewEmptyRow: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    width: '100%',
  },
  previewEmptyText: {
    textAlign: 'center',
    color: '#555',
    fontSize: 12,
  },
  previewBottomAccent: {
    height: 70,
    backgroundColor: '#e8dbc4',
  },

  getLinkBtn: {
    marginTop: 16,
    backgroundColor: '#B71C1C',
    paddingHorizontal: 20,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  getLinkBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});