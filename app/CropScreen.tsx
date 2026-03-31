import * as ImageManipulator from 'expo-image-manipulator';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
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
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CropType = 'profile' | 'banner';

type BoxLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Size = {
  width: number;
  height: number;
};

type CropRect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

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

const getImageSize = (uri: string): Promise<Size> =>
  new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => {
        console.log('Image.getSize failed:', error);
        reject(error);
      }
    );
  });

const getContainRenderedSize = (container: Size, source: Size): Size => {
  const containScale = Math.min(
    container.width / source.width,
    container.height / source.height
  );

  return {
    width: source.width * containScale,
    height: source.height * containScale,
  };
};

const clampCropRect = (
  crop: CropRect,
  source: Size,
  forceSquare: boolean
): CropRect => {
  let originX = Math.max(0, crop.originX);
  let originY = Math.max(0, crop.originY);
  let width = Math.max(1, crop.width);
  let height = Math.max(1, crop.height);

  width = Math.min(width, source.width - originX);
  height = Math.min(height, source.height - originY);

  if (forceSquare) {
    const side = Math.max(1, Math.min(width, height));
    width = side;
    height = side;
  }

  let rounded: CropRect = {
    originX: Math.round(originX),
    originY: Math.round(originY),
    width: Math.round(width),
    height: Math.round(height),
  };

  if (rounded.originX + rounded.width > source.width) {
    rounded.width = Math.max(1, source.width - rounded.originX);
  }

  if (rounded.originY + rounded.height > source.height) {
    rounded.height = Math.max(1, source.height - rounded.originY);
  }

  if (forceSquare) {
    const side = Math.max(1, Math.min(rounded.width, rounded.height));
    rounded.width = side;
    rounded.height = side;

    if (rounded.originX + rounded.width > source.width) {
      rounded.originX = Math.max(0, source.width - rounded.width);
    }

    if (rounded.originY + rounded.height > source.height) {
      rounded.originY = Math.max(0, source.height - rounded.height);
    }
  }

  return rounded;
};

const getCropRectFromViewport = ({
  source,
  viewport,
  frame,
  currentScale,
  translateX,
  translateY,
  forceSquare,
}: {
  source: Size;
  viewport: BoxLayout;
  frame: BoxLayout;
  currentScale: number;
  translateX: number;
  translateY: number;
  forceSquare: boolean;
}): CropRect => {
  const baseRendered = getContainRenderedSize(viewport, source);

  const displayedWidth = baseRendered.width * currentScale;
  const displayedHeight = baseRendered.height * currentScale;

  const viewportCenterX = viewport.width / 2;
  const viewportCenterY = viewport.height / 2;

  const imageLeft = viewportCenterX - displayedWidth / 2 + translateX;
  const imageTop = viewportCenterY - displayedHeight / 2 + translateY;

  const originX = ((frame.x - imageLeft) / displayedWidth) * source.width;
  const originY = ((frame.y - imageTop) / displayedHeight) * source.height;
  const width = (frame.width / displayedWidth) * source.width;
  const height = (frame.height / displayedHeight) * source.height;

  return clampCropRect(
    {
      originX,
      originY,
      width,
      height,
    },
    source,
    forceSquare
  );
};

