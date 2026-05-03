import * as DocumentPicker from 'expo-document-picker';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

type GameScreen = 'flipit' | 'fruitmania' | 'quizmasters';

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

interface GameItem {
  id: number;
  title: string;
  description: string;
  category: string;
  screen: GameScreen;
}

interface Props {
  onNavigate?: (screen: GameScreen, generatedQuiz?: QuizQuestion[] | null) => void;
}

function getGameAiBaseUrl() {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }

  // For Android/iOS Expo testing, replace this fallback with your computer IP if needed.
  return 'http://192.168.1.5:5000';
}

const GAME_AI_BASE_URL = getGameAiBaseUrl();

const Game = ({ onNavigate }: Props) => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  const games: GameItem[] = [
    {
      id: 1,
      title: 'Flip IT!',
      description: 'Matching Card Puzzle',
      category: 'Puzzle',
      screen: 'flipit',
    },
    {
      id: 2,
      title: 'FruitMania',
      description: 'Merge matching fruits',
      category: 'Merge Puzzle',
      screen: 'fruitmania',
    },
    {
      id: 3,
      title: 'Quiz Masters',
      description: 'Upload a lesson file, then choose a game mode',
      category: 'Study Games',
      screen: 'quizmasters',
    },
  ];

  const imgMap: Record<string, { src: any; style?: any }> = {
    'Flip IT!': {
      src: require('../../assets/images/flipit.png'),
      style: { marginLeft: -30, width: '115%', height: '115%' },
    },
    FruitMania: {
      src: require('../../assets/images/fruitmania.png'),
    },
    'Quiz Masters': {
      src: require('../../assets/images/quizmasters.png'),
    },
  };

  const handlePress = (screen: GameScreen) => {
    if (typeof onNavigate === 'function') {
      onNavigate(screen, null);
      return;
    }

    Alert.alert('Navigation not connected', 'Game screen navigation is not connected yet.');
  };

  const uploadFileToGameApi = async (filePayload: any) => {
    try {
      setIsGeneratingQuiz(true);

      const formData = new FormData();
      formData.append('file', filePayload as any);

      const response = await fetch(`${GAME_AI_BASE_URL}/game-ai/generate-quiz-masters`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to generate Quiz Masters game.');
      }

      if (!Array.isArray(data?.questions) || data.questions.length === 0) {
        throw new Error('The game API did not return quiz questions.');
      }

      onNavigate?.('quizmasters', data.questions);
    } catch (error: any) {
      Alert.alert(
        'Quiz generation failed',
        error?.message || 'Unable to generate Quiz Masters from this file.'
      );
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleUploadPress = async () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/markdown',
          'application/json',
          'text/csv',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      await uploadFileToGameApi({
        uri: asset.uri,
        name: asset.name || 'lesson-file',
        type: asset.mimeType || 'application/octet-stream',
      });
    } catch (error: any) {
      Alert.alert('Upload failed', error?.message || 'Unable to select this file.');
    }
  };

  const handleFileChange = async (event: any) => {
    const file = event?.target?.files?.[0];
    if (!file) return;

    await uploadFileToGameApi(file);

    if (event?.target) {
      event.target.value = '';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.pageTitle}>Games</Text>
          <Text style={styles.pageSubtitle}>
            Upload a lesson file and create Matching Cards, Flashcards, Fill-in-the-Blank, and Trivia.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.uploadButton,
            pressed && styles.uploadButtonPressed,
            isGeneratingQuiz && styles.uploadButtonDisabled,
          ]}
          onPress={handleUploadPress}
          disabled={isGeneratingQuiz}
        >
          {isGeneratingQuiz ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={styles.uploadButtonText}>Generating...</Text>
            </View>
          ) : (
            <Text style={styles.uploadButtonText}>+ Upload File</Text>
          )}
        </Pressable>

        {Platform.OS === 'web' ? (
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.json,.csv"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        ) : null}
      </View>

      <View style={styles.grid}>
        {games.map((game) => {
          const imgEntry = imgMap[game.title] || {
            src: undefined,
            style: undefined,
          };

          return (
            <Pressable
              key={game.id}
              style={({ pressed }) => [
                styles.gameCard,
                isSmallScreen && styles.gameCardSmall,
                pressed && styles.gameCardPressed,
              ]}
              onPress={() => handlePress(game.screen)}
            >
              <ImageBackground
                source={imgEntry.src}
                style={styles.cardHeader}
                imageStyle={[styles.cardImage, imgEntry.style]}
              >
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{game.category}</Text>
                </View>

                <View style={styles.cardTextWrap}>
                  <Text style={styles.cardTitle}>{game.title}</Text>
                  <Text style={styles.cardSub}>{game.description}</Text>
                  <Text style={styles.tapToPlay}>Tap to play</Text>
                </View>
              </ImageBackground>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 20,
  },
  titleWrap: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  pageSubtitle: {
    color: '#666',
    marginTop: 4,
    fontSize: 14,
  },
  uploadButton: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    minWidth: 132,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  uploadButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  uploadButtonDisabled: {
    opacity: 0.75,
  },
  uploadButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  gameCard: {
    width: '31%',
    aspectRatio: 1.5,
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },
  gameCardSmall: {
    width: '100%',
  },
  gameCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  cardHeader: {
    backgroundColor: '#D32F2F',
    height: '100%',
    borderRadius: 20,
    position: 'relative',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    overflow: 'hidden',
    width: '100%',
  },
  cardImage: {
    borderRadius: 20,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  categoryBadge: {
    marginTop: 14,
    marginLeft: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  categoryText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardTextWrap: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    width: '100%',
    alignItems: 'flex-start',
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'left',
  },
  cardSub: {
    color: '#FFF',
    fontSize: 16,
    opacity: 0.9,
    textAlign: 'left',
  },
  tapToPlay: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    opacity: 0.95,
  },
});

export default Game;
