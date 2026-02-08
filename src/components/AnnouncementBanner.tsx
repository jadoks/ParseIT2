import React, { useState } from 'react';
import {
    ImageBackground,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { Announcement } from './AnnouncementModal';

interface AnnouncementBannerProps {
  announcements: Announcement[];
}

const AnnouncementBanner = ({ announcements }: AnnouncementBannerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < announcements.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const currentAnnouncement = announcements[currentIndex];

  return (
    <View style={styles.bannerContainer}>
      <ImageBackground
        source={currentAnnouncement.bannerImage}
        style={styles.bannerBackground}
        resizeMode="cover"
      >
        {/* Dark overlay for better text visibility */}
        <View style={styles.overlay} />

        {/* Banner Content */}
        <View style={styles.contentContainer}>
          {/* Left Arrow */}
          <TouchableOpacity
            onPress={handlePrev}
            disabled={currentIndex === 0}
            style={[styles.arrowButton, currentIndex === 0 && styles.disabledArrow]}
          >
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>

          {/* Center Content */}
          <View style={styles.contentText}>
            <Text style={styles.announceTitle}>{currentAnnouncement.title}</Text>
            <Text style={styles.announceMessage}>{currentAnnouncement.message}</Text>
          </View>

          {/* Right Arrow */}
          <TouchableOpacity
            onPress={handleNext}
            disabled={currentIndex === announcements.length - 1}
            style={[styles.arrowButton, currentIndex === announcements.length - 1 && styles.disabledArrow]}
          >
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Dot Indicators */}
        <View style={styles.dotsContainer}>
          {announcements.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    width: '100%',
    height: hp('25'),
    marginBottom: hp('3'),
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  bannerBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    zIndex: 1,
  },
  arrowButton: {
    paddingHorizontal: wp('5'),
    
    paddingVertical: hp('15'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledArrow: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: 70,
    color: '#FFF',
    fontWeight: '300',
    
  },
  contentText: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('2'),
  },
  announceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  announceMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: hp('1.5'),
    zIndex: 1,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#D32F2F',
  },
  inactiveDot: {
    width: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
});

export default AnnouncementBanner;
