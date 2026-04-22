import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "var(--bg-base)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "420px",
          borderRadius: "var(--radius-lg)",
          padding: "40px 32px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-visible)",
          boxShadow: "var(--shadow-card)",
          backdropFilter: "blur(16px)",
          textAlign: "center"
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px", color: "var(--accent-teal)" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.31 2.03c-.06-.03-.15 0-.19.09l-.12.33a2.75 2.75 0 00-1.73-.6 4.42 4.42 0 00-4.15 3.6l-2.96 1.67a.5.5 0 00-.25.43l-.01 8.65a.5.5 0 00.25.44l7.6 4.39a.5.5 0 00.5 0l7.6-4.39a.5.5 0 00.25-.44V8.3l.09-.26a.15.15 0 00-.07-.18l-7.01-3.83zM3 7.97a.5.5 0 00-.25.43v8.65a.5.5 0 00.25.44l7.6 4.39a.5.5 0 00.5 0v-8.65L3.5 7.97A.5.5 0 003 7.97z" />
          </svg>
        </div>
        
        <h1 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 700, color: "var(--text-primary)" }}>
          Order Ops
        </h1>
        <p style={{ margin: "0 0 32px", color: "var(--text-secondary)", fontSize: "14px" }}>
          Enter the shared dashboard password to continue.
        </p>
        
        <div style={{ textAlign: "left" }}>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
