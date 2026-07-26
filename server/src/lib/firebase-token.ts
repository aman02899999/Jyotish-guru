import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Verifies a Firebase Auth ID token server-side without the Firebase Admin
 * SDK (which needs a service account key we don't have). Firebase ID tokens
 * are standard RS256 JWTs signed by Google; this checks the signature
 * against Google's published public keys plus the issuer/audience/expiry,
 * exactly what `admin.auth().verifyIdToken()` does internally.
 * See: https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
 */

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export interface FirebaseIdTokenClaims {
  uid: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseIdTokenClaims | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;

  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    const uid = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!uid || !email) return null;

    return {
      uid,
      email: email.toLowerCase(),
      name: typeof payload.name === "string" ? payload.name : email.split("@")[0],
      emailVerified: payload.email_verified === true,
    };
  } catch (error) {
    console.error("Firebase ID token verification failed", error);
    return null;
  }
}
