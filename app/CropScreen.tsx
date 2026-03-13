import * as ImageManipulator from 'expo-image-manipulator';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

type CropType = 'profile' | 'banner';

declare global {
  var __PROFILE_CROP_RESULT__:
    | {
        uri: string;
        type: CropType;
        ts: number;
      }
    | undefined;
}

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};

const getImageSize = (uri: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject
    );
  });

const CropScreen = () => {
  const params = useLocalSearchParams<{
    imageUri?: string;
    cropType?: CropType;
  }>();

  const imageUri = typeof params.imageUri === 'string' ? params.imageUri : '';
  const cropType: CropType = params.cropType === 'banner' ? 'banner' : 'profile';
  const isProfile = cropType === 'profile';

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const isSmallPhone = screenWidth < 380;
  const isTablet = screenWidth >= 768;
  const isLargeTablet = screenWidth >= 1024;

  const horizontalPadding = isSmallPhone ? 14 : isTablet ? 28 : 18;
  const topAreaHeight = isSmallPhone ? 64 : 72;
  const bottomPanelMinHeight = isSmallPhone ? 120 : isTablet ? 170 : 140;
  const bottomPanelPaddingTop = isSmallPhone ? 6 : 8;
  const bottomPanelPaddingBottom = isSmallPhone ? 14 : 18;

  const maxContentWidth = isLargeTablet ? 980 : isTablet ? 840 : screenWidth;
  const contentWidth = Math.min(screenWidth, maxContentWidth);

  const frameWidth = isProfile
    ? Math.min(contentWidth - horizontalPadding * 2, isTablet ? 420 : 380)
    : Math.min(contentWidth - horizontalPadding * 2, isLargeTablet ? 900 : isTablet ? 760 : 820);

  const frameHeight = isProfile ? frameWidth : frameWidth * 0.42;

  const editorHeight =
    screenHeight - topAreaHeight - bottomPanelMinHeight - bottomPanelPaddingBottom;

  const [sourceSize, setSourceSize] = useState({ width: 1, height: 1 });
  const [ready, setReady] = useState(false);
  const [sliderTrackWidth, setSliderTrackWidth] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const minScale = useSharedValue(1);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const sliderRatio = useSharedValue(0);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        if (!imageUri) return;

        const size = await getImageSize(imageUri);
        if (!mounted) return;

        setSourceSize(size);

        const containScale = Math.min(
          contentWidth / size.width,
          editorHeight / size.height
        );

        const renderedBaseWidth = size.width * containScale;
        const renderedBaseHeight = size.height * containScale;

        const initialScale = Math.max(
          frameWidth / renderedBaseWidth,
          frameHeight / renderedBaseHeight,
          1
        );

        minScale.value = initialScale;
        scale.value = initialScale;
        savedScale.value = initialScale;

        translateX.value = 0;
        translateY.value = 0;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;

        sliderRatio.value = 0;
        setReady(true);
      } catch (error) {
        console.log('Image load error:', error);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [
    imageUri,
    contentWidth,
    editorHeight,
    frameHeight,
    frameWidth,
    minScale,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    sliderRatio,
    translateX,
    translateY,
  ]);

  const baseImageStyle = useMemo(
    () => ({
      width: contentWidth,
      height: editorHeight,
      resizeMode: 'contain' as const,
    }),
    [contentWidth, editorHeight]
  );

  const getRenderedBaseSize = () => {
    const containScale = Math.min(
      contentWidth / sourceSize.width,
      editorHeight / sourceSize.height
    );

    return {
      width: sourceSize.width * containScale,
      height: sourceSize.height * containScale,
    };
  };

  const getBoundaries = (currentScale: number) => {
    const renderedBase = getRenderedBaseSize();
    const scaledWidth = renderedBase.width * currentScale;
    const scaledHeight = renderedBase.height * currentScale;

    const maxX = Math.max(0, (scaledWidth - frameWidth) / 2);
    const maxY = Math.max(0, (scaledHeight - frameHeight) / 2);

    return { maxX, maxY };
  };

  const getMaxScale = () => Math.max(minScale.value + 3, minScale.value + 1.5);

  const applyScale = (nextScale: number) => {
    const boundedScale = clamp(nextScale, minScale.value, getMaxScale());
    scale.value = boundedScale;
    savedScale.value = boundedScale;

    const bounds = getBoundaries(boundedScale);
    translateX.value = clamp(translateX.value, -bounds.maxX, bounds.maxX);
    translateY.value = clamp(translateY.value, -bounds.maxY, bounds.maxY);
    savedTranslateX.value = translateX.value;
    savedTranslateY.value = translateY.value;

    const ratio =
      (boundedScale - minScale.value) / (getMaxScale() - minScale.value || 1);
    sliderRatio.value = clamp(ratio, 0, 1);
  };

  const zoomBy = (delta: number) => {
    applyScale(scale.value + delta);
  };

  const resetEditor = () => {
    scale.value = minScale.value;
    savedScale.value = minScale.value;

    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;

    sliderRatio.value = 0;
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const nextScale = savedScale.value * event.scale;
      applyScale(nextScale);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const bounds = getBoundaries(scale.value);

      translateX.value = clamp(
        savedTranslateX.value + event.translationX,
        -bounds.maxX,
        bounds.maxX
      );
      translateY.value = clamp(
        savedTranslateY.value + event.translationY,
        -bounds.maxY,
        bounds.maxY
      );
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const target =
        Math.abs(scale.value - minScale.value) < 0.05
          ? minScale.value + 1
          : minScale.value;
      applyScale(target);
    });

  const sliderPan = Gesture.Pan().onUpdate((event) => {
    const ratio = clamp(event.x / sliderTrackWidth, 0, 1);
    sliderRatio.value = ratio;
    const nextScale =
      minScale.value + ratio * (getMaxScale() - minScale.value);
    applyScale(nextScale);
  });

  const composedGesture = Gesture.Simultaneous(
    Gesture.Exclusive(doubleTapGesture, panGesture),
    pinchGesture
  );

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const sliderThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderRatio.value * sliderTrackWidth }],
  }));

  const saveCropAndGoBack = (uri: string, type: CropType) => {
    globalThis.__PROFILE_CROP_RESULT__ = {
      uri,
      type,
      ts: Date.now(),
    };
    router.back();
  };

  const handleCrop = async () => {
    try {
      if (!imageUri) {
        router.back();
        return;
      }

      const source = await getImageSize(imageUri);

      const containScale = Math.min(
        contentWidth / source.width,
        editorHeight / source.height
      );

      const renderedBaseWidth = source.width * containScale;
      const renderedBaseHeight = source.height * containScale;

      const finalRenderedWidth = renderedBaseWidth * scale.value;
      const finalRenderedHeight = renderedBaseHeight * scale.value;

      const viewportCenterX = contentWidth / 2;
      const viewportCenterY = editorHeight / 2;

      const frameLeft = viewportCenterX - frameWidth / 2;
      const frameTop = viewportCenterY - frameHeight / 2;

      const imageLeft =
        viewportCenterX - finalRenderedWidth / 2 + translateX.value;
      const imageTop =
        viewportCenterY - finalRenderedHeight / 2 + translateY.value;

      let originX =
        ((frameLeft - imageLeft) / finalRenderedWidth) * source.width;
      let originY =
        ((frameTop - imageTop) / finalRenderedHeight) * source.height;
      let cropWidth = (frameWidth / finalRenderedWidth) * source.width;
      let cropHeight = (frameHeight / finalRenderedHeight) * source.height;

      originX = Math.max(0, originX);
      originY = Math.max(0, originY);

      if (originX + cropWidth > source.width) {
        cropWidth = source.width - originX;
      }

      if (originY + cropHeight > source.height) {
        cropHeight = source.height - originY;
      }

      cropWidth = Math.max(1, cropWidth);
      cropHeight = Math.max(1, cropHeight);

      const targetResize = isProfile
        ? { width: 900, height: 900 }
        : { width: 1600, height: 672 };

      const cropped = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX,
              originY,
              width: cropWidth,
              height: cropHeight,
            },
          },
          {
            resize: targetResize,
          },
        ],
        {
          compress: 0.92,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      runOnJS(saveCropAndGoBack)(cropped.uri, cropType);
    } catch (error) {
      console.log('Crop error:', error);
      router.back();
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (Platform.OS !== 'web') return;

    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (Platform.OS !== 'web' || !isDragging) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    const bounds = getBoundaries(scale.value);

    translateX.value = clamp(
      savedTranslateX.value + dx,
      -bounds.maxX,
      bounds.maxX
    );

    translateY.value = clamp(
      savedTranslateY.value + dy,
      -bounds.maxY,
      bounds.maxY
    );
  };

  const handleMouseUp = () => {
    if (Platform.OS !== 'web') return;

    savedTranslateX.value = translateX.value;
    savedTranslateY.value = translateY.value;
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (Platform.OS !== 'web') return;

    if (e.deltaY > 0) {
      zoomBy(-0.12);
    } else {
      zoomBy(0.12);
    }
  };

  const editorContent = (
    <>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.imageViewport, { width: contentWidth }]}>
          <Animated.Image
            source={{ uri: imageUri }}
            style={[baseImageStyle, imageAnimatedStyle]}
          />
        </Animated.View>
      </GestureDetector>

      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.overlayTop} />

        <View style={styles.overlayMiddleRow}>
          <View style={styles.overlaySide} />

          <View
            style={[
              styles.cropFrame,
              {
                width: frameWidth,
                height: frameHeight,
              },
              isProfile ? styles.cropFrameCircle : styles.cropFrameRect,
            ]}
          >
            <View style={styles.gridVertical1} />
            <View style={styles.gridVertical2} />
            <View style={styles.gridHorizontal1} />
            <View style={styles.gridHorizontal2} />
          </View>

          <View style={styles.overlaySide} />
        </View>

        <View style={styles.overlayBottom} />
      </View>
    </>
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.container}>
        <View
          style={[
            styles.contentWrap,
            {
              maxWidth: maxContentWidth,
              paddingHorizontal: horizontalPadding,
            },
          ]}
        >
          <View style={[styles.topBar, { height: topAreaHeight }]}>
            <Pressable onPress={() => router.back()} style={styles.topBtn}>
              <Text
                style={[
                  styles.topBtnText,
                  { fontSize: isSmallPhone ? 14 : isTablet ? 16 : 15 },
                ]}
              >
                Cancel
              </Text>
            </Pressable>

            <Text
              style={[
                styles.title,
                { fontSize: isSmallPhone ? 16 : isTablet ? 20 : 18 },
              ]}
              numberOfLines={1}
            >
              {isProfile ? 'Crop profile photo' : 'Crop banner'}
            </Text>

            <Pressable onPress={handleCrop} style={styles.topBtn}>
              <Text
                style={[
                  styles.topBtnText,
                  { fontSize: isSmallPhone ? 14 : isTablet ? 16 : 15 },
                ]}
              >
                Done
              </Text>
            </Pressable>
          </View>

          {Platform.OS === 'web' ? (
            <div
              style={{
                height: editorHeight,
                position: 'relative',
                cursor: isDragging ? 'grabbing' : 'grab',
                width: '100%',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              <View style={[styles.editorArea, { height: editorHeight }]}>
                {editorContent}
              </View>
            </div>
          ) : (
            <View style={[styles.editorArea, { height: editorHeight }]}>
              {editorContent}
            </View>
          )}

          <View
            style={[
              styles.bottomPanel,
              {
                minHeight: bottomPanelMinHeight,
                paddingTop: bottomPanelPaddingTop,
                paddingBottom: bottomPanelPaddingBottom,
              },
            ]}
          >
            <View
              style={[
                styles.sliderRow,
                { marginBottom: isSmallPhone ? 12 : isTablet ? 20 : 18 },
              ]}
            >
              <Pressable
                style={[
                  styles.zoomSideButton,
                  { width: isSmallPhone ? 30 : isTablet ? 40 : 34 },
                ]}
                onPress={() => zoomBy(-0.2)}
              >
                <Text
                  style={[
                    styles.zoomSideText,
                    {
                      fontSize: isSmallPhone ? 24 : isTablet ? 34 : 30,
                      lineHeight: isSmallPhone ? 24 : isTablet ? 34 : 30,
                    },
                  ]}
                >
                  −
                </Text>
              </Pressable>

              <GestureDetector gesture={sliderPan}>
                <View
                  style={styles.sliderTrackWrap}
                  onLayout={(e) =>
                    setSliderTrackWidth(e.nativeEvent.layout.width - 24)
                  }
                >
                  <View style={styles.sliderTrack} />
                  <Animated.View
                    style={[styles.sliderThumb, sliderThumbStyle]}
                  />
                </View>
              </GestureDetector>

              <Pressable
                style={[
                  styles.zoomSideButton,
                  { width: isSmallPhone ? 30 : isTablet ? 40 : 34 },
                ]}
                onPress={() => zoomBy(0.2)}
              >
                <Text
                  style={[
                    styles.zoomSideText,
                    {
                      fontSize: isSmallPhone ? 24 : isTablet ? 34 : 30,
                      lineHeight: isSmallPhone ? 24 : isTablet ? 34 : 30,
                    },
                  ]}
                >
                  ＋
                </Text>
              </Pressable>
            </View>

            <View
              style={{
                height: isSmallPhone ? 34 : isTablet ? 52 : 44,
              }}
            />

            <Pressable
              onPress={resetEditor}
              style={[
                styles.resetLinkWrap,
                { marginTop: isSmallPhone ? 10 : 14 },
              ]}
            >
              <Text
                style={[
                  styles.resetLink,
                  { fontSize: isSmallPhone ? 13 : isTablet ? 15 : 14 },
                ]}
              >
                Reset
              </Text>
            </Pressable>

            {!ready && (
              <Text
                style={[
                  styles.loadingText,
                  { fontSize: isSmallPhone ? 11 : 12 },
                ]}
              >
                Preparing editor...
              </Text>
            )}
          </View>
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1f2329',
  },

  container: {
    flex: 1,
    backgroundColor: '#1f2329',
  },

  contentWrap: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  topBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 64,
  },

  topBtnText: {
    color: '#d7d9dd',
    fontWeight: '600',
  },

  title: {
    color: '#f1f3f5',
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },

  editorArea: {
    justifyContent: 'center',
  },

  imageViewport: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    alignSelf: 'center',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },

  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },

  overlayMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  overlaySide: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.38)',
  },

  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },

  cropFrame: {
    overflow: 'hidden',
    borderWidth: 0,
  },

  cropFrameCircle: {
    borderRadius: 9999,
  },

  cropFrameRect: {
    borderRadius: 16,
  },

  gridVertical1: {
    position: 'absolute',
    left: '33.33%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  gridVertical2: {
    position: 'absolute',
    left: '66.66%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  gridHorizontal1: {
    position: 'absolute',
    top: '33.33%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  gridHorizontal2: {
    position: 'absolute',
    top: '66.66%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  bottomPanel: {
    justifyContent: 'flex-start',
  },

  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  zoomSideButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  zoomSideText: {
    color: '#d7d9dd',
    fontWeight: '400',
  },

  sliderTrackWrap: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
    marginHorizontal: 8,
  },

  sliderTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: '#6d7278',
  },

  sliderThumb: {
    position: 'absolute',
    left: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2d7ef7',
    top: 3,
  },

  resetLinkWrap: {
    alignSelf: 'center',
  },

  resetLink: {
    color: '#b9bec5',
    fontWeight: '600',
  },

  loadingText: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
});

export default CropScreen;