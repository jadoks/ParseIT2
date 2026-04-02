import React, { useEffect, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { Announcement } from './AnnouncementModal';

interface AnnouncementBannerProps {
  announcements: Announcement[];
}

const AUTO_SLIDE_MS = 5000;
const BANNER_RADIUS = 18;

const AnnouncementBanner = ({ announcements }: AnnouncementBannerProps) => {
  const { width, height } = useWindowDimensions();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeStart, setSwipeStart] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const shouldShowSwipe = isMobile || isTablet;
  const minSwipeDistance = width * 0.1;

  const hasAnnouncements = announcements.length > 0;
  const currentAnnouncement = hasAnnouncements ? announcements[currentIndex] : null;

  const bannerHeight = isMobile
    ? Math.max(190, Math.min(height * 0.26, 250))
    : isTablet
      ? Math.max(240, Math.min(height * 0.3, 320))
      : Math.max(260, Math.min(height * 0.34, 360));

  const horizontalPadding = isMobile ? 16 : isTablet ? 24 : 32;
  const titleFontSize = isMobile ? 18 : isTablet ? 22 : 28;
  const messageFontSize = isMobile ? 12 : isTablet ? 14 : 16;
  const titleMaxWidth = isMobile ? '100%' : isTablet ? '92%' : '88%';

  const resetAutoSlide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (announcements.length <= 1) return;

    timerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev < announcements.length - 1 ? prev + 1 : 0));
    }, AUTO_SLIDE_MS);
  };

  useEffect(() => {
    resetAutoSlide();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, announcements.length]);

  useEffect(() => {
    if (!hasAnnouncements) return;
    if (currentIndex > announcements.length - 1) {
      setCurrentIndex(0);
    }
  }, [announcements.length, currentIndex, hasAnnouncements]);

  const handlePrev = () => {
    if (!hasAnnouncements) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : announcements.length - 1));
  };

  const handleNext = () => {
    if (!hasAnnouncements) return;
    setCurrentIndex((prev) => (prev < announcements.length - 1 ? prev + 1 : 0));
  };

  const handleDotPress = (index: number) => {
    setCurrentIndex(index);
  };

  const handleSwipeStart = (e: GestureResponderEvent) => {
    setSwipeStart(e.nativeEvent.pageX);
  };

  const handleSwipeEnd = (e: GestureResponderEvent) => {
    const swipeEnd = e.nativeEvent.pageX;
    const swipeDistance = swipeStart - swipeEnd;

    if (swipeDistance > minSwipeDistance) {
      handleNext();
    } else if (swipeDistance < -minSwipeDistance) {
      handlePrev();
    }
  };

  if (!hasAnnouncements) {
    return (
      <View style={[styles.shadowContainer, { height: bannerHeight }]}>
        <View style={[styles.clippedContainer, styles.emptyBanner]}>
          <Text style={styles.emptyTitle}>No announcements yet</Text>
          <Text style={styles.emptyMessage}>
            New announcements will appear here once available.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.shadowContainer, { height: bannerHeight }]}>
      <View style={styles.clippedContainer}>
        <GestureHandlerRootView style={styles.gestureRoot}>
          <View
            onStartShouldSetResponder={() => shouldShowSwipe}
            onMoveShouldSetResponder={() => shouldShowSwipe}
            onResponderGrant={handleSwipeStart}
            onResponderRelease={handleSwipeEnd}
            style={styles.touchLayer}
          >
            <ImageBackground
              source={currentAnnouncement?.bannerImage}
              style={styles.bannerBackground}
              imageStyle={styles.bannerImage}
              resizeMode="cover"
            >
              <View style={styles.overlayDark} />
              <View style={styles.overlayRed} />

              {announcements.length > 1 && (
                <View
                  style={[
                    styles.topBar,
                    {
                      top: isMobile ? 12 : 16,
                      paddingHorizontal: horizontalPadding,
                      justifyContent: isMobile ? 'flex-end' : 'center',
                    },
                  ]}
                >
                  <View style={[styles.counterPill, isMobile && styles.counterPillMobile]}>
                    <Text style={[styles.counterText, isMobile && styles.counterTextMobile]}>
                      {currentIndex + 1} / {announcements.length}
                    </Text>
                  </View>
                </View>
              )}

              <View
                style={[
                  styles.contentContainer,
                  {
                    paddingHorizontal: horizontalPadding,
                  },
                ]}
              >
                {!shouldShowSwipe && announcements.length > 1 ? (
                  <TouchableOpacity
                    onPress={handlePrev}
                    style={[styles.arrowButton, isDesktop && styles.arrowButtonDesktop]}
                    activeOpacity={0.8}
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                  >
                    <Text style={[styles.arrowText, isDesktop && styles.arrowTextDesktop]}>‹</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.arrowSpacer} />
                )}

                <View style={styles.contentText}>
                  <Text
                    style={[
                      styles.announceTitle,
                      {
                        fontSize: titleFontSize,
                        maxWidth: titleMaxWidth,
                        marginBottom: isMobile ? 8 : 10,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {currentAnnouncement?.title}
                  </Text>

                  <Text
                    style={[
                      styles.announceMessage,
                      {
                        fontSize: messageFontSize,
                        lineHeight: isMobile ? 18 : isTablet ? 21 : 24,
                        maxWidth: isMobile ? '100%' : '92%',
                      },
                    ]}
                    numberOfLines={3}
                  >
                    {currentAnnouncement?.message}
                  </Text>
                </View>

                {!shouldShowSwipe && announcements.length > 1 ? (
                  <TouchableOpacity
                    onPress={handleNext}
                    style={[styles.arrowButton, isDesktop && styles.arrowButtonDesktop]}
                    activeOpacity={0.8}
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                  >
                    <Text style={[styles.arrowText, isDesktop && styles.arrowTextDesktop]}>›</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.arrowSpacer} />
                )}
              </View>

              <View
                style={[
                  styles.bottomArea,
                  {
                    paddingBottom: isMobile ? 12 : 16,
                    paddingHorizontal: horizontalPadding,
                  },
                ]}
              >
                {announcements.length > 1 && (
                  <View style={styles.dotsContainer}>
                    {announcements.map((_, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleDotPress(index)}
                        style={[
                          styles.dot,
                          index === currentIndex ? styles.activeDot : styles.inactiveDot,
                        ]}
                        activeOpacity={0.8}
                      />
                    ))}
                  </View>
                )}

                {shouldShowSwipe && announcements.length > 1 && (
                  <View style={styles.swipeHint}>
                    <Text style={styles.swipeHintText}>Swipe to explore announcements</Text>
                  </View>
                )}
              </View>
            </ImageBackground>
          </View>
        </GestureHandlerRootView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowContainer: {
    width: '100%',
    marginBottom: hp('3'),
    borderRadius: BANNER_RADIUS,
    backgroundColor: '#F5F5F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },

  clippedContainer: {
    flex: 1,
    borderRadius: BANNER_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },

  gestureRoot: {
    flex: 1,
  },

  touchLayer: {
    flex: 1,
    width: '100%',
  },

  bannerBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
  },

  bannerImage: {
    width: '100%',
    height: '100%',
    borderRadius: Platform.OS === 'android' ? 0 : BANNER_RADIUS,
  },

  overlayDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.30)',
  },

  overlayRed: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(211,47,47,0.22)',
  },

  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },

  counterPill: {
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    minWidth: 58,
    alignItems: 'center',
  },

  counterPillMobile: {
    backgroundColor: 'rgba(0,0,0,0.50)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  counterText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  counterTextMobile: {
    fontSize: 11,
  },

  contentContainer: {
    flex: 1,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  arrowButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  arrowButtonDesktop: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },

  arrowSpacer: {
    width: 52,
    height: 52,
  },

  arrowText: {
    fontSize: 50,
    color: '#FFF',
    fontWeight: '400',
    lineHeight: 36,
    marginTop: -10,
  },

  arrowTextDesktop: {
    fontSize: 54,
  },

  contentText: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('2'),
  },

  announceTitle: {
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  announceMessage: {
    fontWeight: '500',
    color: '#FFF',
    textAlign: 'center',
  },

  bottomArea: {
    zIndex: 2,
    alignItems: 'center',
  },

  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dot: {
    height: 8,
    borderRadius: 999,
    marginHorizontal: 4,
  },

  activeDot: {
    width: 24,
    backgroundColor: '#FFFFFF',
  },

  inactiveDot: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },

  swipeHint: {
    marginTop: 8,
  },

  swipeHintText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  emptyBanner: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },

  emptyMessage: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    lineHeight: 19,
  },
});

export default AnnouncementBanner;