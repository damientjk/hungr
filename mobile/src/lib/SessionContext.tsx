import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api, Session } from "./api";

interface SessionContextValue {
  session: Session | null;
  setSession: (session: Session | null) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  // Auto-rejoin: if the app was closed/reopened mid-session, restore it as
  // long as we're still a participant (i.e. weren't kicked or didn't leave).
  useEffect(() => {
    api.sessions
      .current()
      .then(({ session: current }) => {
        if (current) setSession(current);
      })
      .catch(() => {});
  }, []);

  // Background presence heartbeat — keeps last_active_at fresh regardless of
  // which tab is focused, so switching away from Sessions/Swipe briefly
  // doesn't make you look disconnected to the rest of the group.
  useEffect(() => {
    if (!session || (session.status !== "active" && session.status !== "swiping")) return;
    const interval = setInterval(() => {
      api.sessions.get(session.id).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [session?.id, session?.status]);

  return (
    <SessionContext.Provider value={{ session, setSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
