import { Picker } from '@react-native-picker/picker';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
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
            <Text style={styles.uploadButtonText}>+ Upload File</Text>
          )}
        </Pressable>
      </View>

      {/* Class + Materials selector */}
      <View style={styles.selectorCard}>
        <Text style={styles.selectorTitle}>Choose class & materials</Text>

        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedClassId}
            onValueChange={handleClassSelect}
            style={styles.picker}
            dropdownIconColor="#D32F2F"
          >
            <Picker.Item label="-- Select a class --" value="" />
            {enrolledCourses.map(course => (
              <Picker.Item key={course.id} label={course.name} value={course.id} />
            ))}
          </Picker>
        </View>

        {selectedClassId !== '' && (
          <View style={styles.materialsList}>
            <Text style={styles.materialsLabel}>Select materials (one or more):</Text>
            {availableMaterials.length === 0 ? (
              <Text style={styles.noMaterials}>No materials uploaded for this class yet.</Text>
            ) : (
              availableMaterials.map(mat => (
                <Pressable
                  key={mat.id}
                  style={[
                    styles.materialItem,
                    selectedMaterialIds.includes(mat.id) && styles.materialItemSelected,
                  ]}
                  onPress={() => toggleMaterial(mat.id)}
                >
                  <Text style={styles.materialTitle}>{mat.title}</Text>
                </Pressable>
              ))
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
            <Text style={styles.generateButtonText}>Generate Quiz from Selected Materials</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  contentContainer: { paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 20,
  },
  titleWrap: { flex: 1 },
  pageTitle: { fontSize: 30, fontWeight: 'bold' },
  pageSubtitle: { color: '#666', marginTop: 4, fontSize: 14 },
  uploadButton: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    minWidth: 132,
    alignItems: 'center',
  },
  uploadButtonDisabled: { opacity: 0.6 },
  uploadButtonText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  selectorCard: { backgroundColor: '#F8F9FA', borderRadius: 20, padding: 20, marginTop: 16 },
  selectorTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  pickerWrapper: { borderWidth: 1, borderColor: '#DDD', borderRadius: 12, marginBottom: 16, backgroundColor: '#FFF' },
  picker: { height: 50, width: '100%' },
  materialsList: { marginBottom: 20 },
  materialsLabel: { fontWeight: '600', marginBottom: 8 },
  materialItem: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  materialItemSelected: { backgroundColor: '#D32F2F10', borderColor: '#D32F2F' },
  materialTitle: { fontSize: 14 },
  noMaterials: { color: '#999', fontStyle: 'italic' },
  generateButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  generateButtonDisabled: { opacity: 0.5 },
  generateButtonText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});

export default Game;