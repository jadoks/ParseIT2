import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

export type UploadToastStage = 'uploading' | 'verifying' | 'processing' | null;

interface UploadProgressToastProps {
  visible: boolean;
  stage: UploadToastStage;
  progress: number; // 0-100, only meaningful while stage === 'uploading'
}

const STAGE_COPY: Record<
  Exclude<UploadToastStage, null>,
  { title: string; subtitle: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
> = {
  uploading: {
    title: 'Uploading grade file…',
    subtitle: 'Sending your file to the server',
    icon: 'cloud-upload-outline',
  },
  verifying: {
    title: 'Checking identity…',
    subtitle: 'Matching the file to your student ID',
    icon: 'account-search-outline',
  },
  processing: {
    title: 'Processing grades…',
    subtitle: 'Reading your grades, almost done',
    icon: 'file-chart-outline',
  },
};

export default function UploadProgressToast({ visible, stage, progress }: UploadProgressToastProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);

  const isIndeterminate = stage === 'verifying' || stage === 'processing';

  // Slide/fade the toast in and out.
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  // Smoothly animate the progress bar width whenever the percentage changes.
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: Math.max(0, Math.min(100, progress)),
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  // Indeterminate sweep + icon pulse. Both loops are keyed off the boolean
  // `isIndeterminate` (not the specific stage string), so flipping between
  // "verifying" and "processing" never tears down and restarts the
  // animation — it just keeps sweeping continuously until the upload
  // actually resolves (success, error, or back to null).
  useEffect(() => {
    if (!isIndeterminate) {
      sweepAnim.setValue(0);
      pulseAnim.setValue(0);
      return;
    }

    const sweepLoop = Animated.loop(
      Animated.timing(sweepAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
        isInteraction: false,
      }),
      { iterations: -1 }
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
      { iterations: -1 }
    );

    sweepLoop.start();
    pulseLoop.start();

    return () => {
      sweepLoop.stop();
      pulseLoop.stop();
    };
  }, [isIndeterminate, sweepAnim, pulseAnim]);

  if (!visible && !stage) return null;

  const copy = STAGE_COPY[stage || 'uploading'];
  const barWidth = Math.max(60, trackWidth * 0.32);

  const pulse = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.5],
  });

  const sweepTranslate = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-barWidth, trackWidth || 260],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          opacity: slideAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [40, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.card}>
        <View style={styles.row}>
          <Animated.View style={[styles.iconWrap, isIndeterminate && { opacity: pulse }]}>
            <MaterialCommunityIcons name={copy.icon} size={22} color="#D32F2F" />
          </Animated.View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {copy.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {stage === 'uploading' ? `${Math.round(progress)}% • ${copy.subtitle}` : copy.subtitle}
            </Text>
          </View>
          {stage === 'uploading' && <Text style={styles.percentText}>{Math.round(progress)}%</Text>}
        </View>

        <View
          style={styles.progressTrack}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        >
          {stage === 'uploading' ? (
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          ) : (
            <Animated.View
              style={[
                styles.indeterminateFill,
                { width: barWidth, transform: [{ translateX: sweepTranslate }] },
              ]}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 88,
    zIndex: 8500,
    elevation: 8500,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FDECEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#222',
  },
  subtitle: {
    fontSize: 11.5,
    color: '#888',
    marginTop: 2,
  },
  percentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D32F2F',
    marginLeft: 6,
  },
  progressTrack: {
    marginTop: 10,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#D32F2F',
  },
  indeterminateFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#D32F2F',
    position: 'absolute',
    left: 0,
    top: 0,
  },
});