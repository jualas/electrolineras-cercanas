const configuredBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''

let privateToken: string | null =
  (import.meta.env.VITE_PRIVATE_TOKEN as string | undefined)?.trim() || null

let unauthorizedHandler: (() => void) | null = null

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return configuredBase ? `${configuredBase}${normalized}` : normalized
}

export function setPrivateToken(token: string | null) {
  privateToken = token?.trim() || null
}

export function getPrivateToken(): string | null {
  return privateToken
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

export async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (privateToken && !headers.has('X-Private-Token')) {
    headers.set('X-Private-Token', privateToken)
  }
  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: 'include',
  })
  if (response.status === 401 && path !== '/api/v1/auth/session' && path !== '/api/v1/auth/login') {
    unauthorizedHandler?.()
  }
  if (!response.ok) {
    let message = `API ${path}: HTTP ${response.status}`
    try {
      const body = (await response.json()) as { detail?: string | { msg: string }[] }
      if (typeof body.detail === 'string') {
        message = body.detail
      } else if (Array.isArray(body.detail) && body.detail[0]?.msg) {
        message = body.detail[0].msg
      }
    } catch {
      // keep default
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}
