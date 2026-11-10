// Front/back body diagram with the muscles an exercise works highlighted.
// Drawn in SVG so it's crisp at any size and works offline.

import { Text, View } from "react-native";
import Svg, { Circle, Ellipse, Rect } from "react-native-svg";
import type { MuscleGroup } from "../lib/types";
import { colors } from "../lib/theme";

type Shape =
  | { k: "c"; x: number; y: number; r: number }
  | { k: "e"; x: number; y: number; rx: number; ry: number }
  | { k: "r"; x: number; y: number; w: number; h: number; rx: number };

const c = (x: number, y: number, r: number): Shape => ({ k: "c", x, y, r });
const e = (x: number, y: number, rx: number, ry: number): Shape => ({ k: "e", x, y, rx, ry });
const r = (x: number, y: number, w: number, h: number, rx: number): Shape => ({ k: "r", x, y, w, h, rx });

// x coordinates are offsets from the figure's center line.
const BODY: Shape[] = [
  c(0, 9, 6.5), // head
  r(-3.5, 14.5, 7, 5, 2), // neck
  r(-13, 19, 26, 21, 7), // chest block
  r(-10.5, 36, 21, 14, 4), // waist
  r(-12, 47, 24, 13, 5), // hips
  r(-20.5, 21, 6.5, 17, 3), // upper arms
  r(14, 21, 6.5, 17, 3),
  r(-21, 38.5, 5.5, 15, 2.5), // forearms
  r(15.5, 38.5, 5.5, 15, 2.5),
  r(-11.5, 59, 10.5, 25, 5), // thighs
  r(1, 59, 10.5, 25, 5),
  r(-10.5, 85, 8.5, 21, 4), // lower legs
  r(2, 85, 8.5, 21, 4),
];

const FRONT = {
  shoulders: [c(-15.5, 22.5, 4), c(15.5, 22.5, 4)],
  chest: [e(-6.5, 27.5, 5.5, 4.5), e(6.5, 27.5, 5.5, 4.5)],
  biceps: [r(-20, 24, 6, 12, 3), r(14, 24, 6, 12, 3)],
  core: [r(-6, 34, 12, 16, 4)],
  quads: [r(-11, 60, 10, 22, 5), r(1, 60, 10, 22, 5)],
};
const BACK = {
  back: [r(-13, 20, 26, 17, 6)],
  shoulders: [c(-15.5, 22.5, 3.5), c(15.5, 22.5, 3.5)],
  triceps: [r(-20, 24, 6, 13, 3), r(14, 24, 6, 13, 3)],
  glutes: [e(-5.5, 58, 5.5, 5), e(5.5, 58, 5.5, 5)],
  hamstrings: [r(-11, 63, 10, 19, 5), r(1, 63, 10, 19, 5)],
  calves: [r(-10, 87, 7.5, 14, 3.5), r(2.5, 87, 7.5, 14, 3.5)],
};

const REGIONS: Record<MuscleGroup, { front: Shape[]; back: Shape[] }> = {
  chest: { front: FRONT.chest, back: [] },
  back: { front: [], back: BACK.back },
  shoulders: { front: FRONT.shoulders, back: BACK.shoulders },
  biceps: { front: FRONT.biceps, back: [] },
  triceps: { front: [], back: BACK.triceps },
  core: { front: FRONT.core, back: [] },
  quads: { front: FRONT.quads, back: [] },
  hamstrings: { front: [], back: BACK.hamstrings },
  glutes: { front: [], back: BACK.glutes },
  calves: { front: [], back: BACK.calves },
  full_body: {
    front: [...FRONT.chest, ...FRONT.core, ...FRONT.quads, ...FRONT.shoulders],
    back: [...BACK.back, ...BACK.glutes, ...BACK.hamstrings, ...BACK.calves],
  },
};

const VIEW_W = 120;
const VIEW_H = 112;
const FRONT_CX = 30;
const BACK_CX = 90;

function draw(shapes: Shape[], cx: number, fill: string, opacity: number, keyPrefix: string) {
  return shapes.map((s, i) => {
    const key = `${keyPrefix}${i}`;
    if (s.k === "c") return <Circle key={key} cx={cx + s.x} cy={s.y} r={s.r} fill={fill} opacity={opacity} />;
    if (s.k === "e") return <Ellipse key={key} cx={cx + s.x} cy={s.y} rx={s.rx} ry={s.ry} fill={fill} opacity={opacity} />;
    return <Rect key={key} x={cx + s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} fill={fill} opacity={opacity} />;
  });
}

export function MuscleDiagram({
  primary,
  secondary = [],
  size = 48,
  labels = false,
}: {
  primary: MuscleGroup;
  secondary?: MuscleGroup[];
  size?: number;
  labels?: boolean;
}) {
  const width = (size * VIEW_W) / VIEW_H;
  const main = REGIONS[primary] ?? REGIONS.full_body;
  const soft = primary === "full_body" ? 0.5 : 1;
  const secondaryShapes = secondary
    .filter((m) => m !== primary && REGIONS[m])
    .map((m) => REGIONS[m]);
  return (
    <View accessibilityLabel={`Muscles worked: ${primary.replace("_", " ")}`} style={{ alignItems: "center" }}>
      <Svg width={width} height={size} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        {draw(BODY, FRONT_CX, "#DFE3E8", 1, "bf")}
        {draw(BODY, BACK_CX, "#DFE3E8", 1, "bb")}
        {secondaryShapes.flatMap((reg, i) => [
          ...draw(reg.front, FRONT_CX, colors.primary, 0.3, `sf${i}-`),
          ...draw(reg.back, BACK_CX, colors.primary, 0.3, `sb${i}-`),
        ])}
        {draw(main.front, FRONT_CX, colors.primary, soft, "mf")}
        {draw(main.back, BACK_CX, colors.primary, soft, "mb")}
      </Svg>
      {labels && (
        <View style={{ flexDirection: "row", width, justifyContent: "space-around" }}>
          <Text style={{ fontSize: 10, color: colors.faint, fontWeight: "600" }}>FRONT</Text>
          <Text style={{ fontSize: 10, color: colors.faint, fontWeight: "600" }}>BACK</Text>
        </View>
      )}
    </View>
  );
}
