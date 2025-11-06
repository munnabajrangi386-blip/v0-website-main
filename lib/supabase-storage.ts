/**
 * Supabase Storage Service
 * Handles file uploads to Supabase Storage (replaces Vercel Blob)
 */
import { createClient } from '@supabase/supabase-js'

const UPLOADS_BUCKET = 'uploads'

// Lazy initialization to avoid build-time errors
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables are not configured')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  file: File | Blob | Buffer,
  path: string,
  options?: {
    contentType?: string
    upsert?: boolean
  }
): Promise<string> {
  try {
    const fileBuffer = file instanceof File || file instanceof Blob
      ? Buffer.from(await file.arrayBuffer())
      : file

    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin.storage
      .from(UPLOADS_BUCKET)
      .upload(path, fileBuffer, {
        contentType: options?.contentType || 'application/octet-stream',
        upsert: options?.upsert ?? true,
        cacheControl: '3600'
      })

    if (error) {
      console.error('Error uploading file:', error)
      throw error
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(UPLOADS_BUCKET)
      .getPublicUrl(path)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error in uploadFile:', error)
    throw error
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(path: string): Promise<void> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin.storage
      .from(UPLOADS_BUCKET)
      .remove([path])

    if (error) {
      console.error('Error deleting file:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in deleteFile:', error)
    throw error
  }
}

/**
 * List files in a folder
 */
export async function listFiles(folder?: string): Promise<string[]> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin.storage
      .from(UPLOADS_BUCKET)
      .list(folder || '', {
        limit: 100,
        offset: 0
      })

    if (error) {
      console.error('Error listing files:', error)
      return []
    }

    return data?.map(item => item.name) || []
  } catch (error) {
    console.error('Error in listFiles:', error)
    return []
  }
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(path: string): string {
  const supabaseAdmin = getSupabaseAdmin()
  const { data } = supabaseAdmin.storage
    .from(UPLOADS_BUCKET)
    .getPublicUrl(path)

  return data.publicUrl
}

