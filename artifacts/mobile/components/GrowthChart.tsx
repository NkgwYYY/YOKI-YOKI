import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { DailyRecord } from '@/contexts/AppContext';
import { getLast7Days, getDayLabel } from '@/utils/dateUtils';

interface GrowthChartProps {
  records: DailyRecord[];
}

const CHART_W = 300;
const CHART_H = 110;
const PAD_L = 24;
const PAD_R = 16;
const PAD_T = 12;
const PAD_B = 28;
const PLOT_W = CHART_W - PAD_L - PAD_R;
const PLOT_H = CHART_H - PAD_T - PAD_B;

export function GrowthChart({ records }: GrowthChartProps) {
  const colors = useColors();
  const days = getLast7Days();
  const moodByDate: Record<string, number> = {};
  records.forEach((r) => {
    moodByDate[r.date] = r.mood;
  });

  const points = days.map((date, index) => ({
    x: PAD_L + (index / 6) * PLOT_W,
    y: PAD_T + PLOT_H - ((( moodByDate[date] ?? -1) - 1) / 4) * PLOT_H,
    mood: moodByDate[date] ?? null,
    label: getDayLabel(date),
  }));

  const validPoints = points.filter((p) => p.mood !== null);
  const polylinePoints = validPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Build fill polygon (area under line)
  const areaPoints = validPoints.length >= 2
    ? `${validPoints[0].x},${PAD_T + PLOT_H} ${polylinePoints} ${validPoints[validPoints.length - 1].x},${PAD_T + PLOT_H}`
    : '';

  const hasData = validPoints.length > 0;

  return (
    <View>
      <Svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Horizontal grid lines */}
        {[1, 2, 3, 4, 5].map((mood) => {
          const y = PAD_T + PLOT_H - ((mood - 1) / 4) * PLOT_H;
          return (
            <Line
              key={mood}
              x1={PAD_L}
              y1={y}
              x2={CHART_W - PAD_R}
              y2={y}
              stroke={colors.border}
              strokeWidth="1"
              strokeDasharray="3,4"
            />
          );
        })}

        {/* Area fill */}
        {areaPoints !== '' && (
          <Polygon
            points={areaPoints}
            fill="url(#areaGrad)"
          />
        )}

        {/* Line */}
        {validPoints.length >= 2 && (
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke={colors.primary}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Dots */}
        {points.map((p, i) => (
          <React.Fragment key={i}>
            {p.mood !== null && (
              <>
                <Circle cx={p.x} cy={p.y} r={5} fill={colors.primary} />
                <Circle cx={p.x} cy={p.y} r={2.5} fill={colors.background} />
              </>
            )}
            {/* X-axis labels */}
            <SvgText
              x={p.x}
              y={CHART_H - 6}
              textAnchor="middle"
              fontSize="11"
              fontFamily="Inter_400Regular"
              fill={colors.mutedForeground}
            >
              {p.label}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>

      {!hasData && (
        <View style={styles.emptyOverlay}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            記録をつけるとグラフが表示されます
          </Text>
        </View>
      )}

      {/* Y-axis labels */}
      <View style={styles.yLabels}>
        {['最高', '', '普通', '', '最低'].map((label, i) => (
          <Text key={i} style={[styles.yLabel, { color: colors.mutedForeground }]}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  yLabels: {
    position: 'absolute',
    left: 0,
    top: 10,
    height: PLOT_H,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: PAD_L - 2,
  },
  yLabel: {
    fontSize: 8,
    fontFamily: 'Inter_400Regular',
  },
});
