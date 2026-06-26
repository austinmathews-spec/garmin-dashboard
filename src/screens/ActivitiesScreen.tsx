import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Line, Text as SvgText } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';
import { Card, StatValue } from '../components';
import { getMockActivities } from '../utils/mockData';
import { useActivitiesData } from '../utils/useGarminData';
import { useDataSource } from '../utils/DataSourceContext';
import type { Activity, HeartRatePoint } from '../types';

// ── Constants ──

const CHART_H = 200;
const CHART_PADDING_LEFT = 40;
const CHART_PADDING_RIGHT = 16;
const CHART_PADDING_TOP = 16;
const CHART_PADDING_BOTTOM = 28;
const CHART_INNER_H = CHART_H - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;

const ACTIVITY_ICONS: Record<string, string> = {
  Running: '\u{1F3C3}',
  Cycling: '\u{1F6B4}',
  Swimming: '\u{1F3CA}',
  Strength: '\u{1F4AA}',
};

const ACTIVITY_COLORS: Record<string, string> = {
  Running: Colors.green,
  Cycling: Colors.orange,
  Swimming: Colors.blue,
  Strength: Colors.purple,
};

const HR_ZONE_COLORS = [Colors.hrRest, Colors.hrFatBurn, Colors.hrCardio, Colors.hrPeak];

