import { useRef, useState } from "react";
import { Text } from "react-native";
import { Button, Field, Screen, type TextInputRef } from "./ui";
import { errorMessage } from "../lib/api";
import { colors } from "../lib/theme";

export function AuthForm({ mode, onSubmit }: { mode: "login" | "register"; onSubmit: (v: { name: string; email: string; password: string }) => Promise<void> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<TextInputRef>(null);
  const passwordRef = useRef<TextInputRef>(null);

  const submit = async () => {
    setError(null);
    if (mode === "register" && !name.trim()) return setError("Please enter your name");
    if (!email.includes("@")) return setError("Please enter a valid email");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    setBusy(true);
    try {
      await onSubmit({ name: name.trim(), email: email.trim(), password });
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen>
      {mode === "register" && (
        <Field label="First name" value={name} onChangeText={setName} autoComplete="given-name" textContentType="givenName" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} autoFocus />
      )}
      <Field
        ref={emailRef}
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        autoFocus={mode === "login"}
      />
      <Field
        ref={passwordRef}
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType={mode === "register" ? "newPassword" : "password"}
        autoComplete={mode === "register" ? "new-password" : "current-password"}
        hint={mode === "register" ? "At least 8 characters" : undefined}
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      {error ? <Text style={{ color: colors.danger, fontWeight: "600" }}>{error}</Text> : null}
      <Button title={mode === "register" ? "Create account" : "Sign in"} onPress={submit} loading={busy} />
    </Screen>
  );
}
