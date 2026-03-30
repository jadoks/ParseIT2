import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

export const PerformanceChart = () => {
  const screenWidth = Dimensions.get('window').width;
  
  // 1. COMPRESS WIDTH: Subtract more (160) to keep it inside the card borders
  // Since you have a sidebar, we need a smaller drawing area.
  const chartWidth = screenWidth - 160; 

  const data = {
    labels: ["IAS", "Capstone", "IOT", "Arts"],
    datasets: [
      {
        data: [82, 92, 78, 72],
        colors: [
          () => '#F87171', 
          () => '#60A5FA', 
          () => '#34D399', 
          () => '#FBBF24', 
        ]
      }
    ]
  };

  const Chart = BarChart as any;

  return (
    <View style={styles.container}>
      <Text style={styles.yearText}>ACADEMIC YEAR 2025 - 2026</Text>

      <View style={styles.chartWrapper}>
        <Chart
          data={data}
          width={chartWidth}
          height={300} 
          fromZero={true}
          flatColor={true} 
          withCustomBarColorFromData={true} 
          showBarTops={false}
          chartConfig={{
            backgroundColor: "#FFFFFF",
            backgroundGradientFrom: "#FFFFFF",
            backgroundGradientTo: "#FFFFFF",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, 
            labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`, 
            
            // 2. ENHANCE BAR SIZE: 1.5 is the "sweet spot" for thick but safe bars
            barPercentage: 1.5,      
            categoryPercentage: 0.8,
            
            propsForBackgroundLines: {
              strokeDasharray: "0",   
              stroke: "#F1F5F9",     
            },
            propsForLabels: {
              fontSize: 10, // Slightly smaller to ensure no overlap
              fontWeight: "600"
            }
          }}
          style={{
            marginVertical: 10,
            borderRadius: 16,
            // 3. INTERNAL COMPRESSION: Increase paddingRight to push everything left
            paddingRight: 75, 
          }}
        />
      </View>

      <View style={styles.legendContainer}>
        <View style={styles.legendRow}>
          <LegendItem color="#F87171" label="IAS: Info Security" />
          <LegendItem color="#60A5FA" label="Capstone: Research" />
        </View>
        <View style={styles.legendRow}>
          <LegendItem color="#34D399" label="IOT: Internet of Things" />
          <LegendItem color="#FBBF24" label="Arts: Art Appreciation" />
        </View>
      </View>
    </View>
  );
};

const LegendItem = ({ label, color }: { label: string; color: string }) => (
  <View style={styles.legendItem}>
    <View style={[styles.dot, { backgroundColor: color }]} />
    <Text style={styles.legendText} numberOfLines={1}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { 
    marginVertical: 10, 
    width: '100%', 
    alignItems: 'center',
    backgroundColor: '#FFFFFF', 
  },
  yearText: { 
    color: '#1E293B', 
    fontSize: 16, 
    fontWeight: '800', 
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  chartWrapper: { 
    width: '90%', // Slightly narrower wrapper
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'center', 
    justifyContent: 'center',
    // Ensure no overflow from children
    overflow: 'hidden',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  legendContainer: { 
    marginTop: 20, 
    width: '85%', 
  },
  legendRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 10 
  },
  legendItem: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  dot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    marginRight: 8 
  },
  legendText: { 
    color: '#64748B', 
    fontSize: 11,
    fontWeight: '600'
  }
});