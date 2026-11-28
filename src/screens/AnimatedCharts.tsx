import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, {
    Circle,
    ClipPath,
    Defs,
    G,
    Line,
    LinearGradient,
    Path,
    Rect,
    Stop,
    Text as SvgText,
} from 'react-native-svg';
import { FONT_BODY } from '../theme/typography';
import { useInView } from './ScrollReveal';

// Animated charts for the student Analytics screen.
//
// Drawn with react-native-svg (already installed: react-native-chart-kit depends on it)
// and the built-in Animated API, so no new package is needed. Each chart plays its
// animation when it first appears and again whenever its data changes.
//
// The animation is driven by a plain 0..1 number kept in React state, not by animated
// SVG props, so it behaves the same on Android, iOS and web.

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const clampScore = (n: unknown) => Math.max(0, Math.min(100, Number(n) || 0));
const shorten = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text);

// 0 -> 1 over `duration` ms once `enabled`. Restarts whenever `signature` changes (new data).
function useReveal(signature: string, duration = 1000, delay = 150, enabled = true) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    setProgress(0);
    if (!enabled) return; // waits until the chart scrolls into view
    const value = new Animated.Value(0);
    const id = value.addListener(({ value: v }) => setProgress(v));
    const animation = Animated.timing(value, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => {
      animation.stop();
      value.removeListener(id);
    };
  }, [signature, duration, delay, enabled]);
  return progress;
}

const GRID = [0, 25, 50, 75, 100];
const INK = '#2B1111';
const MUTED = '#6B7280';

// ───────────────────────────── Bar chart ─────────────────────────────

type BarProps = { data: number[]; labels: string[]; width: number; height: number };

export const AnimatedBarChart = ({ data, labels, width, height }: BarProps) => {
  const { ref, inView, onLayout } = useInView();
  const p = useReveal(JSON.stringify(data), 1000, 150, inView);
  const padX = 22;
  const padTop = 26;
  const padBottom = 34;
  const plotW = width - padX * 2;
  const plotH = height - padTop - padBottom;
  const count = Math.max(data.length, 1);
  const slot = plotW / count;
  const barW = Math.min(slot * 0.52, 56);
  const stagger = 0.4; // bars start one after another

  return (
    <View ref={ref} onLayout={onLayout} collapsable={false}>
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="aBarGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#B42323" />
          <Stop offset="1" stopColor="#7A0000" />
        </LinearGradient>
      </Defs>

      {GRID.map((g) => {
        const y = padTop + (1 - g / 100) * plotH;
        return <Line key={g} x1={padX} x2={width - padX} y1={y} y2={y} stroke="#EEE5E5" strokeWidth={1} />;
      })}

      {data.map((raw, i) => {
        const value = clampScore(raw);
        const start = count > 1 ? (stagger * i) / (count - 1) : 0;
        const bp = easeOutCubic(clamp01((p - start) / (1 - stagger)));
        const h = (value / 100) * plotH * bp;
        const x = padX + slot * i + (slot - barW) / 2;
        const y = padTop + plotH - h;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={Math.max(h, 0)} rx={Math.min(8, barW / 2)} fill="url(#aBarGrad)" />
            {bp > 0.02 && (
              <SvgText
                x={x + barW / 2}
                y={Math.max(14, y - 8)}
                fontSize={11}
                fontWeight="700"
                fontFamily={FONT_BODY}
                fill={INK}
                textAnchor="middle"
              >
                {Math.round(value * bp)}%
              </SvgText>
            )}
            <SvgText
              x={x + barW / 2}
              y={height - 12}
              fontSize={10}
              fontFamily={FONT_BODY}
              fill={MUTED}
              textAnchor="middle"
            >
              {labels[i] || ''}
            </SvgText>
          </G>
        );
      })}
    </Svg>
    </View>
  );
};

// ───────────────────────────── Line chart ─────────────────────────────

type LineProps = {
  data: number[];
  labels: string[];
  width: number;
  height: number;
  // Optional colours so the same chart fits both the maroon student screen
  // and the blue teacher screen.
  color?: string;
  ink?: string;
  muted?: string;
  grid?: string;
};

