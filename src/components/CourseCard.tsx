import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const CourseCard = () => {
  const { width } = useWindowDimensions();

  // determine column count based on screen width
  const cols = width >= 1024 ? 4 : width >= 768 ? 3 : width >= 420 ? 2 : 1;
  const gap = 20; // should match parent list gap/padding
  const horizontalPadding = 30; // approximate container padding
  const cardWidth = Math.max(200, Math.floor((width - horizontalPadding - gap * (cols - 1)) / cols));

  // scale factors for typography and badge
  const scale = Math.min(1.0, Math.max(0.75, cardWidth / 320));
  const titleSize = Math.round(16 * scale);
  const subSize = Math.round(11 * scale);
  const badgeSize = Math.round(35 * scale);

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      {/* Top Red Section */}
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { fontSize: titleSize }]}>Programming 1</Text>
        <Text style={[styles.cardSub, { fontSize: subSize }]}>Jade M. Lisondra</Text>

        {/* Overlapping Profile Icon */}
        <View style={[styles.avatarBadge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, right: 12 * scale, bottom: -badgeSize / 3 }] }>
          <Text style={[styles.avatarEmoji, { fontSize: Math.round(16 * scale) }]}>👤</Text>
        </View>
      </View>

      {/* Main Card Body (White Space) */}
      <View style={styles.cardBody} />

      {/* Footer Icons */}
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.footerIcon}>
          <Text style={styles.iconText}>⋮</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    // width is set dynamically from JS to support responsive grids
    minWidth: 200,
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
    padding: 14,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'relative',
    minHeight: 68,
    justifyContent: 'center'
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
    flex: 1,
    minHeight: 10
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