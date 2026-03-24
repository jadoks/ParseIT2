import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  onBack: () => void;
}

interface CardItem {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const SYMBOLS = ['🍎', '🍌', '🍇', '🍓', '🍍', '🥝'];

export default function FlipIt({ onBack }: Props) {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);

  const matchedCount = useMemo(
    () => cards.filter((card) => card.isMatched).length,
    [cards]
  );

  const isFinished = cards.length > 0 && matchedCount === cards.length;

  const setupGame = () => {
    const deck = [...SYMBOLS, ...SYMBOLS]
      .sort(() => Math.random() - 0.5)
      .map((value, index) => ({
        id: index + 1,
        value,
        isFlipped: false,
        isMatched: false,
      }));

    setCards(deck);
    setSelectedIds([]);
    setMoves(0);
    setLocked(false);
  };

  useEffect(() => {
    setupGame();
  }, []);

  const handleCardPress = (card: CardItem) => {
    if (locked || card.isFlipped || card.isMatched || selectedIds.length === 2) return;

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
          setSelectedIds([]);
          setLocked(false);
        }, 500);
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
        }, 900);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Pressable style={styles.resetButton} onPress={setupGame}>
          <Text style={styles.resetText}>Restart</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>Flip IT!</Text>
      <Text style={styles.subtitle}>Match all pairs to win.</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Moves</Text>
          <Text style={styles.statValue}>{moves}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Matches</Text>
          <Text style={styles.statValue}>
            {matchedCount / 2}/{SYMBOLS.length}
          </Text>
        </View>
      </View>

      {isFinished && (
        <View style={styles.winBanner}>
          <Text style={styles.winText}>You matched everything!</Text>
        </View>
      )}

      <View style={styles.grid}>
        {cards.map((card) => {
          const visible = card.isFlipped || card.isMatched;

          return (
            <Pressable
              key={card.id}
              style={[
                styles.card,
                visible && styles.cardFlipped,
                card.isMatched && styles.cardMatched,
              ]}
              onPress={() => handleCardPress(card)}
            >
              <Text style={styles.cardText}>{visible ? card.value : '?'}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFF8F8',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backButton: {
    backgroundColor: '#EEE',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backText: {
    fontWeight: '700',
    fontSize: 14,
  },
  resetButton: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#222',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 6,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    elevation: 2,
  },
  statLabel: {
    fontSize: 13,
    color: '#777',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#D32F2F',
    marginTop: 4,
  },
  winBanner: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  winText: {
    color: '#2E7D32',
    fontWeight: '700',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  card: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: '#D32F2F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFlipped: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D32F2F',
  },
  cardMatched: {
    backgroundColor: '#C8E6C9',
    borderColor: '#2E7D32',
  },
  cardText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#222',
  },
});