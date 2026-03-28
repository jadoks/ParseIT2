import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  ImageBackground,
  ImageSourcePropType,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

interface Props {
  onBack: () => void;
}

interface CardItem {
  id: number;
  value: ImageSourcePropType;
  isFlipped: boolean;
  isMatched: boolean;
}

type DifficultyKey = 'easy' | 'medium' | 'hard';
type ScreenMode = 'menu' | 'game';

const DIFFICULTY_CONFIG: Record<
  DifficultyKey,
  {
    label: string;
    cols: number;
    pairs: number;
  }
> = {
  easy: { label: 'Easy', cols: 4, pairs: 8 },
  medium: { label: 'Medium', cols: 4, pairs: 10 },
  hard: { label: 'Hard', cols: 5, pairs: 12 },
};

const SYMBOL_POOL: ImageSourcePropType[] = [
  require('../../../assets/games/1.png'),
  require('../../../assets/games/2.png'),
  require('../../../assets/games/3.png'),
  require('../../../assets/games/4.png'),
  require('../../../assets/games/5.png'),
  require('../../../assets/games/6.png'),
  require('../../../assets/games/7.png'),
  require('../../../assets/games/8.png'),
  require('../../../assets/games/9.png'),
  require('../../../assets/games/10.png'),
  require('../../../assets/games/11.png'),
  require('../../../assets/games/12.png'),
  require('../../../assets/games/13.png'),
  require('../../../assets/games/14.png'),
  require('../../../assets/games/15.png'),
  require('../../../assets/games/16.png'),
  require('../../../assets/games/17.png'),
  require('../../../assets/games/18.png'),
  require('../../../assets/games/19.png'),
  require('../../../assets/games/20.png'),
];

