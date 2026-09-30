import GoogleSignInButton from "@/Components/GoogleSignInButton";

// inside the page, above or below your form:
<GoogleSignInButton
  onSuccess={() => { window.location.href = "/"; }}
  onError={(message) => setError(message)}
/>