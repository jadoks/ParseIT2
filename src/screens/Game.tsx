import React from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';

interface GameItem {
  id: number;
  title: string;
  description: string;
  category: string;
}

const Game = () => {
  const games: GameItem[] = [
    {
      id: 1,
      title: 'Flip IT!',
      description: 'Matching Card Puzzle',
      category: 'Puzzle'
    },
    {
      id: 2,
      title: 'FruitMania',
      description: 'Math Puzzle Game',
      category: 'Math'
    },
    {
      id: 3,
      title: 'Quiz Masters',
      description: 'Trivia Games',
      category: 'Trivia'
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>Games</Text>
      <View style={styles.grid}>
        {games.map((game) => {
          // map game id/title to image filename and optional per-image style overrides
          const imgMap: { [key: string]: { src: any; style?: any } } = {
            'Flip IT!': { src: require('../../assets/images/flipit.png'), style: { marginLeft: -30, width: '115%', height: '115%' } },
            'FruitMania': { src: require('../../assets/images/fruitmania.png'), style: undefined },
            'Quiz Masters': { src: require('../../assets/images/quizmasters.png'), style: undefined },
          };

          const imgEntry = imgMap[game.title] || { src: undefined, style: undefined };

          return (
            <View key={game.id} style={styles.gameCard}>
              <ImageBackground source={imgEntry.src} style={styles.cardHeader} imageStyle={[styles.cardImage, imgEntry.style]}>
                <View style={styles.cardTextWrap}>
                  <Text style={styles.cardTitle}>{game.title}</Text>
                  <Text style={styles.cardSub}>{game.description}</Text>
                </View>
              </ImageBackground>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  pageTitle: { fontSize: 25, fontWeight: 'bold', paddingBottom: 10,  textAlign: 'left',  marginBottom: 20 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15
  },
  gameCard: {
    width: '31%',
    minWidth: 250,
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
  cardHeader: {
    backgroundColor: '#D32F2F',
    height: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    overflow: 'hidden',
    width: '100%'
  },
  cardImage: {
    borderRadius: 20,
    width: '100%',
    height: '100%',
   
    objectFit: 'cover',
  },
  cardTextWrap: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    width: '100%',
    alignItems: 'flex-start'
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'left'
  },
  cardSub: {
    color: '#FFF',
    fontSize: 16,
    opacity: 0.9,
    textAlign: 'left'
  }
});

export default Game;
