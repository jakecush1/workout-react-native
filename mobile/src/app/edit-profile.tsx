import { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Screen } from "../components/ui";
import { ProfileForm, profileDraftFrom, type ProfileDraft } from "../components/ProfileForm";
import { useAuth, useUser } from "../lib/auth";
import { errorMessage } from "../lib/api";

export default function EditProfile() {
  const user = useUser();
  const { updateProfile } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<ProfileDraft>(() => profileDraftFrom(user));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft.name.trim()) return Alert.alert("Please enter your name");
    setSaving(true);
    try {
      await updateProfile({ ...draft, name: draft.name.trim() });
      void qc.invalidateQueries();
      router.back();
    } catch (e) {
      setSaving(false);
      Alert.alert("Couldn't save", errorMessage(e));
    }
  };

  return (
    <Screen footer={<Button title="Save changes" onPress={save} loading={saving} />}>
      <ProfileForm value={draft} onChange={setDraft} sections={["about", "goal", "training"]} />
    </Screen>
  );
}