export const AnimatedLineChart = ({
  data,
  labels,
  width,
  height,
  color = '#8B0000',
  ink = INK,
  muted = MUTED,
  grid = '#EEE5E5',
}: LineProps) => {
  const { ref, inView, onLayout } = useInView();
  const p = useReveal(JSON.stringify(data), 1400, 150, inView);
  const areaId = `aLineArea${color.replace('#', '')}`;
  const clipId = `aLineClip${color.replace('#', '')}`;
  const padX = 22;
  const padTop = 28;
  const padBottom = 34;
  const plotW = width - padX * 2;
  const plotH = height - padTop - padBottom;
  const count = Math.max(data.length, 1);
  const slot = plotW / count;
  const baseY = padTop + plotH;

  const points = data.map((raw, i) => {
    const value = clampScore(raw);
    return { x: padX + slot * i + slot / 2, y: padTop + (1 - value / 100) * plotH, value };
  });

  // Smooth curve through the points (same look as the old bezier line).
  let line = '';
  points.forEach((pt, i) => {
    if (i === 0) {
      line = `M ${pt.x} ${pt.y}`;
    } else {
      const prev = points[i - 1];
      const cx = (prev.x + pt.x) / 2;
      line += ` C ${cx} ${prev.y} ${cx} ${pt.y} ${pt.x} ${pt.y}`;
    }
  });
  const area =
    points.length > 1
      ? `${line} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`
      : '';

  // The curve is revealed from left to right.
  const revealX = padX + (plotW + 8) * p;

  return (
    <View ref={ref} onLayout={onLayout} collapsable={false}>
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.22} />
          <Stop offset="1" stopColor={color} stopOpacity={0.02} />
        </LinearGradient>
        <ClipPath id={clipId}>
          <Rect x={0} y={0} width={Math.max(revealX, 0)} height={height} />
        </ClipPath>
      </Defs>

      {GRID.map((g) => {
        const y = padTop + (1 - g / 100) * plotH;
        return <Line key={g} x1={padX} x2={width - padX} y1={y} y2={y} stroke={grid} strokeWidth={1} />;
      })}

      <G clipPath={`url(#${clipId})`}>
        {!!area && <Path d={area} fill={`url(#${areaId})`} />}
        {points.length > 1 && (
          <Path d={line} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        )}
      </G>

      {points.map((pt, i) => {
        const appear = clamp01((revealX - pt.x) / 18);
        return (
          <G key={i}>
            {appear > 0 && (
              <>
                <Circle cx={pt.x} cy={pt.y} r={7 * appear} fill="#FFFFFF" />
                <Circle cx={pt.x} cy={pt.y} r={4.5 * appear} fill={color} />
              </>
            )}
            {appear > 0.7 && (
              <SvgText
                x={pt.x}
                y={Math.max(14, pt.y - 14)}
                fontSize={11}
                fontWeight="700"
                fontFamily={FONT_BODY}
                fill={ink}
                textAnchor="middle"
              >
                {pt.value}%
              </SvgText>
            )}
            <SvgText x={pt.x} y={height - 12} fontSize={10} fontFamily={FONT_BODY} fill={muted} textAnchor="middle">
              {shorten(labels[i] || '', 9)}
            </SvgText>
          </G>
        );
      })}
    </Svg>
    </View>
  );
};

// ───────────────────────────── Donut chart ─────────────────────────────

type Slice = { name: string; population: number; color: string };
type DonutProps = {
  data: Slice[];
  size: number;
  centerValue: number;
  centerLabel: string;
  // The student screen uses a grey "No Data" placeholder slice that should stay out of the legend.
  // A real "No Data" category (teacher risk levels) sets this to true to list it.
  showNoDataLegend?: boolean;
};

