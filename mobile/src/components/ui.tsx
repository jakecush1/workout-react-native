import { forwardRef, type ComponentProps, type ComponentRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, radius, space } from "../lib/theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export function tap() {
  void Haptics.selectionAsync().catch(() => {});
}

// ---- Layout ------------------------------------------------------------------------

export function Screen({
  children,
  title,
  subtitle,
  right,
  refreshing,
  onRefresh,
  footer,
  padded = true,
  tabRoot = false,
}: {
  children: ReactNode;
  /** Large in-content title, used on tab screens that have no navigation header. */
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: ReactNode;
  padded?: boolean;
  tabRoot?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={{
          padding: padded ? space(4) : 0,
          paddingTop: tabRoot ? insets.top + space(3) : padded ? space(4) : 0,
          paddingBottom: space(footer ? 4 : 10),
          gap: space(4),
        }}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
      >
        {title ? (
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.largeTitle}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {right}
          </View>
        ) : null}
        {children}
      </ScrollView>
      {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space(3)) }]}>{footer}</View> : null}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action}
    </View>
  );
}

export function Row({ children, style, gap = 2 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: space(gap) }, style]}>{children}</View>;
}

// ---- Text --------------------------------------------------------------------------

export function H2({ children }: { children: ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}
export function Body({ children, muted, style, numberOfLines }: { children: ReactNode; muted?: boolean; style?: StyleProp<any>; numberOfLines?: number }) {
  return (
    <Text numberOfLines={numberOfLines} style={[styles.body, muted && { color: colors.muted }, style]}>
      {children}
    </Text>
  );
}
export function Small({ children, style }: { children: ReactNode; style?: StyleProp<any> }) {
  return <Text style={[styles.small, style]}>{children}</Text>;
}

// ---- Controls ----------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dark" | "onDark";

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  size = "lg",
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  size?: "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
}) {
  const palette = {
    primary: { bg: colors.primary, fg: "#fff" },
    dark: { bg: colors.dark, fg: "#fff" },
    secondary: { bg: colors.primarySoft, fg: colors.primary },
    ghost: { bg: "transparent", fg: colors.text },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    onDark: { bg: "transparent", fg: "#fff" },
  }[variant];
  const height = { sm: 36, md: 44, lg: 54 }[size];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, height, paddingHorizontal: size === "sm" ? space(3) : space(5) },
        variant === "ghost" && { borderWidth: 1, borderColor: colors.border },
        variant === "onDark" && { borderWidth: 1, borderColor: "#4B5563" },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === "sm" ? 16 : 20} color={palette.fg} /> : null}
          <Text style={[styles.buttonText, { color: palette.fg, fontSize: size === "sm" ? 14 : 16 }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, color = colors.text, size = 22, label }: { icon: IconName; onPress: () => void; color?: string; size?: number; label: string }) {
  return (
    <Pressable accessibilityLabel={label} hitSlop={10} onPress={onPress} style={({ pressed }) => [{ padding: 4 }, pressed && { opacity: 0.5 }]}>
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[styles.chip, selected && { backgroundColor: colors.dark, borderColor: colors.dark }]}
    >
      {icon ? <Ionicons name={icon} size={14} color={selected ? "#fff" : colors.text} /> : null}
      <Text style={[styles.chipText, selected && { color: "#fff" }]}>{label}</Text>
    </Pressable>
  );
}

export function ChipGroup({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space(2) }}>{children}</View>;
}

