import { Image, StyleSheet, Text, View } from 'react-native';

export default function EventBanner() {
  return (
    <View style={styles.banner}>
      <Image source={require('../assets/banner.png')} style={styles.image} />

      <View style={styles.textContainer}>
        <Text style={styles.time}>Monday - 01:00 PM</Text>
        <Text style={styles.place}>Mag Dampa - at Kalampusan Gym</Text>

        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.activeDot]} />
          <View style={styles.dot} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#E74C3C',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  image: {
    width: 80,
    height: 80,
    marginRight: 20,
  },
  textContainer: {
    flex: 1,
  },
  time: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  place: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  dots: {
    flexDirection: 'row',
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    opacity: 0.4,
    marginRight: 6,
  },
  activeDot: {
    opacity: 1,
  },
});
