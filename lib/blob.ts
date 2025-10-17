import { put, list, del } from "@vercel/blob"

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN

async function backoff(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastErr: any
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      await backoff(200 * (i + 1)) // linear backoff
    }
  }
  throw lastErr
}

export async function putJSON(path: string, data: any) {
  const body = JSON.stringify(data, null, 2)
  const res = await withRetry(() =>
    put(path, body, {
      access: "public",
      contentType: "application/json",
      token: TOKEN,
      addRandomSuffix: false,
      allowOverwrite: true,
    }),
  )
  return res.url
}

export async function getJSON<T>(path: string): Promise<T | null> {
  try {
    const { blobs } = await withRetry(() => list({ prefix: path, token: TOKEN, limit: 1 }))
    const found = blobs.find((b) => b.pathname === path)
    if (!found) return null
    const res = await withRetry(() => fetch(found.url, { cache: "no-cache" }))
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export async function listPrefix(prefix: string) {
  return withRetry(() => list({ prefix, token: TOKEN }))
}

export async function deleteBlob(path: string) {
  await del(`https://blob.vercel-storage.com/${path}`, { token: TOKEN })
}

export async function putBinary(path: string, file: File | Blob, contentType?: string) {
  const res = await withRetry(() =>
    put(path, file, {
      access: "public",
      contentType,
      token: TOKEN,
      addRandomSuffix: true,
      allowOverwrite: true,
    }),
  )
  return res.url
}
