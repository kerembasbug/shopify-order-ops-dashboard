import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "420px",
          borderRadius: "24px",
          padding: "32px",
          background: "rgba(255,255,255,0.88)",
          boxShadow: "0 24px 80px rgba(71, 52, 27, 0.16)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "12px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#78562c",
          }}
        >
          Shopify Order Ops
        </p>
        <h1 style={{ marginBottom: "8px", fontSize: "32px" }}>Dashboard login</h1>
        <p style={{ marginTop: 0, marginBottom: "24px", color: "#5b5142" }}>
          Enter the shared dashboard password to continue.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
