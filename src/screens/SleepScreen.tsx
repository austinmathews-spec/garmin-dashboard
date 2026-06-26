import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Line, Path, Circle } from 'react-native-svg';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';
import { Card } from '../components';
import { getMockSleep, getMockWeeklySleep } from '../utils/mockData';
import { useSleepData } from '../utils/useGarminData';
import { useDataSource } from '../utils/DataSourceContext';
import type { SleepSummary, SleepStage, TimeRange } from '../types';

const CHART_HEIGHT = 120;
const TREND_CHART_HEIGHT = 160;
const CURSOR_WIDTH = 2;

type ChartMode = 'lastNight' | 'trend';

const STAGE_COLORS: Record<SleepStage['stage'], string> = {
  deep: Colors.sleepDeep,
  light: Colors.sleepLight,
  rem: Colors.sleepRem,
  awake: Colors.sleepAwake,
};

const STAGE_LABELS: Record<SleepStage['stage'], string> = {
  deep: 'Deep',
  light: 'Light',
  rem: 'REM',
  awake: 'Awake',
};

const STAGE_Y: Record<SleepStage['stage'], number> = {
  awake: 0,
  rem: 1,
  light: 2,
  deep: 3,
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getHours();
  const mins = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

function getAvgSleepMinutes(data: SleepSummary[]): number {
  if (data.length === 0) return 0;
  return Math.round(
    data.reduce((sum, d) => sum + d.totalSleepMinutes, 0) / data.length
  );
}

// ─── Last Night Timeline Chart ───────────────────────────────────────────────

interface LastNightChartProps {
  sleep: SleepSummary;
  chartWidth: number;
  onScrub: (stage: SleepStage | null, timeLabel: string | null) => void;
}

function LastNightChart({ sleep, chartWidth, onScrub }: LastNightChartProps) {
  const chartPadding = Spacing.sm;
  const availableWidth = chartWidth - chartPadding * 2;
  const barHeight = 20;
  const rowHeight = barHeight + 8;
  const chartInnerHeight = rowHeight * 4;
  const totalMinutes = sleep.stages.reduce((s, st) => s + st.durationMinutes, 0);

  const cursorX = useSharedValue(-1);
  const isActive = useSharedValue(false);

  const stageBlocks = useMemo(() => {
    let offsetMin = 0;
    return sleep.stages.map((stage) => {
      const x = (offsetMin / totalMinutes) * availableWidth + chartPadding;
      const w = (stage.durationMinutes / totalMinutes) * availableWidth;
      const y = STAGE_Y[stage.stage] * rowHeight + 4;
      offsetMin += stage.durationMinutes;
      return { ...stage, x, w, y };
    });
  }, [sleep.stages, totalMinutes, availableWidth, chartPadding, rowHeight]);

  const findStageAtX = useCallback(
    (x: number): { stage: SleepStage; timeLabel: string } | null => {
      const relX = x - chartPadding;
      if (relX < 0 || relX > availableWidth) return null;
      const minuteOffset = (relX / availableWidth) * totalMinutes;
      let accumulated = 0;
      for (const stage of sleep.stages) {
        accumulated += stage.durationMinutes;
        if (minuteOffset <= accumulated) {
          const stageStartDate = new Date(stage.startTime);
          const minuteInStage = minuteOffset - (accumulated - stage.durationMinutes);
          const pointTime = new Date(stageStartDate.getTime() + minuteInStage * 60000);
          return { stage, timeLabel: formatTime(pointTime.toISOString()) };
        }
      }
      return null;
    },
    [sleep.stages, totalMinutes, availableWidth, chartPadding]
  );

  const handleScrub = useCallback(
    (x: number) => {
      const result = findStageAtX(x);
      if (result) {
        onScrub(result.stage, result.timeLabel);
      }
    },
    [findStageAtX, onScrub]
  );

  const handleEnd = useCallback(() => {
    onScrub(null, null);
  }, [onScrub]);

  const panGesture = Gesture.Pan()
    .onStart((e) => {
      isActive.value = true;
      cursorX.value = Math.max(0, Math.min(e.x, chartWidth));
      runOnJS(handleScrub)(e.x);
    })
    .onUpdate((e) => {
      cursorX.value = Math.max(0, Math.min(e.x, chartWidth));
      runOnJS(handleScrub)(e.x);
    })
    .onEnd(() => {
      isActive.value = false;
      cursorX.value = -1;
      runOnJS(handleEnd)();
    })
    .minDistance(0);

  const longPressGesture = Gesture.LongPress()
    .minDuration(150)
    .onStart((e) => {
      isActive.value = true;
      cursorX.value = Math.max(0, Math.min(e.x, chartWidth));
      runOnJS(handleScrub)(e.x);
    });

  const composedGesture = Gesture.Race(panGesture, longPressGesture);

  const cursorStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: cursorX.value - CURSOR_WIDTH / 2,
    top: 0,
    bottom: 0,
    width: CURSOR_WIDTH,
    backgroundColor: Colors.chartCursor,
    opacity: isActive.value ? 1 : 0,
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={{ height: chartInnerHeight + 30 }}>
        <Svg width={chartWidth} height={chartInnerHeight}>
          {stageBlocks.map((block, i) => (
            <Rect
              key={i}
              x={block.x}
              y={block.y}
              width={Math.max(block.w - 1, 1)}
              height={barHeight}
              rx={4}
              fill={STAGE_COLORS[block.stage]}
            />
          ))}
        </Svg>
        <Animated.View style={cursorStyle} />
        {/* Y-axis labels */}
        <View style={styles.stageLabelsContainer}>
          {(['awake', 'rem', 'light', 'deep'] as const).map((stage, idx) => (
            <Text
              key={stage}
              style={[
                styles.stageLabel,
                { top: idx * rowHeight + 4 + barHeight / 2 - 6 },
              ]}
            >
              {STAGE_LABELS[stage]}
            </Text>
          ))}
        </View>
        {/* Time axis */}
        <View style={styles.timeAxis}>
          <Text style={styles.timeLabel}>{formatTime(sleep.startTime)}</Text>
          <Text style={styles.timeLabel}>{formatTime(sleep.endTime)}</Text>
        </View>
      </View>
    </GestureDetector>
  );
}

