import { Pressable, StyleSheet, Text, View } from "react-native";

export interface JobSummary {
  id: string;
  title: string;
  status: string;
  address?: string | null;
  scheduledAt?: string | null;
  customer?: { name: string } | null;
}

const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "unscheduled";

export function JobCard({ job, onPress }: { job: JobSummary; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.card} testID={`job-card-${job.title}`}>
      <View style={styles.row}>
        <Text style={styles.title}>{job.title}</Text>
        <Text style={styles.time}>{fmtTime(job.scheduledAt)}</Text>
      </View>
      <Text style={styles.sub}>{job.customer?.name}</Text>
      <Text style={styles.sub}>{job.address ?? "No address"}</Text>
      <Text style={[styles.status, job.status === "completed" && { color: "#16a34a" }]}>{job.status.replace("_", " ")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#e2e8f0" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  title: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  time: { fontSize: 15, color: "#2563eb", fontWeight: "600" },
  sub: { color: "#64748b", marginTop: 2 },
  status: { marginTop: 6, color: "#d97706", fontWeight: "600", textTransform: "capitalize" },
});