// ── Helpers ──

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes} min`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today.getTime() - d.getTime();
  if (diff < 86400000 && diff >= 0) return 'Today';
  if (diff < 172800000 && diff >= 86400000) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function generateWorkoutHR(durationMinutes: number, avgHR: number, maxHR: number): HeartRatePoint[] {
  const points: HeartRatePoint[] = [];
  const count = Math.max(durationMinutes * 2, 20);
  const baseTime = new Date();
  baseTime.setHours(7, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const progress = i / (count - 1);
    const t = new Date(baseTime.getTime() + progress * durationMinutes * 60000);
    let hr: number;
    if (progress < 0.1) {
      hr = avgHR - 30 + progress * 300;
    } else if (progress > 0.9) {
      hr = avgHR - (progress - 0.9) * 200;
    } else {
      hr = avgHR + (Math.sin(progress * Math.PI * 4) * 15) + (Math.random() - 0.5) * 12;
    }
    hr = Math.round(Math.min(Math.max(hr, avgHR - 40), maxHR));
    points.push({ timestamp: t.toISOString(), value: hr });
  }
  return points;
}

function computeHRZones(
  points: HeartRatePoint[],
  durationMinutes: number,
): { zone: string; minBpm: number; maxBpm: number; minutes: number; color: string }[] {
  const zones = [
    { zone: 'Rest', minBpm: 50, maxBpm: 100, minutes: 0, color: HR_ZONE_COLORS[0] },
    { zone: 'Fat Burn', minBpm: 100, maxBpm: 140, minutes: 0, color: HR_ZONE_COLORS[1] },
    { zone: 'Cardio', minBpm: 140, maxBpm: 170, minutes: 0, color: HR_ZONE_COLORS[2] },
    { zone: 'Peak', minBpm: 170, maxBpm: 220, minutes: 0, color: HR_ZONE_COLORS[3] },
  ];
  const minutesPerPoint = durationMinutes / Math.max(points.length - 1, 1);
  for (const p of points) {
    for (const z of zones) {
      if (p.value >= z.minBpm && p.value < z.maxBpm) {
        z.minutes += minutesPerPoint;
        break;
      }
    }
  }
  for (const z of zones) z.minutes = Math.round(z.minutes);
  return zones;
}

// ── Activity Card ──

function ActivityCard({
  activity,
  onPress,
}: {
  activity: Activity;
  onPress: () => void;
}) {
  const icon = ACTIVITY_ICONS[activity.type] ?? '\u{1F3C3}';
  const accentColor = ACTIVITY_COLORS[activity.type] ?? Colors.green;

  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={cardStyles.header}>
          <View style={[cardStyles.iconWrap, { backgroundColor: accentColor + '20' }]}>
            <Text style={cardStyles.icon}>{icon}</Text>
          </View>
          <View style={cardStyles.headerText}>
            <Text style={cardStyles.name}>{activity.name}</Text>
            <Text style={cardStyles.meta}>
              {formatDate(activity.date)} · {formatDuration(activity.durationMinutes)}
            </Text>
          </View>
          <View style={[cardStyles.typeBadge, { backgroundColor: accentColor + '20' }]}>
            <Text style={[cardStyles.typeText, { color: accentColor }]}>{activity.type}</Text>
          </View>
        </View>
        <View style={cardStyles.stats}>
          {activity.distanceKm > 0 && (
            <View style={cardStyles.stat}>
              <Text style={cardStyles.statValue}>{activity.distanceKm.toFixed(1)}</Text>
              <Text style={cardStyles.statLabel}>km</Text>
            </View>
          )}
          <View style={cardStyles.stat}>
            <Text style={cardStyles.statValue}>{activity.avgHeartRate}</Text>
            <Text style={cardStyles.statLabel}>avg bpm</Text>
          </View>
          <View style={cardStyles.stat}>
            <Text style={cardStyles.statValue}>{activity.calories}</Text>
            <Text style={cardStyles.statLabel}>kcal</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const cardStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 20 },
  headerText: { flex: 1, marginLeft: Spacing.sm },
  name: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '600' },
  meta: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  typeText: { fontSize: FontSize.xs, fontWeight: '600' },
  stats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: Spacing.sm },
  stat: { alignItems: 'center' },
  statValue: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  statLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
});

// ── Interactive HR Chart ──

function HRChart({
  points,
  durationMinutes,
  containerWidth,
}: {
  points: HeartRatePoint[];
  durationMinutes: number;
  containerWidth: number;
}) {
  const chartInnerW = containerWidth - CHART_PADDING_LEFT - CHART_PADDING_RIGHT;
  const [cursorInfo, setCursorInfo] = useState<{ hr: number; elapsed: string } | null>(null);
  const cursorX = useSharedValue(-1);
  const isActive = useSharedValue(false);

  const { minHR, maxHR, pathD, yLabels } = useMemo(() => {
    if (points.length === 0) return { minHR: 60, maxHR: 200, pathD: '', yLabels: [] as number[] };
    const values = points.map((p) => p.value);
    const mn = Math.min(...values) - 5;
    const mx = Math.max(...values) + 5;
    const range = mx - mn || 1;

    let d = '';
    for (let i = 0; i < points.length; i++) {
      const x = CHART_PADDING_LEFT + (i / (points.length - 1)) * chartInnerW;
      const y = CHART_PADDING_TOP + (1 - (points[i].value - mn) / range) * CHART_INNER_H;
      d += i === 0 ? `M${x},${y}` : ` L${x},${y}`;
    }

    const step = Math.ceil(range / 4 / 10) * 10;
    const labels: number[] = [];
    for (let v = Math.floor(mn / step) * step; v <= mx; v += step) {
      if (v >= mn) labels.push(v);
    }

    return { minHR: mn, maxHR: mx, pathD: d, yLabels: labels };
  }, [points, chartInnerW]);

  const updateCursor = useCallback(
    (x: number) => {
      const ratio = Math.max(0, Math.min(1, (x - CHART_PADDING_LEFT) / chartInnerW));
      const idx = Math.round(ratio * (points.length - 1));
      if (idx >= 0 && idx < points.length) {
        const elapsedMin = Math.round(ratio * durationMinutes);
        const mm = elapsedMin % 60;
        const hh = Math.floor(elapsedMin / 60);
        const elapsed = hh > 0 ? `${hh}:${String(mm).padStart(2, '0')}` : `${mm}:00`;
        setCursorInfo({ hr: points[idx].value, elapsed });
      }
    },
    [points, durationMinutes],
  );

  const clearCursor = useCallback(() => {
    setCursorInfo(null);
  }, []);

  const gesture = Gesture.Pan()
    .onStart((e) => {
      isActive.value = true;
      cursorX.value = e.x;
      runOnJS(updateCursor)(e.x);
    })
    .onUpdate((e) => {
      cursorX.value = e.x;
      runOnJS(updateCursor)(e.x);
    })
    .onEnd(() => {
      isActive.value = false;
      cursorX.value = -1;
      runOnJS(clearCursor)();
    })
    .minDistance(0);

  const longPress = Gesture.LongPress()
    .minDuration(150)
    .onStart((e) => {
      isActive.value = true;
      cursorX.value = e.x;
      runOnJS(updateCursor)(e.x);
    });

  const composedGesture = Gesture.Race(gesture, longPress);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: isActive.value ? 1 : 0,
    transform: [{ translateX: cursorX.value }],
  }));

  const range = maxHR - minHR || 1;

  return (
    <View>
      {cursorInfo && (
        <View style={chartStyles.cursorHeader}>
          <Text style={chartStyles.cursorHR}>{cursorInfo.hr} bpm</Text>
          <Text style={chartStyles.cursorTime}>{cursorInfo.elapsed}</Text>
        </View>
      )}
      <GestureDetector gesture={composedGesture}>
        <Animated.View>
          <Svg width={containerWidth} height={CHART_H}>
            {/* Grid lines + Y-axis labels */}
            {yLabels.map((v) => {
              const y = CHART_PADDING_TOP + (1 - (v - minHR) / range) * CHART_INNER_H;
              return (
                <React.Fragment key={v}>
                  <Line
                    x1={CHART_PADDING_LEFT}
                    y1={y}
                    x2={CHART_PADDING_LEFT + chartInnerW}
                    y2={y}
                    stroke={Colors.chartGrid}
                    strokeWidth={1}
                  />
                  <SvgText
                    x={CHART_PADDING_LEFT - 6}
                    y={y + 4}
                    fill={Colors.textTertiary}
                    fontSize={10}
                    textAnchor="end"
                  >
                    {v}
                  </SvgText>
                </React.Fragment>
              );
            })}
            {/* HR line */}
            <Path d={pathD} fill="none" stroke={Colors.green} strokeWidth={2} />
          </Svg>
          {/* Cursor overlay */}
          <Animated.View style={[chartStyles.cursorLine, cursorStyle]} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  cursorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  cursorHR: { color: Colors.green, fontSize: FontSize.lg, fontWeight: '700' },
  cursorTime: { color: Colors.textSecondary, fontSize: FontSize.md },
  cursorLine: {
    position: 'absolute',
    top: 0,
    width: 1,
    height: CHART_H,
    backgroundColor: Colors.chartCursor,
  },
});

// ── Activity Detail Modal ──

function ActivityDetail({
  activity,
  onClose,
}: {
  activity: Activity;
  onClose: () => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const chartContainerWidth = screenWidth - Spacing.md * 2;
  const insets = useSafeAreaInsets();
  const accentColor = ACTIVITY_COLORS[activity.type] ?? Colors.green;
  const icon = ACTIVITY_ICONS[activity.type] ?? '\u{1F3C3}';

  const hrPoints = useMemo(
    () =>
      activity.heartRateTimeline ??
      generateWorkoutHR(activity.durationMinutes, activity.avgHeartRate, activity.maxHeartRate),
    [activity],
  );

  const hrZones = useMemo(
    () => computeHRZones(hrPoints, activity.durationMinutes),
    [hrPoints, activity.durationMinutes],
  );

  const totalZoneMinutes = hrZones.reduce((a, z) => a + z.minutes, 0) || 1;

  return (
    <View style={[detailStyles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={detailStyles.header}>
        <Pressable onPress={onClose} style={detailStyles.closeBtn}>
          <Text style={detailStyles.closeTxt}>{'< Back'}</Text>
        </Pressable>
        <View style={detailStyles.headerCenter}>
          <Text style={{ fontSize: 24 }}>{icon}</Text>
          <Text style={[detailStyles.headerTitle, { color: accentColor }]}>{activity.name}</Text>
          <Text style={detailStyles.headerDate}>
            {formatDate(activity.date)} · {formatDuration(activity.durationMinutes)}
          </Text>
        </View>
      </View>

      <ScrollView style={detailStyles.scroll} showsVerticalScrollIndicator={false}>
        {/* HR Chart */}
        <Card title="Heart Rate">
          <HRChart points={hrPoints} durationMinutes={activity.durationMinutes} containerWidth={chartContainerWidth} />
        </Card>

        {/* Summary Stats */}
        <Card title="Summary">
          <View style={detailStyles.statsRow}>
            <StatValue label="Avg HR" value={activity.avgHeartRate} unit="bpm" color={Colors.green} size="sm" />
            <StatValue label="Max HR" value={activity.maxHeartRate} unit="bpm" color={Colors.red} size="sm" />
            <StatValue label="Calories" value={activity.calories} unit="kcal" size="sm" />
            {activity.avgPace ? (
              <StatValue label="Avg Pace" value={activity.avgPace.replace(' /km', '')} unit="/km" size="sm" />
            ) : null}
          </View>
        </Card>

        {/* HR Zones */}
        <Card title="Heart Rate Zones">
          {hrZones.map((z) => (
            <View key={z.zone} style={detailStyles.zoneRow}>
              <View style={detailStyles.zoneLabel}>
                <View style={[detailStyles.zoneDot, { backgroundColor: z.color }]} />
                <Text style={detailStyles.zoneName}>{z.zone}</Text>
              </View>
              <View style={detailStyles.zoneBarBg}>
                <View
                  style={[
                    detailStyles.zoneBarFill,
                    {
                      backgroundColor: z.color,
                      width: `${Math.max((z.minutes / totalZoneMinutes) * 100, 2)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={detailStyles.zoneMin}>{z.minutes}m</Text>
            </View>
          ))}
        </Card>

        {/* Splits Table */}
        {activity.splits && activity.splits.length > 0 && (
          <Card title="Splits">
            <View style={detailStyles.splitsHeader}>
              <Text style={[detailStyles.splitCell, detailStyles.splitHeaderTxt]}>KM</Text>
              <Text style={[detailStyles.splitCell, detailStyles.splitHeaderTxt]}>Pace</Text>
              <Text style={[detailStyles.splitCell, detailStyles.splitHeaderTxt]}>Avg HR</Text>
            </View>
            {activity.splits.map((s) => (
              <View key={s.index} style={detailStyles.splitRow}>
                <Text style={[detailStyles.splitCell, detailStyles.splitVal]}>{s.index}</Text>
                <Text style={[detailStyles.splitCell, detailStyles.splitVal]}>{s.pace}</Text>
                <Text style={[detailStyles.splitCell, detailStyles.splitVal]}>{s.avgHR}</Text>
              </View>
            ))}
          </Card>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  closeBtn: { paddingVertical: Spacing.sm },
  closeTxt: { color: Colors.green, fontSize: FontSize.md, fontWeight: '600' },
  headerCenter: { alignItems: 'center', marginTop: Spacing.xs },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '700', marginTop: Spacing.xs },
  headerDate: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: Spacing.xs },
  scroll: { flex: 1, paddingHorizontal: Spacing.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  zoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  zoneLabel: { flexDirection: 'row', alignItems: 'center', width: 80 },
  zoneDot: { width: 8, height: 8, borderRadius: 4, marginRight: Spacing.xs },
  zoneName: { color: Colors.textSecondary, fontSize: FontSize.xs },
  zoneBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  zoneBarFill: { height: '100%', borderRadius: 3 },
  zoneMin: { color: Colors.textSecondary, fontSize: FontSize.xs, width: 30, textAlign: 'right' },
  splitsHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
    paddingBottom: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  splitRow: { flexDirection: 'row', paddingVertical: Spacing.xs },
  splitCell: { flex: 1, textAlign: 'center' },
  splitHeaderTxt: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },
  splitVal: { color: Colors.text, fontSize: FontSize.sm },
});

