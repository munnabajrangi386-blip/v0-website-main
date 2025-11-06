/**
 * Supabase Storage Service
 * Handles file uploads to Supabase Storage (replaces Vercel Blob)
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use service role for admin operations (full storage access)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

const UPLOADS_BUCKET = 'uploads'

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
  const { data } = supabaseAdmin.storage
    .from(UPLOADS_BUCKET)
    .getPublicUrl(path)

  return data.publicUrl
}

