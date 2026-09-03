import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText, Polygon } from 'react-native-svg';
import { colors, space, typography } from '@/constants/theme';
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
        {/* 目安の横罫。1px の点線だけ。 */}
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

        {/* 折れ線の下の面。グラデーションではなく単一の淡い塗り。 */}
        {areaPoints !== '' && <Polygon points={areaPoints} fill={colors.primary} fillOpacity="0.08" />}

        {/* 折れ線 */}
        {validPoints.length >= 2 && (
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke={colors.primary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Dots */}
        {points.map((p, i) => (
          <React.Fragment key={i}>
            {p.mood !== null && (
              <>
                <Circle cx={p.x} cy={p.y} r={4} fill={colors.primary} />
                <Circle cx={p.x} cy={p.y} r={2} fill={colors.card} />
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
          <Text style={styles.emptyText}>記録をつけるとグラフが表示されます</Text>
        </View>
      )}

      {/* Y-axis labels */}
      <View style={styles.yLabels}>
        {['最高', '', '普通', '', '最低'].map((label, i) => (
          <Text key={i} style={styles.yLabel}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { ...typography.caption, color: colors.mutedForeground },
  yLabels: {
    position: 'absolute',
    left: 0,
    top: space.md,
    height: PLOT_H,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: PAD_L - 2,
  },
  yLabel: { ...typography.micro, fontSize: 9, color: colors.mutedForeground },
});
