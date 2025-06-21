import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Line, Group } from '@shopify/react-native-skia';

const GRID_LINES = 5;
const GRID_COLOR = 'rgba(100,100,100,0.4)';
const DASH = [10, 8];

export default function GridOverlay({ width, height, scale = 1, visible = true }) {
  if (!visible) return null;
  const lines = [];
  // Vertical lines
  for (let i = 1; i < GRID_LINES; i++) {
    const x = (width / GRID_LINES) * i;
    lines.push(
      <Line
        key={`v-${i}`}
        p1={{ x, y: 0 }}
        p2={{ x, y: height }}
        color={GRID_COLOR}
        strokeWidth={2 / scale}
        style="stroke"
        strokeCap="round"
        dash={DASH}
      />
    );
  }
  // Horizontal lines
  for (let i = 1; i < GRID_LINES; i++) {
    const y = (height / GRID_LINES) * i;
    lines.push(
      <Line
        key={`h-${i}`}
        p1={{ x: 0, y }}
        p2={{ x: width, y }}
        color={GRID_COLOR}
        strokeWidth={2 / scale}
        style="stroke"
        strokeCap="round"
        dash={DASH}
      />
    );
  }
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={{ width, height }}>{lines}</Canvas>
    </View>
  );
} 