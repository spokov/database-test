// Supabase Auth always needs an email under the hood, but we don't want
// people to have to type (or mistype) a real email address just to log in.
// So every account gets a synthetic, never-delivered email built from its
// username, e.g. "ivan.petrov" -> "ivan.petrov@clientdb.local". This is
// completely invisible to the person using the app.

export const SYNTHETIC_DOMAIN = 'clientdb.local'

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,40}$/

export function isValidUsername(username) {
  return USERNAME_PATTERN.test((username || '').trim())
}

export function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@${SYNTHETIC_DOMAIN}`
}

// Login accepts either a username (new accounts) or a real email
// (accounts created before this feature existed) - if the typed value
// contains "@", treat it as a literal email; otherwise convert it.
export function resolveLoginEmail(identifier) {
  const trimmed = (identifier || '').trim()
  if (trimmed.includes('@')) return trimmed.toLowerCase()
  return usernameToEmail(trimmed)
}
