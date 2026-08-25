'use strict'

const SESSION_ID_PREFIX = 'DEX~'

/**
 * Validate the configured session ID format.
 * An empty value is allowed so the bot can start in QR/pairing mode.
 * A configured value must use the DEX~ prefix and contain a token after it.
 */
function validateSessionId(value) {
  const sessionId = String(value || '').trim()
  if (!sessionId) return { valid: true, value: '' }

  if (!sessionId.startsWith(SESSION_ID_PREFIX)) {
    return {
      valid: false,
      value: sessionId,
      reason: `SESSION_ID must start with ${SESSION_ID_PREFIX}`,
    }
  }

  if (sessionId.slice(SESSION_ID_PREFIX.length).trim().length === 0) {
    return {
      valid: false,
      value: sessionId,
      reason: `SESSION_ID must contain a token after ${SESSION_ID_PREFIX}`,
    }
  }

  if (/\s/.test(sessionId)) {
    return {
      valid: false,
      value: sessionId,
      reason: 'SESSION_ID must not contain whitespace',
    }
  }

  return { valid: true, value: sessionId }
}

function assertValidSessionId(value) {
  const result = validateSessionId(value)
  if (!result.valid) {
    throw new Error(`[Nexvani] Invalid SESSION_ID: ${result.reason}`)
  }
  return result.value
}

module.exports = {
  SESSION_ID_PREFIX,
  validateSessionId,
  assertValidSessionId,
}

module.exports.default = module.exports
