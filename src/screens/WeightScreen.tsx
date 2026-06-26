import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';
import { Card, TimeRangeSelector } from '../components';
import { useWeightData } from '../utils/useGarminData';
import { useDataSource } from '../utils/DataSourceContext';
import { getMockWeight } from '../utils/mockData';
import type { WeightEntry, TimeRange } from '../types';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CHART_HORIZONTAL_PADDING = Spacing.md;
const CHART_HEIGHT = 250;
const CHART_VERTICAL_PADDING = 30;

type WeightMetric = 'weight' | 'bodyFat' | 'bmi';

function getMetricValue(entry: WeightEntry, metric: WeightMetric): number {
  switch (metric) {
    case 'weight': return entry.weightLbs;
    case 'bodyFat': return entry.bodyFatPct ?? 0;
    case 'bmi': return entry.bmi ?? 0;
  }
}

function getMetricUnit(metric: WeightMetric): string {
  switch (metric) {
    case 'weight': return 'lbs';
    case 'bodyFat': return '%';
    case 'bmi': return '';
  }
}

function getMetricLabel(metric: WeightMetric): string {
  switch (metric) {
    case 'weight': return 'Weight';
    case 'bodyFat': return 'Body Fat';
    case 'bmi': return 'BMI';
  }
}

function getMetricColor(metric: WeightMetric): string {
  switch (metric) {
    case 'weight': return Colors.blue;
    case 'bodyFat': return Colors.orange;
    case 'bmi': return Colors.purple;
  }
}

function buildPath(
  entries: WeightEntry[],
  metric: WeightMetric,
  width: number,
  height: number,
  minVal: number,
  maxVal: number,
): string {
  if (entries.length === 0) return '';
  const range = maxVal - minVal || 1;
  const stepX = width / Math.max(entries.length - 1, 1);

  let d = '';
  entries.forEach((entry, i) => {
    const x = i * stepX;
    const val = getMetricValue(entry, metric);
    const y = height - ((val - minVal) / range) * (height - CHART_VERTICAL_PADDING * 2) - CHART_VERTICAL_PADDING;
    if (i === 0) {
      d += `M ${x} ${y}`;
    } else {
      const prevX = (i - 1) * stepX;
      const prevVal = getMetricValue(entries[i - 1], metric);
      const prevY = height - ((prevVal - minVal) / range) * (height - CHART_VERTICAL_PADDING * 2) - CHART_VERTICAL_PADDING;
      const cpX1 = prevX + stepX * 0.4;
      const cpX2 = x - stepX * 0.4;
      d += ` C ${cpX1} ${prevY} ${cpX2} ${y} ${x} ${y}`;
    }
  });
  return d;
}

function buildAreaPath(
  entries: WeightEntry[],
  metric: WeightMetric,
  width: number,
  height: number,
  minVal: number,
  maxVal: number,
): string {
  const linePath = buildPath(entries, metric, width, height, minVal, maxVal);
  if (!linePath) return '';
  const stepX = width / Math.max(entries.length - 1, 1);
  const lastX = (entries.length - 1) * stepX;
  return `${linePath} L ${lastX} ${height} L 0 ${height} Z`;
}

function getPointY(
  entries: WeightEntry[],
  index: number,
  metric: WeightMetric,
  height: number,
  minVal: number,
  maxVal: number,
): number {
  const range = maxVal - minVal || 1;
  const val = getMetricValue(entries[index], metric);
  return height - ((val - minVal) / range) * (height - CHART_VERTICAL_PADDING * 2) - CHART_VERTICAL_PADDING;
}

