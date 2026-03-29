import React from 'react';
import {
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

type GameScreen = 'flipit' | 'fruitmania' | 'quizmasters';

interface GameItem {
  id: number;
  title: string;
  description: string;
  category: string;
  screen: GameScreen;
}

interface Props {
  onNavigate?: (screen: GameScreen) => void;
}

const Game = ({ onNavigate }: Props) => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;

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
      description: 'Trivia Games',
      category: 'Trivia',
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
      onNavigate(screen);
      return;
    }

    Alert.alert(
      'Navigation not connected',
      'Game screen navigation is not connected yet.'
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>Games</Text>

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
  pageTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    paddingBottom: 10,
    textAlign: 'left',
    marginBottom: 20,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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