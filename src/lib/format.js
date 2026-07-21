export function calcAge(birthDate, asOf = new Date()) {
  if (!birthDate) return null
  const b = new Date(birthDate)
  const ref = typeof asOf === 'string' ? new Date(asOf) : asOf
  const diff = ref.getTime() - b.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

// Age the person was ON a given date (e.g. the date a measurement was
// recorded), not their current age.
export function calcAgeAt(birthDate, atDate) {
  if (!birthDate || !atDate) return null
  const b = new Date(birthDate)
  const a = new Date(atDate)
  const diff = a.getTime() - b.getTime()
  if (diff < 0) return null
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}
