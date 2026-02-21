import React, { useState } from 'react';
import {
  GestureResponderEvent,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { Announcement } from './AnnouncementModal';

interface AnnouncementBannerProps {
  announcements: Announcement[];
}

const AnnouncementBanner = ({ announcements }: AnnouncementBannerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { width } = useWindowDimensions();
  
  // Determine if on mobile/tablet
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const shouldShowSwipe = isMobile || isTablet;
  
  // Track swipe state
  const [swipeStart, setSwipeStart] = useState(0);
  const minSwipeDistance = width * 0.15; // 15% of screen width

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

  const handleSwipeStart = (e: GestureResponderEvent) => {
    setSwipeStart(e.nativeEvent.pageX);
  };

  const handleSwipeEnd = (e: GestureResponderEvent) => {
    const swipeEnd = e.nativeEvent.pageX;
    const swipeDistance = swipeStart - swipeEnd;

    // Swipe left (next)
    if (swipeDistance > minSwipeDistance) {
      handleNext();
    }
    // Swipe right (prev)
    else if (swipeDistance < -minSwipeDistance) {
      handlePrev();
    }
  };

  const currentAnnouncement = announcements[currentIndex];

  return (
    <GestureHandlerRootView style={styles.bannerContainer}>
      <View 
        onStartShouldSetResponder={() => shouldShowSwipe}
        onMoveShouldSetResponder={() => shouldShowSwipe}
        onResponderGrant={handleSwipeStart}
        onResponderRelease={handleSwipeEnd}
        style={{ flex: 1, width: '100%' }}
      >
        <ImageBackground
          source={currentAnnouncement.bannerImage}
          style={styles.bannerBackground}
          resizeMode="cover"
        >
          {/* Dark overlay for better text visibility */}
          <View style={styles.overlay} />

          {/* Banner Content */}
          <View style={[
            styles.contentContainer,
            { paddingHorizontal: shouldShowSwipe ? wp('3') : 0 }
          ]}>
            {/* Left Arrow - Hidden on mobile/tablet */}
            {!shouldShowSwipe && (
              <TouchableOpacity
                onPress={handlePrev}
                disabled={currentIndex === 0}
                style={[styles.arrowButton, currentIndex === 0 && styles.disabledArrow]}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Text style={styles.arrowText}>‹</Text>
              </TouchableOpacity>
            )}

            {/* Center Content */}
            <View style={styles.contentText}>
              <Text style={[
                styles.announceTitle,
                { fontSize: isMobile ? 16 : isTablet ? 18 : 20 }
              ]}>
                {currentAnnouncement.title}
              </Text>
              <Text style={[
                styles.announceMessage,
                { fontSize: isMobile ? 12 : isTablet ? 13 : 14 }
              ]}>
                {currentAnnouncement.message}
              </Text>
            </View>

            {/* Right Arrow - Hidden on mobile/tablet */}
            {!shouldShowSwipe && (
              <TouchableOpacity
                onPress={handleNext}
                disabled={currentIndex === announcements.length - 1}
                style={[styles.arrowButton, currentIndex === announcements.length - 1 && styles.disabledArrow]}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Dot Indicators */}
          <View style={styles.dotsContainer}>
            {announcements.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setCurrentIndex(index)}
                style={[
                  styles.dot,
                  index === currentIndex ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            ))}
          </View>

          {/* Swipe Hint for Mobile */}
          {shouldShowSwipe && announcements.length > 1 && (
            <View style={styles.swipeHint}>
              <Text style={styles.swipeHintText}>← Swipe →</Text>
            </View>
          )}
        </ImageBackground>
      </View>
    </GestureHandlerRootView>
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
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  announceMessage: {
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
  swipeHint: {
    position: 'absolute',
    bottom: hp('2'),
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  swipeHintText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
});

export default AnnouncementBanner;