// ── Empty State ──

function EmptyState() {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>{'\u{1F3C3}'}</Text>
      <Text style={emptyStyles.title}>No Activities Yet</Text>
      <Text style={emptyStyles.subtitle}>
        Your recent activities will appear here once you start tracking workouts with your Garmin
        device.
      </Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingTop: 120, paddingHorizontal: Spacing.lg },
  icon: { fontSize: 48, marginBottom: Spacing.md },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700', marginBottom: Spacing.sm },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },
});

// ── Main Screen ──

export function ActivitiesScreen() {
  const insets = useSafeAreaInsets();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const { source } = useDataSource();
  const { data: liveActivities } = useActivitiesData(source);
  const mockActivities = useMemo(() => getMockActivities(), []);
  const activities = liveActivities ?? mockActivities;
  const fadeIn = useSharedValue(0);

  const openDetail = useCallback(
    (a: Activity) => {
      setSelectedActivity(a);
      fadeIn.value = 0;
      fadeIn.value = withTiming(1, { duration: 200 });
    },
    [fadeIn],
  );

  const closeDetail = useCallback(() => {
    setSelectedActivity(null);
  }, []);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
  }));

  const renderItem = useCallback(
    ({ item }: { item: Activity }) => <ActivityCard activity={item} onPress={() => openDetail(item)} />,
    [openDetail],
  );

  const keyExtractor = useCallback((item: Activity) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.screenTitle}>Activities</Text>

      {activities.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={activities}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={selectedActivity !== null} animationType="slide" presentationStyle="fullScreen">
        {selectedActivity && (
          <Animated.View style={[{ flex: 1 }, backdropStyle]}>
            <ActivityDetail activity={selectedActivity} onClose={closeDetail} />
          </Animated.View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  screenTitle: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '700',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
});