export default function FlipIt({ onBack }: Props) {
  const { width, height } = useWindowDimensions();

  const isSmallScreen = width < 380;
  const isLargeScreen = width >= 768;

  const [screenMode, setScreenMode] = useState<ScreenMode>('menu');
  const [difficulty, setDifficulty] = useState<DifficultyKey>('easy');
  const [showDifficultyPicker, setShowDifficultyPicker] = useState(false);

  const [cards, setCards] = useState<CardItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [score, setScore] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const config = DIFFICULTY_CONFIG[difficulty];

  const matchedCount = useMemo(
    () => cards.filter((card) => card.isMatched).length,
    [cards]
  );

  const isFinished = cards.length > 0 && matchedCount === cards.length;

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getDeck = (pairs: number): CardItem[] => {
    const symbols = SYMBOL_POOL.slice(0, pairs);

    return [...symbols, ...symbols]
      .sort(() => Math.random() - 0.5)
      .map((value, index) => ({
        id: index + 1,
        value,
        isFlipped: false,
        isMatched: false,
      }));
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  };

  const setupGame = () => {
    setCards(getDeck(config.pairs));
    setSelectedIds([]);
    setMoves(0);
    setLocked(false);
    setSeconds(0);
    setScore(0);
  };

  const startGame = () => {
    setupGame();
    setScreenMode('game');
  };

  const stopGame = () => {
    stopTimer();
    setScreenMode('menu');
  };

  useEffect(() => {
    if (screenMode === 'game') {
      startTimer();
    } else {
      stopTimer();
    }

    return () => stopTimer();
  }, [screenMode]);

  useEffect(() => {
    if (isFinished) {
      stopTimer();
    }
  }, [isFinished]);

  useEffect(() => {
    if (screenMode === 'game') {
      setupGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  const handleCardPress = (card: CardItem) => {
    if (locked || card.isFlipped || card.isMatched || selectedIds.length === 2) {
      return;
    }

    const updatedCards = cards.map((item) =>
      item.id === card.id ? { ...item, isFlipped: true } : item
    );
    const updatedSelected = [...selectedIds, card.id];

    setCards(updatedCards);
    setSelectedIds(updatedSelected);

    if (updatedSelected.length === 2) {
      setLocked(true);
      setMoves((prev) => prev + 1);

      const [firstId, secondId] = updatedSelected;
      const firstCard = updatedCards.find((item) => item.id === firstId);
      const secondCard = updatedCards.find((item) => item.id === secondId);

      if (firstCard && secondCard && firstCard.value === secondCard.value) {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((item) =>
              item.id === firstId || item.id === secondId
                ? { ...item, isMatched: true }
                : item
            )
          );
          setScore((prev) => prev + 100);
          setSelectedIds([]);
          setLocked(false);
        }, 350);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((item) =>
              item.id === firstId || item.id === secondId
                ? { ...item, isFlipped: false }
                : item
            )
          );
          setSelectedIds([]);
          setLocked(false);
        }, 700);
      }
    }
  };

  const boardHorizontalPadding = isLargeScreen ? 32 : 18;
  const cols = config.cols;
  const boardMaxWidth = isLargeScreen
    ? Math.min(width * 0.72, 700)
    : width - boardHorizontalPadding * 2;
  const gap = isLargeScreen ? 14 : 10;
  const cardSize = Math.min(
    isLargeScreen ? 118 : isSmallScreen ? 66 : 78,
    (boardMaxWidth - gap * (cols - 1)) / cols
  );

  if (screenMode === 'menu') {
    return (
      <View style={styles.fullScreen}>
        <StatusBar hidden translucent backgroundColor="transparent" />

        <ImageBackground
          source={require('../../../assets/games/flipit-menu-bg.png')}
          resizeMode="cover"
          style={styles.fullScreen}
          imageStyle={styles.bgImage}
        >
          <ScrollView
            contentContainerStyle={styles.menuScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.menuOverlay}>
              <View
                style={[
                  styles.menuPanel,
                  {
                    width: isLargeScreen ? 520 : '84%',
                    paddingVertical: isLargeScreen ? 26 : 18,
                    paddingHorizontal: isLargeScreen ? 34 : 20,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.menuTitle,
                    {
                      fontSize: isLargeScreen ? 64 : isSmallScreen ? 38 : 50,
                      lineHeight: isLargeScreen ? 70 : isSmallScreen ? 46 : 56,
                    },
                  ]}
                >
                  
                </Text>

                <Pressable
                  style={[styles.menuButton, styles.startButton]}
                  onPress={startGame}
                >
                  <Text style={styles.menuButtonText}>Start Game</Text>
                </Pressable>

                <Pressable
                  style={[styles.menuButton, styles.difficultyButton]}
                  onPress={() => setShowDifficultyPicker(true)}
                >
                  <Text style={styles.menuButtonText}>{config.label}</Text>
                  <Text style={styles.dropdownIcon}>▼</Text>
                </Pressable>

                <Pressable
                  style={[styles.menuButton, styles.homeButton]}
                  onPress={onBack}
                >
                  <Text style={styles.menuButtonText}>Back to Home</Text>
                </Pressable>

                <Pressable style={[styles.menuButton, styles.leaderboardButton]}>
                  <Text style={styles.menuButtonText}>Leaderboard</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </ImageBackground>

        <Modal
          visible={showDifficultyPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDifficultyPicker(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowDifficultyPicker(false)}
          >
            <View style={styles.modalCard}>
              {(Object.keys(DIFFICULTY_CONFIG) as DifficultyKey[]).map((key) => {
                const active = key === difficulty;

                return (
                  <Pressable
                    key={key}
                    style={[styles.modalOption, active && styles.modalOptionActive]}
                    onPress={() => {
                      setDifficulty(key);
                      setShowDifficultyPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        active && styles.modalOptionTextActive,
                      ]}
                    >
                      {DIFFICULTY_CONFIG[key].label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.fullScreen}>
      <StatusBar hidden translucent backgroundColor="transparent" />

      <ImageBackground
        source={require('../../../assets/games/flipit-game-bg.png')}
        resizeMode="cover"
        style={styles.fullScreen}
        imageStyle={styles.bgImage}
      >
        <ScrollView
          contentContainerStyle={[
            styles.gameScrollContent,
            { minHeight: height },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.gameOverlay}>
            <View style={[styles.gameHeaderCard, { width: boardMaxWidth + 10 }]}>
              <View>
                <Text style={[styles.statsText, isLargeScreen && styles.statsTextLarge]}>
                  Moves: {moves}
                </Text>
                <Text style={[styles.statsText, isLargeScreen && styles.statsTextLarge]}>
                  Time: {formatTime(seconds)}
                </Text>
              </View>

              <Text
                style={[
                  styles.statsText,
                  styles.scoreText,
                  isLargeScreen && styles.statsTextLarge,
                ]}
              >
                Score: {score}
              </Text>
            </View>

            <View
              style={[
                styles.grid,
                {
                  width: boardMaxWidth,
                  gap,
                },
              ]}
            >
              {cards.map((card) => {
                const visible = card.isFlipped || card.isMatched;

                return (
                  <Pressable
                    key={card.id}
                    style={[
                      styles.card,
                      {
                        width: cardSize,
                        height: cardSize,
                      },
                      visible && styles.cardFlipped,
                      card.isMatched && styles.cardMatched,
                    ]}
                    onPress={() => handleCardPress(card)}
                  >
                    {visible ? (
                      <Image
                        source={card.value}
                        style={[
                          styles.cardImage,
                          {
                            width: cardSize * 0.7,
                            height: cardSize * 0.7,
                          },
                        ]}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.cardText,
                          { fontSize: cardSize * 0.24 },
                        ]}
                      >
                        ?
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.stopButton} onPress={stopGame}>
              <Text style={styles.stopButtonText}>Stop Game</Text>
            </Pressable>

            {isFinished && (
              <View style={styles.winBanner}>
                <Text style={styles.winTitle}>You matched everything!</Text>
                <Text style={styles.winText}>
                  Time: {formatTime(seconds)} | Moves: {moves}
                </Text>
                <Text style={styles.winText}>Final Score: {score}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#000',
  },

  bgImage: {
    width: '100%',
    height: '100%',
  },

  menuScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  menuOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },

  menuPanel: {
    borderRadius: 28,
    alignItems: 'center',
  },

  menuTitle: {
    fontWeight: '900',
    textAlign: 'center',
  },

  menuButton: {
    width: '100%',
    minHeight: 56,
    borderRadius: 32,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
  },

  menuButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },

  startButton: {
    backgroundColor: '#57BFE8',
  },

  difficultyButton: {
    backgroundColor: '#58CF7D',
    justifyContent: 'center',
    alignItems: 'center',
  },

  homeButton: {
    backgroundColor: '#D9803D',
  },

  leaderboardButton: {
    backgroundColor: '#DABD58',
  },

  dropdownIcon: {
    position: 'absolute',
    right: 20,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },

  gameScrollContent: {
    flexGrow: 1,
  },

  gameOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },

  gameHeaderCard: {
    backgroundColor: 'rgba(235, 176, 39, 0.86)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  statsText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    marginBottom: 4,
  },

  statsTextLarge: {
    fontSize: 22,
  },

  scoreText: {
    marginTop: 2,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 24,
  },

  card: {
    backgroundColor: '#E1BB3F',
    borderRadius: 10,
    borderWidth: 4,
    borderColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  cardFlipped: {
    backgroundColor: '#FFF0A5',
  },

  cardMatched: {
    backgroundColor: '#CDE7A4',
  },

  cardText: {
    fontWeight: '900',
    color: '#111',
  },

  cardImage: {
    resizeMode: 'contain',
  },

  stopButton: {
    backgroundColor: '#111',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 4,
  },

  stopButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },

  winBanner: {
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },

  winTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111',
    marginBottom: 4,
  },

  winText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  modalCard: {
    width: 260,
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingVertical: 8,
  },

  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },

  modalOptionActive: {
    backgroundColor: '#EEF7FF',
  },

  modalOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },

  modalOptionTextActive: {
    color: '#18A8E8',
  },
});