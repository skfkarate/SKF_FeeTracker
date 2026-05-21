import nextEnv from '@next/env'

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())

const skfBase = cleanOrigin(process.env.SKF_KARATE_SMOKE_URL || 'https://www.skfkarate.org')
const feeTrackBase = cleanOrigin(process.env.FEETRACK_SMOKE_URL || 'https://fees.skfkarate.org')
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 10_000)
const requireAuth = process.env.SMOKE_REQUIRE_AUTH === 'true'
const username = process.env.FEETRACK_SMOKE_USERNAME || process.env.ADMIN_USERNAME || ''
const password = process.env.FEETRACK_SMOKE_PASSWORD || process.env.ADMIN_PASSWORD || ''

const results = []

function cleanOrigin(value) {
  const url = new URL(String(value || '').trim())
  return url.origin
}

function endpoint(origin, path) {
  return new URL(path, origin).toString()
}

function record(status, name, detail = '') {
  results.push({ status, name, detail })
  console.log(`${status} ${name}${detail ? ` - ${detail}` : ''}`)
}

async function request(name, url, init = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
    })
    const contentType = response.headers.get('content-type') || ''
    const body = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => '')

    return { response, body }
  } catch (error) {
    throw new Error(`${name} request failed: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    clearTimeout(timer)
  }
}

async function expectJsonOk(name, url, validate) {
  const { response, body } = await request(name, url)
  if (!response.ok) {
    throw new Error(`${name} returned ${response.status}`)
  }
  if (!body || typeof body !== 'object') {
    throw new Error(`${name} did not return JSON`)
  }
  if (validate && !validate(body)) {
    throw new Error(`${name} returned an unexpected payload`)
  }
  record('PASS', name, `${response.status}`)
  return { response, body }
}

async function expectStatus(name, url, expectedStatus, init = {}) {
  const { response } = await request(name, url, init)
  if (response.status !== expectedStatus) {
    throw new Error(`${name} returned ${response.status}, expected ${expectedStatus}`)
  }
  record('PASS', name, `${response.status}`)
  return response
}

async function runAuthenticatedSmoke() {
  if (!username || !password) {
    const message = 'set FEETRACK_SMOKE_USERNAME and FEETRACK_SMOKE_PASSWORD to verify authenticated data flow'
    if (requireAuth) throw new Error(`Authenticated smoke required but credentials are missing: ${message}`)
    record('SKIP', 'authenticated FeeTrack smoke', message)
    return
  }

  const login = await request('FeeTrack login', endpoint(feeTrackBase, '/api/feetrack/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (!login.response.ok || !login.body?.success) {
    throw new Error(`FeeTrack login returned ${login.response.status}`)
  }

  const sessionCookie = (login.response.headers.get('set-cookie') || '').split(';')[0]
  if (!sessionCookie) throw new Error('FeeTrack login did not set a session cookie')
  record('PASS', 'FeeTrack authenticated login', `${login.response.status}`)

  const data = await request('FeeTrack authenticated data', endpoint(feeTrackBase, '/api/feetrack/data'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({ action: 'get_branch_counts' }),
  })

  if (!data.response.ok || !data.body?.success || !data.body?.data) {
    throw new Error(`FeeTrack authenticated data returned ${data.response.status}`)
  }
  record('PASS', 'FeeTrack authenticated data flow', `${data.response.status}`)
}

async function main() {
  console.log(`Smoke targets: SKF-Karate=${skfBase}, FeeTrack=${feeTrackBase}`)

  await expectJsonOk('SKF-Karate health', endpoint(skfBase, '/api/health'), (body) =>
    body.success === true && body.data?.status === 'ok'
  )
  await expectJsonOk('SKF-Karate FeeTrack integration', endpoint(skfBase, '/api/integrations/feetrack'), (body) =>
    body.success === true && body.configured === true
  )
  await expectJsonOk('FeeTrack health', endpoint(feeTrackBase, '/api/feetrack/health'), (body) =>
    body.success === true && body.backend?.reachable === true && body.backend?.configured === true
  )
  await expectStatus('FeeTrack unauthenticated session', endpoint(feeTrackBase, '/api/feetrack/auth/session'), 401)
  await expectStatus('FeeTrack unauthenticated data', endpoint(feeTrackBase, '/api/feetrack/data'), 401, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get_branch_counts' }),
  })
  await runAuthenticatedSmoke()

  const failures = results.filter((result) => result.status === 'FAIL')
  if (failures.length) process.exit(1)
}

main().catch((error) => {
  record('FAIL', 'production smoke', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
