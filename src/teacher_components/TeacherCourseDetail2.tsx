import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import TeacherAssignmentSection from './TeacherAssignmentSection';
import TeacherMaterialSection from './TeacherMaterialSection';
import TeacherMembersSection from './TeacherMembersSection';
import TeacherSubmissionsSection from './TeacherSubmissionsSection';

export type Assignment = {
  id: string;
  title: string;
  description: string;
  posted: string;
  due: string;
  points: string;
  fileName?: string;
  fileUri?: string;
  fileType?: string;
};

export type Material = {
  id: string;
  title: string;
  week: string;
  posted: string;
  content?: string;
  fileName?: string;
  fileUri?: string;
  fileType?: string;
};

export type Member = {
  id: string;
  name: string;
  handle: string;
};

const TeacherCourseDetail2 = ({ onBack }: { onBack?: () => void }) => {
  const [activeTab, setActiveTab] = useState<'Materials' | 'Assignments'>('Materials');
  const [showMembers, setShowMembers] = useState(false);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);

  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([
    {
      id: '1',
      title: 'React Fundamental Quiz',
      description: 'Read and Answer Carefully',
      posted: 'Mar 5, 2026 (6:40 PM)',
      due: '2026-03-10 (11:59 PM)',
      points: '10',
      fileName: 'quiz-guide.pdf',
    },
    {
      id: '2',
      title: 'Build Simple Website',
      description: 'Use HTML/CSS',
      posted: 'Mar 5, 2026 (8:00 AM)',
      due: '2026-03-15 (11:59 PM)',
      points: '50',
    },
  ]);

  const [materials, setMaterials] = useState<Material[]>([
    {
      id: '1',
      title: 'Introduction to Python',
      week: 'Week 1',
      posted: 'Mar 5, 2026 (8:00 AM)',
      content:
        'Introduction to Python\n\nTopics:\n• Variables\n• Data Types\n• Input and Output\n• Basic Operators',
      fileName: 'python-introduction.pdf',
      fileUri: undefined,
      fileType: 'application/pdf',
    },
  ]);

  const [members, setMembers] = useState<Member[]>([
    { id: '7230494', name: 'Lisondra, Jade', handle: '@jadok' },
  ]);

  const [memberIdInput, setMemberIdInput] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPoints, setFormPoints] = useState('');
  const [formDue, setFormDue] = useState('');
  const [formWeek, setFormWeek] = useState('');

  const [pickedFile, setPickedFile] = useState<{
    name?: string | undefined;
    uri?: string | undefined;
    type?: string | undefined;
  } | null>(null);

  const [pickedAssignmentFile, setPickedAssignmentFile] = useState<{
    name?: string | undefined;
    uri?: string | undefined;
    type?: string | undefined;
  } | null>(null);

  const resetCreateForm = () => {
    setFormTitle('');
    setFormDesc('');
    setFormPoints('');
    setFormDue('');
    setFormWeek('');
    setPickedFile(null);
    setPickedAssignmentFile(null);
  };

  const openCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const openMaterialModal = (material: Material) => {
    setSelectedMaterial(material);
    setShowMaterialModal(true);
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

      setPickedFile({
        name: asset.name,
        uri: asset.uri,
        type: asset.mimeType,
      });
    } catch {
      Alert.alert('Error', 'Failed to pick file.');
    }
  };

  const handlePickAssignmentFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

      setPickedAssignmentFile({
        name: asset.name,
        uri: asset.uri,
        type: asset.mimeType,
      });
    } catch {
      Alert.alert('Error', 'Failed to pick assignment file.');
    }
  };

  const handleOpenUploadedFile = async (fileUri?: string) => {
    if (!fileUri) {
      Alert.alert('No File', 'No uploaded file available.');
      return;
    }

    try {
      await Linking.openURL(fileUri);
    } catch {
      Alert.alert('Error', 'Unable to open the file.');
    }
  };

  const handleCreate = () => {
    if (!formTitle.trim()) {
      Alert.alert('Required', 'Please enter a title.');
      return;
    }

    if (activeTab === 'Materials') {
      if (!formWeek.trim()) {
        Alert.alert('Required', 'Please enter the week.');
        return;
      }

      const newMaterial: Material = {
        id: Date.now().toString(),
        title: formTitle.trim(),
        week: formWeek.trim(),
        posted: new Date().toLocaleString(),
        content: `${formWeek.trim()} material: ${formTitle.trim()}`,
        fileName: pickedFile?.name ?? undefined,
        fileUri: pickedFile?.uri ?? undefined,
        fileType: pickedFile?.type ?? undefined,
      };

      setMaterials((prev) => [newMaterial, ...prev]);
      setShowCreateModal(false);
      resetCreateForm();
      Alert.alert('Success', 'Material created successfully.');
      return;
    }

    if (!formDesc.trim() || !formDue.trim() || !formPoints.trim()) {
      Alert.alert('Required', 'Please complete all assignment fields.');
      return;
    }

    const newAssignment: Assignment = {
      id: Date.now().toString(),
      title: formTitle.trim(),
      description: formDesc.trim(),
      posted: new Date().toLocaleString(),
      due: formDue.trim(),
      points: formPoints.trim(),
      fileName: pickedAssignmentFile?.name ?? undefined,
      fileUri: pickedAssignmentFile?.uri ?? undefined,
      fileType: pickedAssignmentFile?.type ?? undefined,
    };

    setAssignments((prev) => [newAssignment, ...prev]);
    setShowCreateModal(false);
    resetCreateForm();
    Alert.alert('Success', 'Assignment created successfully.');
  };

  const openUpdateModal = (item: Assignment | undefined) => {
    if (!item) return;
    setSelectedId(item.id);
    setFormTitle(item.title);
    setFormDesc(item.description);
    setFormPoints(item.points);
    setFormDue(item.due);
    setShowUpdateModal(true);
  };

  const handleUpdate = () => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === selectedId
          ? {
              ...a,
              title: formTitle,
              description: formDesc,
              points: formPoints,
              due: formDue,
            }
          : a
      )
    );
    setShowUpdateModal(false);
    Alert.alert('Success', 'Assignment Updated');
  };

  const handleDelete = () => {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setAssignments((prev) => prev.filter((a) => a.id !== selectedId));
          setShowUpdateModal(false);
          setShowSubmissions(false);
        },
      },
    ]);
  };

  const handleAddMember = () => {
    if (!memberIdInput.trim()) return;

    const newMember: Member = {
      id: memberIdInput.trim(),
      name: 'New Student',
      handle: '@newuser',
    };

    setMembers((prev) => [...prev, newMember]);
    setMemberIdInput('');
  };

  const handleRemoveMember = () => {
    setMembers((prev) => prev.filter((m) => m.id !== memberIdInput.trim()));
    setMemberIdInput('');
  };

  const currentAssignment = assignments.find((a) => a.id === selectedId);

  if (showSubmissions) {
    return (
      <>
        <TeacherSubmissionsSection
          members={members}
          currentAssignment={currentAssignment}
          onBack={() => setShowSubmissions(false)}
          onOpenUpdate={() => openUpdateModal(currentAssignment)}
        />

        <Modal visible={showUpdateModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.sidePanel}>
              <View style={styles.panelHeader}>
                <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                  <MaterialCommunityIcons name="chevron-left" size={28} color="#000" />
                </TouchableOpacity>
                <Text style={styles.panelTitle}>Update Assignment</Text>
              </View>

              <TextInput
                style={styles.inputBox}
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="Title"
              />
              <TextInput
                style={styles.inputBox}
                value={formDesc}
                onChangeText={setFormDesc}
                placeholder="Description"
              />
              <View style={styles.dualInputRow}>
                <TextInput
                  style={[styles.inputBox, { flex: 1 }]}
                  value={formPoints}
                  onChangeText={setFormPoints}
                  keyboardType="numeric"
                  placeholder="Points"
                />
                <TextInput
                  style={[styles.inputBox, { flex: 1 }]}
                  value="10"
                  editable={false}
                />
              </View>
              <TextInput
                style={styles.inputBox}
                value={formDue}
                onChangeText={setFormDue}
                placeholder="Due Date"
              />

              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteButtonText}>Delete Assignment</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
                <Text style={styles.updateButtonText}>Update Assignment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  if (showMembers) {
    return (
      <TeacherMembersSection
        members={members}
        memberIdInput={memberIdInput}
        setMemberIdInput={setMemberIdInput}
        onBack={() => setShowMembers(false)}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        onOpenSubmission={() => {
          setShowSubmissions(true);
          setShowMembers(false);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.redHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <MaterialCommunityIcons name="chevron-left" size={35} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.courseTitle}>CC123 (3A - Python)</Text>
            <Text style={styles.courseSubText}>Programming 2 (Lecture)</Text>
            <Text style={styles.instructorText}>Instructor: Ramcee Bading</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'Materials' && styles.tabActive]}
          onPress={() => setActiveTab('Materials')}
        >
          <MaterialCommunityIcons
            name="book-multiple"
            size={22}
            color={activeTab === 'Materials' ? '#C62828' : '#333'}
          />
          <Text style={[styles.tabLabel, activeTab === 'Materials' && styles.tabLabelActive]}>
            Materials ({materials.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'Assignments' && styles.tabActive]}
          onPress={() => setActiveTab('Assignments')}
        >
          <MaterialCommunityIcons
            name="clipboard-list"
            size={22}
            color={activeTab === 'Assignments' ? '#C62828' : '#333'}
          />
          <Text style={[styles.tabLabel, activeTab === 'Assignments' && styles.tabLabelActive]}>
            Assignments ({assignments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'Materials' ? (
        <TeacherMaterialSection
          materials={materials}
          onCreate={openCreateModal}
          onOpenMaterial={openMaterialModal}
        />
      ) : (
        <TeacherAssignmentSection
          assignments={assignments}
          onCreate={openCreateModal}
          onOpenMembers={(id) => {
            setSelectedId(id);
            setShowMembers(true);
          }}
        />
      )}

      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.createModalBox}>
            <View style={styles.createHeaderRow}>
              <Text style={styles.createTitle}>
                Create {activeTab === 'Materials' ? 'Material' : 'Assignment'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
              >
                <MaterialCommunityIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.inputBox}
              placeholder={activeTab === 'Materials' ? 'Material Title' : 'Assignment Title'}
              value={formTitle}
              onChangeText={setFormTitle}
            />

            {activeTab === 'Materials' ? (
              <>
                <TextInput
                  style={styles.inputBox}
                  placeholder="Week (example: Week 1)"
                  value={formWeek}
                  onChangeText={setFormWeek}
                />

                <TouchableOpacity style={styles.uploadBtn} onPress={handlePickFile}>
                  <MaterialCommunityIcons name="upload" size={20} color="#FFF" />
                  <Text style={styles.uploadBtnText}>Upload File</Text>
                </TouchableOpacity>

                {pickedFile?.name ? (
                  <View style={styles.filePreviewBox}>
                    <MaterialCommunityIcons
                      name="file-document-outline"
                      size={22}
                      color="#C62828"
                    />
                    <Text style={styles.filePreviewText}>{pickedFile.name}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <TextInput
                  style={styles.inputBox}
                  placeholder="Description"
                  value={formDesc}
                  onChangeText={setFormDesc}
                />
                <TextInput
                  style={styles.inputBox}
                  placeholder="Due Date"
                  value={formDue}
                  onChangeText={setFormDue}
                />
                <TextInput
                  style={styles.inputBox}
                  placeholder="Points"
                  keyboardType="numeric"
                  value={formPoints}
                  onChangeText={setFormPoints}
                />

                <TouchableOpacity style={styles.uploadBtn} onPress={handlePickAssignmentFile}>
                  <MaterialCommunityIcons name="upload" size={20} color="#FFF" />
                  <Text style={styles.uploadBtnText}>Upload File</Text>
                </TouchableOpacity>

                {pickedAssignmentFile?.name ? (
                  <View style={styles.filePreviewBox}>
                    <MaterialCommunityIcons
                      name="file-document-outline"
                      size={22}
                      color="#C62828"
                    />
                    <Text style={styles.filePreviewText}>{pickedAssignmentFile.name}</Text>
                  </View>
                ) : null}
              </>
            )}

            <TouchableOpacity style={styles.updateButton} onPress={handleCreate}>
              <Text style={styles.updateButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showMaterialModal} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.materialModalBox}>
            <View style={styles.createHeaderRow}>
              <Text style={styles.createTitle}>{selectedMaterial?.title || 'Material'}</Text>
              <TouchableOpacity onPress={() => setShowMaterialModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <Text style={styles.materialLabel}>Week</Text>
            <Text style={styles.materialValue}>{selectedMaterial?.week || '-'}</Text>

            <Text style={styles.materialLabel}>Posted</Text>
            <Text style={styles.materialValue}>{selectedMaterial?.posted || '-'}</Text>

            <Text style={styles.materialLabel}>Uploaded File</Text>
            {selectedMaterial?.fileName ? (
              <View style={styles.materialFileRow}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={24}
                  color="#C62828"
                />
                <View style={styles.materialFileInfo}>
                  <Text style={styles.materialFileName}>{selectedMaterial.fileName}</Text>
                  <TouchableOpacity
                    style={styles.openFileBtn}
                    onPress={() => handleOpenUploadedFile(selectedMaterial.fileUri)}
                  >
                    <Text style={styles.openFileBtnText}>Open File</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.noFileText}>No uploaded file</Text>
            )}

            <TouchableOpacity
              style={styles.updateButton}
              onPress={() => setShowMaterialModal(false)}
            >
              <Text style={styles.updateButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default TeacherCourseDetail2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  redHeader: {
    backgroundColor: '#C62828',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 10 },
  headerInfo: { flex: 1 },
  courseTitle: { color: '#FFF', fontSize: 28, fontWeight: 'bold' },
  courseSubText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 5 },
  instructorText: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 10,
  },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#C62828' },
  tabLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  tabLabelActive: { color: '#C62828' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 10,
  },
  sidePanel: {
    backgroundColor: '#FFF',
    width: 320,
    maxHeight: '92%',
    borderRadius: 15,
    padding: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  createModalBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
  },
  materialModalBox: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  createHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  createTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    marginRight: 12,
  },
  inputBox: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: '#333',
  },
  dualInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  uploadBtn: {
    backgroundColor: '#C62828',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  uploadBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  filePreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  filePreviewText: {
    marginLeft: 10,
    color: '#333',
    flex: 1,
    fontSize: 14,
  },
  materialLabel: {
    fontSize: 13,
    color: '#777',
    marginTop: 8,
    marginBottom: 4,
    fontWeight: '600',
  },
  materialValue: {
    fontSize: 15,
    color: '#222',
    marginBottom: 8,
  },
  materialFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 18,
  },
  materialFileInfo: {
    flex: 1,
    marginLeft: 10,
  },
  materialFileName: {
    fontSize: 15,
    color: '#222',
    fontWeight: '600',
    marginBottom: 8,
  },
  openFileBtn: {
    backgroundColor: '#C62828',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  openFileBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  noFileText: {
    fontSize: 14,
    color: '#777',
    marginBottom: 18,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#D32F2F',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  deleteButtonText: {
    color: '#D32F2F',
    fontSize: 13,
  },
  updateButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 5,
  },
  updateButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});