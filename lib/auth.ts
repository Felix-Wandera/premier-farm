import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "super-secret-key-change-in-production";

/**
 * Hash a plain text password using bcryptjs.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare a plain text password with a hashed password.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Determine the encoded secret key used for signing/verifying.
 */
function getJwtSecretKey() {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret || secret.length === 0) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("The environment variable JWT_SECRET_KEY is not set.");
    }
  }
  return new TextEncoder().encode(JWT_SECRET_KEY);
}

/**
 * Sign a new JWT token.
 * Contains user payload such as id, email, and role.
 */
export async function signToken(payload: { id: string; email: string; role: string }) {
  const iat = Math.floor(Date.now() / 1000);
  // Token expires in 24 hours
  const exp = iat + 60 * 60 * 24;

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(exp)
    .setIssuedAt(iat)
    .setNotBefore(iat)
    .sign(getJwtSecretKey());
}

/**
 * Verify a JWT token.
 */
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Get the current user session payload directly from the cookie.
 * Can be used in both Server Components and Server Actions.
 */
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyToken(token);
  return payload;
}
