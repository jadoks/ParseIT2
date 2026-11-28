import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, NativeScrollEvent, NativeSyntheticEvent, StyleProp, Text, TextStyle } from 'react-native';

// "Animate when it scrolls into view", like modern websites. No package needed.
//
// How to use it on a screen with a vertical ScrollView:
//
//   const reveal = useScrollReveal();
//   <ScrollRevealProvider value={reveal.controller}>
//     <ScrollView onScroll={reveal.onScroll} scrollEventThrottle={32}> ... </ScrollView>
//   </ScrollRevealProvider>
//
// Anything inside that calls useInView() (the animated charts, CountUpText, the bars)
// then waits until it is on screen, plays once, and stays put afterwards. Elements that
// are already visible when the screen opens play right away. Outside a provider
// everything simply plays on mount, so nothing breaks if a screen isn't wired up.

type Listener = () => void;

export class RevealController {
  private listeners = new Set<Listener>();
  subscribe = (fn: Listener) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  notify = () => {
    this.listeners.forEach((fn) => fn());
  };
}

const RevealContext = createContext<RevealController | null>(null);
export const ScrollRevealProvider = RevealContext.Provider;

export function useScrollReveal() {
  const controller = useRef(new RevealController()).current;
  const onScroll = useCallback(
    (_event?: NativeSyntheticEvent<NativeScrollEvent>) => controller.notify(),
    [controller]
  );
  return { controller, onScroll };
}

/**
 * Tells you when the element (put `ref` and `onLayout` on it) first becomes visible.
 * `trigger` = how far up the window the element's top edge must be (0.9 = top 90%).
 */
export function useInView(trigger = 0.9) {
  const controller = useContext(RevealContext);
  const ref = useRef<any>(null);
  const seen = useRef(!controller);
  const [inView, setInView] = useState(!controller);

  const check = useCallback(() => {
    if (seen.current) return;
    const node = ref.current;
    if (!node || typeof node.measureInWindow !== 'function') return;
    node.measureInWindow((_x: number, y: number, w: number, h: number) => {
      if (seen.current) return;
      if (!w && !h) return; // not laid out yet, or its tab is hidden
      const windowHeight = Dimensions.get('window').height;
      if (y < windowHeight * trigger && y + h > 0) {
        seen.current = true;
        setInView(true);
      }
    });
  }, [trigger]);

  useEffect(() => {
    if (!controller || seen.current) return;
    const unsubscribe = controller.subscribe(check);
    const timer = setTimeout(check, 80); // elements already on screen when it opens
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [controller, check]);

  return { ref, inView, onLayout: check };
}

/**
 * A number that counts up from 0 when it scrolls into view. Values such as "78%" keep
 * their suffix; anything that isn't a plain number (for example "N/A" or "3/5") is
 * shown as it is.
 */
export const CountUpText = ({ value, style }: { value: string | number; style?: StyleProp<TextStyle> }) => {
  const match = String(value).match(/^(-?\d+(?:\.\d+)?)(\D*)$/);
  const target = match ? Number(match[1]) : null;
  const suffix = match ? match[2] : '';
  const decimals = match && match[1].includes('.') ? match[1].split('.')[1].length : 0;
  const [shown, setShown] = useState(0);
  const { ref, inView, onLayout } = useInView();

  useEffect(() => {
    if (target === null) return;
    setShown(0);
    if (!inView) return;
    const anim = new Animated.Value(0);
    const id = anim.addListener(({ value: v }) => setShown(v));
    const run = Animated.timing(anim, {
      toValue: target,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    run.start();
    return () => {
      run.stop();
      anim.removeListener(id);
    };
  }, [target, inView]);

  if (target === null) return <Text style={style}>{value}</Text>;
  return (
    <Text ref={ref} onLayout={onLayout} style={style}>
      {shown.toFixed(decimals)}
      {suffix}
    </Text>
  );
};