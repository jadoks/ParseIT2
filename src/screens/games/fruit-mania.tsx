import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  ImageBackground,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

type FruitKey =
  | 'watermelon'
  | 'lemon'
  | 'apple'
  | 'orange'
  | 'pineapple'
  | 'coconut'
  | 'dragonfruit';

type CellValue = FruitKey | null;
type ScreenMode = 'menu' | 'game';
type Direction = 'up' | 'down' | 'left' | 'right';

const GRID_SIZE = 4;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const FINAL_FRUIT: FruitKey = 'dragonfruit';

const FRUIT_IMAGES: Record<FruitKey, any> = {
  watermelon: require('../../../assets/games/fruits/watermelon.png'),
  lemon: require('../../../assets/games/fruits/lemon.png'),
  apple: require('../../../assets/games/fruits/apple.png'),
  orange: require('../../../assets/games/fruits/orange.png'),
  pineapple: require('../../../assets/games/fruits/pineapple.png'),
  coconut: require('../../../assets/games/fruits/coconut.png'),
  dragonfruit: require('../../../assets/games/fruits/dragonfruit.png'),
};

const MENU_BG_MOBILE = require('../../../assets/games/fruit-menu-bg.png');
const MENU_BG_WEB = require('../../../assets/games/fruit-menu-web.png');

const NEXT_FRUIT: Record<FruitKey, FruitKey> = {
  watermelon: 'lemon',
  lemon: 'apple',
  apple: 'orange',
  orange: 'pineapple',
  pineapple: 'coconut',
  coconut: 'dragonfruit',
  dragonfruit: 'dragonfruit',
};

const FRUIT_SCORE: Record<FruitKey, number> = {
  watermelon: 2,
  lemon: 4,
  apple: 8,
  orange: 16,
  pineapple: 32,
  coconut: 64,
  dragonfruit: 128,
};

const getRandomEmptyIndex = (board: CellValue[]) => {
  const emptyIndexes: number[] = [];

  for (let i = 0; i < board.length; i += 1) {
    if (board[i] === null) {
      emptyIndexes.push(i);
    }
  }

  if (emptyIndexes.length === 0) return -1;

  return emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
};

const addNewWatermelon = (board: CellValue[]) => {
  const next = [...board];
  const emptyIndex = getRandomEmptyIndex(next);

  if (emptyIndex !== -1) {
    next[emptyIndex] = 'watermelon';
  }

  return next;
};

const createInitialBoard = (): CellValue[] => {
  let board: CellValue[] = Array(CELL_COUNT).fill(null);
  board = addNewWatermelon(board);
  board = addNewWatermelon(board);
  return board;
};

const compactLine = (line: CellValue[]) => {
  const filtered = line.filter((cell): cell is FruitKey => cell !== null);
  const result: CellValue[] = [...filtered];

  while (result.length < GRID_SIZE) {
    result.push(null);
  }

  return result;
};

const mergeLineLeft = (line: CellValue[]) => {
  const compacted = compactLine(line);
  const merged: CellValue[] = [...compacted];
  let gainedScore = 0;

  for (let i = 0; i < GRID_SIZE - 1; i += 1) {
    const current = merged[i];
    const next = merged[i + 1];

    if (
      current &&
      next &&
      current === next &&
      current !== FINAL_FRUIT
    ) {
      const upgraded = NEXT_FRUIT[current];
      merged[i] = upgraded;
      merged[i + 1] = null;
      gainedScore += FRUIT_SCORE[upgraded];
      i += 1;
    }
  }

  const finalLine = compactLine(merged);

  return { line: finalLine, gainedScore };
};

const processLine = (line: CellValue[], reverse: boolean) => {
  const working = reverse ? [...line].reverse() : [...line];
  const { line: mergedLine, gainedScore } = mergeLineLeft(working);
  const finalLine = reverse ? [...mergedLine].reverse() : mergedLine;

  return { finalLine, gainedScore };
};

