import { useEffect, useState } from "react";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authEvent, setAuthEvent] = useState<AuthChangeEvent | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthEvent(event);
        setSession(session);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const signInWithEmail = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUpWithEmail = (email: string, password: string) =>
    supabase.auth.signUp({ email, password });

  const resetPassword = (email: string) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: __DEV__
        ? "exp+hungr://reset-password"
        : "hungr://reset-password",
    });

  const updatePassword = (newPassword: string) =>
    supabase.auth.updateUser({ password: newPassword });

  const signOut = () => supabase.auth.signOut();

  return {
    session,
    loading,
    authEvent,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    updatePassword,
    signOut,
  };
}
