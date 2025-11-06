/**
 * Storage adapter that uses local files (Vercel Blob removed, using Supabase Storage instead)
 */
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

export async function saveToStorage(key: string, data: any): Promise<void> {
  // Use local file system
  try {
    const filePath = join(process.cwd(), key)
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
    console.log(`Saved ${key} to local file`)
  } catch (error) {
    console.error(`Failed to save ${key} to file:`, error)
    throw error
  }
}

export async function loadFromStorage<T>(key: string): Promise<T | null> {
  // Use local file system
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

export function storageExists(key: string): boolean {
  const filePath = join(process.cwd(), key)
  return existsSync(filePath)
}
