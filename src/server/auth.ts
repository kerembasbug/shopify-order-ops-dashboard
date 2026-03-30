import { jwtVerify, SignJWT, type JWTPayload } from "jose";

export const SESSION_COOKIE_NAME = "order_ops_session";

const SESSION_SUBJECT = "dashboard-user";
const SESSION_EXPIRATION = "12h";

function getSecretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(secret: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(SESSION_SUBJECT)
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRATION)
    .sign(getSecretKey(secret));
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<JWTPayload> {
  const verified = await jwtVerify(token, getSecretKey(secret), {
    algorithms: ["HS256"],
    subject: SESSION_SUBJECT,
  });

  return verified.payload;
}
