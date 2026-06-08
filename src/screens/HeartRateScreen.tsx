import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useDerivedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';
import { Card, TimeRangeSelector } from '../components';
import { getMockHeartRate, getMockWeeklyHR } from '../utils/mockData';
import type { HeartRatePoint, HeartRateZone, TimeRange } from '../types';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HORIZONTAL_PADDING = Spacing.md;
const CHART_WIDTH = SCREEN_WIDTH - CHART_HORIZONTAL_PADDING * 2;
const CHART_HEIGHT = 220;
const CHART_VERTICAL_PADDING = 20;

function generateMonthlyHR(days: number): { points: HeartRatePoint[]; restingValues: number[] } {
  const points: HeartRatePoint[] = [];
  const restingValues: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const resting = 56 + Math.round(Math.random() * 8);
    restingValues.push(resting);
    points.push({
      timestamp: d.toISOString(),
      value: resting,
    });
  }
  return { points, restingValues };
}

function buildPath(
  points: HeartRatePoint[],
  width: number,
  height: number,
  minVal: number,
  maxVal: number,
): string {
  if (points.length === 0) return '';
  const range = maxVal - minVal || 1;
  const stepX = width / Math.max(points.length - 1, 1);

  let d = '';
  points.forEach((p, i) => {
    const x = i * stepX;
    const y = height - ((p.value - minVal) / range) * (height - CHART_VERTICAL_PADDING * 2) - CHART_VERTICAL_PADDING;
    if (i === 0) {
      d += `M ${x} ${y}`;
    } else {
      const prevX = (i - 1) * stepX;
      const prevY = height - ((points[i - 1].value - minVal) / range) * (height - CHART_VERTICAL_PADDING * 2) - CHART_VERTICAL_PADDING;
      const cpX1 = prevX + stepX * 0.4;
      const cpX2 = x - stepX * 0.4;
      d += ` C ${cpX1} ${prevY} ${cpX2} ${y} ${x} ${y}`;
    }
  });
  return d;
}

function getPointAtIndex(
  points: HeartRatePoint[],
  index: number,
  width: number,
  height: number,
  minVal: number,
  maxVal: number,
): { x: number; y: number } {
  const range = maxVal - minVal || 1;
  const stepX = width / Math.max(points.length - 1, 1);
  const x = index * stepX;
  const y = height - ((points[index].value - minVal) / range) * (height - CHART_VERTICAL_PADDING * 2) - CHART_VERTICAL_PADDING;
  return { x, y };
}

