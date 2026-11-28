import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
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

const STAGE_ORDER: Exclude<UploadToastStage, null>[] = ['uploading', 'verifying', 'processing'];

export default function UploadProgressToast({ visible, stage, progress }: UploadProgressToastProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Slide/fade the toast in and out.
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  if (!visible && !stage) return null;

  const copy = STAGE_COPY[stage || 'uploading'];

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
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name={copy.icon} size={22} color="#8B0000" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {copy.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {copy.subtitle}
            </Text>
          </View>
          {stage === 'uploading' && <Text style={styles.percentText}>{Math.round(progress)}%</Text>}
        </View>

        {/* Three steps: upload, identity check, processing. The first bar fills
            with the real upload progress; the others light up as each step starts. */}
        <View style={styles.steps}>
          {STAGE_ORDER.map((name, index) => {
            const current = STAGE_ORDER.indexOf((stage || 'uploading') as any);
            const fill =
              index < current ? 100 : index === current ? (name === 'uploading' ? Math.max(6, Math.min(100, progress)) : 100) : 0;
            return (
              <View key={name} style={styles.stepTrack}>
                <View style={[styles.stepFill, { width: `${fill}%` }]} />
              </View>
            );
          })}
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EBD4D4',
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#4A0000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 12,
  },
  steps: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  stepTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F3E6E6',
    overflow: 'hidden',
  },
  stepFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8B0000',
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
    backgroundColor: '#F7EDED',
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
    color: '#8B0000',
    marginLeft: 6,
  },
});