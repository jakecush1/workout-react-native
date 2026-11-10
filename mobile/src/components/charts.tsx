import { useState } from "react";
import { Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { colors } from "../lib/theme";

export interface Point {
  label: string;
  value: number;
}

function useWidth() {
  const [width, setWidth] = useState(0);
  return [width, (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)] as const;
}

function niceMax(max: number) {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const n = max / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

const fmt = (v: number) => (v >= 10000 ? `${Math.round(v / 1000)}k` : v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${Math.round(v * 10) / 10}`);

export function BarChart({
  data,
  height = 160,
  color = colors.primary,
  highlightLast = true,
  labelEvery: labelEveryProp,
}: {
  data: Point[];
  height?: number;
  color?: string;
  highlightLast?: boolean;
  /** Show every Nth x-axis label (default: enough to fit about six). */
  labelEvery?: number;
}) {
  const [width, onLayout] = useWidth();
  const padL = 30;
  const padB = 20;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const plotW = Math.max(0, width - padL);
  const plotH = height - padB;
  const slot = data.length ? plotW / data.length : 0;
  const barW = Math.min(28, slot * 0.6);
  const labelEvery = labelEveryProp ?? Math.ceil(data.length / 6);
  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {[0, 0.5, 1].map((f) => (
            <Line key={f} x1={padL} x2={width} y1={plotH - f * plotH} y2={plotH - f * plotH} stroke={colors.border} strokeDasharray={f === 0 ? undefined : "3 4"} />
          ))}
          <SvgText x={0} y={10} fontSize={10} fill={colors.faint}>{fmt(max)}</SvgText>
          <SvgText x={0} y={plotH} fontSize={10} fill={colors.faint}>0</SvgText>
          {data.map((d, i) => {
            const h = (d.value / max) * plotH;
            const x = padL + i * slot + (slot - barW) / 2;
            const last = highlightLast && i === data.length - 1;
            return (
              <Rect key={i} x={x} y={plotH - h} width={barW} height={Math.max(h, d.value > 0 ? 2 : 0)} rx={4} fill={last ? color : color + "99"} />
            );
          })}
          {data.map((d, i) =>
            i % labelEvery === 0 || i === data.length - 1 ? (
              <SvgText key={`l${i}`} x={padL + i * slot + slot / 2} y={height - 4} fontSize={10} fill={colors.faint} textAnchor="middle">
                {d.label}
              </SvgText>
            ) : null,
          )}
        </Svg>
      )}
    </View>
  );
}

export function LineChart({ data, height = 180, color = colors.primary, unit = "" }: { data: Point[]; height?: number; color?: string; unit?: string }) {
  const [width, onLayout] = useWidth();
  if (data.length === 0) {
    return (
      <View style={{ height, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.muted }}>No data yet</Text>
      </View>
    );
  }
  const padL = 36;
  const padR = 10;
  const padT = 12;
  const padB = 20;
  const values = data.map((d) => d.value);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (lo === hi) {
    lo = lo - Math.max(1, lo * 0.1);
    hi = hi + Math.max(1, hi * 0.1);
  } else {
    const pad = (hi - lo) * 0.15;
    lo -= pad;
    hi += pad;
  }
  lo = Math.max(0, lo);
  const plotW = Math.max(0, width - padL - padR);
  const plotH = height - padT - padB;
  const x = (i: number) => padL + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => padT + plotH - ((v - lo) / (hi - lo)) * plotH;
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join(" ");
  const area = `${path} L${x(data.length - 1)},${padT + plotH} L${x(0)},${padT + plotH} Z`;
  const labelEvery = Math.ceil(data.length / 5);
  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {[0, 0.5, 1].map((f) => {
            const yy = padT + plotH - f * plotH;
            return (
              <Line key={f} x1={padL} x2={width - padR} y1={yy} y2={yy} stroke={colors.border} strokeDasharray={f === 0 ? undefined : "3 4"} />
            );
          })}
          <SvgText x={0} y={padT + 4} fontSize={10} fill={colors.faint}>{fmt(hi)}{unit}</SvgText>
          <SvgText x={0} y={padT + plotH} fontSize={10} fill={colors.faint}>{fmt(lo)}{unit}</SvgText>
          <Path d={area} fill={color} opacity={0.08} />
          <Path d={path} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {data.map((d, i) => (
            <Circle key={i} cx={x(i)} cy={y(d.value)} r={i === data.length - 1 ? 5 : 3} fill={i === data.length - 1 ? color : "#fff"} stroke={color} strokeWidth={2} />
          ))}
          {data.map((d, i) =>
            i % labelEvery === 0 || i === data.length - 1 ? (
              <SvgText key={`l${i}`} x={x(i)} y={height - 4} fontSize={10} fill={colors.faint} textAnchor="middle">
                {d.label}
              </SvgText>
            ) : null,
          )}
        </Svg>
      )}
    </View>
  );
}

/** Ring showing weekly progress toward the target. */
export function ProgressRing({ value, max, size = 92, stroke = 10, color = colors.primary, children }: { value: number; max: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* Rotate so the arc starts at 12 o'clock. */}
      <View style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
        />
      </Svg>
      </View>
      {children}
    </View>
  );
}