const moveBoard = (board: CellValue[], direction: Direction) => {
  const next: CellValue[] = Array(CELL_COUNT).fill(null);
  let moved = false;
  let gainedScore = 0;

  const getRow = (row: number) =>
    board.slice(row * GRID_SIZE, row * GRID_SIZE + GRID_SIZE);

  const setRow = (row: number, values: CellValue[]) => {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      next[row * GRID_SIZE + col] = values[col];
    }
  };

  const getCol = (col: number) => {
    const values: CellValue[] = [];
    for (let row = 0; row < GRID_SIZE; row += 1) {
      values.push(board[row * GRID_SIZE + col]);
    }
    return values;
  };

  const setCol = (col: number, values: CellValue[]) => {
    for (let row = 0; row < GRID_SIZE; row += 1) {
      next[row * GRID_SIZE + col] = values[row];
    }
  };

  if (direction === 'left' || direction === 'right') {
    for (let row = 0; row < GRID_SIZE; row += 1) {
      const original = getRow(row);
      const { finalLine, gainedScore: rowScore } = processLine(
        original,
        direction === 'right'
      );

      setRow(row, finalLine);
      gainedScore += rowScore;

      if (original.some((cell, index) => cell !== finalLine[index])) {
        moved = true;
      }
    }
  }

  if (direction === 'up' || direction === 'down') {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const original = getCol(col);
      const { finalLine, gainedScore: colScore } = processLine(
        original,
        direction === 'down'
      );

      setCol(col, finalLine);
      gainedScore += colScore;

      if (original.some((cell, index) => cell !== finalLine[index])) {
        moved = true;
      }
    }
  }

  return { board: next, moved, gainedScore };
};

const isBoardFull = (board: CellValue[]) => {
  return board.every((cell) => cell !== null);
};

const hasMovesAvailable = (board: CellValue[]) => {
  if (!isBoardFull(board)) return true;

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE - 1; col += 1) {
      const current = board[row * GRID_SIZE + col];
      const next = board[row * GRID_SIZE + col + 1];

      if (current === next) return true;
    }
  }

  for (let col = 0; col < GRID_SIZE; col += 1) {
    for (let row = 0; row < GRID_SIZE - 1; row += 1) {
      const current = board[row * GRID_SIZE + col];
      const next = board[(row + 1) * GRID_SIZE + col];

      if (current === next) return true;
    }
  }

  return false;
};

