import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { Alert, Image, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api, setToken } from "./api";
import { JobCard, type JobSummary } from "./JobCard";

type Detail = JobSummary & { notes?: string | null; photos?: { id: string; thumbUrl?: string | null; url: string }[]; invoice?: { status: string } | null };

function Button({ label, onPress, tone = "primary", disabled }: { label: string; onPress: () => void; tone?: "primary" | "ok" | "ghost"; disabled?: boolean }) {
  const bg = tone === "ok" ? "#16a34a" : tone === "ghost" ? "#fff" : "#2563eb";
  return (
    <Pressable onPress={onPress} disabled={disabled} testID={`btn-${label}`} accessibilityRole="button"
      style={[styles.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : 1, borderWidth: tone === "ghost" ? 1 : 0, borderColor: "#e2e8f0" }]}>
      <Text style={{ color: tone === "ghost" ? "#0f172a" : "#fff", fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function Login({ onDone }: { onDone: (name: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    const { data } = await api.POST("/api/v1/auth/login", { body: { email, password } });
    if (!data) return setError("Invalid credentials");
    setToken(data.accessToken);
    onDone(data.user.name);
  }

  return (
    <View style={styles.pad}>
      <Text style={styles.h1}>Field Service</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" style={styles.input} testID="email" />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} testID="password" />
      {!!error && <Text style={{ color: "#dc2626" }}>{error}</Text>}
      <Button label="Sign in" onPress={submit} />
    </View>
  );
}

function Today({ name, onOpen, onLogout }: { name: string; onOpen: (id: string) => void; onLogout: () => void }) {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);
  const load = useCallback(async () => {
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const to = new Date(from.getTime() + 86_400_000);
    const { data } = await api.GET("/api/v1/jobs", { params: { query: { from: from.toISOString(), to: to.toISOString() } } });
    setJobs(data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>Today</Text>
      <Text style={styles.sub} testID="whoami">Signed in as {name}</Text>
      {jobs === null && <Text>Loading…</Text>}
      {jobs?.length === 0 && <Text testID="empty">No jobs scheduled for today.</Text>}
      {jobs?.map((j) => <JobCard key={j.id} job={j} onPress={() => onOpen(j.id)} />)}
      <Button label="Refresh" tone="ghost" onPress={load} />
      <Button label="Sign out" tone="ghost" onPress={onLogout} />
    </ScrollView>
  );
}

function JobScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const [job, setJob] = useState<Detail | null>(null);
  const [notes, setNotes] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.GET("/api/v1/jobs/{id}", { params: { path: { id } } });
    if (data) setJob(data as Detail);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function checkin() {
    await api.POST("/api/v1/jobs/{id}/checkin", { params: { path: { id } } });
    await load();
  }

  async function addPhotos() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, quality: 0.8 });
    if (res.canceled) return;
    setBusy(true);
    for (const asset of res.assets) {
      const contentType = asset.mimeType ?? "image/jpeg";
      const { data: ps } = await api.POST("/api/v1/uploads/presign", {
        body: { jobId: id, filename: asset.fileName ?? `photo-${Date.now()}.jpg`, contentType },
      });
      if (!ps) continue;
      const blob = await (await fetch(asset.uri)).blob();
      const put = await fetch(ps.url, { method: "PUT", headers: { "content-type": contentType }, body: blob });
      if (put.ok) setPreviews((p) => [...p, asset.uri]);
      else Alert.alert("Upload failed", String(put.status));
    }
    setBusy(false);
  }

  async function complete() {
    setBusy(true);
    await api.POST("/api/v1/jobs/{id}/complete", { params: { path: { id } }, body: { notes } });
    setBusy(false);
    await load();
  }

  if (!job) return <Text style={styles.pad}>Loading…</Text>;
  const done = job.status === "completed";

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Pressable onPress={onBack} testID="back"><Text style={{ color: "#2563eb" }}>‹ Back</Text></Pressable>
      <Text style={styles.h1}>{job.title}</Text>
      <Text style={styles.sub}>{job.customer?.name}</Text>
      <Text testID="address" style={{ fontSize: 16, marginVertical: 6 }}>📍 {job.address ?? "No address"}</Text>
      <Text testID="status" style={{ fontWeight: "700", marginBottom: 10 }}>Status: {job.status.replace("_", " ")}</Text>

      {!done && (
        <>
          {job.status !== "in_progress" && <Button label="Check in" onPress={checkin} />}
          <Button label="Add photos" tone="ghost" onPress={addPhotos} disabled={busy} />
          <View style={styles.previews}>
            {previews.map((uri) => <Image key={uri} source={{ uri }} style={styles.preview} testID="preview" />)}
          </View>
          <Text testID="photo-count">{previews.length} photo(s) uploaded</Text>
          <TextInput placeholder="Notes" value={notes} onChangeText={setNotes} multiline style={[styles.input, { height: 80 }]} testID="notes" />
          <Button label="Complete job" tone="ok" onPress={complete} disabled={busy} />
        </>
      )}
      {done && <Text testID="completed-banner" style={{ color: "#16a34a", fontWeight: "700", fontSize: 18 }}>✓ Job completed. Invoice is being generated.</Text>}
      <StatusBar style="dark" />
    </ScrollView>
  );
}

export default function App() {
  const [name, setName] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.phone}>
        {!name ? <Login onDone={setName} />
          : jobId ? <JobScreen id={jobId} onBack={() => setJobId(null)} />
          : <Today name={name} onOpen={setJobId} onLogout={() => { setToken(null); setName(null); }} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f5f9", alignItems: "center" },
  phone: { flex: 1, width: "100%", maxWidth: 440, backgroundColor: "#f8fafc", ...(Platform.OS === "web" ? { minHeight: "100vh" as unknown as number } : {}) },
  pad: { padding: 16 },
  h1: { fontSize: 26, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  sub: { color: "#64748b", marginBottom: 12 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 10, marginBottom: 10 },
  btn: { padding: 12, borderRadius: 10, alignItems: "center", marginVertical: 5 },
  previews: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 },
  preview: { width: 80, height: 80, borderRadius: 8 },
});
