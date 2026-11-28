import React from 'react';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Theme, fonts } from '../theme';
import { metersTo, type ElevationUnit } from '../units';

/**
 * The altimeter's tape: a vertical scale that slides under a fixed
 * pointer, like the altitude tape on an aircraft display. Ticks every 10
 * m (or 50 ft), labels every 50 m (or 200 ft).
 */
export default function Tape({ theme, meters, unit, height, width = 96 }: { theme: Theme; meters: number | null; unit: ElevationUnit; height: number; width?: number }) {
  const v = meters == null ? 0 : metersTo(meters, unit);
  const step = unit === 'ft' ? 50 : 10;
  const labelEvery = unit === 'ft' ? 200 : 50;
  const pxPer = 2.2 * (unit === 'ft' ? 0.25 : 1);
  const mid = height / 2;
  const first = Math.floor((v - mid / pxPer) / step) * step;
  const ticks: number[] = [];
  for (let t = first; t <= v + mid / pxPer; t += step) ticks.push(t);
  const y = (t: number) => mid - (t - v) * pxPer;
  return (
    <Svg width={width} height={height}>
      <Rect x={0.5} y={0.5} width={width - 1} height={height - 1} rx={14} fill={theme.face} stroke={theme.edge} />
      {ticks.map((t) => {
        const major = Math.round(t) % labelEvery === 0;
        return (
          <React.Fragment key={t}>
            <Line x1={width - 10} y1={y(t)} x2={width - 10 - (major ? 18 : 9)} y2={y(t)} stroke={major ? theme.ink : theme.inkFaint} strokeWidth={major ? 1.6 : 1} />
            {major ? (
              <SvgText x={width - 34} y={y(t) + 4} fontSize={12} fontFamily={fonts.medium} fill={theme.inkSoft} textAnchor="end">
                {String(Math.round(t))}
              </SvgText>
            ) : null}
          </React.Fragment>
        );
      })}
      {meters != null ? <Path d={`M ${width - 6} ${mid} L ${width - 22} ${mid - 9} L ${width - 22} ${mid + 9} Z`} fill={theme.accent} /> : null}
      <Line x1={8} y1={mid} x2={width - 24} y2={mid} stroke={theme.accent} strokeWidth={1.5} strokeOpacity={meters != null ? 0.7 : 0} />
    </Svg>
  );
}
