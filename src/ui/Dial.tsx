import React from 'react';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { Theme, fonts } from '../theme';
import type { DialStyle } from '../gates';
import { angleFor, dialScale, dialTicks, ARC_END, ARC_START } from '../dial';
import { fromHpa, type PressureUnit } from '../units';

/**
 * The dial. A 270 degree scale in the person's unit, a teal hand on the
 * reading, and a thin set hand on the reading three hours ago (the
 * reference hand a mechanical barometer has), so the trend shows at a
 * glance. No weather words on the face: it shows what the sensor reads.
 *
 *  - classic: a pale enamel face in a graphite bezel, fine graduations
 *  - marine: a dark face with bold graduations, for a boat or a wall
 *  - plain: the ring and the needle only
 */
export default function Dial({
  theme,
  size,
  style,
  unit,
  hpa,
  refHpa,
  caption,
}: {
  theme: Theme;
  size: number;
  style: DialStyle;
  unit: PressureUnit;
  hpa: number | null;
  refHpa?: number | null;
  caption: string;
}) {
  const scale = dialScale(unit, hpa);
  const c = size / 2;
  const marine = style === 'marine';
  const plain = style === 'plain';
  const bezelW = plain ? 0 : size * 0.035;
  const faceR = c - bezelW;
  const faceFill = marine ? (theme.isDark ? '#0E1418' : '#16232A') : theme.face;
  const ink = marine ? '#EEF2F3' : theme.ink;
  const soft = marine ? '#9FB0B6' : theme.inkSoft;
  const tickOuter = faceR - size * 0.035;
  const pt = (deg: number, r: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) };
  };
  const ticks = dialTicks(scale);
  const v = hpa != null ? fromHpa(hpa, unit) : null;
  const ref = refHpa != null ? fromHpa(refHpa, unit) : null;
  const needleDeg = v != null ? angleFor(scale, v) : null;
  const refDeg = ref != null ? angleFor(scale, ref) : null;
  const arcR = tickOuter;
  const a0 = pt(ARC_START, arcR);
  const a1 = pt(ARC_END, arcR);
  const labelSize = size * (marine ? 0.052 : 0.046);
  const label = (n: number) => (scale.decimals ? n.toFixed(scale.decimals) : String(Math.round(n)));
  const hand = (deg: number, len: number, tail: number) => {
    const tip = pt(deg, len);
    const back = pt(deg + 180, tail);
    return { tip, back };
  };

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityLabel={caption}>
      {!plain ? <Circle cx={c} cy={c} r={c - 0.5} fill={theme.bezel} /> : null}
      {!plain ? <Circle cx={c} cy={c} r={c - bezelW * 0.45} fill="none" stroke={theme.bezelInk} strokeOpacity={0.35} strokeWidth={1} /> : null}
      <Circle cx={c} cy={c} r={faceR} fill={plain ? 'none' : faceFill} stroke={plain ? theme.rule : 'none'} strokeWidth={plain ? 2 : 0} />
      {/* The arc the scale sits on. */}
      <Path d={`M ${a0.x} ${a0.y} A ${arcR} ${arcR} 0 1 1 ${a1.x} ${a1.y}`} fill="none" stroke={plain ? theme.rule : soft} strokeOpacity={plain ? 1 : 0.5} strokeWidth={plain ? 2 : 1} />
      {ticks.map((t) => {
        if (plain && !t.major) return null;
        const deg = angleFor(scale, t.value);
        const len = t.major ? size * (marine ? 0.06 : 0.05) : size * 0.024;
        const p1 = pt(deg, tickOuter);
        const p2 = pt(deg, tickOuter - len);
        return <Line key={t.value} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={t.major ? ink : soft} strokeWidth={t.major ? (marine ? 2.6 : 1.8) : 1} strokeLinecap="round" />;
      })}
      {ticks
        .filter((t) => t.major)
        .map((t) => {
          const deg = angleFor(scale, t.value);
          const p = pt(deg, tickOuter - size * (marine ? 0.115 : 0.1));
          return (
            <SvgText key={`l${t.value}`} x={p.x} y={p.y + labelSize * 0.36} fontSize={labelSize} fontFamily={marine ? fonts.bold : fonts.semibold} fill={ink} textAnchor="middle">
              {label(t.value)}
            </SvgText>
          );
        })}
      <SvgText x={c} y={c - size * 0.15} fontSize={size * 0.04} fontFamily={fonts.bold} fill={soft} textAnchor="middle" letterSpacing={1.6}>
        {caption.toUpperCase()}
      </SvgText>
      <SvgText x={c} y={c + size * 0.3} fontSize={size * 0.055} fontFamily={fonts.semibold} fill={soft} textAnchor="middle">
        {unit}
      </SvgText>
      {refDeg != null ? (
        <G>
          {(() => {
            const h = hand(refDeg, tickOuter - size * 0.02, 0);
            const d = pt(refDeg, tickOuter - size * 0.075);
            return (
              <>
                <Line x1={c} y1={c} x2={h.tip.x} y2={h.tip.y} stroke={soft} strokeWidth={1.4} strokeLinecap="round" />
                <Circle cx={d.x} cy={d.y} r={size * 0.012} fill={faceFill === 'none' ? theme.bg : faceFill} stroke={soft} strokeWidth={1.4} />
              </>
            );
          })()}
        </G>
      ) : null}
      {needleDeg != null ? (
        <G>
          {(() => {
            const h = hand(needleDeg, tickOuter - size * 0.01, size * 0.1);
            const side = (sign: number) => pt(needleDeg + 90 * sign, size * 0.016);
            const l = side(-1);
            const r = side(1);
            return (
              <>
                <Path d={`M ${h.tip.x} ${h.tip.y} L ${l.x} ${l.y} L ${h.back.x} ${h.back.y} L ${r.x} ${r.y} Z`} fill={theme.accent} />
                <Circle cx={h.back.x} cy={h.back.y} r={size * 0.022} fill={theme.accent} />
              </>
            );
          })()}
        </G>
      ) : null}
      <Circle cx={c} cy={c} r={size * 0.032} fill={marine ? '#EEF2F3' : theme.ink} />
      <Circle cx={c} cy={c} r={size * 0.012} fill={marine ? '#16232A' : theme.face} />
    </Svg>
  );
}
