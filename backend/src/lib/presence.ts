import { supabase } from "./supabase";

/** Below this, a participant shows as "Disconnected" and can't receive a host transfer. */
const DISCONNECTED_AFTER_MS = 20 * 1000;

/** How long the current host must be inactive before ownership is up for transfer. */
const HOST_TRANSFER_AFTER_MS = 60 * 1000;

/** Beyond this, reopening the app no longer auto-rejoins the user to the session. */
export const AUTO_REJOIN_STALE_AFTER_MS = 10 * 60 * 1000;

/** Bump a participant's presence. No-ops if they're not (or no longer) a participant. */
export async function touchParticipant(sessionId: string, userId: string): Promise<void> {
  await supabase
    .from("session_participants")
    .update({ last_active_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("user_id", userId);
}

/** Most-recently-active participant other than `excludeUserId`, if any are currently connected. */
async function pickNewOwner(sessionId: string, excludeUserId: string): Promise<string | null> {
  const { data: participants } = await supabase
    .from("session_participants")
    .select("user_id, last_active_at")
    .eq("session_id", sessionId)
    .neq("user_id", excludeUserId);

  const now = Date.now();
  const connected = (participants ?? [])
    .filter((p) => now - new Date(p.last_active_at).getTime() <= DISCONNECTED_AFTER_MS)
    .sort((a, b) => new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime());

  return connected[0]?.user_id ?? null;
}

/**
 * Hand ownership to another connected participant, or close the session if
 * no one else is currently connected. Used both when the host explicitly
 * leaves and when they've been silently disconnected too long.
 */
export async function handleOwnerDeparture(sessionId: string, departingOwnerId: string): Promise<void> {
  const newOwnerId = await pickNewOwner(sessionId, departingOwnerId);
  if (newOwnerId) {
    await supabase.from("sessions").update({ owner_id: newOwnerId }).eq("id", sessionId);
  } else {
    await supabase.from("sessions").update({ status: "closed" }).eq("id", sessionId);
  }
}

/** Opportunistically transfer ownership away from a host who's gone quiet. Call on session reads. */
export async function maybeTransferStaleOwnership(sessionId: string): Promise<void> {
  const { data: session } = await supabase
    .from("sessions")
    .select("owner_id, status")
    .eq("id", sessionId)
    .single();
  if (!session || session.status === "closed") return;

  const { data: ownerRow } = await supabase
    .from("session_participants")
    .select("last_active_at")
    .eq("session_id", sessionId)
    .eq("user_id", session.owner_id)
    .single();

  const ownerStale =
    !ownerRow || Date.now() - new Date(ownerRow.last_active_at).getTime() > HOST_TRANSFER_AFTER_MS;
  if (!ownerStale) return;

  await handleOwnerDeparture(sessionId, session.owner_id);
}

/** Attach `disconnected` to each participant based on the same threshold shown in the UI. */
export function withDisconnectedFlag<T extends { last_active_at: string }>(
  participants: T[]
): (T & { disconnected: boolean })[] {
  const now = Date.now();
  return participants.map((p) => ({
    ...p,
    disconnected: now - new Date(p.last_active_at).getTime() > DISCONNECTED_AFTER_MS,
  }));
}
