import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const Grades = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Grades Screen (Coming Soon)</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  text: {
    fontSize: 18,
    color: '#000',
  },
});