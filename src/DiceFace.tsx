import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DieType } from './diceUtils';

interface Props {
  sides: DieType;
  value: number;
  size?: number;
}

// Returns SVG polygon points for die shapes, normalised to a 0-0 to size-size box
function getPolygonPoints(sides: DieType, cx: number, cy: number, r: number): string {
  switch (sides) {
    case 4:
      // Triangle (pointing up)
      return [
        [cx, cy - r],
        [cx + r * 0.866, cy + r * 0.5],
        [cx - r * 0.866, cy + r * 0.5],
      ].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    case 6:
      // Square (rotated 45deg = diamond, but for d6 we want a square)
      return [
        [cx - r * 0.75, cy - r * 0.75],
        [cx + r * 0.75, cy - r * 0.75],
        [cx + r * 0.75, cy + r * 0.75],
        [cx - r * 0.75, cy + r * 0.75],
      ].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    case 8:
      // Diamond (square rotated 45deg)
      return [
        [cx, cy - r],
        [cx + r, cy],
        [cx, cy + r],
        [cx - r, cy],
      ].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    default:
      return regularPolygon(sides === 100 ? 20 : sides, cx, cy, r);
  }
}

function regularPolygon(n: number, cx: number, cy: number, r: number): string {
  const points: string[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    points.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return points.join(' ');
}

// Since React Native doesn't include SVG by default, we use a View-based approach
// with borders to approximate shapes. For a clean e-ink result we use a simple
// bordered box with the number inside — extensible to react-native-svg if added later.

const SHAPE_STYLES: Record<DieType, object> = {
  4: { borderRadius: 0, transform: [{ rotate: '0deg' }] },
  6: { borderRadius: 4 },
  8: { borderRadius: 0, transform: [{ rotate: '45deg' }] },
  10: { borderRadius: 8 },
  12: { borderRadius: 12 },
  20: { borderRadius: 999 },
  100: { borderRadius: 999, borderWidth: 3 },
};

export default function DiceFace({ sides, value, size = 64 }: Props) {
  const isRotated = sides === 8;

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <View
        style={[
          styles.face,
          { width: size * 0.85, height: size * 0.85 },
          SHAPE_STYLES[sides],
        ]}
      >
        <Text
          style={[
            styles.value,
            { fontSize: size * 0.35 },
            isRotated ? { transform: [{ rotate: '-45deg' }] } : {},
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
  },
  face: {
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
