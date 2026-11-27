import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * The app's own glyphs, drawn on a 24 grid with round ends. No icon pack.
 * Tabs: gauge (a dial with a hand), altimeter (two peaks), history (a
 * line over an axis), settings (a knob with notches).
 */
export type GlyphName =
  | 'gauge'
  | 'altimeter'
  | 'history'
  | 'settings'
  | 'close'
  | 'back'
  | 'check'
  | 'plus'
  | 'chevron'
  | 'up'
  | 'down'
  | 'steady'
  | 'share'
  | 'print'
  | 'file'
  | 'bell'
  | 'tag'
  | 'location'
  | 'reset'
  | 'lock'
  | 'star'
  | 'undo'
  | 'trash'
  | 'sensor'
  | 'calendar'
  | 'dial';

const PATHS: Record<GlyphName, string[]> = {
  gauge: ['M4.2 16.5a8.5 8.5 0 1 1 15.6 0', 'M12 13.5l3.6-4.6', 'M7.5 19.5h9'],
  altimeter: ['M2.5 19.5l6-10 3.5 5.5 2.5-3.5 7 8z', 'M8.5 9.5l1.6 2.6'],
  history: ['M3.5 4.5v15h17', 'M6.5 15l3.5-4 3 2.5 4.5-6'],
  settings: ['M12 7.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9z', 'M12 2.8v2.2', 'M12 19v2.2', 'M2.8 12h2.2', 'M19 12h2.2', 'M5.5 5.5l1.5 1.5', 'M17 17l1.5 1.5', 'M5.5 18.5l1.5-1.5', 'M17 7l1.5-1.5'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  back: ['M15 5l-7 7 7 7'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  plus: ['M12 5v14', 'M5 12h14'],
  chevron: ['M9 5l7 7-7 7'],
  up: ['M12 19V5', 'M6 11l6-6 6 6'],
  down: ['M12 5v14', 'M6 13l6 6 6-6'],
  steady: ['M5 12h14', 'M13 6l6 6-6 6'],
  share: ['M12 3.5v11', 'M7.5 8L12 3.5 16.5 8', 'M5 12.5v7h14v-7'],
  print: ['M7 9V3.5h10V9', 'M7 17H4.5V9h15v8H17', 'M7 14h10v6.5H7z'],
  file: ['M6 3.5h8l4 4v13H6z', 'M14 3.5v4h4', 'M9 12.5h6', 'M9 16h6'],
  bell: ['M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z', 'M10 20.5h4'],
  tag: ['M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3-8.7 8.7z', 'M8 8h.01'],
  location: ['M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z', 'M12 7.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z'],
  reset: ['M4.5 12a7.5 7.5 0 1 0 2.2-5.3', 'M4.5 4v4.5H9'],
  lock: ['M6 10.5h12v10H6z', 'M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3'],
  star: ['M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z'],
  undo: ['M9 8.5L4.5 13 9 17.5', 'M4.5 13h10a5 5 0 0 0 0-10h-3'],
  trash: ['M4.5 6.5h15', 'M9.5 6.5v-3h5v3', 'M6.5 6.5l1 14h9l1-14'],
  sensor: ['M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7z', 'M6.3 6.3a8 8 0 0 0 0 11.4', 'M17.7 6.3a8 8 0 0 1 0 11.4'],
  calendar: ['M4.5 6h15v14h-15z', 'M4.5 10h15', 'M8.5 3.5v4', 'M15.5 3.5v4'],
  dial: ['M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17z', 'M12 12l-3-4.5', 'M12 5.5v1.5', 'M18.5 12H17', 'M7 12H5.5'],
};

export default function Glyph({ name, size = 24, color, weight = 2 }: { name: GlyphName; size?: number; color: string; weight?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {PATHS[name].map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {name === 'gauge' ? <Circle cx={12} cy={13.5} r={1.3} fill={color} /> : null}
      {name === 'dial' ? <Circle cx={12} cy={12} r={1.1} fill={color} /> : null}
    </Svg>
  );
}
