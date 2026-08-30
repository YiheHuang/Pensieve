export function beijingDateTimeLocal(date = new Date()) {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`
}

export function beijingInputToIso(value: string) {
  if (!value) return new Date().toISOString()
  return new Date(`${value.length === 16 ? `${value}:00` : value}+08:00`).toISOString()
}

export function resolveCaptureOccurredAt(value: string, manuallySet: boolean, submittedAt?: string, now = new Date()) {
  if (manuallySet) return value
  return submittedAt || beijingDateTimeLocal(now)
}
