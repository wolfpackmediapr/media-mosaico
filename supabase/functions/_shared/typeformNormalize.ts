// Shared Typeform → normalized alert helpers.
// Keep in sync with get-typeform-alerts/index.ts (legacy implementation).

export type FormType = 'tv' | 'radio'

export interface NormalizedAlert {
  id: string
  formType: FormType
  formId: string
  token?: string
  submittedAt: string
  landedAt?: string
  channel?: string
  program?: string
  title?: string
  summary?: string
  category?: string
  tags: string[]
  clients: string[]
  isAlert: boolean
  rawAnswers: Record<string, string | string[]>
  payload: Record<string, unknown>
}

function matchKey(title: string, keywords: string[]): boolean {
  const t = title.toLowerCase()
  return keywords.some((k) => t.includes(k))
}

export function classifyField(
  title: string,
): 'title' | 'summary' | 'category' | 'channel' | 'program' | 'clients' | 'tags' | null {
  const t = title.toLowerCase()
  if (matchKey(t, ['título', 'titulo'])) return 'title'
  if (matchKey(t, ['resumen', 'noticia o evento'])) return 'summary'
  if (matchKey(t, ['categoría', 'categoria'])) return 'category'
  if (matchKey(t, ['canal', 'emisora', 'estación', 'estacion'])) return 'channel'
  if (matchKey(t, ['programa'])) return 'program'
  if (matchKey(t, ['lista de email', 'clientes', 'cliente'])) return 'clients'
  if (matchKey(t, ['tag'])) return 'tags'
  return null
}

export function extractAnswerValue(answer: any): string | string[] | null {
  if (!answer) return null
  switch (answer.type) {
    case 'text':
    case 'long_text':
    case 'email':
    case 'url':
    case 'phone_number':
      return answer[answer.type] ?? null
    case 'choice':
      return answer.choice?.label ?? answer.choice?.other ?? null
    case 'choices':
      return answer.choices?.labels ?? []
    case 'number':
      return String(answer.number)
    case 'boolean':
      return answer.boolean ? 'Sí' : 'No'
    case 'date':
      return answer.date ?? null
    default:
      return null
  }
}

export async function fetchFormSchema(
  formId: string,
  token: string,
): Promise<Map<string, string>> {
  const res = await fetch(`https://api.typeform.com/forms/${formId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`schema:${res.status}`)
  const json = await res.json()
  const map = new Map<string, string>()
  const walk = (fields: any[]) => {
    for (const f of fields ?? []) {
      if (f.id && f.title) map.set(f.id, f.title)
      if (f.properties?.fields) walk(f.properties.fields)
    }
  }
  walk(json.fields ?? [])
  return map
}

export function normalizeItem(
  item: any,
  formType: FormType,
  formId: string,
  titles: Map<string, string>,
): NormalizedAlert {
  const norm: NormalizedAlert = {
    id: item.response_id ?? item.token,
    formType,
    formId,
    token: item.token,
    submittedAt: item.submitted_at ?? item.landed_at ?? new Date().toISOString(),
    landedAt: item.landed_at,
    tags: [],
    clients: [],
    isAlert: false,
    rawAnswers: {},
    payload: item,
  }
  for (const ans of item.answers ?? []) {
    const fieldId = ans.field?.id
    const title = (fieldId ? titles.get(fieldId) : undefined) ?? ans.field?.ref ?? ''
    const value = extractAnswerValue(ans)
    if (value == null) continue
    if (title) norm.rawAnswers[title] = value
    const kind = title ? classifyField(title) : null
    if (!kind) continue
    switch (kind) {
      case 'title':
      case 'summary':
      case 'category':
      case 'channel':
      case 'program':
        ;(norm as any)[kind] = Array.isArray(value) ? value.join(', ') : value
        break
      case 'clients':
        norm.clients = Array.isArray(value) ? value : [value]
        break
      case 'tags':
        norm.tags = Array.isArray(value) ? value : [value]
        break
    }
  }
  // Infer program/channel from "Programas de … (CANAL)" field
  if (!norm.channel || !norm.program) {
    for (const [t, v] of Object.entries(norm.rawAnswers)) {
      const low = t.toLowerCase()
      if (low.startsWith('programas de') && v) {
        norm.program = Array.isArray(v) ? v.join(', ') : v
        if (!norm.channel) {
          const m = t.match(/\(([^)]+)\)/)
          if (m) norm.channel = m[1]
        }
        break
      }
    }
  }
  norm.isAlert = Boolean(norm.clients?.length || norm.title || norm.summary)
  return norm
}