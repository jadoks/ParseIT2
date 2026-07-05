import AsyncStorage from '@react-native-async-storage/async-storage';
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
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { QuizQuestion } from './games/quiz-masters';

type GameScreen = 'menu' | 'quizmasters';

interface Props {
  // 🌟 UPDATED: Added gameType to the onNavigate callback
  onNavigate?: (screen: GameScreen, generatedQuiz?: QuizQuestion[] | null, gameType?: string) => void;
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
const apiFetch = (url: string, options: any = {}) => fetch(url, { credentials: 'include', ...options });

// 🌟 FIXED: Game options now match exactly what the backend supports
const gameOptions = [
  { value: 'quiz_master', label: 'Multiple Choice', icon: 'list-outline' },
  { value: 'memory_match', label: 'Matching Type', icon: 'swap-horizontal-outline' },
  { value: 'flashcard', label: 'Flashcards', icon: 'albums-outline' },
  { value: 'fill_in_blanks', label: 'Fill in the Blanks', icon: 'create-outline' },
];

// 🌟 NEW: Daily AI generation limit config
const MAX_QUESTIONS_PER_GENERATION = 20;
const MAX_GENERATIONS_PER_DAY = 10;

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

// 🌟 NEW: Per-student storage key so each student gets their own 10/day pool,
// even if multiple students use the same device.
function getGenerationLimitStorageKey(studentId?: string) {
  return `gameAi_dailyGenerationLimit_${studentId || 'anonymous'}`;
}

const Game = ({ onNavigate, enrolledCourses = [], studentId, onSaveQuizScore }: Props) => {
  const { width } = useWindowDimensions();
  const [uploadStage, setUploadStage] = useState<string>('');
  const [mode, setMode] = useState<GameScreen>('menu');
  const [generatedQuestions, setGeneratedQuestions] = useState<QuizQuestion[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [numberOfQuestions, setNumberOfQuestions] = useState('10');
  const [gameType, setGameType] = useState<string>('');

  // 🌟 NEW: Track how many AI generations have been used today
  const [generationsUsedToday, setGenerationsUsedToday] = useState<number>(0);
  const [isLimitLoaded, setIsLimitLoaded] = useState(false);

  const parsedCount = parseInt(numberOfQuestions, 10) || 0;
  const isInvalidCount = parsedCount > MAX_QUESTIONS_PER_GENERATION || parsedCount < 1;
  const remainingGenerations = Math.max(0, MAX_GENERATIONS_PER_DAY - generationsUsedToday);
  const hasReachedDailyLimit = generationsUsedToday >= MAX_GENERATIONS_PER_DAY;

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<{ id: string; title: string }[]>([]);
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);

  // 🌟 NEW: Load this student's generation count on mount, and whenever the
  // logged-in student changes (resets automatically on a new day too).
  useEffect(() => {
    let isCancelled = false;
    const loadGenerationCount = async () => {
      setIsLimitLoaded(false);
      const storageKey = getGenerationLimitStorageKey(studentId);
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        const todayKey = getTodayKey();
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.date === todayKey) {
            if (!isCancelled) setGenerationsUsedToday(parsed.count || 0);
          } else {
            if (!isCancelled) setGenerationsUsedToday(0);
            await AsyncStorage.setItem(storageKey, JSON.stringify({ date: todayKey, count: 0 }));
          }
        } else {
          if (!isCancelled) setGenerationsUsedToday(0);
          await AsyncStorage.setItem(storageKey, JSON.stringify({ date: todayKey, count: 0 }));
        }
      } catch (err) {
        console.warn('Failed to load AI generation limit:', err);
      } finally {
        if (!isCancelled) setIsLimitLoaded(true);
      }
    };
    loadGenerationCount();
    return () => {
      isCancelled = true;
    };
  }, [studentId]);

  // 🌟 NEW: Increment and persist this student's generation count
  const recordGenerationUsed = async () => {
    const storageKey = getGenerationLimitStorageKey(studentId);
    const todayKey = getTodayKey();
    const nextCount = generationsUsedToday + 1;
    setGenerationsUsedToday(nextCount);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify({ date: todayKey, count: nextCount }));
    } catch (err) {
      console.warn('Failed to persist AI generation limit:', err);
    }
  };

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
    if (!gameType) return Alert.alert('Selection required', 'Please select a game type first.');
    if (!selectedClassId || selectedMaterialIds.length === 0) return Alert.alert('Selection required', 'Please select a class and at least one material.');
    if (!studentId) return Alert.alert('Not logged in', 'Student ID missing.');
    if (isInvalidCount) return Alert.alert('Invalid count', `Please enter between 1 and ${MAX_QUESTIONS_PER_GENERATION} items.`);
    // 🌟 NEW: Enforce daily AI generation limit
    if (hasReachedDailyLimit) {
      return Alert.alert(
        'Daily limit reached',
        `You've used all ${MAX_GENERATIONS_PER_DAY} AI generations for today. Please try again tomorrow.`
      );
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
          gameType: gameType, 
          numberOfQuestions: parsedCount, 
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed');
      if (!data.questions?.length) throw new Error('No questions generated');

      setGeneratedQuestions(data.questions);
      setMode('quizmasters');
      // 🌟 NEW: Count this as one of today's AI generations
      await recordGenerationUsed();
      // 🌟 PASS gameType to the navigator
      if (onNavigate) onNavigate('quizmasters', data.questions, gameType);
    } catch (error: any) {
      Alert.alert('Generation failed', error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async () => {
    if (!gameType) return Alert.alert('Selection required', 'Please select a game type first.');
    if (isInvalidCount) return Alert.alert('Invalid count', `Please enter between 1 and ${MAX_QUESTIONS_PER_GENERATION} items.`);
    // 🌟 NEW: Enforce daily AI generation limit
    if (hasReachedDailyLimit) {
      return Alert.alert(
        'Daily limit reached',
        `You've used all ${MAX_GENERATIONS_PER_DAY} AI generations for today. Please try again tomorrow.`
      );
    }
    
    setUploadStage('Selecting file...');
    setIsGenerating(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain', 'image/jpeg', 'image/png', 'image/webp'],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled || !result.assets?.length) {
        setUploadStage('');
        setIsGenerating(false);
        return;
      }

      const asset = result.assets[0];
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const fileResponse = await fetch(asset.uri);
        const blob = await fileResponse.blob();
        formData.append('file', blob, asset.name || 'upload');
      } else {
        formData.append('file', {
          uri: asset.uri,
          name: asset.name || 'upload',
          type: asset.mimeType || 'application/octet-stream',
        } as any);
      }

      setUploadStage('Uploading...');
      const uploadResponse = await apiFetch(`${API_BASE_URL}/game/upload`, {
        method: 'POST',
        credentials: "include",
        body: formData,
      });
      
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadData.error || 'Upload failed');
      const { uploadId } = uploadData;

      setUploadStage('Processing...');
      const processResponse = await apiFetch(`${API_BASE_URL}/game/process`, {
        method: 'POST',
        credentials: "include",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          studentId,
          gameType: gameType, 
          numberOfQuestions: parsedCount, 
        }),
      });

      setUploadStage('Generating Quiz...');
      const processData = await processResponse.json();
      if (!processResponse.ok) throw new Error(processData.error || 'Processing failed');

      setUploadStage('Complete');
      setGeneratedQuestions(processData.questions);
      setMode('quizmasters');
      // 🌟 NEW: Count this as one of today's AI generations
      await recordGenerationUsed();
      // 🌟 PASS gameType to the navigator
      if (onNavigate) onNavigate('quizmasters', processData.questions, gameType);
      
    } catch (error: any) {
      Alert.alert('Upload failed', error.message);
    } finally {
      setUploadStage('');
      setIsGenerating(false);
    }
  };

  const selectedClassName = enrolledCourses.find(c => c.id === selectedClassId)?.name;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.pageTitle}>Games</Text>
          <Text style={styles.pageSubtitle}>Upload a file or select class materials to generate a quiz.</Text>
        </View>
        
        <Pressable
          style={[styles.uploadButton, (isGenerating || isInvalidCount || !gameType || hasReachedDailyLimit) && styles.uploadButtonDisabled]}
          onPress={handleFileUpload}
          disabled={isGenerating || isInvalidCount || !gameType || hasReachedDailyLimit}
        >
          {isGenerating ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={styles.uploadButtonText}>{uploadStage || 'Uploading...'}</Text>
            </View>
          ) : !gameType ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="alert-circle-outline" size={18} color="#FFF" />
              <Text style={styles.uploadButtonText}>Select Game Type</Text>
            </View>
          ) : hasReachedDailyLimit ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="lock-closed-outline" size={18} color="#FFF" />
              <Text style={styles.uploadButtonText}>Daily Limit Reached</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
              <Text style={styles.uploadButtonText}>Upload File</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* 🌟 NEW: Daily AI generation usage banner */}
      {isLimitLoaded && (
        <View style={[styles.limitBanner, hasReachedDailyLimit && styles.limitBannerReached]}>
          <Ionicons
            name={hasReachedDailyLimit ? 'alert-circle' : 'sparkles'}
            size={18}
            color={hasReachedDailyLimit ? '#D32F2F' : '#2E7D32'}
          />
          <Text style={[styles.limitBannerText, hasReachedDailyLimit && styles.limitBannerTextReached]}>
            {hasReachedDailyLimit
              ? `You've used all ${MAX_GENERATIONS_PER_DAY} AI generations today. Come back tomorrow!`
              : `${remainingGenerations} of ${MAX_GENERATIONS_PER_DAY} AI generations remaining today`}
          </Text>
        </View>
      )}

      <View style={styles.settingsCard}>
        <View style={styles.settingsHeader}>
          <Ionicons name="settings-outline" size={22} color="#D32F2F" />
          <Text style={styles.settingsTitle}>Quiz Settings</Text>
        </View>
        <Text style={styles.settingsSubtitle}>
          This configuration applies to both <Text style={{fontWeight: '700'}}>File Uploads</Text> and <Text style={{fontWeight: '700'}}>Class Lessons</Text>.
        </Text>
        
        <View>
          <Text style={styles.inputLabel}>Number of Questions / Items (Max {MAX_QUESTIONS_PER_GENERATION})</Text>
          <TextInput
            style={[styles.questionsInput, isInvalidCount && styles.questionsInputError]}
            placeholder="e.g., 10"
            placeholderTextColor="#999"
            value={numberOfQuestions}
            onChangeText={(text) => setNumberOfQuestions(text.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
          />
          {isInvalidCount && (
            <Text style={styles.errorText}>
              {parsedCount > MAX_QUESTIONS_PER_GENERATION ? `Maximum limit is ${MAX_QUESTIONS_PER_GENERATION} items.` : 'Please enter at least 1 item.'}
            </Text>
          )}
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={styles.inputLabel}>Game Type</Text>
          <View style={styles.gameTypeGrid}>
            {gameOptions.map((opt) => {
              const isSelected = gameType === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.gameTypeChip, isSelected && styles.gameTypeChipSelected]}
                  onPress={() => setGameType(opt.value)}
                >
                  <Ionicons name={opt.icon} size={16} color={isSelected ? "#FFF" : "#D32F2F"} style={{ marginRight: 6 }} />
                  <Text style={[styles.gameTypeText, isSelected && styles.gameTypeTextSelected]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {!gameType && <Text style={[styles.errorText, { marginTop: 8 }]}>Please select a game type to continue.</Text>}
        </View>
      </View>

      <View style={styles.selectorCard}>
        <Text style={styles.selectorTitle}>Choose class & lesson</Text>
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.inputLabel}>Select Class</Text>
          <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setIsClassDropdownOpen(true)} activeOpacity={0.7}>
            <Text style={[styles.dropdownTriggerText, !selectedClassName && styles.placeholderText]}>
              {selectedClassName || '-- Select a class --'}
            </Text>
            <Ionicons name={isClassDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color="#D32F2F" />
          </TouchableOpacity>
        </View>

        <Modal visible={isClassDropdownOpen} transparent animationType="fade" onRequestClose={() => setIsClassDropdownOpen(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsClassDropdownOpen(false)}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select a Class</Text>
                <TouchableOpacity onPress={() => setIsClassDropdownOpen(false)}>
                  <Ionicons name="close-circle" size={28} color="#999" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                {enrolledCourses.length === 0 ? (
                  <View style={styles.emptyState}><Text style={styles.emptyText}>No enrolled classes found.</Text></View>
                ) : (
                  enrolledCourses.map(course => {
                    const isSelected = selectedClassId === course.id;
                    return (
                      <TouchableOpacity key={course.id} style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]} onPress={() => handleClassSelect(course.id)}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>{course.name}</Text>
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
    <View style={styles.materialsHeaderRow}>
      <Text style={styles.inputLabel}>Select one Lesson</Text>
      {selectedMaterialIds.length > 0 && (
        <TouchableOpacity onPress={() => setSelectedMaterialIds([])} hitSlop={8}>
          <Text style={styles.clearSelectionText}>Show all ({availableMaterials.length})</Text>
        </TouchableOpacity>
      )}
    </View>
    {availableMaterials.length === 0 ? (
      <View style={styles.noMaterialsBox}>
        <Ionicons name="folder-open-outline" size={24} color="#999" />
        <Text style={styles.noMaterials}>No materials uploaded for this class yet.</Text>
      </View>
    ) : (
      <View style={styles.materialsGrid}>
        {(selectedMaterialIds.length > 0
          ? availableMaterials.filter(mat => selectedMaterialIds.includes(mat.id))
          : availableMaterials
        ).map(mat => {
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
              {isSelected && (
                <Ionicons name="close-circle" size={16} color="#FFF" style={{ marginLeft: 6 }} />
              )}
            </Pressable>
          );
        })}
      </View>
    )}
  </View>
)}

        <Pressable
          style={[styles.generateButton, (!selectedClassId || selectedMaterialIds.length === 0 || isGenerating || isInvalidCount || !gameType || hasReachedDailyLimit) && styles.generateButtonDisabled]}
          onPress={generateFromMaterials}
          disabled={!selectedClassId || selectedMaterialIds.length === 0 || isGenerating || isInvalidCount || !gameType || hasReachedDailyLimit}
        >
          {isGenerating ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : !gameType ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="alert-circle-outline" size={20} color="#FFF" />
              <Text style={styles.generateButtonText}>Select a Game Type</Text>
            </View>
          ) : hasReachedDailyLimit ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="lock-closed-outline" size={20} color="#FFF" />
              <Text style={styles.generateButtonText}>Daily Limit Reached</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="sparkles-outline" size={20} color="#FFF" />
              <Text style={styles.generateButtonText}>Generate {gameOptions.find((g) => g.value === gameType)?.label || 'Quiz'}</Text>
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
    marginBottom: 24,
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
  uploadButtonDisabled: { opacity: 0.5, shadowOpacity: 0 },
  uploadButtonText: { color: '#FFF', fontWeight: '800', fontSize: 14, letterSpacing: 0.2 },

  // 🌟 NEW: Daily limit banner styles
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  limitBannerReached: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FFD7D7',
  },
  limitBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E7D32',
    flex: 1,
  },
  limitBannerTextReached: {
    color: '#D32F2F',
  },
  
  settingsCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 24,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
  },
  settingsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },

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
  
  questionsInput: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: '#EAEAEA',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    minHeight: 56,
  },
  questionsInputError: {
    borderColor: '#F44336',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },

  // 🌟 Game Type Grid Styles
  gameTypeGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10 
  },
  gameTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#EAEAEA',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  gameTypeChipSelected: { 
    backgroundColor: '#D32F2F', 
    borderColor: '#D32F2F' 
  },
  gameTypeText: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#444' 
  },
  gameTypeTextSelected: { 
    color: '#FFF' 
  },

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
  materialsHeaderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 8,
},
clearSelectionText: {
  color: '#D32F2F',
  fontSize: 13,
  fontWeight: '700',
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