export default function FruitMania({ onBack }: any) {
  const { width, height } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const canUseKeyboard = Platform.OS === 'web' && isLargeScreen;

  const [screenMode, setScreenMode] = useState<ScreenMode>('menu');
  const [board, setBoard] = useState<CellValue[]>(createInitialBoard());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const boardSize = useMemo(() => {
    const usableWidth = width - 24;
    const usableHeight = height - 180;
    const candidate = Math.min(usableWidth, usableHeight, 520);
    return Math.max(280, candidate);
  }, [width, height]);

  const startGame = () => {
    setBoard(createInitialBoard());
    setScore(0);
    setGameOver(false);
    setScreenMode('game');
  };

  const showGameOver = () => {
    setGameOver(true);
  };

  const handleMove = (direction: Direction) => {
    if (gameOver) return;

    setBoard((currentBoard) => {
      const result = moveBoard(currentBoard, direction);

      if (!result.moved) {
        if (!hasMovesAvailable(currentBoard)) {
          showGameOver();
        }
        return currentBoard;
      }

      let nextBoard = result.board;

      if (!isBoardFull(nextBoard)) {
        nextBoard = addNewWatermelon(nextBoard);
      }

      setScore((prev) => prev + result.gainedScore);

      if (!hasMovesAvailable(nextBoard)) {
        showGameOver();
      }

      return nextBoard;
    });
  };

  useEffect(() => {
    if (!canUseKeyboard || screenMode !== 'game' || gameOver) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          handleMove('up');
          break;
        case 'ArrowDown':
          event.preventDefault();
          handleMove('down');
          break;
        case 'ArrowLeft':
          event.preventDefault();
          handleMove('left');
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleMove('right');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canUseKeyboard, screenMode, gameOver]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        !gameOver &&
        (Math.abs(gestureState.dx) > 12 || Math.abs(gestureState.dy) > 12),

      onPanResponderRelease: (_, gestureState) => {
        if (gameOver) return;

        const { dx, dy } = gestureState;

        if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;

        if (Math.abs(dx) > Math.abs(dy)) {
          handleMove(dx > 0 ? 'right' : 'left');
        } else {
          handleMove(dy > 0 ? 'down' : 'up');
        }
      },
    })
  ).current;

  if (screenMode === 'menu') {
    return (
      <ImageBackground
        source={isLargeScreen ? MENU_BG_WEB : MENU_BG_MOBILE}
        resizeMode="cover"
        style={styles.fullscreenBackground}
        imageStyle={styles.backgroundImage}
      >
        <ScrollView
          style={styles.fullscreenScroll}
          contentContainerStyle={[
            styles.menuScrollContent,
            { minHeight: height, width: '100%' },
          ]}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.menuButtons}>
            <Pressable style={styles.yellowButton} onPress={startGame}>
              <Text style={styles.yellowButtonText}>Start Game</Text>
            </Pressable>

            <Pressable style={styles.darkButton} onPress={onBack}>
              <Text style={styles.darkButtonText}>Back to Home</Text>
            </Pressable>

            <Pressable style={styles.yellowButtonDisabled}>
              <Text style={styles.yellowButtonDisabledText}>Leaderboard</Text>
            </Pressable>
          </View>
        </ScrollView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../../../assets/games/fruit-bg.png')}
      resizeMode="cover"
      style={styles.fullscreenBackground}
      imageStyle={styles.backgroundImage}
    >
      <ScrollView
        style={styles.fullscreenScroll}
        contentContainerStyle={[
          styles.gameScrollContent,
          { minHeight: height, width: '100%' },
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gameTopBar}>
          <View style={styles.scoreWrap}>
            <Text style={styles.scoreText}>{score}</Text>
          </View>

          <Pressable style={styles.exitBtn} onPress={onBack}>
            <Text style={styles.exitBtnText}>Exit Game</Text>
          </Pressable>
        </View>

        <View
          style={[styles.boardWrapper, { width: boardSize, height: boardSize }]}
        >
          <View
            style={[styles.board, { width: boardSize, height: boardSize }]}
            {...panResponder.panHandlers}
          >
            {board.map((fruit, index) => (
              <View key={index} style={styles.cell}>
                <View style={styles.cellInner}>
                  {fruit ? (
                    <Image source={FRUIT_IMAGES[fruit]} style={styles.fruit} />
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          {gameOver ? (
            <Pressable style={styles.gameOverOverlay} onPress={startGame}>
              <Text style={styles.gameOverText}>GAME OVER</Text>
              <Text style={styles.gameOverSubText}>Tap to Restart Game</Text>
            </Pressable>
          ) : null}
        </View>

        {canUseKeyboard ? (
          <View style={styles.legendWrap}>
            <Text style={styles.legendTitle}>Keyboard Controls</Text>
            <Text style={styles.legendRow}>
              ↑ = up   ↓ = down   ← = left   → = right
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fullscreenBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  backgroundImage: {
    width: '100%',
    height: '100%',
  },

  fullscreenScroll: {
    flex: 1,
    width: '100%',
  },

  menuScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  menuButtons: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 120,
  },

  yellowButton: {
    width: 220,
    height: 58,
    borderRadius: 30,
    backgroundColor: '#E5BE42',
    alignItems: 'center',
    justifyContent: 'center',
  },

  yellowButtonText: {
    fontSize: 17,
    color: '#5a4500',
    fontWeight: '500',
  },

  darkButton: {
    width: 220,
    height: 58,
    borderRadius: 30,
    backgroundColor: '#2E3941',
    alignItems: 'center',
    justifyContent: 'center',
  },

  darkButtonText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '500',
  },

  yellowButtonDisabled: {
    width: 220,
    height: 58,
    borderRadius: 30,
    backgroundColor: '#E5BE42',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.78,
  },

  yellowButtonDisabledText: {
    fontSize: 17,
    color: '#5a4500',
    fontWeight: '500',
  },

  gameScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 12,
  },

  gameTopBar: {
    width: '100%',
    maxWidth: 560,
    minHeight: 90,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  exitBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 120,
    height: 34,
    borderRadius: 24,
    backgroundColor: '#E5BE42',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },

  exitBtnText: {
    color: '#5a4500',
    fontSize: 18,
    fontWeight: '500',
  },

  scoreWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  scoreText: {
    fontSize: 52,
    color: '#685201',
    fontWeight: '400',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },

  boardWrapper: {
    alignSelf: 'center',
    position: 'relative',
  },

  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 3,
    borderColor: '#E8DEC7',
    backgroundColor: 'rgba(237, 228, 205, 0.18)',
    alignSelf: 'center',
  },

  cell: {
    width: '25%',
    height: '25%',
    borderWidth: 3,
    borderColor: '#E8DEC7',
    padding: 4,
    borderRadius: 4,
  },

  cellInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  fruit: {
    width: '88%',
    height: '88%',
    resizeMode: 'contain',
  },

  legendWrap: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
  },

  legendRow: {
    fontSize: 18,
    color: '#5a4500',
    fontWeight: '500',
    textAlign: 'center',
  },

  legendTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5a4500',
    marginBottom: 8,
  },

  legendText: {
    fontSize: 16,
    color: '#FFF7DA',
    lineHeight: 24,
    fontWeight: '500',
  },

  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#E8DEC7',
  },

  gameOverText: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFF7DA',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },

  gameOverSubText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF7DA',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});