function formatTimestamp(ts: string, range: TimeRange): string {
  const date = new Date(ts);
  if (range === '1D') {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (range === 'All' || range === '1Y') {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function HeartRateScreen() {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1D');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const cursorX = useSharedValue(-1);
  const cursorOpacity = useSharedValue(0);

  const todayData = useMemo(() => getMockHeartRate(), []);
  const weeklyData = useMemo(() => getMockWeeklyHR(), []);
  const monthlyData = useMemo(() => generateMonthlyHR(30), []);
  const threeMonthData = useMemo(() => generateMonthlyHR(90), []);
  const yearData = useMemo(() => generateMonthlyHR(365), []);
  const allData = useMemo(() => generateMonthlyHR(730), []);

  const chartPoints = useMemo((): HeartRatePoint[] => {
    switch (selectedRange) {
      case '1D':
        return todayData.timelinePoints;
      case '1W':
        return weeklyData.map((d) => ({ timestamp: d.date, value: d.restingHR }));
      case '1M':
        return monthlyData.points;
      case '3M':
        return threeMonthData.points;
      case '1Y':
        return yearData.points;
      case 'All':
        return allData.points;
      default:
        return todayData.timelinePoints;
    }
  }, [selectedRange, todayData, weeklyData, monthlyData, threeMonthData, yearData, allData]);

  const { minVal, maxVal } = useMemo(() => {
    const values = chartPoints.map((p) => p.value);
    return {
      minVal: Math.min(...values) - 5,
      maxVal: Math.max(...values) + 5,
    };
  }, [chartPoints]);

  const pathD = useMemo(
    () => buildPath(chartPoints, CHART_WIDTH, CHART_HEIGHT, minVal, maxVal),
    [chartPoints, minVal, maxVal],
  );

  const currentBpm = activeIndex !== null ? chartPoints[activeIndex]?.value ?? todayData.restingHR : todayData.restingHR;
  const currentLabel = activeIndex !== null && chartPoints[activeIndex]
    ? formatTimestamp(chartPoints[activeIndex].timestamp, selectedRange)
    : 'Resting Heart Rate';

  const yesterdayResting = 61;
  const restingDiff = yesterdayResting - todayData.restingHR;
  const diffPositive = restingDiff > 0;

  const updateActiveIndex = useCallback(
    (x: number) => {
      const stepX = CHART_WIDTH / Math.max(chartPoints.length - 1, 1);
      const idx = Math.round(x / stepX);
      const clampedIdx = Math.max(0, Math.min(chartPoints.length - 1, idx));
      setActiveIndex(clampedIdx);
    },
    [chartPoints],
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

  const cursorPoint = activeIndex !== null
    ? getPointAtIndex(chartPoints, activeIndex, CHART_WIDTH, CHART_HEIGHT, minVal, maxVal)
    : null;

  const animatedCircleProps = useAnimatedProps(() => ({
    cx: `${cursorX.value}`,
    opacity: cursorOpacity.value,
  }));

  const handleRangeChange = useCallback((range: TimeRange) => {
    setSelectedRange(range);
    setActiveIndex(null);
    cursorOpacity.value = 0;
  }, [cursorOpacity]);

  const sevenDayAvgResting = Math.round(
    weeklyData.reduce((sum, d) => sum + d.restingHR, 0) / weeklyData.length,
  );

  const totalZoneMinutes = todayData.zones.reduce((s, z) => s + z.minutes, 0);

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
          <Text style={styles.bpmValue}>{currentBpm}</Text>
          <Text style={styles.bpmUnit}> bpm</Text>
        </View>
        <Text style={styles.headerLabel}>{currentLabel}</Text>
        <Text style={[styles.diffText, { color: diffPositive ? Colors.green : Colors.red }]}>
          {diffPositive ? '▼' : '▲'} {Math.abs(restingDiff)} bpm from yesterday
        </Text>

        {/* Interactive Chart */}
        <View style={styles.chartContainer}>
          <GestureDetector gesture={composedGesture}>
            <Animated.View style={styles.chartWrapper}>
              <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                <Path
                  d={pathD}
                  stroke={Colors.chartLine}
                  strokeWidth={2}
                  fill="none"
                />
                <AnimatedLine
                  animatedProps={animatedLineProps}
                  stroke={Colors.chartCursor}
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
                {cursorPoint && (
                  <AnimatedCircle
                    animatedProps={animatedCircleProps}
                    cy={cursorPoint.y}
                    r={6}
                    fill={Colors.green}
                    stroke={Colors.text}
                    strokeWidth={2}
                  />
                )}
              </Svg>
            </Animated.View>
          </GestureDetector>
        </View>

        {/* Time Range Selector */}
        <TimeRangeSelector selected={selectedRange} onSelect={handleRangeChange} />

        {/* Stat Cards */}
        <Card title="Resting Heart Rate">
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{todayData.restingHR}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{sevenDayAvgResting}</Text>
              <Text style={styles.statLabel}>7-day avg</Text>
            </View>
          </View>
        </Card>

        <View style={styles.statCardsRow}>
          <Card title="Max HR" style={styles.halfCard}>
            <Text style={styles.cardMainValue}>{todayData.maxHR}</Text>
            <Text style={styles.cardUnit}>bpm</Text>
          </Card>
          <Card title="Min HR" style={styles.halfCard}>
            <Text style={styles.cardMainValue}>{todayData.minHR}</Text>
            <Text style={styles.cardUnit}>bpm</Text>
          </Card>
        </View>

        {/* HR Zones */}
        <Card title="Heart Rate Zones">
          <View style={styles.zonesContainer}>
            {/* Stacked bar */}
            <View style={styles.stackedBar}>
              {todayData.zones.map((zone) => (
                <View
                  key={zone.zone}
                  style={[
                    styles.zoneSegment,
                    {
                      flex: zone.minutes / totalZoneMinutes,
                      backgroundColor: getZoneColor(zone.zone),
                    },
                  ]}
                />
              ))}
            </View>
            {/* Zone legend */}
            {todayData.zones.map((zone) => (
              <View key={zone.zone} style={styles.zoneLegendRow}>
                <View style={[styles.zoneDot, { backgroundColor: getZoneColor(zone.zone) }]} />
                <Text style={styles.zoneName}>{zone.zone}</Text>
                <Text style={styles.zoneRange}>{zone.minBpm}–{zone.maxBpm} bpm</Text>
                <Text style={styles.zoneMinutes}>{zone.minutes} min</Text>
              </View>
            ))}
          </View>
        </Card>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getZoneColor(zone: string): string {
  switch (zone) {
    case 'Rest':
      return Colors.hrRest;
    case 'Fat Burn':
      return Colors.hrFatBurn;
    case 'Cardio':
      return Colors.hrCardio;
    case 'Peak':
      return Colors.hrPeak;
    default:
      return Colors.textSecondary;
  }
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
  bpmValue: {
    color: Colors.text,
    fontSize: FontSize.hero,
    fontWeight: '700',
  },
  bpmUnit: {
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
    marginBottom: Spacing.md,
  },
  chartContainer: {
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  chartWrapper: {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
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
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
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
  zonesContainer: {
    gap: Spacing.sm,
  },
  stackedBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  zoneSegment: {
    height: '100%',
  },
  zoneLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  zoneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  zoneName: {
    color: Colors.text,
    fontSize: FontSize.sm,
    flex: 1,
  },
  zoneRange: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginRight: Spacing.md,
  },
  zoneMinutes: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '600',
    width: 55,
    textAlign: 'right',
  },
});
