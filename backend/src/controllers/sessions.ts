import { Response } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase";
import { AuthRequest } from "../middleware/auth";

const CreateSessionSchema = z.object({
  name: z.string().min(1).max(100),
  cuisineFilters: z.array(z.string()).default([]),
  maxDistance: z.number().min(100).max(50000).default(5000),
});

export async function createSession(req: AuthRequest, res: Response) {
  const parsed = CreateSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      owner_id: req.userId,
      name: parsed.data.name,
      cuisine_filters: parsed.data.cuisineFilters,
      max_distance: parsed.data.maxDistance,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: "Failed to create session" });
    return;
  }

  // Add owner as first participant
  await supabase.from("session_participants").insert({
    session_id: data.id,
    user_id: req.userId,
  });

  res.status(201).json({ session: data });
}

export async function joinSession(req: AuthRequest, res: Response) {
  const { code } = req.params;

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("*")
    .eq("invite_code", code)
    .eq("status", "active")
    .single();

  if (sessionError || !session) {
    res.status(404).json({ error: "Session not found or no longer active" });
    return;
  }

  const { error } = await supabase.from("session_participants").upsert({
    session_id: session.id,
    user_id: req.userId,
  });

  if (error) {
    res.status(500).json({ error: "Failed to join session" });
    return;
  }

  res.json({ session });
}

export async function getSessionMatches(req: AuthRequest, res: Response) {
  const { id } = req.params;

  // Restaurants liked by ALL participants in the session
  const { data, error } = await supabase.rpc("get_session_matches", {
    session_id: id,
  });

  if (error) {
    res.status(500).json({ error: "Failed to fetch matches" });
    return;
  }

  res.json({ matches: data });
}