const CropScreen = () => {
  const params = useLocalSearchParams<{
    imageUri?: string;
    cropType?: CropType;
  }>();

  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const imageUri = typeof params.imageUri === 'string' ? params.imageUri : '';
  const cropType: CropType = params.cropType === 'banner' ? 'banner' : 'profile';
  const isProfile = cropType === 'profile';

  const shortestSide = Math.min(screenWidth, screenHeight);
  const longestSide = Math.max(screenWidth, screenHeight);

  const isSmallPhone = shortestSide < 380;
  const isShortPhone = longestSide < 740;
  const isTablet = shortestSide >= 768;
  const isLargeTablet = shortestSide >= 1024;

  const useSmoothSmallScreenDrag = isSmallPhone || isShortPhone;

  const horizontalPadding = isSmallPhone ? 12 : isTablet ? 28 : 18;
  const baseTopHeight = isSmallPhone ? 52 : isTablet ? 72 : 64;
  const topAreaHeight = baseTopHeight + insets.top + (isSmallPhone ? 6 : 8);
  const bottomPanelMinHeight = isSmallPhone ? 108 : isTablet ? 170 : 140;
  const bottomPanelPaddingTop = isSmallPhone ? 6 : 8;
  const bottomPanelPaddingBottom = isSmallPhone ? 12 : 18;

  const maxContentWidth = isLargeTablet ? 980 : isTablet ? 840 : screenWidth;
  const contentWidth = Math.min(screenWidth, maxContentWidth);
  const usableWidth = contentWidth - horizontalPadding * 2;

  const profileMaxFrameWidth = isSmallPhone ? 300 : isTablet ? 420 : 380;
  const bannerMaxFrameWidth = isLargeTablet ? 900 : isTablet ? 760 : usableWidth;

  const frameWidth = isProfile
    ? Math.min(usableWidth, profileMaxFrameWidth)
    : Math.min(usableWidth, bannerMaxFrameWidth);

  const frameHeight = isProfile ? frameWidth : frameWidth * 0.42;

  const editorHeight =
    screenHeight - topAreaHeight - bottomPanelMinHeight - bottomPanelPaddingBottom;

  const [sourceSize, setSourceSize] = useState<Size>({ width: 1, height: 1 });
  const [ready, setReady] = useState(false);
  const [sliderTrackWidth, setSliderTrackWidth] = useState(1);
  const [isCropping, setIsCropping] = useState(false);
  const [viewportLayout, setViewportLayout] = useState<BoxLayout | null>(null);
  const [frameLayout, setFrameLayout] = useState<BoxLayout | null>(null);

  const minScale = useSharedValue(1);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const sliderRatio = useSharedValue(0);

  const actualViewportWidth = viewportLayout?.width ?? contentWidth;
  const actualViewportHeight = viewportLayout?.height ?? editorHeight;

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        if (!imageUri) return;
        const size = await getImageSize(imageUri);
        if (!mounted) return;
        setSourceSize(size);
      } catch (error) {
        console.log('Image load error:', error);
        if (mounted) setReady(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [imageUri]);

  useEffect(() => {
    if (!imageUri || !sourceSize.width || !sourceSize.height) return;
    if (!actualViewportWidth || !actualViewportHeight) return;

    const renderedBase = getContainRenderedSize(
      { width: actualViewportWidth, height: actualViewportHeight },
      sourceSize
    );

    const initialScale = Math.max(
      frameWidth / renderedBase.width,
      frameHeight / renderedBase.height,
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
  }, [
    imageUri,
    sourceSize,
    actualViewportWidth,
    actualViewportHeight,
    frameWidth,
    frameHeight,
    minScale,
    scale,
    savedScale,
    translateX,
    translateY,
    savedTranslateX,
    savedTranslateY,
    sliderRatio,
  ]);

  const baseImageStyle = useMemo(
    () => ({
      width: actualViewportWidth,
      height: actualViewportHeight,
      resizeMode: 'contain' as const,
    }),
    [actualViewportWidth, actualViewportHeight]
  );

  const getRenderedBaseSize = () => {
    'worklet';

    const containScale = Math.min(
      actualViewportWidth / sourceSize.width,
      actualViewportHeight / sourceSize.height
    );

    return {
      width: sourceSize.width * containScale,
      height: sourceSize.height * containScale,
    };
  };

  const getBoundaries = (currentScale: number) => {
    'worklet';

    const renderedBase = getRenderedBaseSize();
    const scaledWidth = renderedBase.width * currentScale;
    const scaledHeight = renderedBase.height * currentScale;

    const maxX = Math.max(0, (scaledWidth - frameWidth) / 2);
    const maxY = Math.max(0, (scaledHeight - frameHeight) / 2);

    return { maxX, maxY };
  };

  const getMaxScale = () => {
    'worklet';
    return Math.max(minScale.value + 3, minScale.value + 1.5);
  };

  const applyScale = (nextScale: number) => {
    'worklet';

    const boundedScale = clamp(nextScale, minScale.value, getMaxScale());
    scale.value = boundedScale;
    savedScale.value = boundedScale;

    const bounds = getBoundaries(boundedScale);
    translateX.value = clamp(translateX.value, -bounds.maxX, bounds.maxX);
    translateY.value = clamp(translateY.value, -bounds.maxY, bounds.maxY);
    savedTranslateX.value = translateX.value;
    savedTranslateY.value = translateY.value;

    const denominator = getMaxScale() - minScale.value;
    const ratio =
      denominator === 0 ? 0 : (boundedScale - minScale.value) / denominator;

    sliderRatio.value = clamp(ratio, 0, 1);
  };

  const zoomBy = (delta: number) => {
    const step = isSmallPhone ? 0.16 : 0.2;
    const nextScale = scale.value + delta * (step / 0.2);
    applyScale(nextScale);
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

      const targetX = clamp(
        savedTranslateX.value + event.translationX,
        -bounds.maxX,
        bounds.maxX
      );

      const targetY = clamp(
        savedTranslateY.value + event.translationY,
        -bounds.maxY,
        bounds.maxY
      );

      if (useSmoothSmallScreenDrag) {
        const velocityFactor = 0.0009;
        const followFactor = 0.22;

        const velocityPushX = event.velocityX * velocityFactor;
        const velocityPushY = event.velocityY * velocityFactor;

        translateX.value = clamp(
          translateX.value +
            (targetX - translateX.value) * followFactor +
            velocityPushX,
          -bounds.maxX,
          bounds.maxX
        );

        translateY.value = clamp(
          translateY.value +
            (targetY - translateY.value) * followFactor +
            velocityPushY,
          -bounds.maxY,
          bounds.maxY
        );
      } else {
        translateX.value = targetX;
        translateY.value = targetY;
      }
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
          ? minScale.value + (isSmallPhone ? 0.85 : 1)
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

  const onViewportLayout = (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setViewportLayout({ x, y, width, height });
  };

  const onFrameLayout = (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setFrameLayout({ x, y, width, height });
  };

  const handleCrop = async () => {
    if (isCropping) return;

    try {
      setIsCropping(true);

      if (!imageUri) {
        router.back();
        return;
      }

      if (!viewportLayout || !frameLayout) {
        console.log('Missing viewport/frame layout');
        router.back();
        return;
      }

      // Normalize everything to PNG first.
      // This is especially important for JPEG/JPG because EXIF orientation
      // can cause the cropped result to not match the preview.
      const normalized = await ImageManipulator.manipulateAsync(
        imageUri,
        [],
        {
          compress: 1,
          format: ImageManipulator.SaveFormat.PNG,
        }
      );

      const source = await getImageSize(normalized.uri);

      const crop = getCropRectFromViewport({
        source,
        viewport: viewportLayout,
        frame: frameLayout,
        currentScale: scale.value,
        translateX: translateX.value,
        translateY: translateY.value,
        forceSquare: isProfile,
      });

      const targetResize = isProfile
        ? { width: 900, height: 900 }
        : { width: 1600, height: 672 };

      // Final result is also PNG.
      const cropped = await ImageManipulator.manipulateAsync(
        normalized.uri,
        [{ crop }, { resize: targetResize }],
        {
          compress: 1,
          format: ImageManipulator.SaveFormat.PNG,
        }
      );

      saveCropAndGoBack(cropped.uri, cropType);
    } catch (error) {
      console.log('Crop error:', error);
      router.back();
    } finally {
      setIsCropping(false);
    }
  };

  const editorContent = (
    <>
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          collapsable={false}
          style={[styles.imageViewport, { width: contentWidth, height: editorHeight }]}
          onLayout={onViewportLayout}
        >
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
            collapsable={false}
            onLayout={onFrameLayout}
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
          <View
            style={[
              styles.topBar,
              {
                height: topAreaHeight,
                paddingTop: insets.top + (isSmallPhone ? 6 : 8),
              },
            ]}
          >
            <Pressable onPress={() => router.back()} style={styles.topBtn}>
              <Text
                style={[
                  styles.topBtnText,
                  { fontSize: isSmallPhone ? 13 : isTablet ? 16 : 15 },
                ]}
              >
                Cancel
              </Text>
            </Pressable>

            <Text
              style={[
                styles.title,
                { fontSize: isSmallPhone ? 15 : isTablet ? 20 : 18 },
              ]}
              numberOfLines={1}
            >
              {isProfile ? 'Crop profile photo' : 'Crop banner'}
            </Text>

            <Pressable
              onPress={handleCrop}
              style={styles.topBtn}
              disabled={!ready || isCropping || !viewportLayout || !frameLayout}
            >
              <Text
                style={[
                  styles.topBtnText,
                  {
                    fontSize: isSmallPhone ? 13 : isTablet ? 16 : 15,
                    opacity:
                      !ready || isCropping || !viewportLayout || !frameLayout
                        ? 0.6
                        : 1,
                  },
                ]}
              >
                {isCropping ? 'Saving...' : 'Done'}
              </Text>
            </Pressable>
          </View>

          <View style={[styles.editorArea, { height: editorHeight }]}>
            {editorContent}
          </View>

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
                { marginBottom: isSmallPhone ? 10 : isTablet ? 20 : 18 },
              ]}
            >
              <Pressable
                style={[
                  styles.zoomSideButton,
                  { width: isSmallPhone ? 28 : isTablet ? 40 : 34 },
                ]}
                onPress={() => zoomBy(-0.2)}
                disabled={!ready || isCropping}
              >
                <Text
                  style={[
                    styles.zoomSideText,
                    {
                      fontSize: isSmallPhone ? 22 : isTablet ? 34 : 30,
                      lineHeight: isSmallPhone ? 22 : isTablet ? 34 : 30,
                      opacity: !ready || isCropping ? 0.5 : 1,
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
                    setSliderTrackWidth(
                      Math.max(1, e.nativeEvent.layout.width - 24)
                    )
                  }
                >
                  <View style={styles.sliderTrack} />
                  <Animated.View style={[styles.sliderThumb, sliderThumbStyle]} />
                </View>
              </GestureDetector>

              <Pressable
                style={[
                  styles.zoomSideButton,
                  { width: isSmallPhone ? 28 : isTablet ? 40 : 34 },
                ]}
                onPress={() => zoomBy(0.2)}
                disabled={!ready || isCropping}
              >
                <Text
                  style={[
                    styles.zoomSideText,
                    {
                      fontSize: isSmallPhone ? 22 : isTablet ? 34 : 30,
                      lineHeight: isSmallPhone ? 22 : isTablet ? 34 : 30,
                      opacity: !ready || isCropping ? 0.5 : 1,
                    },
                  ]}
                >
                  ＋
                </Text>
              </Pressable>
            </View>

            <View
              style={{
                height: isSmallPhone ? 22 : isTablet ? 52 : 44,
              }}
            />

            <Pressable
              onPress={resetEditor}
              style={[
                styles.resetLinkWrap,
                { marginTop: isSmallPhone ? 8 : 14 },
              ]}
              disabled={!ready || isCropping}
            >
              <Text
                style={[
                  styles.resetLink,
                  {
                    fontSize: isSmallPhone ? 12 : isTablet ? 15 : 14,
                    opacity: !ready || isCropping ? 0.5 : 1,
                  },
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  topBtn: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    minWidth: 52,
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
    marginHorizontal: 6,
  },

  editorArea: {
    justifyContent: 'center',
  },

  imageViewport: {
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