import React, { useState } from "react";
import { Link } from "react-router-dom";
import { db } from "@/api/db";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Mail, Lock, ArrowLeft, Loader2, KeyRound } from "lucide-react";
import AuthLayout from "@/Components/AuthLayout";
import { cachedSupabaseUser, supabaseConfigured } from "@/api/supabase";

// Local mode resets on this device; Supabase mode uses email recovery.
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [recoveryMode] = useState(() => {
    const recoveryLink = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    return supabaseConfigured && (recoveryLink || !!cachedSupabaseUser());
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if ((!supabaseConfigured || recoveryMode) && newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await db.auth.resetPassword({ email, newPassword });
      setDone(true);
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={KeyRound}
      title="Reset password"
      subtitle={supabaseConfigured && !recoveryMode ? "We’ll email you a secure password reset link" : "Choose a new password for your account"}
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          <ArrowLeft className="w-3 h-3 inline mr-1" />Back to log in
        </Link>
      }
    >
      {done ? (
        <p className="text-sm text-foreground text-center">
          {supabaseConfigured && !recoveryMode
            ? "If an account exists for that email, a password reset link has been sent."
            : <>Your password has been changed. You can now <Link to="/login" className="text-primary font-medium hover:underline">log in</Link>.</>}
        </p>
      ) : (
        <>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!recoveryMode && <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input id="email" type="email" autoFocus placeholder="you@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" required />
              </div>
            </div>}
            {(!supabaseConfigured || recoveryMode) && <>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input id="newPassword" type="password" autoComplete="new-password" placeholder="At least 6 characters"
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pl-10 h-12" required minLength={6} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input id="confirmPassword" type="password" autoComplete="new-password" placeholder="Repeat password"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 h-12" required />
              </div>
            </div>
            </>}
            <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
              {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>) : supabaseConfigured && !recoveryMode ? "Send reset link" : "Reset password"}
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
