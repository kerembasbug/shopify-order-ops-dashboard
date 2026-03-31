import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromToken, SESSION_COOKIE_NAME } from "@/server/auth";
import { getEnv } from "@/server/env";

export default async function HomePage() {
  const sessionToken = cookies().get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  const session = await getSessionFromToken(
    sessionToken,
    getEnv().appSessionSecret,
  );

  if (!session) {
    redirect("/login");
  }

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
          maxWidth: "520px",
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
        <h1 style={{ marginBottom: "8px", fontSize: "32px" }}>Dashboard</h1>
        <p style={{ marginTop: 0, marginBottom: 0, color: "#5b5142" }}>
          Root route placeholder for the signed-in dashboard experience.
        </p>
      </section>
    </main>
  );
}
