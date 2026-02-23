import React, { useState } from 'react';
import {
  ImageBackground,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
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

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ 
  visible, 
  onClose, 
  announcements = []
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768; // mobile/tablet check

  if (!announcements || announcements.length === 0) return null;

  const current = announcements[currentIndex] || announcements[0];

  const handleNext = () => {
    if (currentIndex < announcements.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleClose = () => {
    setCurrentIndex(0);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <ImageBackground
          source={current.bannerImage}
          style={[
            styles.container,
             { width: isSmallScreen && styles.fullScreenContainer ? undefined : '100%', 
              maxWidth: isSmallScreen && styles.fullScreenContainer ? '80%' : 1200,
              height: isSmallScreen && styles.fullScreenContainer ? '100%' : undefined,
              maxHeight: isSmallScreen && styles.fullScreenContainer ? 230 : undefined 
             }
          ]}
          resizeMode="cover"
        >
          {/* Dark overlay for readability */}
          <View style={styles.overlay} />

          {/* Content */}
          <View style={styles.contentOverlay}>
            <View style={styles.content}>
              <Text style={styles.title}>{current.title}</Text>
              <Text style={styles.message}>{current.message}</Text>
            </View>
          </View>

          {/* Dots */}
          <View style={styles.indicators}>
            {announcements.map((_, idx) => (
              <View
                key={idx}
                style={[styles.dot, idx === currentIndex && styles.dotActive]}
              />
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
              onPress={handlePrev}
              disabled={currentIndex === 0}
            >
              <Text style={styles.navBtnText}>← Prev</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Text style={styles.closeBtnText}>Got It</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navBtn, currentIndex === announcements.length - 1 && styles.navBtnDisabled]}
              onPress={handleNext}
              disabled={currentIndex === announcements.length - 1}
            >
              <Text style={styles.navBtnText}>Next →</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
     // full container
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderRadius: 20,
    maxHeight: 280,
    width: '100%',
    maxWidth: 1200,
     
  },
  fullScreenContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(192, 1, 1, 0.4)',
  },
  contentOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20, // small padding for text
    paddingVertical: 28,
    zIndex: 1,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  message: {
    fontSize: 14,
    color: '#FFF',
    lineHeight: 22,
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 8,
    zIndex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotActive: {
    backgroundColor: '#D32F2F',
    width: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    zIndex: 1,
  },
  navBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    fontWeight: '600',
    fontSize: 12,
    color: '#FFF',
  },
  closeBtn: {
    flex: 1.2,
    backgroundColor: '#D32F2F',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default AnnouncementModal;