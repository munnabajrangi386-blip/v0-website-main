/**
 * Storage adapter that uses Vercel Blob in production and local files in development
 */
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { putJSON, getJSON } from './blob'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const USE_BLOB = IS_PRODUCTION && !!process.env.BLOB_READ_WRITE_TOKEN

export async function saveToStorage(key: string, data: any): Promise<void> {
  if (USE_BLOB) {
    // Use Vercel Blob in production
    try {
      await putJSON(key, data)
      console.log(`Saved ${key} to Vercel Blob`)
    } catch (error) {
      console.error(`Failed to save ${key} to Blob:`, error)
      throw error
    }
  } else {
    // Use local file system in development
    try {
      const filePath = join(process.cwd(), key)
      writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
      console.log(`Saved ${key} to local file`)
    } catch (error) {
      console.error(`Failed to save ${key} to file:`, error)
      throw error
    }
  }
}

export async function loadFromStorage<T>(key: string): Promise<T | null> {
  if (USE_BLOB) {
    // Use Vercel Blob in production
    try {
      const data = await getJSON<T>(key)
      if (data) {
        console.log(`Loaded ${key} from Vercel Blob`)
      }
      return data
    } catch (error) {
      console.error(`Failed to load ${key} from Blob:`, error)
      return null
    }
  } else {
    // Use local file system in development
    try {
      const filePath = join(process.cwd(), key)
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf8')
        const data = JSON.parse(content) as T
        console.log(`Loaded ${key} from local file`)
        return data
      }
      return null
    } catch (error) {
      console.error(`Failed to load ${key} from file:`, error)
      return null
    }
  }
}

export function storageExists(key: string): boolean {
  if (USE_BLOB) {
    // Can't check blob existence synchronously, return true to attempt load
    return true
  } else {
    const filePath = join(process.cwd(), key)
    return existsSync(filePath)
  }
}
