import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import CourseCard from '../components/CourseCard';
import FilterBar from '../components/FilterBar';

const Dashboard = () => {
  return (
    <ScrollView style={styles.container}>
      {/* Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerDay}>Monday - 01:00 PM</Text>
          <Text style={styles.bannerLocation}>Mag Dampa - at Kalampusan Gym</Text>
          <View style={styles.dots}>
            <View style={styles.dotActive} /><View style={styles.dot} /><View style={styles.dot} />
          </View>
        </View>
      </View>

      <FilterBar />

      <View style={styles.grid}>
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <CourseCard key={item} />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  banner: {
    backgroundColor: '#E53935',
    borderRadius: 40,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  bannerContent: { alignItems: 'center' },
  bannerDay: { color: '#FFF', fontSize: 14 },
  bannerLocation: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  dots: { flexDirection: 'row', marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)', marginHorizontal: 3 },
  dotActive: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF', marginHorizontal: 3 },
  // Inside Dashboard.tsx styles
grid: { 
  flexDirection: 'row', 
  flexWrap: 'wrap', 
  justifyContent: 'center', // Center the cards horizontally
  gap: 15 // Use gap if your RN version supports it, otherwise use margins in CourseCard
},
});

export default Dashboard;