export function OptionCard({
  title,
  blurb,
  icon,
  selected,
  onPress,
  right,
}: {
  title: string;
  blurb?: string;
  icon?: IconName;
  selected?: boolean;
  onPress: () => void;
  right?: ReactNode;
}) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={[styles.option, selected && { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}
    >
      {icon ? (
        <View style={[styles.optionIcon, selected && { backgroundColor: colors.primary }]}>
          <Ionicons name={icon} size={22} color={selected ? "#fff" : colors.text} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        {blurb ? <Text style={styles.optionBlurb}>{blurb}</Text> : null}
      </View>
      {right ?? (selected ? <Ionicons name="checkmark-circle" size={24} color={colors.primary} /> : null)}
    </Pressable>
  );
}

export type TextInputRef = ComponentRef<typeof TextInput>;

export const Field = forwardRef<TextInputRef, TextInputProps & { label?: string; hint?: string; suffix?: string }>(function Field(
  { label, hint, suffix, style, ...props },
  ref,
) {
  return (
    <View style={{ gap: space(1.5) }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        <TextInput ref={ref} placeholderTextColor={colors.faint} style={[styles.input, style]} {...props} />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      {hint ? <Text style={styles.small}>{hint}</Text> : null}
    </View>
  );
});

export function Stepper({ value, onChange, min = 0, max = 99, step = 1, format }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; format?: (v: number) => string }) {
  return (
    <View style={styles.stepper}>
      <IconButton label="Decrease" icon="remove" onPress={() => { tap(); onChange(Math.max(min, value - step)); }} />
      <Text style={styles.stepperValue}>{format ? format(value) : value}</Text>
      <IconButton label="Increase" icon="add" onPress={() => { tap(); onChange(Math.min(max, value + step)); }} />
    </View>
  );
}

export function Badge({ label, tone = "neutral", icon }: { label: string; tone?: "neutral" | "primary" | "success" | "warning" | "info" | "danger"; icon?: IconName }) {
  const t = {
    neutral: { bg: "#EEF0F3", fg: colors.muted },
    primary: { bg: colors.primarySoft, fg: colors.primary },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    info: { bg: colors.infoSoft, fg: colors.info },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={t.fg} /> : null}
      <Text style={[styles.badgeText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

export function Stat({ label, value, icon, tone = colors.text, onPress }: { label: string; value: string | number; icon?: IconName; tone?: string; onPress?: () => void }) {
  const inner = (
    <>
      {icon ? <Ionicons name={icon} size={18} color={tone} /> : null}
      <Text style={[styles.statValue, { color: tone }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.small}>{label}</Text>
    </>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          tap();
          onPress();
        }}
        style={({ pressed }) => [styles.stat, pressed && { opacity: 0.8 }]}
      >
        {inner}
      </Pressable>
    );
  }
  return <View style={styles.stat}>{inner}</View>;
}

// ---- States ------------------------------------------------------------------------

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Text style={[styles.body, { color: colors.muted, textAlign: "center" }]}>{label}</Text> : null}
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={40} color={colors.faint} />
      <Text style={[styles.body, { textAlign: "center", color: colors.muted }]}>{message}</Text>
      {onRetry ? <Button title="Try again" variant="ghost" size="md" onPress={onRetry} /> : null}
    </View>
  );
}

export function Empty({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: ReactNode }) {
  return (
    <Card style={{ alignItems: "center", paddingVertical: space(8), gap: space(2) }}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.h3}>{title}</Text>
      {body ? <Text style={[styles.body, { color: colors.muted, textAlign: "center" }]}>{body}</Text> : null}
      {action ? <View style={{ marginTop: space(2), alignSelf: "stretch" }}>{action}</View> : null}
    </Card>
  );
}

export const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "flex-end", gap: space(3), marginBottom: space(1) },
  largeTitle: { fontSize: 32, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 2 },
  footer: { paddingHorizontal: space(4), paddingTop: space(3), backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, gap: space(2) },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space(4), gap: space(2), shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space(2) },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  h2: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: "700", color: colors.text },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  small: { fontSize: 13, color: colors.muted },
  label: { fontSize: 14, fontWeight: "600", color: colors.text },
  button: { borderRadius: radius.md, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: space(2) },
  buttonText: { fontWeight: "700" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: space(3.5), paddingVertical: space(2), borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipText: { fontSize: 14, fontWeight: "600", color: colors.text },
  option: { flexDirection: "row", alignItems: "center", gap: space(3), padding: space(4), borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card },
  optionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  optionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  optionBlurb: { fontSize: 14, color: colors.muted, marginTop: 2 },
  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  input: { flex: 1, minWidth: 0, fontSize: 16, color: colors.text, paddingHorizontal: space(4), paddingVertical: space(3.5) },
  suffix: { paddingRight: space(4), color: colors.muted, fontWeight: "600" },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: space(2), paddingVertical: space(1), gap: space(2) },
  stepperValue: { fontSize: 16, fontWeight: "700", minWidth: 44, textAlign: "center", color: colors.text },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: space(2), paddingVertical: 3, borderRadius: radius.pill, alignSelf: "flex-start" },
  badgeText: { fontSize: 12, fontWeight: "700" },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: space(3), gap: 2 },
  statValue: { fontSize: 22, fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space(3), padding: space(8), backgroundColor: colors.bg },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
});
