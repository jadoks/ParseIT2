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
            <MaterialCommunityIcons name={copy.icon} size={22} color="#D32F2F" />
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
});