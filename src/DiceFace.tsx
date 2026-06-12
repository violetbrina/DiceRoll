import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DieType } from './diceUtils';

interface Props {
  sides: DieType;
  value: number;
  size?: number;
}

// Triangle (up = d4, down = d20) using the React Native border trick.
// Outer black triangle + inner white triangle create an outlined look.
function TriangleFace({
  direction,
  value,
  size,
}: {
  direction: 'up' | 'down';
  value: number;
  size: number;
}) {
  const halfW = Math.round(size * 0.46);
  const h = Math.round(size * 0.8);
  const border = 2;
  const innerHalfW = halfW - border * 2;
  const innerH = h - border * 3;

  if (direction === 'up') {
    return (
      <View style={[styles.wrapper, { width: size, height: size }]}>
        <View style={{ width: size, height: h, position: 'relative' }}>
          {/* Outer black upward triangle */}
          <View
            style={{
              position: 'absolute',
              left: Math.round(size / 2) - halfW,
              top: 0,
              width: 0,
              height: 0,
              borderLeftWidth: halfW,
              borderRightWidth: halfW,
              borderBottomWidth: h,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: '#000',
            }}
          />
          {/* Inner white upward triangle (creates outline) */}
          <View
            style={{
              position: 'absolute',
              left: Math.round(size / 2) - innerHalfW,
              top: border * 2,
              width: 0,
              height: 0,
              borderLeftWidth: innerHalfW,
              borderRightWidth: innerHalfW,
              borderBottomWidth: innerH,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: '#fff',
            }}
          />
          {/* Number near bottom of triangle */}
          <Text
            style={[
              styles.triValue,
              { fontSize: size * 0.28, bottom: size * 0.04, width: size },
            ]}
          >
            {value}
          </Text>
        </View>
      </View>
    );
  }

  // Downward triangle (d20)
  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <View style={{ width: size, height: h, position: 'relative' }}>
        {/* Outer black downward triangle */}
        <View
          style={{
            position: 'absolute',
            left: Math.round(size / 2) - halfW,
            bottom: 0,
            width: 0,
            height: 0,
            borderLeftWidth: halfW,
            borderRightWidth: halfW,
            borderTopWidth: h,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: '#000',
          }}
        />
        {/* Inner white downward triangle (creates outline) */}
        <View
          style={{
            position: 'absolute',
            left: Math.round(size / 2) - innerHalfW,
            bottom: border * 2,
            width: 0,
            height: 0,
            borderLeftWidth: innerHalfW,
            borderRightWidth: innerHalfW,
            borderTopWidth: innerH,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: '#fff',
          }}
        />
        {/* Number near top of downward triangle */}
        <Text
          style={[
            styles.triValue,
            { fontSize: size * 0.28, top: size * 0.04, width: size },
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function DiceFace({ sides, value, size = 64 }: Props) {
  if (sides === 4) {
    return <TriangleFace direction="up" value={value} size={size} />;
  }
  if (sides === 20) {
    return <TriangleFace direction="down" value={value} size={size} />;
  }

  const faceStyle = SHAPE_STYLES[sides] ?? SHAPE_STYLES[100];
  const isRotated = sides === 8;

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <View
        style={[
          styles.face,
          // d10 uses a tall oval: wider in one axis
          sides === 10
            ? { width: size * 0.72, height: size * 0.9 }
            : { width: size * 0.85, height: size * 0.85 },
          faceStyle,
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

// Shape styles per die type (d4 and d20 handled separately via TriangleFace)
const SHAPE_STYLES: Partial<Record<DieType, object>> = {
  6: { borderRadius: 4 },                      // Square
  8: { borderRadius: 0, transform: [{ rotate: '45deg' }] }, // Diamond
  10: { borderRadius: 999 },                   // Tall oval (circle on tall rect)
  12: { borderRadius: 14 },                    // Rounded pentagon-ish
  100: { borderRadius: 999, borderWidth: 3 },  // Double-bordered circle
};

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
  triValue: {
    position: 'absolute',
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
