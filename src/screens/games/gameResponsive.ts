import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

// ============================================================
// RESPONSIVE DESIGN SYSTEM
// ============================================================
// Centralizes every breakpoint, scale, and spacing decision so
// no component below ever reaches for a hardcoded pixel value.
// ============================================================

export const BREAKPOINTS = {
  smallPhone: 400,
  mobile: 600,
  tablet: 900,
};

export interface ResponsiveInfo {
  width: number;
  height: number;
  isSmallPhone: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  /** Phones in portrait with limited height (< 700) — spacing and type tighten up. */
  isShortScreen: boolean;
  isWeb: boolean;
  contentWidth: number;
  horizontalPadding: number;
  cardPadding: number;
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  font: {
    heading: number;
    subheading: number;
    body: number;
    question: number;
    caption: number;
    button: number;
  };
  flashcardWidth: number;
  flashcardHeight: number;
  memoryColumns: 1 | 2;
  touchTarget: number;
  optionsInRow: boolean;
}

export const useResponsive = (): ResponsiveInfo => {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isSmallPhone = width < BREAKPOINTS.smallPhone;
    const isMobile = width >= BREAKPOINTS.smallPhone && width < BREAKPOINTS.mobile;
    const isTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
    const isDesktop = width >= BREAKPOINTS.tablet;
    const isLandscape = width > height;
    // Short, non-desktop screens get tighter spacing so more content fits before scrolling.
    const compact = height < 700 && !isDesktop;
    const isWeb = Platform.OS === 'web';

    // Centered content container max width, scales by device class.
    let contentWidth: number;
    if (isDesktop) {
      // Use nearly the full screen on desktop (was capped at 1100px).
      contentWidth = Math.min(width * 0.96, 1800);
    } else if (isTablet) {
      contentWidth = Math.min(width * 0.92, 800);
      contentWidth = Math.max(Math.min(contentWidth, width - 24), 700 > width ? width - 24 : 700);
    } else {
      contentWidth = width; // small phone / mobile: full width with internal padding
    }

    const horizontalPadding = isSmallPhone ? 12 : isMobile ? 16 : isTablet ? 24 : 20;
    const cardPadding = (isSmallPhone ? 16 : isMobile ? 20 : isTablet ? 24 : 28) - (compact ? 4 : 0);

    const spacing = {
      xs: isSmallPhone ? 4 : 6,
      sm: isSmallPhone ? 8 : isMobile ? 10 : 12,
      md: (isSmallPhone ? 12 : isMobile ? 16 : isTablet ? 20 : 24) - (compact ? 4 : 0),
      lg: (isSmallPhone ? 16 : isMobile ? 20 : isTablet ? 28 : 32) - (compact ? 6 : 0),
      xl: (isSmallPhone ? 20 : isMobile ? 28 : isTablet ? 36 : 44) - (compact ? 8 : 0),
    };

    // Extra scale for wide monitors on top of the per-breakpoint sizes below.
    const fontScale = width >= 1440 ? 1.2 : width >= 1100 ? 1.1 : 1;
    const fs = (n: number) => Math.round(n * fontScale);

    const font = {
      heading: fs(isSmallPhone ? 18 : isMobile ? 20 : isTablet ? 25 : 30),
      subheading: fs(isSmallPhone ? 15 : isMobile ? 16 : isTablet ? 18 : 20),
      body: fs(isSmallPhone ? 14 : isMobile ? 15 : isTablet ? 16 : 18),
      question: fs(isSmallPhone ? 18 : isMobile ? 19 : isTablet ? 23 : 26) - (compact ? 2 : 0),
      caption: fs(isSmallPhone ? 12 : isMobile ? 13 : 14),
      button: fs(isSmallPhone ? 15 : isMobile ? 16 : isTablet ? 17 : 18),
    };

    // Flashcards: scale width with screen, keep a comfortable aspect ratio.
    const flashcardWidth = isDesktop
      ? Math.min(contentWidth * 0.7, 560)
      : isTablet
      ? contentWidth * 0.8
      : width - horizontalPadding * 2;
    const flashcardHeight = isSmallPhone
      ? 200
      : isMobile
      ? 230
      : isTablet
      ? 280
      : 320;

    // Memory match: stack on phones, two columns side-by-side on tablet/desktop.
    const memoryColumns: 1 | 2 = isTablet || isDesktop ? 2 : 1;

    const touchTarget = 48;

    // Multiple choice: lay all answers out in a single row on wide screens.
    const optionsInRow = width >= BREAKPOINTS.tablet;

    return {
      width,
      height,
      isSmallPhone,
      isMobile,
      isTablet,
      isDesktop,
      isLandscape,
      isShortScreen: compact,
      isWeb,
      contentWidth,
      horizontalPadding,
      cardPadding,
      spacing,
      font,
      flashcardWidth,
      flashcardHeight,
      memoryColumns,
      touchTarget,
      optionsInRow,
    };
  }, [width, height]);
};