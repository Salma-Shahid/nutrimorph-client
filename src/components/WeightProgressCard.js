import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function WeightProgressCard({
  colors,
  entries = [],
  currentWeight,
  targetWeight,
}) {
  const [chartWidth, setChartWidth] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const points = useMemo(() => {
    const history = entries.slice(-7);
    if (history.length || !Number(currentWeight)) return history;
    return [
      { weight: Number(currentWeight), createdAt: new Date().toISOString() },
    ];
  }, [currentWeight, entries]);

  const values = points
    .map((entry) => Number(entry.weight))
    .filter(Number.isFinite);
  const parsedTarget =
    targetWeight === null || targetWeight === undefined || targetWeight === ""
      ? NaN
      : Number(targetWeight);
  const target =
    Number.isFinite(parsedTarget) && parsedTarget > 0 ? parsedTarget : NaN;
  const rangeValues = Number.isFinite(target) ? [...values, target] : values;
  const low = rangeValues.length ? Math.min(...rangeValues) - 1 : 0;
  const high = rangeValues.length ? Math.max(...rangeValues) + 1 : 1;
  const chartHeight = 86;
  const coordinates = points.map((entry, index) => ({
    x:
      points.length <= 1
        ? 12
        : 12 + (index / (points.length - 1)) * Math.max(0, chartWidth - 24),
    y:
      chartHeight -
      8 -
      ((Number(entry.weight) - low) / Math.max(1, high - low)) *
        (chartHeight - 16),
    entry,
  }));
  const firstWeight = values[0];
  const latestWeight = values[values.length - 1];
  const change =
    Number.isFinite(firstWeight) && Number.isFinite(latestWeight)
      ? Number((latestWeight - firstWeight).toFixed(1))
      : null;

  const flip = () => {
    const nextFlipped = !flipped;
    setFlipped(nextFlipped);
    Animated.spring(rotation, {
      toValue: nextFlipped ? 1 : 0,
      useNativeDriver: true,
      friction: 9,
      tension: 70,
    }).start();
  };

  const frontRotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backRotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });
  const frontOpacity = rotation.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = rotation.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={
        flipped ? "Show weight progress chart" : "Show weight progress stats"
      }
      activeOpacity={0.96}
      onPress={flip}
      style={[
        styles.card,
        { backgroundColor: colors.cardBg, borderColor: colors.border },
      ]}
    >
      <Animated.View
        style={[
          styles.face,
          {
            opacity: frontOpacity,
            transform: [{ perspective: 900 }, { rotateY: frontRotate }],
          },
        ]}
        pointerEvents={flipped ? "none" : "auto"}
      >
        <View style={styles.heading}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              Track your Loss
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Weight trend · tap to see stats
            </Text>
          </View>
          <Ionicons name="sync-outline" size={19} color={colors.primary} />
        </View>
        <View
          style={[styles.chart, { backgroundColor: colors.cardBgGlow }]}
          onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
        >
          {Number.isFinite(target) && (
            <View
              style={[
                styles.targetLine,
                {
                  top:
                    chartHeight -
                    8 -
                    ((target - low) / Math.max(1, high - low)) *
                      (chartHeight - 16),
                  borderColor: colors.textSecondary,
                },
              ]}
            />
          )}
          {coordinates.slice(1).map((point, index) => {
            const previous = coordinates[index];
            const dx = point.x - previous.x;
            const dy = point.y - previous.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            return (
              <View
                key={`line-${index}`}
                style={[
                  styles.segment,
                  {
                    left: previous.x,
                    top: previous.y,
                    width: length,
                    backgroundColor: colors.primary,
                    transform: [{ rotate: `${angle}rad` }],
                  },
                ]}
              />
            );
          })}
          {coordinates.map((point, index) => (
            <View
              key={`${point.entry._id || point.entry.createdAt}-${index}`}
              style={[
                styles.point,
                {
                  left: point.x - 4,
                  top: point.y - 4,
                  backgroundColor: colors.primary,
                  borderColor: colors.cardBg,
                },
              ]}
            />
          ))}
          {points.length === 0 && (
            <Text style={[styles.emptyChart, { color: colors.textSecondary }]}>
              Log a weigh-in to start your progress graph.
            </Text>
          )}
          {Number.isFinite(target) && (
            <Text style={[styles.targetText, { color: colors.textSecondary }]}>
              Target {target} kg
            </Text>
          )}
        </View>
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {points.length
              ? `${points.length} recent weigh-in${points.length === 1 ? "" : "s"}`
              : "No weigh-ins yet"}
          </Text>
          {points.length > 0 && (
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {formatDate(points[points.length - 1].createdAt)}
            </Text>
          )}
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.face,
          styles.back,
          {
            opacity: backOpacity,
            transform: [{ perspective: 900 }, { rotateY: backRotate }],
          },
        ]}
        pointerEvents={flipped ? "auto" : "none"}
      >
        <View style={styles.heading}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              Progress stats
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Tap to return to the graph
            </Text>
          </View>
          <Ionicons name="analytics-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {Number.isFinite(latestWeight) ? `${latestWeight} kg` : "--"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Latest
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {change === null
                ? "--"
                : `${change > 0 ? "+" : ""}${change} kg`}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Change
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {Number.isFinite(target) ? `${target} kg` : "--"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Target
            </Text>
          </View>
        </View>
        <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
          Weight trends are estimates; day-to-day changes are normal.
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 206,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
    backfaceVisibility: "hidden",
  },
  back: { justifyContent: "space-between" },
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 15, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 4 },
  chart: {
    height: 110,
    borderRadius: 12,
    marginTop: 12,
    position: "relative",
    overflow: "hidden",
  },
  targetLine: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 1,
    borderTopWidth: 1,
    borderStyle: "dashed",
  },
  segment: { position: "absolute", height: 2 },
  point: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  targetText: { position: "absolute", top: 4, right: 8, fontSize: 10 },
  emptyChart: { position: "absolute", alignSelf: "center", top: 40, fontSize: 12 },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  footerText: { fontSize: 11 },
  stats: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "700" },
  disclaimer: { fontSize: 11, lineHeight: 16, marginTop: 12 },
});
