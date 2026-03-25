import React, { useEffect, useRef, useState } from 'react';
import {
  ImageBackground,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  bannerImage?: any;
}

interface AnnouncementModalProps {
  visible: boolean;
  onClose: () => void;
  announcements: Announcement[];
}

const AUTO_SLIDE_MS = 3000;

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  visible,
  onClose,
  announcements = [],
}) => {
  const { width, height } = useWindowDimensions();

  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

  const modalWidth = isMobile ? width * 0.9 : isTablet ? width * 0.82 : Math.min(width * 0.78, 1200);
  const modalHeight = isMobile
    ? Math.max(220, Math.min(height * 0.3, 300))
    : isTablet
    ? Math.max(260, Math.min(height * 0.34, 360))
    : Math.max(280, Math.min(height * 0.38, 420));

  const titleFontSize = isMobile ? 20 : isTablet ? 24 : 30;
  const messageFontSize = isMobile ? 13 : isTablet ? 14 : 16;

  const hasAnnouncements = announcements.length > 0;
  const current = hasAnnouncements ? announcements[currentIndex] || announcements[0] : null;

  const resetAutoSlide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!visible || announcements.length <= 1) return;

    timerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev < announcements.length - 1 ? prev + 1 : 0));
    }, AUTO_SLIDE_MS);
  };

  useEffect(() => {
    resetAutoSlide();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, visible, announcements.length]);

  useEffect(() => {
    if (!visible) {
      setCurrentIndex(0);
    }
  }, [visible]);

  if (!hasAnnouncements) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < announcements.length - 1 ? prev + 1 : 0));
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : announcements.length - 1));
  };

  const handleClose = () => {
    setCurrentIndex(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    onClose();
  };

  const handleDotPress = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <ImageBackground
          source={current?.bannerImage}
          style={[
            styles.container,
            {
              width: modalWidth,
              height: modalHeight,
            },
          ]}
          imageStyle={styles.imageStyle}
          resizeMode="cover"
        >
          <View style={styles.overlayDark} />
          <View style={styles.overlayRed} />

          <View style={styles.topRow}>
            {announcements.length > 1 && (
              <View style={styles.counterPill}>
                <Text style={styles.counterText}>
                  {currentIndex + 1} / {announcements.length}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.contentOverlay}>
            <View style={styles.content}>
              <Text
                style={[styles.title, { fontSize: titleFontSize }]}
                numberOfLines={2}
              >
                {current?.title}
              </Text>

              <Text
                style={[styles.message, { fontSize: messageFontSize }]}
                numberOfLines={4}
              >
                {current?.message}
              </Text>
            </View>
          </View>

          <View style={styles.bottomWrap}>
            {announcements.length > 1 && (
              <View style={styles.indicators}>
                {announcements.map((_, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleDotPress(idx)}
                    activeOpacity={0.8}
                    style={[styles.dot, idx === currentIndex && styles.dotActive]}
                  />
                ))}
              </View>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={handlePrev}
                activeOpacity={0.85}
              >
                <Text style={styles.navBtnText}>← Prev</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleClose}
                activeOpacity={0.9}
              >
                <Text style={styles.closeBtnText}>Got It</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navBtn}
                onPress={handleNext}
                activeOpacity={0.85}
              >
                <Text style={styles.navBtnText}>Next →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  container: {
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },

  imageStyle: {
    borderRadius: 22,
  },

  overlayDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.34)',
  },

  overlayRed: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(211,47,47,0.22)',
  },

  topRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    zIndex: 1,
  },

  counterPill: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  counterText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },

  contentOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 20,
    zIndex: 1,
  },

  content: {
    alignItems: 'center',
    width: '100%',
  },

  title: {
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  message: {
    color: '#FFF',
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: '92%',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  bottomWrap: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    zIndex: 1,
  },

  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },

  dotActive: {
    width: 24,
    backgroundColor: '#FFFFFF',
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },

  navBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
  },

  navBtnText: {
    fontWeight: '700',
    fontSize: 12,
    color: '#FFF',
  },

  closeBtn: {
    flex: 1.2,
    backgroundColor: '#D32F2F',
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },

  closeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default AnnouncementModal;