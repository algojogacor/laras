import crypto from "crypto"
import { db } from "@/lib/db"

// ============================================================================
// TOTP-based MFA (RFC 6238)
// ============================================================================

const TOTP_DIGITS = 6
const TOTP_PERIOD = 30 // seconds
const TOTP_ALGORITHM = "sha1"
const TOTP_WINDOW = 1 // allow 1 step before/after for clock drift

/**
 * Generate a random TOTP secret (base32 encoded).
 * 20 bytes (160 bits) is the standard for SHA-1 HMAC.
 */
export function generateMFASecret(): string {
  const bytes = crypto.randomBytes(20)
  return base32Encode(bytes)
}

/**
 * Verify a 6-digit TOTP token against a secret.
 *
 * Uses constant-time comparison (timingSafeEqual) to prevent timing attacks.
 * Allows a window of ±1 time step for clock drift.
 *
 * @param secret  The base32-encoded TOTP secret
 * @param token   The 6-digit token to verify
 * @returns       true if the token is valid
 */
export function verifyMFAToken(secret: string, token: string): boolean {
  if (!token || token.length !== TOTP_DIGITS || !/^\d{6}$/.test(token)) {
    return false
  }

  const secretBytes = base32Decode(secret)
  if (!secretBytes || secretBytes.length === 0) return false

  const now = Math.floor(Date.now() / 1000)
  const counter = Math.floor(now / TOTP_PERIOD)

  for (let offset = -TOTP_WINDOW; offset <= TOTP_WINDOW; offset++) {
    const expected = generateTOTP(secretBytes, counter + offset)
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token.padStart(TOTP_DIGITS, "0")))) {
      return true
    }
  }

  return false
}

/**
 * Enable MFA for a user account.
 *
 * Stores the secret (encrypted-like encoding) in the account record.
 * MFA is not active until explicitly enabled.
 *
 * @param userId  The account ID
 * @param secret  The base32-encoded TOTP secret
 */
export async function enableMFA(userId: string, secret: string): Promise<void> {
  // Basic validation: ensure the secret is at least 16 base32 chars
  if (!secret || secret.length < 16) {
    throw new Error("Invalid MFA secret")
  }

  await db.account.update({
    where: { id: userId },
    data: {
      mfaEnabled: true,
      mfaSecret: secret,
    },
  })
}

/**
 * Disable MFA for a user account.
 *
 * Clears the stored secret and disables MFA.
 */
export async function disableMFA(userId: string): Promise<void> {
  await db.account.update({
    where: { id: userId },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
    },
  })
}

/**
 * Check if MFA is enabled for a user and verify a token.
 *
 * Used during login flow: after password verification, if MFA is enabled,
 * prompt for TOTP and call this function.
 *
 * @param userId  The account ID
 * @param token   The 6-digit TOTP token
 * @returns       true if MFA is disabled OR token is valid; false if token is invalid
 */
export async function checkMFA(userId: string, token?: string): Promise<{
  mfaEnabled: boolean
  valid: boolean
}> {
  const account = await db.account.findUnique({
    where: { id: userId },
    select: { mfaEnabled: true, mfaSecret: true },
  })

  if (!account) {
    return { mfaEnabled: false, valid: false }
  }

  if (!account.mfaEnabled || !account.mfaSecret) {
    return { mfaEnabled: false, valid: true }
  }

  if (!token) {
    return { mfaEnabled: true, valid: false }
  }

  const valid = verifyMFAToken(account.mfaSecret, token)
  return { mfaEnabled: true, valid }
}

// ============================================================================
// Internal TOTP implementation (RFC 6238 / RFC 4226)
// ============================================================================

/**
 * Generate a TOTP value for a given time counter.
 */
function generateTOTP(secret: Uint8Array, counter: number): string {
  const hmac = hmacSHA1(secret, int64ToBytes(counter))
  return truncateHOTP(hmac)
}

/**
 * HMAC-SHA1 implementation using Node.js crypto.
 */
function hmacSHA1(key: Uint8Array, message: Uint8Array): Buffer {
  return crypto.createHmac("sha1", Buffer.from(key)).update(Buffer.from(message)).digest()
}

/**
 * Truncate HMAC result to HOTP value (RFC 4226, section 5.3).
 */
function truncateHOTP(hmac: Buffer): string {
  const offset = hmac[hmac.length - 1] & 0xf
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  const otp = binary % 1_000_000
  return otp.toString().padStart(TOTP_DIGITS, "0")
}

/**
 * Convert a 64-bit integer to 8-byte big-endian buffer.
 */
function int64ToBytes(num: number): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeBigInt64BE(BigInt(num), 0)
  return buf
}

// ============================================================================
// Base32 encoding/decoding (RFC 4648)
// ============================================================================

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

function base32Encode(bytes: Uint8Array): string {
  let result = ""
  let bits = 0
  let value = 0

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i]
    bits += 8

    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f]
      bits -= 5
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f]
  }

  return result
}

function base32Decode(encoded: string): Uint8Array | null {
  // Normalize: uppercase, strip padding and whitespace
  const normalized = encoded.toUpperCase().replace(/[= ]/g, "")
  if (!/^[A-Z2-7]+$/.test(normalized)) return null

  const bytes: number[] = []
  let bits = 0
  let value = 0

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i]
    const idx = BASE32_ALPHABET.indexOf(char)
    if (idx === -1) return null

    value = (value << 5) | idx
    bits += 5

    while (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }

  return new Uint8Array(bytes)
}
