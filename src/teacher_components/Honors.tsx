import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const headerImage = require('../../assets/images/myjourney-header-template-1.png');

type Cluster = {
  id: string;
  name: string;
  locked: boolean;
};

type Student = {
  name: string;
  id: string;
  unit: string;
  gpa: string;
  clusterId: string;
};

type DropdownProps = {
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  width?: number;
};

function CustomDropdown({
  value,
  options,
  onSelect,
  width = 160,
}: DropdownProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ width, zIndex: 1000 }}>
      <TouchableOpacity
        style={[styles.dropdownButton, { width }]}
        onPress={() => setVisible((prev) => !prev)}
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
              onPress={() => {
                onSelect(option);
                setVisible(false);
              }}
            >
              <Text style={styles.dropdownItemText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

type RenameModalProps = {
  visible: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
};

function RenameClusterModal({
  visible,
  onClose,
  value,
  onChange,
  onConfirm,
}: RenameModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.renameOverlay}>
        <View style={styles.renameModalCard}>
          <Text style={styles.renameModalTitle}>Rename Cluster</Text>

          <TextInput
            style={styles.renameModalInput}
            placeholder="Enter new cluster name"
            placeholderTextColor="#999"
            value={value}
            onChangeText={onChange}
          />

          <View style={styles.renameModalActions}>
            <TouchableOpacity style={styles.renameCancelBtn} onPress={onClose}>
              <Text style={styles.renameCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.renameSaveBtn} onPress={onConfirm}>
              <Text style={styles.renameSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type PreviewProps = {
  visible: boolean;
  onClose: () => void;
  clusterName: string;
  adviser: string;
  students: Student[];
  schoolYear: string;
  semester: string;
};

function HonorRollPreviewModal({
  visible,
  onClose,
  clusterName,
  adviser,
  students,
  schoolYear,
  semester,
}: PreviewProps) {
  if (!visible) return null;

  const handleGetLink = async () => {
    const generatedLink = `https://honorroll.example.com/view?cluster=${encodeURIComponent(
      clusterName
    )}&sy=${encodeURIComponent(schoolYear)}&semester=${encodeURIComponent(semester)}`;

    const supported = await Linking.canOpenURL(generatedLink);

    if (supported) {
      Linking.openURL(generatedLink);
    } else {
      Alert.alert('Link Generated', generatedLink);
    }
  };

  return (
    <View style={styles.previewOverlay}>
      <View style={styles.previewWrapper}>
        <View style={styles.previewTopBar}>
          <Text style={styles.previewTitle}>Honor Roll Preview</Text>
          <TouchableOpacity onPress={onClose} style={styles.previewCloseBtn}>
            <Text style={styles.previewCloseText}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.previewScrollContent}>
          <View style={styles.previewCard}>
            <Image source={headerImage} style={styles.previewHeaderImage} />

            <View style={styles.previewBody}>
              <Text style={styles.previewCongrats}>Congratulations</Text>

              <View style={styles.previewMetaBox}>
                <Text style={styles.previewMetaText}>
                  Course Year / Section: {clusterName}
                </Text>
                <Text style={styles.previewMetaText}>Adviser: {adviser}</Text>
                <Text style={styles.previewMetaText}>Academic Year: {schoolYear}</Text>
                <Text style={styles.previewMetaText}>Semester: {semester}</Text>
                <Text style={styles.previewMetaText}>
                  Total No. of Students: {students.length}
                </Text>
              </View>

              <View style={styles.previewTable}>
                <View style={styles.previewTableHeader}>
                  <Text style={[styles.previewHeaderCell, { width: 45 }]}>NO.</Text>
                  <Text style={[styles.previewHeaderCell, { flex: 1 }]}>
                    NAME OF STUDENT
                  </Text>
                  <Text style={[styles.previewHeaderCell, { width: 70 }]}>GWA</Text>
                </View>

                {students.length === 0 ? (
                  <View style={styles.previewEmptyRow}>
                    <Text style={styles.previewEmptyText}>
                      No generated honor roll yet.
                    </Text>
                  </View>
                ) : (
                  students.map((student, index) => (
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
                  ))
                )}
              </View>
            </View>

            <View style={styles.previewBottomAccent} />
          </View>

          <TouchableOpacity style={styles.getLinkBtn} onPress={handleGetLink}>
            <Text style={styles.getLinkBtnText}>Get Link</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

export default function HonorsScreen() {
  const [activeTab, setActiveTab] = useState<'My Cluster' | 'Draft'>('My Cluster');

  const [clusterName, setClusterName] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [selectedClusterId, setSelectedClusterId] = useState('cluster-1');
  const [renameModalVisible, setRenameModalVisible] = useState(false);

  const [clusters, setClusters] = useState<Cluster[]>([
    { id: 'cluster-1', name: '3A - PYTHON', locked: false },
    { id: 'cluster-2', name: '3B - JAVA', locked: false },
    { id: 'cluster-3', name: '3C - C++', locked: false },
    { id: 'cluster-4', name: '3D - WEB DEV', locked: false },
  ]);

  const academicYears = [
    'S.Y 2023 - 2024',
    'S.Y 2024 - 2025',
    'S.Y 2025 - 2026',
    'S.Y 2026 - 2027',
  ];

  const semesters = ['First Semester', 'Second Semester', 'Summer'];

  const [schoolYear, setSchoolYear] = useState('S.Y 2025 - 2026');
  const [semester, setSemester] = useState('First Semester');

  const allStudents: Student[] = [
    { name: 'Alvarez, Tangal', id: '1', unit: '25', gpa: '1.500', clusterId: 'cluster-1' },
    { name: 'Almonia, Emo Cyril', id: '2', unit: '24', gpa: '1.520', clusterId: 'cluster-1' },
    { name: 'Sarmiento, Jade Anne', id: '3', unit: '26', gpa: '1.430', clusterId: 'cluster-1' },
    { name: 'Reyes, Mark Daniel', id: '4', unit: '25', gpa: '1.610', clusterId: 'cluster-1' },
    { name: 'Torres, Angela Mae', id: '5', unit: '23', gpa: '1.720', clusterId: 'cluster-1' },
   
  ];

  const [studentId, setStudentId] = useState('');
  const [generatedStudents, setGeneratedStudents] = useState<Student[]>([]);
  const [selectedStudentRowId, setSelectedStudentRowId] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const selectedCluster = useMemo(
    () => clusters.find((cluster) => cluster.id === selectedClusterId),
    [clusters, selectedClusterId]
  );

  const adviser = 'Tristan Mondisico';

  const handleAddCluster = () => {
    const trimmedName = clusterName.trim();

    if (!trimmedName) {
      Alert.alert('Validation', 'Please enter a cluster name.');
      return;
    }

    const exists = clusters.some(
      (cluster) => cluster.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (exists) {
      Alert.alert('Duplicate', 'Cluster name already exists.');
      return;
    }

    const newCluster: Cluster = {
      id: `cluster-${Date.now()}`,
      name: trimmedName,
      locked: false,
    };

    setClusters((prev) => [...prev, newCluster]);
    setSelectedClusterId(newCluster.id);
    setClusterName('');
  };

  const openRenameModal = () => {
    if (!selectedCluster) {
      Alert.alert('No Selection', 'Please select a cluster first.');
      return;
    }

    if (selectedCluster.locked) {
      Alert.alert('Locked', 'This cluster is locked and cannot be renamed.');
      return;
    }

    setRenameValue(selectedCluster.name);
    setRenameModalVisible(true);
  };

  const handleRenameCluster = () => {
    const trimmedName = renameValue.trim();

    if (!selectedCluster) {
      Alert.alert('No Selection', 'Please select a cluster first.');
      return;
    }

    if (selectedCluster.locked) {
      Alert.alert('Locked', 'This cluster is locked and cannot be renamed.');
      return;
    }

    if (!trimmedName) {
      Alert.alert('Validation', 'Type the new cluster name.');
      return;
    }

    const exists = clusters.some(
      (cluster) =>
        cluster.name.toLowerCase() === trimmedName.toLowerCase() &&
        cluster.id !== selectedClusterId
    );

    if (exists) {
      Alert.alert('Duplicate', 'Another cluster already uses that name.');
      return;
    }

    setClusters((prev) =>
      prev.map((cluster) =>
        cluster.id === selectedClusterId
          ? { ...cluster, name: trimmedName }
          : cluster
      )
    );

    setRenameModalVisible(false);
    setRenameValue('');
    Alert.alert('Success', 'Cluster renamed successfully.');
  };

  const handleDeleteCluster = () => {
    if (!selectedCluster) {
      Alert.alert('No Selection', 'Please select a cluster first.');
      return;
    }

    if (selectedCluster.locked) {
      Alert.alert('Locked', 'This cluster is locked and cannot be deleted.');
      return;
    }

    if (clusters.length === 1) {
      Alert.alert('Not Allowed', 'At least one cluster must remain.');
      return;
    }

    const updatedClusters = clusters.filter((cluster) => cluster.id !== selectedClusterId);
    setClusters(updatedClusters);
    setSelectedClusterId(updatedClusters[0].id);
    setGeneratedStudents((prev) =>
      prev.filter((student) => student.clusterId !== selectedClusterId)
    );
    setSelectedStudentRowId(null);
  };

  const handleToggleLockCluster = () => {
    if (!selectedCluster) {
      Alert.alert('No Selection', 'Please select a cluster first.');
      return;
    }

    setClusters((prev) =>
      prev.map((cluster) =>
        cluster.id === selectedClusterId
          ? { ...cluster, locked: !cluster.locked }
          : cluster
      )
    );
  };

  const handleGenerate = () => {
    if (!selectedClusterId) {
      Alert.alert('No Cluster', 'Please select a cluster first.');
      return;
    }

    let filtered =
      generatedStudents.length > 0
        ? generatedStudents
        : allStudents
            .filter((student) => student.clusterId === selectedClusterId)
            .filter((student) => Number(student.gpa) <= 2.0);

    const student7230479 = allStudents.find((student) => student.id === '7230479');

    if (student7230479) {
      const alreadyIncluded = filtered.some((student) => student.id === '7230479');
      if (!alreadyIncluded) {
        filtered = [student7230479, ...filtered];
      }
    }

    setGeneratedStudents(filtered);

    if (filtered.length === 0) {
      Alert.alert('No Results', 'No honor roll students found.');
      return;
    }

    setPreviewVisible(true);
  };

  const handleSearchStudent = () => {
    const trimmedId = studentId.trim();

    if (!trimmedId) {
      Alert.alert('Validation', 'Please enter a student ID.');
      return;
    }

    const foundStudent = allStudents.find((student) => student.id === trimmedId);

    if (!foundStudent) {
      Alert.alert('Not Found', 'Student ID not found. Use 1, 2, 3, 4, 5, or 7230479.');
      return;
    }

    const isQualified = Number(foundStudent.gpa) <= 2.0;

    if (!isQualified) {
      Alert.alert('Not Qualified', 'This student is not qualified for honor roll.');
      return;
    }

    setGeneratedStudents((prev) => {
      const alreadyExists = prev.some((student) => student.id === foundStudent.id);
      if (alreadyExists) {
        return prev;
      }
      return [foundStudent, ...prev];
    });

   
    setStudentId('');
  };

  const handleRemoveStudent = () => {
    if (selectedStudentRowId) {
      setGeneratedStudents((prev) =>
        prev.filter((student) => student.id !== selectedStudentRowId)
      );
      setSelectedStudentRowId(null);
      setStudentId('');
      return;
    }

    const trimmedId = studentId.trim();

    if (!trimmedId) {
      Alert.alert('Validation', 'Click a row first or enter a student ID.');
      return;
    }

    const exists = generatedStudents.some((student) => student.id === trimmedId);

    if (!exists) {
      Alert.alert('Not Found', 'Student is not in the generated honor roll.');
      return;
    }

    setGeneratedStudents((prev) => prev.filter((student) => student.id !== trimmedId));
    setStudentId('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Honors</Text>
          <Text style={styles.infoIcon}>i</Text>
        </View>

        <View style={styles.subHeader}>
          <Text style={styles.mainHeading}>Generate Honor Roll</Text>
          <Text style={styles.subHeadingText}>Create Dean&apos;s listers for your class</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'My Cluster' && styles.tabActive]}
            onPress={() => setActiveTab('My Cluster')}
          >
            <View style={styles.tabLabelRow}>
              <Ionicons
                name="checkmark"
                size={18}
                color={activeTab === 'My Cluster' ? '#B71C1C' : '#333'}
              />
              <Text style={[styles.tabText, activeTab === 'My Cluster' && styles.tabTextActive]}>
                My Cluster
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'Draft' && styles.tabActive]}
            onPress={() => setActiveTab('Draft')}
          >
            <View style={styles.tabLabelRow}>
              <Ionicons
                name="document-text-outline"
                size={16}
                color={activeTab === 'Draft' ? '#B71C1C' : '#333'}
              />
              <Text style={[styles.tabText, activeTab === 'Draft' && styles.tabTextActive]}>
                Draft
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {activeTab === 'My Cluster' ? (
          <View>
            <View style={styles.actionRow}>
              <TextInput
                style={styles.input}
                placeholder="Enter Cluster Name"
                placeholderTextColor="#A9A9A9"
                value={clusterName}
                onChangeText={setClusterName}
              />
              <TouchableOpacity style={styles.addBtn} onPress={handleAddCluster}>
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlineBtn} onPress={openRenameModal}>
                <Text style={styles.outlineBtnText}>Rename</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlineBtn} onPress={handleDeleteCluster}>
                <Text style={styles.outlineBtnText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlineBtn} onPress={handleToggleLockCluster}>
                <Text style={styles.outlineBtnText}>
                  {selectedCluster?.locked ? 'Unlock' : 'Lock'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.clusterGrid}>
              {clusters.map((item) => {
                const isSelected = selectedClusterId === item.id;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.clusterItem}
                    onPress={() => setSelectedClusterId(item.id)}
                  >
                    <View style={styles.radioOuter}>
                      {isSelected ? <View style={styles.radioInner} /> : null}
                    </View>
                    <Text style={styles.clusterText}>
                      {item.name} {item.locked ? '(Locked)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.draftControlsRow}>
              <CustomDropdown
                value={schoolYear}
                options={academicYears}
                onSelect={setSchoolYear}
                width={170}
              />

              <CustomDropdown
                value={semester}
                options={semesters}
                onSelect={setSemester}
                width={160}
              />

              <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate}>
                <Text style={styles.generateBtnText}>Generate</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.idInputRow}>
              <TextInput
                style={styles.idInput}
                placeholder="Enter Student ID"
                value={studentId}
                onChangeText={setStudentId}
              />
              <TouchableOpacity onPress={handleSearchStudent}>
                <Text style={styles.mathSymbol}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRemoveStudent}>
                <Text style={styles.mathSymbol}>-</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, { flex: 2 }]}>Student Name</Text>
              <Text style={[styles.headerCell, { flex: 1 }]}>Student ID</Text>
              <Text style={[styles.headerCell, { flex: 0.5 }]}>Unit</Text>
              <Text style={[styles.headerCell, { flex: 0.5 }]}>GPA</Text>
            </View>

            {generatedStudents.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No generated honor roll yet. Search student ID 1, 2, 3, 4, 5.
                </Text>
              </View>
            ) : (
              generatedStudents.map((item) => {
                const isSelected = selectedStudentRowId === item.id;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.tableRow, isSelected ? styles.selectedTableRow : null]}
                    onPress={() => setSelectedStudentRowId(item.id)}
                  >
                    <Text style={[styles.cellText, { flex: 2 }]}>{item.name}</Text>
                    <Text style={[styles.cellText, { flex: 1 }]}>{item.id}</Text>
                    <Text style={[styles.cellText, { flex: 0.5 }]}>{item.unit}</Text>
                    <Text style={[styles.cellText, { flex: 0.5 }]}>{item.gpa}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      <RenameClusterModal
        visible={renameModalVisible}
        onClose={() => setRenameModalVisible(false)}
        value={renameValue}
        onChange={setRenameValue}
        onConfirm={handleRenameCluster}
      />

      <HonorRollPreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        clusterName={selectedCluster?.name || '3A - PYTHON'}
        adviser={adviser}
        students={generatedStudents}
        schoolYear={schoolYear}
        semester={semester}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 40, paddingTop: 30, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 36, fontWeight: '800', color: '#000' },
  infoIcon: { color: '#B71C1C', fontSize: 18, fontWeight: 'bold', fontStyle: 'italic' },
  subHeader: { marginTop: 15, marginBottom: 35 },
  mainHeading: { fontSize: 22, fontWeight: '700', color: '#000' },
  subHeadingText: { fontSize: 14, color: '#444', marginTop: 2 },

  tabContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabItem: {
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#B71C1C' },
  tabText: { fontSize: 14, color: '#333', fontWeight: '500' },
  tabTextActive: { color: '#B71C1C', fontWeight: 'bold' },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  input: {
    width: 280,
    height: 40,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  addBtn: {
    backgroundColor: '#B71C1C',
    height: 40,
    paddingHorizontal: 25,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addBtnText: { color: '#FFF', fontWeight: 'bold' },
  outlineBtn: {
    height: 40,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#B71C1C',
    borderRadius: 8,
    justifyContent: 'center',
  },
  outlineBtnText: { color: '#B71C1C', fontSize: 12 },

  clusterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 30, marginTop: 10 },
  clusterItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#B71C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B71C1C',
  },
  clusterText: { fontSize: 14, fontWeight: '800', color: '#000' },

  draftControlsRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 15,
  marginBottom: 15,
  flexWrap: 'wrap',
  zIndex: 999,
},
  dropdownButton: {
  height: 38,
  borderWidth: 1,
  borderColor: '#333',
  borderRadius: 6,
  paddingHorizontal: 10,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: '#FFF',
},
  dropdownButtonText: {
    fontSize: 12,
    color: '#000',
  },
  inlineDropdownMenu: {
  position: 'absolute',
  top: 42,
  left: 0,
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
},
  dropdownItemText: {
    fontSize: 13,
    color: '#000',
  },

  dropdownWrapper: {
  position: 'relative',
  zIndex: 9999,
},

  generateBtn: {
    backgroundColor: '#B71C1C',
    width: 130,
    height: 38,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateBtnText: { color: '#FFF', fontSize: 12, fontWeight: '500' },

  idInputRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 30 },
  idInput: {
    width: 230,
    height: 45,
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  mathSymbol: { fontSize: 24, color: '#333', fontWeight: '600' },

  tableHeader: { flexDirection: 'row', paddingBottom: 10, marginTop: 10 },
  headerCell: { fontSize: 13, color: '#555', fontWeight: '400' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#FFF',
  },
  selectedTableRow: {
    backgroundColor: '#FDECEC',
  },
  cellText: { fontSize: 14, color: '#000', fontWeight: '400' },

  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 8,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
  },

  renameOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  renameModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 20,
  },
  renameModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    marginBottom: 14,
  },
  renameModalInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  renameModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  renameCancelBtn: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCC',
    justifyContent: 'center',
  },
  renameCancelText: {
    color: '#333',
    fontWeight: '600',
  },
  renameSaveBtn: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#B71C1C',
    justifyContent: 'center',
  },
  renameSaveText: {
    color: '#FFF',
    fontWeight: '700',
  },

  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
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
    backgroundColor: '',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
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