import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const CourseCard = () => {
  return (
    <View style={styles.card}>
      {/* Top Red Section */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Programming 1</Text>
        <Text style={styles.cardSub}>Jade M. Lisondra</Text>
        
        {/* Overlapping Profile Icon */}
        <View style={styles.avatarBadge}>
          <Text style={styles.avatarEmoji}>👤</Text>
        </View>
      </View>

      {/* Main Card Body (White Space) */}
      <View style={styles.cardBody} />

      {/* Footer Icons */}
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.footerIcon}>
          <Text style={styles.iconText}>💬</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerIcon}>
          <Text style={styles.iconText}>⋮</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '31%', // Fits 3 columns on web/tablet
    minWidth: 250, // Ensures readability on mobile
    aspectRatio: 1.1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginBottom: 25,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    // Elevation for Android
    elevation: 4,
    overflow: 'visible', // Critical for the badge overlap
  },
  cardHeader: { 
    backgroundColor: '#D32F2F', 
    padding: 15, 
    height: '45%', 
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'relative' 
  },
  cardTitle: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: 'bold',
    marginBottom: 2 
  },
  cardSub: { 
    color: '#FFF', 
    fontSize: 11,
    opacity: 0.9 
  },
  avatarBadge: { 
    position: 'absolute', 
    right: 15, 
    bottom: -15, 
    backgroundColor: '#000', 
    borderRadius: 20, 
    width: 35, 
    height: 35, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF'
  },
  avatarEmoji: { 
    fontSize: 16, 
    color: '#FFF' 
  },
  cardBody: { 
    flex: 1 
  },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    paddingHorizontal: 15, 
    paddingBottom: 15,
    gap: 15 
  },
  footerIcon: {
    padding: 5
  },
  iconText: {
    fontSize: 18,
    color: '#333'
  }
});

export default CourseCard;