import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

interface Props {
  onBack: () => void;
}

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

type ScreenMode = 'menu' | 'tile' | 'tech';
type TileDifficulty = 'Easy' | 'Hard';
type TileStage = 'start' | 'play' | 'done';

const QUIZ_DATA: QuizQuestion[] = [
  {
    question: 'Which device is used primarily for data storage?',
    options: ['Switch', 'Router', 'Server', 'Hard Drive'],
    answer: 'Hard Drive',
  },
  {
    question: 'What does CPU stand for?',
    options: [
      'Central Process Unit',
      'Central Processing Unit',
      'Computer Processing Utility',
      'Control Processing Unit',
    ],
    answer: 'Central Processing Unit',
  },
  {
    question: 'Which one is an input device?',
    options: ['Monitor', 'Keyboard', 'Speaker', 'Projector'],
    answer: 'Keyboard',
  },
  {
    question: 'Which storage type is faster?',
    options: ['HDD', 'SSD', 'DVD', 'USB 2.0'],
    answer: 'SSD',
  },
  {
    question: 'Which part is called the brain of the computer?',
    options: ['RAM', 'Motherboard', 'CPU', 'GPU'],
    answer: 'CPU',
  },
  {
    question: 'Which one is a web browser?',
    options: ['Windows', 'Chrome', 'Excel', 'Linux'],
    answer: 'Chrome',
  },
  {
    question: 'Which cable is commonly used for networking?',
    options: ['HDMI', 'VGA', 'Ethernet', 'AUX'],
    answer: 'Ethernet',
  },
  {
    question: 'What does RAM do?',
    options: [
      'Stores files permanently',
      'Provides temporary memory',
      'Prints documents',
      'Connects to Wi-Fi',
    ],
    answer: 'Provides temporary memory',
  },
  {
    question: 'Which device sends printed output to paper?',
    options: ['Scanner', 'Printer', 'Router', 'Modem'],
    answer: 'Printer',
  },
  {
    question: 'Which one is an operating system?',
    options: ['Android', 'Google', 'Facebook', 'Bluetooth'],
    answer: 'Android',
  },
];

const TILE_QUESTION =
  'A number system where a number is represented using only two digits: 0 and 1.';
const TILE_ANSWER = 'BINARY';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const randomShift = () => Math.floor(Math.random() * 25) + 1;

const shiftChar = (char: string, shift: number) => {
  const code = char.charCodeAt(0);
  const base = 65;
  return String.fromCharCode(((code - base + shift) % 26) + base);
};

const encodeWord = (word: string, shift: number) =>
  word
    .split('')
    .map((char) => (char === ' ' ? ' ' : shiftChar(char, shift)))
    .join('');

