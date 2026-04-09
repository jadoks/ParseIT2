import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import HomeScreen from '../App';

export default function Index() {
  const [appState, setAppState] = useState<'splash' | 'app'>('splash');

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppState('app');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (appState === 'splash') {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('../assets/images/loading_animation.gif')}
          style={styles.splashImage}
        />
        <Text style={styles.parsingText}>Parsing...</Text>
      </View>
    );
  }

  return <HomeScreen />;
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  splashImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  parsingText: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: '600',
    color: '#D32F2F',
    letterSpacing: 0.5,
  },
});