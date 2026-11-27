import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const USE_NATIVE_DRIVER = Platform.OS !== "web";
const IS_WEB = Platform.OS === "web";
const CHART_POINTS = 14;
// Chart padding. The right gutter holds the target label and latest value so
// they never collide with (or clip against) the line.
const PAD = { top: 14, bottom: 12, left: 12, right: 58 };

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
const round1 = (value) => Math.round(value * 10) / 10;
const signed = (value) => `${value > 0 ? "+" : ""}${round1(value)} kg`;

export default function WeightProgressCard({
  colors,
  entries = [],
  currentWeight,
  targetWeight,
  onAddWeighIn,
}) {
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const [flipped, setFlipped] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;

  // Full account history, oldest → newest, with invalid rows dropped.
  const history = useMemo(() => {
    const rows = (entries || [])
      .map((entry) => ({
        ...entry,
        weight: Number(entry?.weight),
        time: new Date(entry?.createdAt).getTime(),
      }))
      .filter((entry) => Number.isFinite(entry.weight) && entry.weight > 0)
      .sort((a, b) => (a.time || 0) - (b.time || 0));
    if (rows.length || !(Number(currentWeight) > 0)) return rows;
    // No weigh-ins yet: show the profile weight as the starting point.
    return [
      {
        weight: Number(currentWeight),
        createdAt: new Date().toISOString(),
        time: Date.now(),
        fromProfile: true,
      },
    ];
  }, [currentWeight, entries]);

  const points = history.slice(-CHART_POINTS);
  const parsedTarget = Number(targetWeight);
  const target =
    targetWeight !== null &&
    targetWeight !== undefined &&
    targetWeight !== "" &&
    Number.isFinite(parsedTarget) &&
    parsedTarget > 0
      ? parsedTarget
      : null;

  const first = history[0]?.weight;
  const latest = history[history.length - 1]?.weight;
  const previous = history[history.length - 2]?.weight;
  const totalChange =
    history.length > 1 ? round1(latest - first) : null;
  const lastChange =
    history.length > 1 ? round1(latest - previous) : null;

  // Direction of the goal: losing unless the target is above the start.
  const goal =
    target !== null && Number.isFinite(first) && target > first
      ? "gain"
      : "lose";
  const isAway = (delta) =>
    delta !== null && (goal === "lose" ? delta > 0 : delta < 0);
  const isToward = (delta) =>
    delta !== null && (goal === "lose" ? delta < 0 : delta > 0);
  // Trend colour follows the most recent movement.
  const trendDelta = lastChange;
  const trendColor = isAway(trendDelta)
    ? colors.danger || "#EF4444"
    : isToward(trendDelta)
      ? colors.primary
      : colors.textSecondary;
  const toTarget =
    target !== null && Number.isFinite(latest) ? round1(target - latest) : null;

  // --- chart geometry (measured, so nothing clips on any width) -----------
  const values = points.map((point) => point.weight);
  const rangeValues = target !== null ? [...values, target] : values;
  const minValue = rangeValues.length ? Math.min(...rangeValues) : 0;
  const maxValue = rangeValues.length ? Math.max(...rangeValues) : 1;
  const span = Math.max(maxValue - minValue, 2);
  const low = minValue - span * 0.12;
  const high = maxValue + span * 0.12;
  const plotWidth = Math.max(0, chartSize.width - PAD.left - PAD.right);
  const plotHeight = Math.max(0, chartSize.height - PAD.top - PAD.bottom);
  const yFor = (value) =>
    PAD.top + (1 - (value - low) / Math.max(0.0001, high - low)) * plotHeight;
  const coordinates = points.map((point, index) => ({
    x:
      points.length <= 1
        ? PAD.left + plotWidth / 2
        : PAD.left + (index / (points.length - 1)) * plotWidth,
    y: yFor(point.weight),
    point,
  }));
  const ready = chartSize.width > 0 && chartSize.height > 0;
  const targetY = target !== null ? yFor(target) : null;
  const clampLabel = (y) =>
    Math.min(Math.max(y - 7, 0), Math.max(0, chartSize.height - 14));

  const flip = () => {
    const next = !flipped;
    setFlipped(next);
    Animated.timing(rotation, {
      toValue: next ? 1 : 0,
      duration: 380,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  // Native: 3D flip. Web: cross-fade (backface-visibility is unreliable there).
  const frontStyle = IS_WEB
    ? {
        opacity: rotation.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
      }
    : {
        opacity: rotation.interpolate({
          inputRange: [0, 0.49, 0.5, 1],
          outputRange: [1, 1, 0, 0],
        }),
        transform: [
          { perspective: 900 },
          {
            rotateY: rotation.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", "180deg"],
            }),
          },
        ],
      };
  const backStyle = IS_WEB
    ? {
        opacity: rotation.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
      }
    : {
        opacity: rotation.interpolate({
          inputRange: [0, 0.49, 0.5, 1],
          outputRange: [0, 0, 1, 1],
        }),
        transform: [
          { perspective: 900 },
          {
            rotateY: rotation.interpolate({
              inputRange: [0, 1],
              outputRange: ["180deg", "360deg"],
            }),
          },
        ],
      };

  const lineColor = history.length > 1 ? trendColor : colors.primary;
  const lowest = history.length ? Math.min(...history.map((h) => h.weight)) : null;
  const highest = history.length ? Math.max(...history.map((h) => h.weight)) : null;
  const weeks =
    history.length > 1
      ? (history[history.length - 1].time - history[0].time) / (7 * 86400000)
      : 0;
  const weeklyRate = weeks >= 1 && totalChange !== null ? totalChange / weeks : null;

  const stats = [
    { label: "Latest", value: Number.isFinite(latest) ? `${round1(latest)} kg` : "--" },
    {
      label: "Since start",
      value: totalChange === null ? "--" : signed(totalChange),
      color: isAway(totalChange) ? colors.danger : isToward(totalChange) ? colors.primary : undefined,
    },
    {
      label: "Last change",
      value: lastChange === null ? "--" : signed(lastChange),
      color: isAway(lastChange) ? colors.danger : isToward(lastChange) ? colors.primary : undefined,
    },
    {
      // Direction goes in the label so the value fits narrow cells.
      label:
        toTarget === null || Math.abs(toTarget) < 0.1
          ? "Target"
          : toTarget < 0
            ? "Left to lose"
            : "Left to gain",
      value:
        toTarget === null
          ? "Not set"
          : Math.abs(toTarget) < 0.1
            ? "Reached"
            : `${Math.abs(toTarget)} kg`,
    },
    {
      label: "Range",
      value:
        history.length < 2 ? "--" : `${round1(lowest)}–${round1(highest)} kg`,
    },
    {
      label: "Per week",
      value: weeklyRate === null ? "--" : signed(weeklyRate),
      color: isAway(weeklyRate) ? colors.danger : undefined,
    },
  ];

  const statusText = (() => {
    if (!history.length) return "No weigh-ins yet";
    if (history.length === 1) {
      return history[0].fromProfile
        ? "Starting weight from your profile"
        : "1 weigh-in · add another to see your trend";
    }
    if (isAway(lastChange)) {
      return `Up ${Math.abs(lastChange)} kg, moving away from your goal`;
    }
    if (isToward(lastChange)) {
      return `${goal === "lose" ? "Down" : "Up"} ${Math.abs(lastChange)} kg, on track`;
    }
    return "No change since last weigh-in";
  })();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        flipped ? "Show weight progress chart" : "Show weight progress stats"
      }
      onPress={flip}
      style={({ pressed, hovered }) => [
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderColor:
            pressed || hovered
              ? colors.neonBorderActive || colors.primary
              : isAway(trendDelta) && history.length > 1
                ? colors.danger
                : colors.neonBorder || colors.border,
        },
      ]}
    >
      <Animated.View
        style={[styles.face, frontStyle]}
        pointerEvents={flipped ? "none" : "auto"}
      >
        <View style={styles.heading}>
          <View style={styles.headingText}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {goal === "gain" ? "Track your Gain" : "Track your Loss"}
            </Text>
            <Text
              style={[styles.subtitle, { color: history.length > 1 ? trendColor : colors.textSecondary }]}
              numberOfLines={1}
            >
              {statusText}
            </Text>
          </View>
          <View style={[styles.flipHint, { borderColor: colors.border }]}>
            <Ionicons name="stats-chart-outline" size={14} color={colors.primary} />
            <Text style={[styles.flipHintText, { color: colors.textSecondary }]}>Stats</Text>
          </View>
        </View>

        <View
          style={[styles.chart, { backgroundColor: colors.cardBgGlow }]}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            if (width !== chartSize.width || height !== chartSize.height) {
              setChartSize({ width, height });
            }
          }}
        >
          {ready && targetY !== null && (
            <>
              <View
                style={[
                  styles.targetLine,
                  {
                    top: targetY,
                    left: PAD.left,
                    width: plotWidth,
                    borderColor: colors.textSecondary,
                  },
                ]}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.gutterLabel,
                  { top: clampLabel(targetY), color: colors.textSecondary },
                ]}
              >
                🎯 {round1(target)} kg
              </Text>
            </>
          )}

          {ready &&
            coordinates.slice(1).map((point, index) => {
              const prev = coordinates[index];
              const dx = point.x - prev.x;
              const dy = point.y - prev.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              // Views rotate around their centre, so position each segment by
              // its midpoint; this keeps consecutive segments joined.
              return (
                <View
                  key={`seg-${index}`}
                  style={[
                    styles.segment,
                    {
                      left: (prev.x + point.x) / 2 - length / 2,
                      top: (prev.y + point.y) / 2 - 1.25,
                      width: length,
                      backgroundColor: lineColor,
                      transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                    },
                  ]}
                />
              );
            })}

          {ready &&
            coordinates.map((coordinate, index) => {
              const isLast = index === coordinates.length - 1;
              return (
                <View
                  key={`${coordinate.point._id || coordinate.point.createdAt}-${index}`}
                  style={[
                    isLast ? styles.pointLast : styles.point,
                    {
                      left: coordinate.x - (isLast ? 5 : 3.5),
                      top: coordinate.y - (isLast ? 5 : 3.5),
                      backgroundColor: isLast ? lineColor : colors.cardBg,
                      borderColor: lineColor,
                    },
                  ]}
                />
              );
            })}

          {ready && coordinates.length > 0 && (
            <Text
              numberOfLines={1}
              style={[
                styles.gutterLabel,
                {
                  top: clampLabel(coordinates[coordinates.length - 1].y),
                  color: lineColor,
                  fontWeight: "700",
                },
                // Avoid overlapping the target label when they are close.
                targetY !== null &&
                  Math.abs(coordinates[coordinates.length - 1].y - targetY) < 14 && {
                    top: clampLabel(
                      coordinates[coordinates.length - 1].y +
                        (coordinates[coordinates.length - 1].y > targetY ? 14 : -14),
                    ),
                  },
              ]}
            >
              {round1(coordinates[coordinates.length - 1].point.weight)} kg
            </Text>
          )}

          {history.length === 0 && (
            <View style={styles.emptyOverlay}>
              <Ionicons name="scale-outline" size={22} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Log a weigh-in to start your progress graph.
              </Text>
            </View>
          )}
          {history.length === 1 && (
            <Text
              style={[styles.sparseText, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              Log another weigh-in to draw your trend line.
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]} numberOfLines={1}>
            {history.length > CHART_POINTS
              ? `Last ${CHART_POINTS} of ${history.length} weigh-ins`
              : history.length && !history[0].fromProfile
                ? `${history.length} weigh-in${history.length === 1 ? "" : "s"}`
                : "Tap the card for stats"}
          </Text>
          {points.length > 0 && !points[points.length - 1].fromProfile && (
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {formatDate(points[points.length - 1].createdAt)}
            </Text>
          )}
        </View>
      </Animated.View>

      <Animated.View
        style={[styles.face, backStyle]}
        pointerEvents={flipped ? "auto" : "none"}
      >
        <View style={styles.heading}>
          <View style={styles.headingText}>
            <Text style={[styles.title, { color: colors.text }]}>Progress stats</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {history.length > 1
                ? `${formatDate(history[0].createdAt)} – ${formatDate(history[history.length - 1].createdAt)}`
                : "Tap to return to the graph"}
            </Text>
          </View>
          <Ionicons name="analytics-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <View
              key={stat.label}
              style={[styles.statCell, { backgroundColor: colors.cardBgGlow, borderColor: colors.border }]}
            >
              <Text
                style={[styles.statValue, { color: stat.color || colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {stat.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
        {history.length < 2 ? (
          onAddWeighIn ? (
            <Text
              onPress={onAddWeighIn}
              style={[styles.disclaimer, { color: colors.primary, fontWeight: "700" }]}
            >
              + Add a weigh-in to unlock trend stats
            </Text>
          ) : (
            <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
              Add a weigh-in to unlock trend stats.
            </Text>
          )
        ) : (
          <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
            Day-to-day changes are normal; watch the weekly trend.
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 248,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    padding: 14,
    backfaceVisibility: "hidden",
  },
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  headingText: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 3 },
  flipHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  flipHintText: { fontSize: 11, fontWeight: "600" },
  chart: {
    flex: 1,
    borderRadius: 12,
    marginTop: 10,
    position: "relative",
    overflow: "hidden",
  },
  targetLine: {
    position: "absolute",
    height: 0,
    borderTopWidth: 1,
    borderStyle: "dashed",
    opacity: 0.7,
  },
  segment: { position: "absolute", height: 2.5, borderRadius: 2 },
  point: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1.5,
  },
  pointLast: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  gutterLabel: {
    position: "absolute",
    right: 6,
    width: PAD.right - 8,
    textAlign: "right",
    fontSize: 10,
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 6,
  },
  emptyText: { fontSize: 12, textAlign: "center" },
  sparseText: {
    position: "absolute",
    left: 10,
    right: PAD.right,
    bottom: 6,
    fontSize: 11,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 8,
  },
  footerText: { fontSize: 11, flexShrink: 1 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
    marginTop: 12,
  },
  statCell: {
    width: "31.5%",
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  statValue: { fontSize: 13, fontWeight: "700" },
  statLabel: { fontSize: 10, marginTop: 2 },
  disclaimer: { fontSize: 11, lineHeight: 16, marginTop: 10, textAlign: "center" },
});