export default function QuizMasters({ onBack }: Props) {
  const { width, height } = useWindowDimensions();

  const contentWidth = useMemo(() => {
    if (width >= 900) return 760;
    if (width >= 600) return width * 0.84;
    return width - 24;
  }, [width]);

  const [screenMode, setScreenMode] = useState<ScreenMode>('menu');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [tileDifficulty, setTileDifficulty] = useState<TileDifficulty>('Easy');
  const [tileStage, setTileStage] = useState<TileStage>('start');
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [wrongLetters, setWrongLetters] = useState<string[]>([]);
  const [tileWon, setTileWon] = useState(false);
  const [tileFailed, setTileFailed] = useState(false);
  const [hardShift, setHardShift] = useState<number>(randomShift());

  const currentQuestion = QUIZ_DATA[currentIndex];
  const isLast = currentIndex === QUIZ_DATA.length - 1;

  const hiddenWord = TILE_ANSWER.split('')
    .map((letter) => (guessedLetters.includes(letter) ? letter : '_'))
    .join(' ');

  const chancesLeft =
    tileDifficulty === 'Easy' ? 5 - wrongLetters.length : 3 - wrongLetters.length;

  const encodedWord = useMemo(() => encodeWord(TILE_ANSWER, hardShift), [hardShift]);

  const resetTechTalk = () => {
    setCurrentIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  };

  const resetTileShuffle = () => {
    setGuessedLetters([]);
    setWrongLetters([]);
    setTileWon(false);
    setTileFailed(false);
    setTileStage('start');
    setHardShift(randomShift());
  };

  const goHome = () => {
    resetTechTalk();
    resetTileShuffle();
    setShowDifficultyModal(false);
    setScreenMode('menu');
  };

  const handleQuizSelect = (option: string) => {
    if (selected !== null) return;

    setSelected(option);
    if (option === currentQuestion.answer) {
      setScore((prev) => prev + 1);
    }
  };

  const handleQuizNext = () => {
    if (selected === null) return;

    if (isLast) {
      setFinished(true);
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setSelected(null);
  };

  const handleDifficultySelect = (difficulty: TileDifficulty) => {
    setTileDifficulty(difficulty);
    setGuessedLetters([]);
    setWrongLetters([]);
    setTileWon(false);
    setTileFailed(false);
    setTileStage('start');
    setHardShift(randomShift());
    setShowDifficultyModal(false);
  };

  const startTileGame = () => {
    setGuessedLetters([]);
    setWrongLetters([]);
    setTileWon(false);
    setTileFailed(false);
    setHardShift(randomShift());
    setTileStage('play');
  };

  const handleTileLetterPress = (letter: string) => {
    if (tileWon || tileFailed || chancesLeft <= 0) return;
    if (guessedLetters.includes(letter) || wrongLetters.includes(letter)) return;

    if (TILE_ANSWER.includes(letter)) {
      const updatedCorrect = [...guessedLetters, letter];
      setGuessedLetters(updatedCorrect);

      const solved = TILE_ANSWER.split('').every((char) =>
        updatedCorrect.includes(char),
      );

      if (solved) {
        setTileWon(true);
        setTileStage('done');
      }
      return;
    }

    const updatedWrong = [...wrongLetters, letter];
    setWrongLetters(updatedWrong);

    const remaining =
      tileDifficulty === 'Easy' ? 5 - updatedWrong.length : 3 - updatedWrong.length;

    if (remaining <= 0) {
      setTileFailed(true);
    }
  };

  const getOptionStyle = (option: string) => {
    const isCorrect = option === currentQuestion.answer;
    const isSelected = selected === option;

    if (selected === null) return styles.optionButton;
    if (isCorrect) return [styles.optionButton, styles.correctOption];
    if (isSelected && !isCorrect) return [styles.optionButton, styles.wrongOption];
    return styles.optionButton;
  };

  const renderMenu = () => (
    <View style={[styles.menuWrapper, { minHeight: height - 40, width: contentWidth }]}>
      <View style={styles.heroCard}>
        <View style={styles.logoArea}>
          <View style={styles.bubbleRow}>
            <View style={[styles.bubble, styles.bubbleYellow]}>
              <Text style={styles.bubbleText}>Q</Text>
            </View>
            <View style={[styles.bubble, styles.bubbleRed, styles.bubbleOverlap]}>
              <Text style={styles.bubbleText}>A</Text>
            </View>
          </View>
        </View>

        <Text style={styles.heroTitle}>Quiz Arcade</Text>
        <Text style={styles.heroSubtitle}>
          Choose a mode and challenge your tech knowledge.
        </Text>
      </View>

      <View style={styles.menuButtonsArea}>
        <Pressable
          style={styles.menuButton}
          onPress={() => {
            resetTileShuffle();
            setScreenMode('tile');
          }}
        >
          <View style={styles.menuIconWrap}>
            <Text style={styles.menuButtonIcon}>☷</Text>
          </View>
          <View style={styles.menuTextWrap}>
            <Text style={styles.menuButtonText}>Tile Shuffle</Text>
            <Text style={styles.menuButtonSubtext}>Guess the hidden word.</Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.menuButton}
          onPress={() => {
            resetTechTalk();
            setScreenMode('tech');
          }}
        >
          <View style={styles.menuIconWrap}>
            <Text style={styles.menuButtonIcon}>☺</Text>
          </View>
          <View style={styles.menuTextWrap}>
            <Text style={styles.menuButtonText}>Tech Talk</Text>
            <Text style={styles.menuButtonSubtext}>
              Answer polished multiple-choice questions.
            </Text>
          </View>
        </Pressable>

        <Pressable style={styles.homeButton} onPress={onBack}>
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderTileShuffle = () => (
    <View style={[styles.gameScreen, { minHeight: height - 40, width: contentWidth }]}>
      <Pressable style={styles.backButtonInline} onPress={goHome}>
        <Text style={styles.backIcon}>←</Text>
      </Pressable>

      {tileStage === 'start' ? (
        <View style={styles.tileStartOnlyArea}>
          <View style={styles.tileIntroCard}>
            <Pressable
              style={[
                styles.difficultyBanner,
                tileDifficulty === 'Hard' && styles.difficultyBannerHard,
              ]}
              onPress={() => setShowDifficultyModal(true)}
            >
              <Text style={styles.difficultyBannerText}>{tileDifficulty} Mode</Text>
            </Pressable>

            <Text style={styles.tileModeTitle}>Tile Shuffle</Text>
            <Text style={styles.tileModeSubtitle}>
              {tileDifficulty === 'Easy'
                ? 'Guess the word from the clue.'
                : 'Decode the encrypted text during gameplay.'}
            </Text>

            <Pressable style={styles.startPrimaryButton} onPress={startTileGame}>
              <Text style={styles.startPrimaryButtonText}>Start Game</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.tileQuestionArea}>
            <Text style={styles.sectionEyebrow}>Tile Shuffle</Text>

            {tileDifficulty === 'Hard' ? (
              <>
                <Text style={styles.hardModeQuestion}>Q: {encodedWord}</Text>
                <Text style={styles.hardModeShift}>Shift #: {hardShift}</Text>
                <Text style={styles.tileWord}>{hiddenWord}</Text>
                <Text style={styles.tileChances}>
                  Chances Left: {Math.max(chancesLeft, 0)}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.tileQuestion}>Q: {TILE_QUESTION}</Text>
                <Text style={styles.tileWord}>{hiddenWord}</Text>
                <Text style={styles.tileChances}>
                  Chances Left: {Math.max(chancesLeft, 0)}
                </Text>

                {wrongLetters.length > 0 && !tileWon ? (
                  <Text style={styles.incorrectLabel}>
                    Wrong Letters: {wrongLetters.join(', ')}
                  </Text>
                ) : null}

                {!tileWon && chancesLeft <= 0 ? (
                  <View style={styles.lossCard}>
                    <Text style={styles.lossTitle}>Out of chances</Text>
                    <Text style={styles.lossText}>Answer: {TILE_ANSWER}</Text>
                    <Pressable style={styles.restartSolidButton} onPress={resetTileShuffle}>
                      <Text style={styles.restartSolidButtonText}>Try Again</Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            )}
          </View>

          <View style={styles.letterGrid}>
            {ALPHABET.map((letter) => {
              const isCorrect = guessedLetters.includes(letter);
              const isWrong = wrongLetters.includes(letter);
              const disabled = isCorrect || isWrong || tileWon || tileFailed || chancesLeft <= 0;

              return (
                <Pressable
                  key={letter}
                  style={[
                    styles.letterBox,
                    isCorrect && styles.letterBoxCorrect,
                    isWrong && styles.letterBoxWrong,
                    disabled && styles.letterBoxDisabled,
                  ]}
                  onPress={() => handleTileLetterPress(letter)}
                  disabled={disabled}
                >
                  <Text
                    style={[
                      styles.letterText,
                      (isCorrect || isWrong) && styles.letterTextActive,
                    ]}
                  >
                    {letter}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Modal visible={tileWon} transparent animationType="fade">
            <View style={styles.overlayBackdrop}>
              <View style={styles.overlayCard}>
                <Text style={styles.overlaySuccessTitle}>Good Job!</Text>
                <Text style={styles.overlayMessage}>You answer correctly.</Text>
                <Pressable style={styles.overlayButtonSuccess} onPress={resetTileShuffle}>
                  <Text style={styles.overlayButtonText}>Play Again</Text>
                </Pressable>
                <Pressable
                  style={styles.overlaySecondaryButtonSuccess}
                  onPress={() => {
                    setTileWon(false);
                    goHome();
                  }}
                >
                  <Text style={styles.overlaySecondaryButtonSuccessText}>Back to Menu</Text>
                </Pressable>
              </View>
            </View>
          </Modal>

          <Modal visible={tileFailed} transparent animationType="fade">
            <View style={styles.overlayBackdrop}>
              <View style={styles.overlayCard}>
                <Text style={styles.overlayFailTitle}>Failed</Text>
                <Text style={styles.overlayMessage}>
                  The correct answer was {TILE_ANSWER}.
                </Text>
                <Pressable style={styles.overlayButton} onPress={resetTileShuffle}>
                  <Text style={styles.overlayButtonText}>Try Again</Text>
                </Pressable>
                <Pressable
                  style={styles.overlaySecondaryButton}
                  onPress={() => {
                    setTileFailed(false);
                    goHome();
                  }}
                >
                  <Text style={styles.overlaySecondaryButtonText}>Back to Menu</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </>
      )}

      <Modal visible={showDifficultyModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Difficulty</Text>
            <Text style={styles.modalSubtitle}>
              Easy uses the clue only. Hard adds a random Caesar shift.
            </Text>

            <Pressable
              style={[styles.modalDifficultyButton, styles.easyButton]}
              onPress={() => handleDifficultySelect('Easy')}
            >
              <Text style={styles.modalDifficultyText}>Easy</Text>
            </Pressable>

            <Pressable
              style={[styles.modalDifficultyButton, styles.hardButton]}
              onPress={() => handleDifficultySelect('Hard')}
            >
              <Text style={styles.modalDifficultyText}>Hard</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderTechTalk = () => (
    <View style={[styles.gameScreen, { minHeight: height - 40, width: contentWidth }]}>
      <Pressable style={styles.backButtonInline} onPress={goHome}>
        <Text style={styles.backIcon}>←</Text>
      </Pressable>

      <View style={styles.techContentCard}>
        <Text style={styles.sectionEyebrow}>Multiple Choice</Text>
        <Text style={styles.headerTitle}>Bytes of Knowledge</Text>
        <Text style={styles.headerSubtitle}>Read carefully and pick the best answer.</Text>
        <View style={styles.divider} />

        {!finished ? (
          <>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>
                Question {currentIndex + 1} of {QUIZ_DATA.length}
              </Text>
              <Text style={styles.progressScore}>Score: {score}</Text>
            </View>

            <View style={styles.questionCard}>
              <Text style={styles.questionCounter}>{currentQuestion.question}</Text>
            </View>

            <View style={styles.optionsWrapper}>
              {currentQuestion.options.map((option) => (
                <Pressable
                  key={option}
                  style={getOptionStyle(option)}
                  onPress={() => handleQuizSelect(option)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected !== null &&
                        option === currentQuestion.answer &&
                        styles.correctOptionText,
                      selected === option &&
                        selected !== currentQuestion.answer &&
                        styles.wrongOptionText,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.footerArea}>
              <Pressable
                style={[styles.nextButton, selected === null && styles.nextButtonDisabled]}
                onPress={handleQuizNext}
                disabled={selected === null}
              >
                <Text style={styles.nextButtonText}>
                  {isLast ? 'Finish Quiz' : 'Next Question'}
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.resultWrapper}>
            <View style={styles.resultCard}>
              <Text style={styles.resultText}>
                You scored {score} out of {QUIZ_DATA.length}
              </Text>
              <Text style={styles.resultSubtext}>
                {score >= 8
                  ? 'Excellent work.'
                  : score >= 5
                    ? 'Good job. Keep practicing.'
                    : 'Nice try. Play again to improve your score.'}
              </Text>
            </View>

            <Pressable style={styles.nextButtonSuccess} onPress={resetTechTalk}>
              <Text style={styles.nextButtonText}>Play Again</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F6FB" />
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              minHeight: height,
              paddingHorizontal: width < 400 ? 12 : 24,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {screenMode === 'menu' && renderMenu()}
          {screenMode === 'tile' && renderTileShuffle()}
          {screenMode === 'tech' && renderTechTalk()}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F6FB',
  },
  root: {
    flex: 1,
    backgroundColor: '#F3F6FB',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  menuWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    gap: 24,
  },
  heroCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#0C1A2A',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  logoArea: {
    marginBottom: 18,
    alignItems: 'center',
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bubble: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#324154',
  },
  bubbleYellow: {
    backgroundColor: '#F4C82D',
  },
  bubbleRed: {
    backgroundColor: '#D32F2F',
  },
  bubbleOverlap: {
    marginLeft: -18,
    marginTop: 44,
  },
  bubbleText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#122033',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#5A6B7F',
    textAlign: 'center',
  },
  menuButtonsArea: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  menuButton: {
    width: '100%',
    minHeight: 96,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8E0EA',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    shadowColor: '#0C1A2A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  menuIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuButtonIcon: {
    fontSize: 28,
    color: '#163E7A',
  },
  menuButtonText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C2B3C',
    marginBottom: 4,
  },
  menuButtonSubtext: {
    fontSize: 14,
    color: '#6A7B8F',
  },
  homeButton: {
    marginTop: 8,
    width: '100%',
    minHeight: 60,
    borderRadius: 18,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  gameScreen: {
    paddingTop: 8,
    paddingBottom: 28,
  },
  backButtonInline: {
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginBottom: 18,
  },
  backIcon: {
    fontSize: 34,
    color: '#122033',
    fontWeight: '700',
  },
  tileStartOnlyArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIntroCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0C1A2A',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  tileModeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#122033',
    marginTop: 20,
    marginBottom: 8,
  },
  tileModeSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#5A6B7F',
    textAlign: 'center',
    marginBottom: 18,
  },
  difficultyBanner: {
    minWidth: 180,
    backgroundColor: '#18A957',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  difficultyBannerHard: {
    backgroundColor: '#D32F2F',
  },
  difficultyBannerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  startPrimaryButton: {
    width: '100%',
    minHeight: 56,
    backgroundColor: '#D32F2F',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C2B3C',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#6A7B8F',
    textAlign: 'center',
    marginBottom: 22,
  },
  modalDifficultyButton: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 14,
  },
  easyButton: {
    backgroundColor: '#18A957',
  },
  hardButton: {
    backgroundColor: '#D32F2F',
  },
  modalDifficultyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  tileQuestionArea: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#0C1A2A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sectionEyebrow: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#4B6FAE',
    marginBottom: 8,
  },
  tileQuestion: {
    fontSize: 20,
    lineHeight: 30,
    color: '#1C2B3C',
    textAlign: 'center',
    marginBottom: 14,
    fontWeight: '700',
  },
  tileWord: {
    fontSize: 28,
    letterSpacing: 6,
    color: '#122033',
    marginBottom: 8,
    fontWeight: '800',
  },
  tileChances: {
    fontSize: 16,
    color: '#425466',
    marginBottom: 10,
    fontWeight: '600',
  },
  hardModeQuestion: {
    fontSize: 28,
    lineHeight: 36,
    color: '#1C2B3C',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '800',
    letterSpacing: 2,
  },
  hardModeShift: {
    fontSize: 20,
    color: '#1C2B3C',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '700',
  },
  incorrectLabel: {
    fontSize: 16,
    color: '#D32F2F',
    fontWeight: '700',
    textAlign: 'center',
  },
  lossCard: {
    marginTop: 12,
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#FFF1F0',
    padding: 16,
    alignItems: 'center',
  },
  lossTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#D32F2F',
    marginBottom: 4,
  },
  lossText: {
    fontSize: 16,
    color: '#7A2020',
    marginBottom: 12,
  },
  letterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  letterBox: {
    width: 58,
    height: 58,
    borderWidth: 1.5,
    borderColor: '#C8D5E6',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterBoxCorrect: {
    backgroundColor: '#18A957',
    borderColor: '#18A957',
  },
  letterBoxWrong: {
    backgroundColor: '#D32F2F',
    borderColor: '#D32F2F',
  },
  letterBoxDisabled: {
    opacity: 0.9,
  },
  letterText: {
    fontSize: 24,
    color: '#4969A8',
    fontWeight: '800',
  },
  letterTextActive: {
    color: '#FFFFFF',
  },
  tileResultArea: {
    marginTop: 28,
    alignItems: 'center',
    gap: 14,
  },
  restartSolidButton: {
    minWidth: 160,
    backgroundColor: '#D32F2F',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restartSolidButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  overlaySuccessTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#18A957',
    marginBottom: 8,
  },
  overlayFailTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#D32F2F',
    marginBottom: 8,
  },
  overlayMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 18,
  },
  overlayButton: {
    width: '100%',
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  overlayButtonSuccess: {
    width: '100%',
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#18A957',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  overlayButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  overlaySecondaryButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlaySecondaryButtonText: {
    color: '#D32F2F',
    fontSize: 15,
    fontWeight: '800',
  },
  overlaySecondaryButtonSuccess: {
    width: '100%',
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#E8F8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlaySecondaryButtonSuccessText: {
    color: '#18A957',
    fontSize: 15,
    fontWeight: '800',
  },
  techContentCard: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0C1A2A',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#D32F2F',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5A6B7F',
    marginBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3C1C1',
    marginBottom: 20,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  progressText: {
    fontSize: 14,
    color: '#5A6B7F',
    fontWeight: '700',
  },
  progressScore: {
    fontSize: 14,
    color: '#18A957',
    fontWeight: '800',
  },
  questionCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },
  questionCounter: {
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '800',
    color: '#8B1E1E',
  },
  optionsWrapper: {
    gap: 14,
  },
  optionButton: {
    width: '100%',
    minHeight: 64,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F2C4C4',
  },
  optionText: {
    fontSize: 17,
    color: '#1B1B1B',
    fontWeight: '600',
  },
  correctOption: {
    backgroundColor: '#E8F8EE',
    borderColor: '#18A957',
  },
  wrongOption: {
    backgroundColor: '#FDE2E2',
    borderColor: '#D32F2F',
  },
  correctOptionText: {
    color: '#18A957',
    fontWeight: '800',
  },
  wrongOptionText: {
    color: '#8B1E1E',
    fontWeight: '800',
  },
  footerArea: {
    marginTop: 24,
    alignItems: 'center',
  },
  nextButton: {
    minWidth: 180,
    backgroundColor: '#D32F2F',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonSuccess: {
    minWidth: 180,
    backgroundColor: '#18A957',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.45,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  resultWrapper: {
    paddingTop: 10,
    alignItems: 'center',
    gap: 20,
  },
  resultCard: {
    width: '100%',
    backgroundColor: '#E8F8EE',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 24,
    lineHeight: 34,
    color: '#18A957',
    fontWeight: '800',
    textAlign: 'center',
  },
  resultSubtext: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5A6B7F',
    textAlign: 'center',
    marginTop: 8,
  },
});