import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { normalizeText } from '../_shared/textNormalize.ts'

console.log('[get-typeform-alerts] boot', {
  hasToken: !!Deno.env.get('TYPEFORM_API_TOKEN'),
  hasTvId: !!Deno.env.get('TYPEFORM_TV_FORM_ID'),
})

const TV_FORM_ID = Deno.env.get('TYPEFORM_TV_FORM_ID') ?? ''

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
    const until: string | undefined = body.until || undefined
    const search: string = (body.search ?? '').toString().toLowerCase().trim()

    const formTypes: FormType[] = form === 'all' ? ['tv', 'radio'] : [form]

    // Build query
    let query = adminClient
      .from('typeform_responses')
      .select(
        'response_id, form_type, submitted_at, title, summary, category, channel, program, clients, tags, raw_answers',
        { count: 'exact' },
      )
      .in('form_type', formTypes)
      .order('submitted_at', { ascending: false })

    if (since) query = query.gte('submitted_at', since)
    if (until) query = query.lte('submitted_at', until)
    if (search) {
      const esc = search.replace(/[\\%_,()]/g, (m) => `\\${m}`)
      const like = `%${esc}%`
      query = query.or(
        `title.ilike.${like},summary.ilike.${like},program.ilike.${like},channel.ilike.${like}`,
      )
    }

    // Server-side pagination (no active-client filtering applied to total — matches prior UX
    // where total reflects raw results and inactive-client labels are stripped per-row).
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1
    query = query.range(start, end)

    const { data, error, count } = await query
    if (error) {
      console.error('[get-typeform-alerts] mirror query error', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const items: NormalizedAlert[] = (data ?? []).map((r: any) => {
      const clients = (r.clients ?? []).filter((c: string) =>
        activeClients.normalized.has(normalizeText(c)),
      )
      return {
        id: r.response_id,
        formType: r.form_type as FormType,
        submittedAt: r.submitted_at,
        channel: r.channel ?? undefined,
        program: r.program ?? undefined,
        title: r.title ?? undefined,
        summary: r.summary ?? undefined,
        category: r.category ?? undefined,
        tags: r.tags ?? [],
        clients,
        rawAnswers: r.raw_answers ?? {},
      }
    })

    return new Response(
      JSON.stringify({
        items,
        total: count ?? items.length,
        errors: {},
        tvFormConfigured: Boolean(TV_FORM_ID),
      }),
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