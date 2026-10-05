import React, { useEffect, useRef, useState } from "react";
import { db } from "@/api/db";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

let gsiPromise;
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = resolve;
      s.onerror = () => { gsiPromise = undefined; reject(new Error("Could not load Google sign-in. Check your internet connection.")); };
      document.head.appendChild(s);
    });
  }
  return gsiPromise;
}

function decodeJwt(token) {
  const p = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(p + "=".repeat((4 - (p.length % 4)) % 4));
  return JSON.parse(decodeURIComponent(Array.from(bin).map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")));
}

async function signInWithGoogleCredential(credential) {
  const c = decodeJwt(credential);
  const okIssuer = c.iss === "accounts.google.com" || c.iss === "https://accounts.google.com";
  if (!okIssuer || c.aud !== CLIENT_ID || !c.exp || c.exp * 1000 < Date.now()) throw new Error("Google sign-in could not be verified. Please try again.");
  if (!c.email || c.email_verified === false) throw new Error("Your Google email address is not verified.");

  return db.auth.loginWithGoogle({ email: c.email, full_name: c.name, picture: c.picture, credential });
}

export default function GoogleSignInButton({ onSuccess, onError }) {
  const boxRef = useRef(null);
  const cb = useRef({ onSuccess, onError });
  cb.current = { onSuccess, onError };
  const [, setReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !boxRef.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async (response) => {
            try { cb.current.onSuccess?.(await signInWithGoogleCredential(response.credential)); }
            catch (err) { cb.current.onError?.(err.message || "Google sign-in failed"); }
          },
        });
        window.google.accounts.id.renderButton(boxRef.current, {
          type: "standard", theme: "outline", size: "large", text: "continue_with",
          shape: "rectangular", logo_alignment: "left",
          width: Math.min(400, Math.max(200, boxRef.current.offsetWidth || 320)),
        });
        setReady(true);
      })
      .catch((err) => cb.current.onError?.(err.message));
    return () => { cancelled = true; };
  }, []);

  if (!CLIENT_ID) {
    return (
      <div className="w-full">
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Google sign-in has not been configured for this app"
          className="w-full h-12 rounded-md border border-gray-300 bg-gray-50 text-sm font-medium text-gray-500 flex items-center justify-center gap-2 cursor-not-allowed"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 opacity-60" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335" />
          </svg>
          Google sign-in unavailable
        </button>
        <p className="mt-2 text-center text-xs text-muted-foreground">Use email and password, or configure Google sign-in for this app.</p>
      </div>
    );
  }
  return <div ref={boxRef} className="w-full flex justify-center min-h-[44px]" />;
}
