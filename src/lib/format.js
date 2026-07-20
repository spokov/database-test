export function calcAge(birthDate) {
  if (!birthDate) return null
  const b = new Date(birthDate)
  const diff = Date.now() - b.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}
