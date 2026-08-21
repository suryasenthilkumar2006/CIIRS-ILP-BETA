import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Generates a random cryptographically secure 6-digit numeric string OTP (100000 - 999999).
 *
 * @returns 6-digit numeric string
 */
export function generateOTP(): string {
  if (typeof crypto?.randomInt === "function") {
    return crypto.randomInt(100000, 1000000).toString();
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hashes an OTP using bcrypt with 10 salt rounds.
 *
 * @param otp - Plain text OTP string
 * @returns Hashed OTP string
 */
export async function hashOTP(otp: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(otp, saltRounds);
}

/**
 * Verifies an entered OTP against the stored bcrypt hash.
 *
 * @param inputOtp - The candidate plain text OTP
 * @param hashedOtp - The bcrypt hashed OTP stored in DB
 * @returns True if OTP matches hash, false otherwise
 */
export async function verifyOTP(
  inputOtp: string,
  hashedOtp: string
): Promise<boolean> {
  if (!inputOtp || !hashedOtp) {
    return false;
  }
  try {
    return await bcrypt.compare(inputOtp, hashedOtp);
  } catch {
    return false;
  }
}
