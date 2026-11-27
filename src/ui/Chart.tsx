import React from 'react';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Theme, fonts } from '../theme';
import type { ChartData, RangeId } from '../chart';
import { pressureScale, thin, timeTicks } from '../chart';
import type { Note } from '../notes';
import { fromHpa, type PressureUnit } from '../units';
import { tickLabel } from '../format';

/**
 * The pressure chart. The line is drawn only between readings close in
 * time (src/chart.ts); a stretch with no readings is a pale band with no
 * line through it, and a reading on its own is a dot. Notes stand on the
 * chart as numbered marks.
 */
export default function Chart({
  theme,
  data,
  range,
  unit,
  notes,
  width,
  height,
  locale,
  label,
}: {
  theme: Theme;
  data: ChartData;
  range: RangeId;
  unit: PressureUnit;
  notes: Note[];
  width: number;
  height: number;
  locale: string;
  label: string;
}) {
  const left = 44;
  const right = 10;
  const top = 18;
  const bottom = 24;
  const w = width - left - right;
  const h = height - top - bottom;
  const scale = pressureScale(data.points.map((p) => p.hpa), unit);
  const X = (t: number) => left + ((t - data.from) / Math.max(1, data.to - data.from)) * w;
  const Y = (hpa: number) => top + h - ((fromHpa(hpa, unit) - scale.min) / Math.max(1e-9, scale.max - scale.min)) * h;
  const Yv = (v: number) => top + h - ((v - scale.min) / Math.max(1e-9, scale.max - scale.min)) * h;
  const runs = thin(data, Math.round(w / 2));
  const shown = notes.filter((n) => n.t >= data.from && n.t <= data.to).sort((a, b) => a.t - b.t);

  return (
    <Svg width={width} height={height} accessibilityLabel={label}>
      {data.gaps.map((g, i) => (
        <Rect key={`g${i}`} x={X(g.from)} y={top} width={Math.max(1, X(g.to) - X(g.from))} height={h} fill={theme.gap} />
      ))}
      {scale.ticks.map((t) => (
        <G key={`y${t}`}>
          <Line x1={left} y1={Yv(t)} x2={left + w} y2={Yv(t)} stroke={theme.rule} strokeWidth={1} />
          <SvgText x={left - 7} y={Yv(t) + 4} fontSize={11} fontFamily={fonts.medium} fill={theme.inkSoft} textAnchor="end">
            {t.toFixed(scale.decimals)}
          </SvgText>
        </G>
      ))}
      {timeTicks(data.from, data.to, range).map((t) => (
        <G key={`x${t}`}>
          <Line x1={X(t)} y1={top + h} x2={X(t)} y2={top + h + 4} stroke={theme.inkFaint} strokeWidth={1} />
          <SvgText x={X(t)} y={top + h + 17} fontSize={11} fontFamily={fonts.medium} fill={theme.inkSoft} textAnchor="middle">
            {tickLabel(t, range, locale)}
          </SvgText>
        </G>
      ))}
      <Line x1={left} y1={top + h} x2={left + w} y2={top + h} stroke={theme.inkFaint} strokeWidth={1} />
      {runs.map((run, i) => {
        if (run.length === 1) return <Circle key={`r${i}`} cx={X(run[0].t)} cy={Y(run[0].hpa)} r={3} fill={theme.accent} />;
        const d = run.map((p, j) => `${j ? 'L' : 'M'} ${X(p.t).toFixed(1)} ${Y(p.hpa).toFixed(1)}`).join(' ');
        const area = `${d} L ${X(run[run.length - 1].t).toFixed(1)} ${top + h} L ${X(run[0].t).toFixed(1)} ${top + h} Z`;
        return (
          <G key={`r${i}`}>
            <Path d={area} fill={theme.accentWash} />
            <Path d={d} stroke={theme.accent} strokeWidth={2.4} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          </G>
        );
      })}
      {shown.map((n, i) => {
        const x = X(n.t);
        return (
          <G key={n.id}>
            <Line x1={x} y1={top + 8} x2={x} y2={top + h} stroke={theme.ink} strokeOpacity={0.55} strokeWidth={1} strokeDasharray="3 3" />
            <Circle cx={x} cy={top + 2} r={9} fill={theme.ink} />
            <SvgText x={x} y={top + 6} fontSize={11} fontFamily={fonts.bold} fill={theme.bg} textAnchor="middle">
              {String(i + 1)}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