export const AnimatedDonutChart = ({ data, size, centerValue, centerLabel, showNoDataLegend = false }: DonutProps) => {
  const { ref, inView, onLayout } = useInView();
  const p = useReveal(JSON.stringify(data), 1200, 150, inView);
  const stroke = Math.round(size * 0.17);
  const radius = (size - stroke) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, d) => sum + d.population, 0) || 1;
  const gap = data.length > 1 ? 3 : 0;

  let used = 0;
  const slices = data.map((d) => {
    const length = (d.population / total) * circumference;
    const start = used;
    used += length;
    return { ...d, length, start };
  });

  const legend = data.filter((d) => showNoDataLegend || d.name !== 'No Data');

  return (
    <View ref={ref} onLayout={onLayout} collapsable={false} style={styles.donutWrap}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={radius} stroke="#F3E9E9" strokeWidth={stroke} fill="none" />
        {slices.map((s) => {
          const drawn = Math.max(s.length * p - gap, 0);
          return (
            <Circle
              key={s.name}
              cx={c}
              cy={c}
              r={radius}
              stroke={s.color}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${drawn} ${circumference}`}
              strokeDashoffset={-(s.start * p)}
              rotation="-90"
              origin={`${c}, ${c}`}
            />
          );
        })}
        <SvgText
          x={c}
          y={c + size * 0.03}
          fontSize={size * 0.2}
          fontWeight="800"
          fontFamily={FONT_BODY}
          fill={INK}
          textAnchor="middle"
        >
          {Math.round(centerValue * p)}
        </SvgText>
        <SvgText
          x={c}
          y={c + size * 0.14}
          fontSize={Math.max(10, size * 0.065)}
          fontFamily={FONT_BODY}
          fill={MUTED}
          textAnchor="middle"
        >
          {centerLabel}
        </SvgText>
      </Svg>

      {legend.length > 0 && (
        <View style={styles.legend}>
          {legend.map((d) => (
            <View key={d.name} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: d.color }]} />
              <Text style={styles.legendText}>
                {d.population} {d.name}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// ───────────────────────────── Ring gauge ─────────────────────────────
// One score (0-100) as a ring. Good for a short list of items, for example the
// lowest performing topics: the ring sweeps and the number counts up.

type GaugeProps = {
  value: number;
  color: string;
  label: string;
  sublabel?: string;
  size?: number;
  width?: number;
  track?: string;
  ink?: string;
  muted?: string;
};

export const AnimatedRingGauge = ({
  value,
  color,
  label,
  sublabel,
  size = 92,
  width = 112,
  track = '#F3E9E9',
  ink = INK,
  muted = MUTED,
}: GaugeProps) => {
  const { ref, inView, onLayout } = useInView();
  const p = useReveal(String(value), 1100, 150, inView);
  const stroke = Math.round(size * 0.13);
  const radius = (size - stroke) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * radius;
  const score = clampScore(value);
  const drawn = circumference * (score / 100) * p;

  return (
    <View ref={ref} onLayout={onLayout} collapsable={false} style={[styles.gaugeWrap, { width }]}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={radius} stroke={track} strokeWidth={stroke} fill="none" />
        {drawn > 0.5 && (
          <Circle
            cx={c}
            cy={c}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${drawn} ${circumference}`}
            rotation="-90"
            origin={`${c}, ${c}`}
          />
        )}
        <SvgText
          x={c}
          y={c + size * 0.09}
          fontSize={size * 0.26}
          fontWeight="800"
          fontFamily={FONT_BODY}
          fill={ink}
          textAnchor="middle"
        >
          {Math.round(score * p)}%
        </SvgText>
      </Svg>
      <Text style={[styles.gaugeLabel, { color: ink }]} numberOfLines={2}>
        {label}
      </Text>
      {!!sublabel && <Text style={[styles.gaugeSub, { color: muted }]}>{sublabel}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  gaugeWrap: { alignItems: 'center' },
  gaugeLabel: { fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  gaugeSub: { fontFamily: FONT_BODY, fontSize: 11, textAlign: 'center', marginTop: 2 },
  donutWrap: { alignItems: 'center', justifyContent: 'center', width: '100%' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FAF7F7',
    borderWidth: 1,
    borderColor: '#EFE6E6',
  },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontFamily: FONT_BODY, fontSize: 12, fontWeight: '600', color: '#374151' },
});