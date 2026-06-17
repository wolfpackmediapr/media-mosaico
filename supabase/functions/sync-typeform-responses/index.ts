import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { fetchFormSchema, normalizeItem, type FormType, type NormalizedAlert } from '../_shared/typeformNormalize.ts'

const RADIO_FORM_ID = 'ngv41rGM'
const TV_FORM_ID = Deno.env.get('TYPEFORM_TV_FORM_ID') ?? ''
const TYPEFORM_TOKEN = Deno.env.get('TYPEFORM_API_TOKEN') ?? ''

console.log('[sync-typeform-responses] boot', {
  hasToken: !!TYPEFORM_TOKEN,
  hasTvId: !!TV_FORM_ID,
})

interface Target {
  formType: FormType
  formId: string
}

interface SyncResult {
  formType: FormType
  formId: string
  fetched: number
  upserted: number
  lastSubmittedAt: string | null
  status: 'ok' | 'error'
  error?: string
}

async function getSyncState(admin: any, formId: string) {
  const { data, error } = await admin
    .from('typeform_sync_state')
    .select('*')
    .eq('form_id', formId)
    .maybeSingle()
  if (error) {
    console.error('[sync] state read error', formId, error)
    return null
  }
  return data
}

async function writeSyncState(admin: any, row: Record<string, unknown>) {
  const { error } = await admin
    .from('typeform_sync_state')
    .upsert(row, { onConflict: 'form_id' })
  if (error) console.error('[sync] state write error', error)
}

async function fetchPage(formId: string, params: URLSearchParams): Promise<any> {
  const url = `https://api.typeform.com/forms/${formId}/responses?${params}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TYPEFORM_TOKEN}` },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`typeform:${res.status}:${body.slice(0, 200)}`)
  }
  return res.json()
}

async function syncOne(admin: any, target: Target, sinceOverride?: string): Promise<SyncResult> {
  const result: SyncResult = {
    formType: target.formType,
    formId: target.formId,
    fetched: 0,
    upserted: 0,
    lastSubmittedAt: null,
    status: 'ok',
  }

  await writeSyncState(admin, {
    form_id: target.formId,
    form_type: target.formType,
    last_run_at: new Date().toISOString(),
    last_run_status: 'running',
    last_error: null,
  })

  try {
    const state = await getSyncState(admin, target.formId)
    const sinceRaw = sinceOverride ?? state?.last_synced_at ?? undefined
    // Typeform's `since` param only accepts Unix timestamps (seconds) or ISO
    // strings with a `Z` suffix — it rejects `+00:00` offsets that Postgres
    // emits for timestamptz columns.
    let since: string | undefined
    if (sinceRaw) {
      const ms = new Date(sinceRaw).getTime()
      if (!Number.isNaN(ms)) since = String(Math.floor(ms / 1000))
    }
    const titles = await fetchFormSchema(target.formId, TYPEFORM_TOKEN)

    const pageSize = 1000
    let before: string | undefined
    let maxSubmittedAt: string | null = state?.last_synced_at ?? null
    const seenTokens = new Set<string>()

    while (true) {
      const params = new URLSearchParams({
        page_size: String(pageSize),
        completed: 'true',
      })
      // Note: Typeform forbids combining `sort` with `before`/`after`.
      // Default order is submitted_at desc, which is what we want.
      if (since) params.set('since', since)
      if (before) params.set('before', before)

      const json = await fetchPage(target.formId, params)
      const items: any[] = json.items ?? []
      if (items.length === 0) break

      const normalized: NormalizedAlert[] = items.map((it) =>
        normalizeItem(it, target.formType, target.formId, titles),
      )
      result.fetched += normalized.length

      const rows = normalized.map((n) => ({
        form_type: n.formType,
        form_id: n.formId,
        response_id: n.id,
        token: n.token ?? null,
        submitted_at: n.submittedAt,
        landed_at: n.landedAt ?? null,
        title: n.title ?? null,
        summary: n.summary ?? null,
        category: n.category ?? null,
        channel: n.channel ?? null,
        program: n.program ?? null,
        clients: n.clients ?? [],
        tags: n.tags ?? [],
        is_alert: n.isAlert,
        raw_answers: n.rawAnswers,
        payload: n.payload,
      }))
      // Upsert in small batches to stay under Postgres statement timeout
      const BATCH = 100
      for (let i = 0; i < rows.length; i += BATCH) {
        const slice = rows.slice(i, i + BATCH)
        const { error: upsertErr } = await admin
          .from('typeform_responses')
          .upsert(slice, { onConflict: 'form_id,response_id' })
        if (upsertErr) throw new Error(`upsert:${upsertErr.message}`)
        result.upserted += slice.length
      }

      for (const n of normalized) {
        if (!maxSubmittedAt || n.submittedAt > maxSubmittedAt) maxSubmittedAt = n.submittedAt
      }

      // Advance cursor: with sort=desc, `before` should be the token of the last (oldest) item
      const lastItem = items[items.length - 1]
      const nextBefore = lastItem?.token
      if (!nextBefore || seenTokens.has(nextBefore) || items.length < pageSize) {
        break
      }
      seenTokens.add(nextBefore)
      before = nextBefore
    }

    result.lastSubmittedAt = maxSubmittedAt
    await writeSyncState(admin, {
      form_id: target.formId,
      form_type: target.formType,
      last_synced_at: maxSubmittedAt,
      last_run_at: new Date().toISOString(),
      last_run_status: 'ok',
      last_error: null,
    })
  } catch (err) {
    result.status = 'error'
    result.error = String((err as Error).message ?? err)
    console.error('[sync] form error', target.formId, err)
    await writeSyncState(admin, {
      form_id: target.formId,
      form_type: target.formType,
      last_run_at: new Date().toISOString(),
      last_run_status: 'error',
      last_error: result.error,
    })
  }
  return result
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (!TYPEFORM_TOKEN) {
    return new Response(JSON.stringify({ error: 'typeform_token_missing' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let body: any = {}
  if (req.method === 'POST') {
    body = await req.json().catch(() => ({}))
  }
  const formFilter: 'tv' | 'radio' | 'all' = body.form ?? 'all'
  const sinceOverride: string | undefined = body.since || undefined

  const targets: Target[] = []
  if ((formFilter === 'radio' || formFilter === 'all')) {
    targets.push({ formType: 'radio', formId: RADIO_FORM_ID })
  }
  if ((formFilter === 'tv' || formFilter === 'all') && TV_FORM_ID) {
    targets.push({ formType: 'tv', formId: TV_FORM_ID })
  }

  try {
    const results: SyncResult[] = []
    for (const t of targets) {
      results.push(await syncOne(admin, t, sinceOverride))
    }
    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[sync-typeform-responses] fatal', err)
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})