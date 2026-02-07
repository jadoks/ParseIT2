import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const filters = ["All", "1st Year", "2nd Year", "3rd Year", "4th Year"];

const FilterBar = () => {
  return (
    <View style={styles.filterContainer}>
      {filters.map((filter, index) => (
        <TouchableOpacity key={filter} style={styles.filterItem}>
          {/* Radio circle - red for the first one to match image */}
          <View style={[styles.radio, index === 0 && styles.radioActive]} />
          <Text style={styles.filterText}>{filter}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  filterContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    marginBottom: 25, 
    paddingHorizontal: 10 
  },
  filterItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginRight: 25,
    marginVertical: 5 
  },
  radio: { 
    width: 18, 
    height: 18, 
    borderRadius: 9, 
    borderWidth: 1, 
    borderColor: '#D32F2F', 
    marginRight: 8 
  },
  radioActive: {
    backgroundColor: 'transparent', // Image shows empty red circles
    borderWidth: 1.5,
  },
  filterText: { 
    fontSize: 14, 
    color: '#333' 
  },
});

export default FilterBar;