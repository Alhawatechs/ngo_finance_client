/**
 * Removes .next-dev so the next `next dev` run does a full compile.
 * Fixes ChunkLoadError when chunk hashes change after edits.
 * On Windows, stop `next dev` first if removal fails (folder locked).
 */
const fs = require('fs/promises')
const path = require('path')

const dir = path.join(__dirname, '..', '.next-dev')

async function main() {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      await fs.rm(dir, { recursive: true, force: true })
      process.stderr.write(`Removed ${dir}\n`)
      return
    } catch (e) {
      if (e && e.code === 'ENOENT') return
      if (attempt === 5) {
        process.stderr.write(
          'Could not delete .next-dev (files may be locked). Stop the Next.js dev server (Ctrl+C), then run this script again.\n'
        )
        process.exitCode = 1
        return
      }
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
    }
  }
}

main()
