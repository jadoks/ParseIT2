import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QuizMasters, { QuizQuestion } from './games/quiz-masters';

type GameScreen = 'menu' | 'quizmasters';

interface Props {
  onNavigate?: (screen: GameScreen, generatedQuiz?: QuizQuestion[] | null) => void;
  enrolledCourses?: Array<{
    id: string;
    name: string;
    materials: Array<{ id: string; title: string; type: string }>;
  }>;
  studentId?: string;
  onSaveQuizScore?: (data: {
    classId: string;
    materialIds: string[];
    score: number;
    totalQuestions: number;
    answers: any[];
  }) => Promise<void>;
}

function getGameAiBaseUrl() {
  if (Platform.OS === 'web') return 'http://localhost:5000';
  const possibleHost =
    Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost || '';
  const host = possibleHost.split(':')[0];
  return host ? `http://${host}:5000` : 'http://192.168.1.5:5000';
}

const API_BASE_URL = getGameAiBaseUrl();

const apiFetch = (url: string, options: any = {}) =>
  fetch(url, { credentials: 'include', ...options });

const Game = ({ onNavigate, enrolledCourses = [], studentId, onSaveQuizScore }: Props) => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;

  const [mode, setMode] = useState<GameScreen>('menu');
  const [generatedQuestions, setGeneratedQuestions] = useState<QuizQuestion[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Class & material selection state
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<{ id: string; title: string }[]>([]);
  
  // Professional Dropdown State
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);

  // When a class is selected, show its materials
  useEffect(() => {
    if (!selectedClassId) {
      setAvailableMaterials([]);
      setSelectedMaterialIds([]);
      return;
    }
    const course = enrolledCourses.find(c => c.id === selectedClassId);
    setAvailableMaterials(course?.materials || []);
    setSelectedMaterialIds([]);
  }, [selectedClassId, enrolledCourses]);

  const handleClassSelect = (classId: string) => {
    setSelectedClassId(classId);
    setIsClassDropdownOpen(false);
  };

  const toggleMaterial = (materialId: string) => {
    setSelectedMaterialIds(prev =>
      prev.includes(materialId) ? prev.filter(id => id !== materialId) : [...prev, materialId]
    );
  };

  const generateFromMaterials = async () => {
    if (!selectedClassId || selectedMaterialIds.length === 0) {
      Alert.alert('Selection required', 'Please select a class and at least one material.');
      return;
    }
    if (!studentId) {
      Alert.alert('Not logged in', 'Student ID missing.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/game-ai/generate-quiz-materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClassId,
          materialIds: selectedMaterialIds,
          studentId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed');
      if (!data.questions?.length) throw new Error('No questions generated');

      setGeneratedQuestions(data.questions);
      setMode('quizmasters');
      if (onNavigate) onNavigate('quizmasters', data.questions);
    } catch (error: any) {
      Alert.alert('Generation failed', error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async () => {
    setIsGenerating(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType,
      } as any);

      const response = await apiFetch(`${API_BASE_URL}/game-ai/generate-quiz-masters`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setGeneratedQuestions(data.questions);
      setMode('quizmasters');
      if (onNavigate) onNavigate('quizmasters', data.questions);
    } catch (error: any) {
      Alert.alert('Upload failed', error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuizComplete = async (score: number, total: number, answers: any[]) => {
    if (selectedClassId && selectedMaterialIds.length > 0 && onSaveQuizScore) {
      try {
        await onSaveQuizScore({
          classId: selectedClassId,
          materialIds: selectedMaterialIds,
          score,
          totalQuestions: total,
          answers,
        });
        Alert.alert(
          'Score saved',
          `You scored ${score}/${total} (${Math.round((score / total) * 100)}%) for this class activity.`
        );
      } catch (err) {
        console.error('Save score error', err);
        Alert.alert('Error', 'Could not save score.');
      }
    }
    setMode('menu');
    setGeneratedQuestions(null);
  };

  if (mode === 'quizmasters' && generatedQuestions) {
    return (
      <QuizMasters
        onBack={() => setMode('menu')}
        generatedQuestions={generatedQuestions}
        onComplete={handleQuizComplete}
      />
    );
  }

  const selectedClassName = enrolledCourses.find(c => c.id === selectedClassId)?.name;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.pageTitle}>Games</Text>
          <Text style={styles.pageSubtitle}>
            Upload a file or select class materials to generate a quiz.
          </Text>
        </View>
        <Pressable
          style={[styles.uploadButton, isGenerating && styles.uploadButtonDisabled]}
          onPress={handleFileUpload}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
              <Text style={styles.uploadButtonText}>Upload File</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Class + Materials selector */}
      <View style={styles.selectorCard}>
        <Text style={styles.selectorTitle}>Choose class & materials</Text>

        {/* PROFESSIONAL CUSTOM DROPDOWN */}
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.inputLabel}>Select Class</Text>
          <TouchableOpacity 
            style={styles.dropdownTrigger} 
            onPress={() => setIsClassDropdownOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dropdownTriggerText, !selectedClassName && styles.placeholderText]}>
              {selectedClassName || '-- Select a class --'}
            </Text>
            <Ionicons 
              name={isClassDropdownOpen ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#D32F2F" 
            />
          </TouchableOpacity>
        </View>

        {/* Dropdown Modal */}
        <Modal
          visible={isClassDropdownOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsClassDropdownOpen(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setIsClassDropdownOpen(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select a Class</Text>
                <TouchableOpacity onPress={() => setIsClassDropdownOpen(false)}>
                  <Ionicons name="close-circle" size={28} color="#999" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                {enrolledCourses.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No enrolled classes found.</Text>
                  </View>
                ) : (
                  enrolledCourses.map(course => {
                    const isSelected = selectedClassId === course.id;
                    return (
                      <TouchableOpacity
                        key={course.id}
                        style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                        onPress={() => handleClassSelect(course.id)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                            {course.name}
                          </Text>
                          <Text style={styles.dropdownItemSub}>{course.materials.length} materials available</Text>
                        </View>
                        {isSelected && <Ionicons name="checkmark-circle" size={22} color="#D32F2F" />}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {selectedClassId !== '' && (
          <View style={styles.materialsSection}>
            <Text style={styles.inputLabel}>Select materials (one or more)</Text>
            {availableMaterials.length === 0 ? (
              <View style={styles.noMaterialsBox}>
                <Ionicons name="folder-open-outline" size={24} color="#999" />
                <Text style={styles.noMaterials}>No materials uploaded for this class yet.</Text>
              </View>
            ) : (
              <View style={styles.materialsGrid}>
                {availableMaterials.map(mat => {
                  const isSelected = selectedMaterialIds.includes(mat.id);
                  return (
                    <Pressable
                      key={mat.id}
                      style={[styles.materialChip, isSelected && styles.materialChipSelected]}
                      onPress={() => toggleMaterial(mat.id)}
                    >
                      <Ionicons 
                        name={isSelected ? "document-text" : "document-text-outline"} 
                        size={16} 
                        color={isSelected ? "#FFF" : "#D32F2F"} 
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.materialTitle, isSelected && styles.materialTitleSelected]}>
                        {mat.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <Pressable
          style={[
            styles.generateButton,
            (!selectedClassId || selectedMaterialIds.length === 0 || isGenerating) &&
              styles.generateButtonDisabled,
          ]}
          onPress={generateFromMaterials}
          disabled={!selectedClassId || selectedMaterialIds.length === 0 || isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="sparkles-outline" size={20} color="#FFF" />
              <Text style={styles.generateButtonText}>Generate Quiz</Text>
            </View>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  contentContainer: { padding: 24, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 28,
  },
  titleWrap: { flex: 1 },
  pageTitle: { fontSize: 32, fontWeight: '900', color: '#111', letterSpacing: -0.5 },
  pageSubtitle: { color: '#666', marginTop: 6, fontSize: 15, lineHeight: 22 },
  uploadButton: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadButtonDisabled: { opacity: 0.7, shadowOpacity: 0 },
  uploadButtonText: { color: '#FFF', fontWeight: '800', fontSize: 14, letterSpacing: 0.2 },
  
  selectorCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 24, 
    padding: 24, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  selectorTitle: { fontSize: 20, fontWeight: '800', marginBottom: 24, color: '#111' },
  
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#444', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  // Professional Dropdown Styles
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#EAEAEA',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
  },
  dropdownTriggerText: { fontSize: 15, fontWeight: '600', color: '#111', flex: 1 },
  placeholderText: { color: '#999', fontWeight: '500' },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 480,
    maxHeight: '70%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  modalList: { padding: 12 },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 4,
    backgroundColor: '#FAFAFA',
  },
  dropdownItemSelected: { backgroundColor: '#FFF1F1', borderWidth: 1, borderColor: '#FFD7D7' },
  dropdownItemText: { fontSize: 15, fontWeight: '700', color: '#333' },
  dropdownItemTextSelected: { color: '#D32F2F' },
  dropdownItemSub: { fontSize: 12, color: '#888', marginTop: 2, fontWeight: '500' },
  emptyState: { padding: 30, alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 14 },

  // Materials Grid
  materialsSection: { marginBottom: 24 },
  materialsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  materialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#EAEAEA',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  materialChipSelected: { backgroundColor: '#D32F2F', borderColor: '#D32F2F' },
  materialTitle: { fontSize: 13, fontWeight: '700', color: '#444', flexShrink: 1 },
  materialTitleSelected: { color: '#FFF' },
  noMaterialsBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  noMaterials: { color: '#999', fontSize: 14, fontStyle: 'italic' },

  generateButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  generateButtonDisabled: { opacity: 0.5, shadowOpacity: 0 },
  generateButtonText: { color: '#FFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },
});

export default Game;