// ─── Trend Line Chart ────────────────────────────────────────────────────────

interface TrendChartProps {
  data: SleepSummary[];
  chartWidth: number;
  onScrub: (item: SleepSummary | null) => void;
}

function TrendChart({ data, chartWidth, onScrub }: TrendChartProps) {
  const chartPadding = Spacing.md;
  const availableWidth = chartWidth - chartPadding * 2;
  const availableHeight = TREND_CHART_HEIGHT - 40;

  const cursorX = useSharedValue(-1);
  const isActive = useSharedValue(false);

  const { path, points, minVal, maxVal } = useMemo(() => {
    if (data.length === 0) return { path: '', points: [], minVal: 0, maxVal: 0 };
    const values = data.map((d) => d.totalSleepMinutes);
    const min = Math.min(...values) - 20;
    const max = Math.max(...values) + 20;
    const range = max - min || 1;

    const pts = data.map((d, i) => {
      const x = chartPadding + (i / Math.max(data.length - 1, 1)) * availableWidth;
      const y = availableHeight - ((d.totalSleepMinutes - min) / range) * availableHeight + 20;
      return { x, y, item: d };
    });

    let pathStr = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpx1 = prev.x + (curr.x - prev.x) / 3;
      const cpx2 = prev.x + (2 * (curr.x - prev.x)) / 3;
      pathStr += ` C ${cpx1} ${prev.y} ${cpx2} ${curr.y} ${curr.x} ${curr.y}`;
    }

    return { path: pathStr, points: pts, minVal: min, maxVal: max };
  }, [data, availableWidth, availableHeight, chartPadding]);

  const findItemAtX = useCallback(
    (x: number): SleepSummary | null => {
      if (points.length === 0) return null;
      let closest = points[0];
      let minDist = Math.abs(x - closest.x);
      for (let i = 1; i < points.length; i++) {
        const dist = Math.abs(x - points[i].x);
        if (dist < minDist) {
          minDist = dist;
          closest = points[i];
        }
      }
      return closest.item;
    },
    [points]
  );

  const handleScrub = useCallback(
    (x: number) => {
      const item = findItemAtX(x);
      if (item) onScrub(item);
    },
    [findItemAtX, onScrub]
  );

  const handleEnd = useCallback(() => {
    onScrub(null);
  }, [onScrub]);

  const panGesture = Gesture.Pan()
    .onStart((e) => {
      isActive.value = true;
      cursorX.value = Math.max(chartPadding, Math.min(e.x, chartPadding + availableWidth));
      runOnJS(handleScrub)(e.x);
    })
    .onUpdate((e) => {
      cursorX.value = Math.max(chartPadding, Math.min(e.x, chartPadding + availableWidth));
      runOnJS(handleScrub)(e.x);
    })
    .onEnd(() => {
      isActive.value = false;
      cursorX.value = -1;
      runOnJS(handleEnd)();
    })
    .minDistance(0);

  const longPressGesture = Gesture.LongPress()
    .minDuration(150)
    .onStart((e) => {
      isActive.value = true;
      cursorX.value = Math.max(chartPadding, Math.min(e.x, chartPadding + availableWidth));
      runOnJS(handleScrub)(e.x);
    });

  const composedGesture = Gesture.Race(panGesture, longPressGesture);

  const cursorStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: cursorX.value - CURSOR_WIDTH / 2,
    top: 0,
    bottom: 0,
    width: CURSOR_WIDTH,
    backgroundColor: Colors.chartCursor,
    opacity: isActive.value ? 1 : 0,
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={{ height: TREND_CHART_HEIGHT }}>
        <Svg width={chartWidth} height={TREND_CHART_HEIGHT}>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((frac) => (
            <Line
              key={frac}
              x1={chartPadding}
              y1={20 + availableHeight * frac}
              x2={chartPadding + availableWidth}
              y2={20 + availableHeight * frac}
              stroke={Colors.chartGrid}
              strokeWidth={1}
            />
          ))}
          {/* Line */}
          <Path
            d={path}
            stroke={Colors.green}
            strokeWidth={2.5}
            fill="none"
          />
          {/* Data points */}
          {points.map((pt, i) => (
            <Circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={4}
              fill={Colors.green}
            />
          ))}
        </Svg>
        <Animated.View style={cursorStyle} />
      </View>
    </GestureDetector>
  );
}

