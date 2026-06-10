import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { normalizeText } from '../_shared/textNormalize.ts'

console.log('[get-typeform-alerts] boot', {
  hasToken: !!Deno.env.get('TYPEFORM_API_TOKEN'),
  hasTvId: !!Deno.env.get('TYPEFORM_TV_FORM_ID'),
})

const RADIO_FORM_ID = 'ngv41rGM'
const TV_FORM_ID = Deno.env.get('TYPEFORM_TV_FORM_ID') ?? ''
const TYPEFORM_TOKEN = Deno.env.get('TYPEFORM_API_TOKEN') ?? ''

type FormType = 'tv' | 'radio'

interface NormalizedAlert {
  id: string
  formType: FormType
  submittedAt: string
  channel?: string
  program?: string
  title?: string
  summary?: string
  category?: string
  tags: string[]
  clients: string[]
  rawAnswers: Record<string, string | string[]>
}

interface CacheEntry { at: number; data: NormalizedAlert[] }
const cache = new Map<FormType, CacheEntry>()
const CACHE_TTL_MS = 60 * 1000

interface ActiveClientsCache { at: number; names: string[]; normalized: Set<string> }
let activeClientsCache: ActiveClientsCache | null = null
const ACTIVE_CLIENTS_TTL_MS = 60 * 1000

async function getActiveClients(adminClient: any): Promise<ActiveClientsCache> {
  if (activeClientsCache && Date.now() - activeClientsCache.at < ACTIVE_CLIENTS_TTL_MS) {
    return activeClientsCache
  }
  const { data, error } = await adminClient
    .from('clients')
    .select('name')
    .eq('is_active', true)
  if (error) {
    console.error('[get-typeform-alerts] active clients fetch error', error)
    return activeClientsCache ?? { at: Date.now(), names: [], normalized: new Set() }
  }
  const names = (data ?? []).map((r: any) => String(r.name || '')).filter(Boolean)
  activeClientsCache = {
    at: Date.now(),
    names,
    normalized: new Set(names.map((n) => normalizeText(n))),
  }
  return activeClientsCache
}

function matchKey(title: string, keywords: string[]): boolean {
  const t = title.toLowerCase()
  return keywords.some((k) => t.includes(k))
}

function classifyField(title: string): keyof NormalizedAlert | 'program' | 'clients' | 'tags' | null {
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

function extractAnswerValue(answer: any): string | string[] | null {
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

async function fetchFormSchema(formId: string): Promise<Map<string, string>> {
  const res = await fetch(`https://api.typeform.com/forms/${formId}`, {
    headers: { Authorization: `Bearer ${TYPEFORM_TOKEN}` },
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

async function fetchResponses(formId: string, formType: FormType, pageSize: number, since?: string): Promise<NormalizedAlert[]> {
  const titles = await fetchFormSchema(formId)
  const params = new URLSearchParams({ page_size: String(pageSize), completed: 'true' })
  if (since) params.set('since', since)
  const res = await fetch(`https://api.typeform.com/forms/${formId}/responses?${params}`, {
    headers: { Authorization: `Bearer ${TYPEFORM_TOKEN}` },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`responses:${res.status}:${body.slice(0, 200)}`)
  }
  const json = await res.json()
  const items: NormalizedAlert[] = []
  for (const item of json.items ?? []) {
    const norm: NormalizedAlert = {
      id: item.response_id ?? item.token,
      formType,
      submittedAt: item.submitted_at ?? item.landed_at ?? new Date().toISOString(),
      tags: [],
      clients: [],
      rawAnswers: {},
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
    // If a "Programas De ..." field was answered for a specific channel and no canal was selected,
    // infer channel from field title.
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
    items.push(norm)
  }
  return items
}

async function getCached(formType: FormType, formId: string, pageSize: number, since?: string): Promise<NormalizedAlert[]> {
  if (since) {
    return fetchResponses(formId, formType, pageSize, since)
  }
  const hit = cache.get(formType)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data.slice(0, pageSize)
  const data = await fetchResponses(formId, formType, pageSize)
  cache.set(formType, { at: Date.now(), data })
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''))
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!TYPEFORM_TOKEN) {
      return new Response(JSON.stringify({ error: 'typeform_token_missing' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const activeClients = await getActiveClients(adminClient)

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const form: 'tv' | 'radio' | 'all' = body.form ?? 'all'
    const pageSize = Math.min(Math.max(Number(body.page_size ?? 25), 1), 100)
    const page = Math.max(Number(body.page ?? 1), 1)
    const since: string | undefined = body.since || undefined
    const search: string = (body.search ?? '').toString().toLowerCase().trim()

    const targets: { type: FormType; id: string }[] = []
    if (form === 'tv' || form === 'all') {
      if (TV_FORM_ID) targets.push({ type: 'tv', id: TV_FORM_ID })
    }
    if (form === 'radio' || form === 'all') {
      targets.push({ type: 'radio', id: RADIO_FORM_ID })
    }

    const results = await Promise.allSettled(
      targets.map((t) => getCached(t.type, t.id, pageSize * page, since)),
    )

    const items: NormalizedAlert[] = []
    const errors: Record<string, string> = {}
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') items.push(...r.value)
      else errors[targets[i].type] = String((r as PromiseRejectedResult).reason?.message ?? r.reason)
    })

    // Filter out inactive client labels from each item's clients[]
    let filtered = items.map((it) => {
      if (!it.clients || it.clients.length === 0) return it
      const cleaned = it.clients.filter((c) => activeClients.normalized.has(normalizeText(c)))
      return { ...it, clients: cleaned }
    })
    if (search) {
      filtered = filtered.filter((it) => {
        const hay = `${it.title ?? ''} ${it.summary ?? ''} ${it.program ?? ''} ${it.channel ?? ''} ${(it.clients ?? []).join(' ')} ${(it.tags ?? []).join(' ')}`.toLowerCase()
        return hay.includes(search)
      })
    }

    filtered.sort((a, b) => (b.submittedAt > a.submittedAt ? 1 : -1))

    const total = filtered.length
    const start = (page - 1) * pageSize
    const paged = filtered.slice(start, start + pageSize)

    return new Response(
      JSON.stringify({ items: paged, total, errors, tvFormConfigured: Boolean(TV_FORM_ID) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('get-typeform-alerts error', err)
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})