function formatDate(dateStr: string, range: TimeRange): string {
  const date = new Date(dateStr + 'T12:00:00');
  if (range === 'All' || range === '1Y') {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function WeightScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - CHART_HORIZONTAL_PADDING * 2;

  const [selectedRange, setSelectedRange] = useState<TimeRange>('1M');
  const [selectedMetric, setSelectedMetric] = useState<WeightMetric>('weight');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const cursorX = useSharedValue(-1);
  const cursorOpacity = useSharedValue(0);

  const { source } = useDataSource();
  const { data: liveWeight } = useWeightData(source);

  const mockData = useMemo(() => getMockWeight(), []);
  const weightData = liveWeight ?? mockData;
  const entries = weightData.entries;

  const filteredEntries = useMemo((): WeightEntry[] => {
    const now = Date.now();
    const dayMs = 86400000;
    let cutoff: number;
    switch (selectedRange) {
      case '1W': cutoff = now - 7 * dayMs; break;
      case '1M': cutoff = now - 30 * dayMs; break;
      case '3M': cutoff = now - 90 * dayMs; break;
      case '1Y': cutoff = now - 365 * dayMs; break;
      case 'All': return entries;
      default: cutoff = now - 30 * dayMs;
    }
    return entries.filter(e => new Date(e.timestamp).getTime() >= cutoff);
  }, [entries, selectedRange]);

  const { minVal, maxVal } = useMemo(() => {
    const values = filteredEntries.map(e => getMetricValue(e, selectedMetric));
    if (values.length === 0) return { minVal: 0, maxVal: 100 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.15 || 2;
    return { minVal: min - padding, maxVal: max + padding };
  }, [filteredEntries, selectedMetric]);

  const pathD = useMemo(
    () => buildPath(filteredEntries, selectedMetric, chartWidth, CHART_HEIGHT, minVal, maxVal),
    [filteredEntries, selectedMetric, chartWidth, minVal, maxVal],
  );

  const areaD = useMemo(
    () => buildAreaPath(filteredEntries, selectedMetric, chartWidth, CHART_HEIGHT, minVal, maxVal),
    [filteredEntries, selectedMetric, chartWidth, minVal, maxVal],
  );

  const activeEntry = activeIndex !== null ? filteredEntries[activeIndex] : null;
  const displayEntry = activeEntry ?? weightData.latestEntry;
  const displayValue = displayEntry ? getMetricValue(displayEntry, selectedMetric) : 0;
  const displayLabel = activeEntry
    ? formatDate(activeEntry.date, selectedRange)
    : getMetricLabel(selectedMetric);

  const firstEntry = filteredEntries.length > 0 ? filteredEntries[0] : null;
  const latestEntry = filteredEntries.length > 0 ? filteredEntries[filteredEntries.length - 1] : null;
  const changeSinceStart = firstEntry && latestEntry
    ? Math.round((getMetricValue(latestEntry, selectedMetric) - getMetricValue(firstEntry, selectedMetric)) * 10) / 10
    : 0;

  const metricColor = getMetricColor(selectedMetric);

  const updateActiveIndex = useCallback(
    (x: number) => {
      if (filteredEntries.length === 0) return;
      const stepX = chartWidth / Math.max(filteredEntries.length - 1, 1);
      const idx = Math.round(x / stepX);
      const clampedIdx = Math.max(0, Math.min(filteredEntries.length - 1, idx));
      setActiveIndex(clampedIdx);
    },
    [filteredEntries, chartWidth],
  );

  const panGesture = Gesture.Pan()
    .onBegin((e) => {
      cursorX.value = e.x;
      cursorOpacity.value = withTiming(1, { duration: 100 });
      runOnJS(setIsDragging)(true);
      runOnJS(updateActiveIndex)(e.x);
    })
    .onUpdate((e) => {
      cursorX.value = e.x;
      runOnJS(updateActiveIndex)(e.x);
    })
    .onEnd(() => {
      cursorOpacity.value = withTiming(0, { duration: 200 });
      runOnJS(setIsDragging)(false);
      runOnJS(setActiveIndex)(null);
    })
    .onFinalize(() => {
      cursorOpacity.value = withTiming(0, { duration: 200 });
      runOnJS(setIsDragging)(false);
      runOnJS(setActiveIndex)(null);
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(150)
    .onStart((e) => {
      cursorX.value = e.x;
      cursorOpacity.value = withTiming(1, { duration: 100 });
      runOnJS(setIsDragging)(true);
      runOnJS(updateActiveIndex)(e.x);
    });

  const composedGesture = Gesture.Race(panGesture, longPressGesture);

  const animatedLineProps = useAnimatedProps(() => ({
    x1: `${cursorX.value}`,
    y1: '0',
    x2: `${cursorX.value}`,
    y2: `${CHART_HEIGHT}`,
    opacity: cursorOpacity.value,
  }));

  const cursorPointY = activeIndex !== null && filteredEntries.length > 0
    ? getPointY(filteredEntries, activeIndex, selectedMetric, CHART_HEIGHT, minVal, maxVal)
    : 0;

  const animatedCircleProps = useAnimatedProps(() => ({
    cx: `${cursorX.value}`,
    opacity: cursorOpacity.value,
  }));

  const handleRangeChange = useCallback((range: TimeRange) => {
    setSelectedRange(range);
    setActiveIndex(null);
    cursorOpacity.value = 0;
  }, [cursorOpacity]);

  const weightRanges: TimeRange[] = ['1W', '1M', '3M', '1Y', 'All'];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isDragging}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.heroValue, { color: metricColor }]}>{displayValue}</Text>
          <Text style={styles.heroUnit}> {getMetricUnit(selectedMetric)}</Text>
        </View>
        <Text style={styles.headerLabel}>{displayLabel}</Text>
        {changeSinceStart !== 0 && !activeIndex && (
          <Text style={[styles.diffText, { color: changeSinceStart < 0 ? Colors.green : Colors.red }]}>
            {changeSinceStart > 0 ? '+' : ''}{changeSinceStart} {getMetricUnit(selectedMetric)} this period
          </Text>
        )}

        {/* Metric Selector */}
        <View style={styles.metricSelector}>
          {(['weight', 'bodyFat', 'bmi'] as WeightMetric[]).map((m) => (
            <View
              key={m}
              style={[
                styles.metricPill,
                selectedMetric === m && { backgroundColor: getMetricColor(m) + '20', borderColor: getMetricColor(m) },
              ]}
              onTouchEnd={() => { setSelectedMetric(m); setActiveIndex(null); cursorOpacity.value = 0; }}
            >
              <Text style={[
                styles.metricPillText,
                selectedMetric === m && { color: getMetricColor(m), fontWeight: '700' },
              ]}>
                {getMetricLabel(m)}
              </Text>
            </View>
          ))}
        </View>

        {/* Interactive Chart */}
        <View style={styles.chartContainer}>
          <GestureDetector gesture={composedGesture}>
            <Animated.View style={styles.chartWrapper}>
              <Svg width={chartWidth} height={CHART_HEIGHT}>
                <Defs>
                  <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={metricColor} stopOpacity="0.2" />
                    <Stop offset="1" stopColor={metricColor} stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                {areaD ? (
                  <Path d={areaD} fill="url(#areaGrad)" />
                ) : null}
                <Path
                  d={pathD}
                  stroke={metricColor}
                  strokeWidth={2.5}
                  fill="none"
                />
                <AnimatedLine
                  animatedProps={animatedLineProps}
                  stroke={Colors.chartCursor}
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
                {activeIndex !== null && (
                  <AnimatedCircle
                    animatedProps={animatedCircleProps}
                    cy={cursorPointY}
                    r={6}
                    fill={metricColor}
                    stroke={Colors.text}
                    strokeWidth={2}
                  />
                )}
              </Svg>
            </Animated.View>
          </GestureDetector>
        </View>

        {/* Time Range */}
        <View style={styles.timeRangeContainer}>
          {weightRanges.map((range) => (
            <View
              key={range}
              style={[
                styles.rangePill,
                selectedRange === range && styles.rangePillActive,
              ]}
              onTouchEnd={() => handleRangeChange(range)}
            >
              <Text style={[
                styles.rangePillText,
                selectedRange === range && styles.rangePillTextActive,
              ]}>
                {range}
              </Text>
            </View>
          ))}
        </View>

        {/* Body Composition Cards */}
        {displayEntry && (
          <>
            <Card title="Body Composition">
              <View style={styles.compositionGrid}>
                <CompositionItem label="Weight" value={`${displayEntry.weightLbs}`} unit="lbs" color={Colors.blue} />
                <CompositionItem label="Body Fat" value={displayEntry.bodyFatPct != null ? `${displayEntry.bodyFatPct}` : '—'} unit="%" color={Colors.orange} />
                <CompositionItem label="BMI" value={displayEntry.bmi != null ? `${displayEntry.bmi}` : '—'} unit="" color={Colors.purple} />
                <CompositionItem label="Body Water" value={displayEntry.bodyWaterPct != null ? `${displayEntry.bodyWaterPct}` : '—'} unit="%" color={Colors.blue} />
              </View>
            </Card>

            <View style={styles.statCardsRow}>
              <Card title="Muscle Mass" style={styles.halfCard}>
                <Text style={styles.cardMainValue}>
                  {displayEntry.muscleMassKg != null ? `${displayEntry.muscleMassKg}` : '—'}
                </Text>
                <Text style={styles.cardUnit}>kg</Text>
              </Card>
              <Card title="Bone Mass" style={styles.halfCard}>
                <Text style={styles.cardMainValue}>
                  {displayEntry.boneMassKg != null ? `${displayEntry.boneMassKg}` : '—'}
                </Text>
                <Text style={styles.cardUnit}>kg</Text>
              </Card>
            </View>

            <View style={styles.statCardsRow}>
              <Card title="Visceral Fat" style={styles.halfCard}>
                <Text style={styles.cardMainValue}>
                  {displayEntry.visceralFat != null ? `${displayEntry.visceralFat}` : '—'}
                </Text>
                <Text style={styles.cardUnit}>rating</Text>
              </Card>
              <Card title="Metabolic Age" style={styles.halfCard}>
                <Text style={styles.cardMainValue}>
                  {displayEntry.metabolicAge != null ? `${displayEntry.metabolicAge}` : '—'}
                </Text>
                <Text style={styles.cardUnit}>years</Text>
              </Card>
            </View>

            {/* Period Summary */}
            <Card title="Period Summary">
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{weightData.averageWeightLbs}</Text>
                  <Text style={styles.statLabel}>Avg Weight</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{weightData.averageBodyFatPct ?? '—'}</Text>
                  <Text style={styles.statLabel}>Avg Body Fat %</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{weightData.averageBmi ?? '—'}</Text>
                  <Text style={styles.statLabel}>Avg BMI</Text>
                </View>
              </View>
            </Card>
          </>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function CompositionItem({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={styles.compositionItem}>
      <View style={[styles.compositionDot, { backgroundColor: color }]} />
      <Text style={styles.compositionLabel}>{label}</Text>
      <View style={styles.compositionValueRow}>
        <Text style={[styles.compositionValue, { color }]}>{value}</Text>
        {unit ? <Text style={styles.compositionUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingHorizontal: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: Spacing.lg,
  },
  heroValue: {
    fontSize: FontSize.hero,
    fontWeight: '700',
  },
  heroUnit: {
    color: Colors.textSecondary,
    fontSize: FontSize.xl,
    fontWeight: '400',
  },
  headerLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  diffText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  metricSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginVertical: Spacing.md,
  },
  metricPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.surfaceLight,
    backgroundColor: Colors.surface,
  },
  metricPillText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  chartContainer: {
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  chartWrapper: {
    height: CHART_HEIGHT,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginVertical: Spacing.md,
  },
  rangePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.xl,
  },
  rangePillActive: {
    backgroundColor: Colors.surface,
  },
  rangePillText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  rangePillTextActive: {
    color: Colors.text,
  },
  compositionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  compositionItem: {
    width: '45%',
    paddingVertical: Spacing.sm,
  },
  compositionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: Spacing.xs,
  },
  compositionLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginBottom: 2,
  },
  compositionValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  compositionValue: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  compositionUnit: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginLeft: 4,
  },
  statCardsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfCard: {
    flex: 1,
  },
  cardMainValue: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  cardUnit: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.surfaceLight,
  },
  statValue: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});