// ─── Stages Breakdown Bar ────────────────────────────────────────────────────

interface StagesBarProps {
  sleep: SleepSummary;
}

function StagesBar({ sleep }: StagesBarProps) {
  const total = sleep.deepMinutes + sleep.lightMinutes + sleep.remMinutes + sleep.awakeMinutes;
  const segments = [
    { stage: 'deep' as const, minutes: sleep.deepMinutes },
    { stage: 'light' as const, minutes: sleep.lightMinutes },
    { stage: 'rem' as const, minutes: sleep.remMinutes },
    { stage: 'awake' as const, minutes: sleep.awakeMinutes },
  ];

  return (
    <View>
      <View style={styles.stagesBarRow}>
        {segments.map((seg) => (
          <View
            key={seg.stage}
            style={[
              styles.stagesBarSegment,
              {
                flex: seg.minutes / total,
                backgroundColor: STAGE_COLORS[seg.stage],
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.stagesLegend}>
        {segments.map((seg) => (
          <View key={seg.stage} style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: STAGE_COLORS[seg.stage] }]}
            />
            <Text style={styles.legendText}>
              {STAGE_LABELS[seg.stage]} {Math.round((seg.minutes / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function SleepScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - Spacing.md * 2;

  const [mode, setMode] = useState<ChartMode>('lastNight');
  const [timeRange, setTimeRange] = useState<TimeRange>('1W');

  const { source } = useDataSource();
  const { data: liveSleep } = useSleepData(source);
  const mockSleep = useMemo(() => getMockSleep(), []);
  const todaySleep = liveSleep ?? mockSleep;
  const weeklySleep = useMemo(() => getMockWeeklySleep(), []);
  const avgMinutes = useMemo(() => getAvgSleepMinutes(weeklySleep), [weeklySleep]);

  // Scrub state
  const [scrubDuration, setScrubDuration] = useState<string | null>(null);
  const [scrubScore, setScrubScore] = useState<number | null>(null);
  const [scrubStage, setScrubStage] = useState<string | null>(null);
  const [scrubTime, setScrubTime] = useState<string | null>(null);

  const displayDuration = scrubDuration ?? formatDuration(todaySleep.totalSleepMinutes);
  const displayScore = scrubScore ?? todaySleep.sleepScore;

  const diffMinutes = todaySleep.totalSleepMinutes - avgMinutes;
  const diffSign = diffMinutes >= 0 ? '▲' : '▼';
  const diffColor = diffMinutes >= 0 ? Colors.green : Colors.red;
  const diffText = `${diffSign} ${Math.abs(diffMinutes)} min vs your average`;

  const handleLastNightScrub = useCallback(
    (stage: SleepStage | null, timeLabel: string | null) => {
      if (stage && timeLabel) {
        setScrubStage(STAGE_LABELS[stage.stage]);
        setScrubTime(timeLabel);
      } else {
        setScrubStage(null);
        setScrubTime(null);
      }
    },
    []
  );

  const handleTrendScrub = useCallback((item: SleepSummary | null) => {
    if (item) {
      setScrubDuration(formatDuration(item.totalSleepMinutes));
      setScrubScore(item.sleepScore);
    } else {
      setScrubDuration(null);
      setScrubScore(null);
    }
  }, []);

  const generateSleepData = useCallback((days: number): SleepSummary[] => {
    const results: SleepSummary[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const totalMin = 400 + Math.round(Math.random() * 120);
      results.push({
        ...getMockSleep(d),
        totalSleepMinutes: totalMin,
        sleepScore: 65 + Math.round(Math.random() * 30),
      });
    }
    return results;
  }, []);

  const trendData = useMemo(() => {
    switch (timeRange) {
      case '1W':
        return weeklySleep;
      case '1M':
        return generateSleepData(30);
      case '3M':
        return generateSleepData(90);
      case '1Y':
        return generateSleepData(365);
      case 'All':
        return generateSleepData(730);
      default:
        return weeklySleep;
    }
  }, [timeRange, weeklySleep, generateSleepData]);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            {scrubStage && scrubTime ? (
              <>
                <Text style={styles.heroDuration}>{scrubStage}</Text>
                <Text style={styles.scrubTimeLabel}>{scrubTime}</Text>
              </>
            ) : (
              <>
                <Text style={styles.heroDuration}>{displayDuration}</Text>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreText}>
                    Sleep Score: {displayScore}/100
                  </Text>
                </View>
                <Text style={[styles.diffText, { color: diffColor }]}>
                  {diffText}
                </Text>
              </>
            )}
          </View>

          {/* Mode Toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === 'lastNight' && styles.modeButtonActive,
              ]}
              onPress={() => setMode('lastNight')}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === 'lastNight' && styles.modeButtonTextActive,
                ]}
              >
                Last Night
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === 'trend' && styles.modeButtonActive,
              ]}
              onPress={() => setMode('trend')}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === 'trend' && styles.modeButtonTextActive,
                ]}
              >
                Trend
              </Text>
            </TouchableOpacity>
          </View>

          {/* Chart */}
          {mode === 'lastNight' ? (
            <View style={styles.chartContainer}>
              <LastNightChart sleep={todaySleep} chartWidth={chartWidth} onScrub={handleLastNightScrub} />
            </View>
          ) : (
            <View style={styles.chartContainer}>
              {/* Time range selector for trend */}
              <View style={styles.trendRangeRow}>
                {(['1W', '1M', '3M', '1Y', 'All'] as TimeRange[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.rangePill,
                      timeRange === r && styles.rangePillActive,
                    ]}
                    onPress={() => setTimeRange(r)}
                  >
                    <Text
                      style={[
                        styles.rangePillText,
                        timeRange === r && styles.rangePillTextActive,
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TrendChart data={trendData} chartWidth={chartWidth} onScrub={handleTrendScrub} />
            </View>
          )}

          {/* Stat Cards */}
          <Card title="Sleep Stages">
            <StagesBar sleep={todaySleep} />
          </Card>

          <Card title="Time to Fall Asleep">
            <Text style={styles.statValueLarge}>
              {todaySleep.timeToFallAsleepMinutes} min
            </Text>
          </Card>

          <Card title="Times Woken Up">
            <Text style={styles.statValueLarge}>
              {todaySleep.timesWoken}
            </Text>
          </Card>

          <Card title="Avg Sleep Score (7-day)">
            <Text style={styles.statValueLarge}>
              {Math.round(
                weeklySleep.reduce((sum, d) => sum + d.sleepScore, 0) /
                  weeklySleep.length
              )}
              /100
            </Text>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    marginTop: Spacing.md,
  },
  heroDuration: {
    color: Colors.text,
    fontSize: FontSize.hero,
    fontWeight: '700',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  scoreText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  diffText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  scrubTimeLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.lg,
    marginTop: Spacing.xs,
  },
  modeToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modeButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surfaceLight,
  },
  modeButtonActive: {
    backgroundColor: Colors.green,
  },
  modeButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: Colors.background,
  },
  chartContainer: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    overflow: 'hidden',
  },
  stageLabelsContainer: {
    position: 'absolute',
    right: Spacing.xs,
    top: 0,
    bottom: 30,
  },
  stageLabel: {
    position: 'absolute',
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    right: 0,
  },
  timeAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.xs,
  },
  timeLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
  },
  trendRangeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  rangePill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surfaceLight,
    minHeight: 36,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  rangePillActive: {
    backgroundColor: Colors.green,
  },
  rangePillText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  rangePillTextActive: {
    color: Colors.background,
  },
  stagesBarRow: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  stagesBarSegment: {
    height: '100%',
  },
  stagesLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
  },
  statValueLarge: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
});
