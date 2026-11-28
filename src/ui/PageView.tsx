import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import type { FontKey, Page } from '../pdf/layout';
import { fonts } from '../theme';

const FONT_FOR: Record<FontKey, string> = { regular: fonts.regular, medium: fonts.medium, bold: fonts.bold };

/** The PDF page on screen, drawn from the same operations as the PDF with the same fonts. White in both themes, as it prints. */
export default function PageView({ page, width, label }: { page: Page; width: number; label: string }) {
  const height = (page.height / page.width) * width;
  return (
    <View style={{ width, height, backgroundColor: '#FFFFFF' }} accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={width} height={height} viewBox={`0 0 ${page.width} ${page.height}`}>
        <G>
          {page.ops.map((op, i) => {
            if (op.k === 'text')
              return (
                <SvgText key={i} x={op.x} y={op.y} fontFamily={FONT_FOR[op.font]} fontSize={op.size} fill={op.color}>
                  {op.text}
                </SvgText>
              );
            if (op.k === 'rect') return <Rect key={i} x={op.x} y={op.y} width={op.w} height={op.h} fill={op.fill ?? 'none'} stroke={op.stroke} strokeWidth={op.stroke ? op.lw ?? 1 : 0} />;
            if (op.k === 'dot') return <Circle key={i} cx={op.x} cy={op.y} r={op.r} fill={op.fill} />;
            return <Line key={i} x1={op.x1} y1={op.y1} x2={op.x2} y2={op.y2} stroke={op.color} strokeWidth={op.lw} strokeDasharray={op.dash ? op.dash.join(' ') : undefined} />;
          })}
        </G>
      </Svg>
    </View>
  );
}
