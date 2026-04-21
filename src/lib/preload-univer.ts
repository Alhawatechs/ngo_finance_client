/**
 * Preload Univer editor chunks so the Budget spreadsheet tab shows immediately
 * when the user switches to it (no delay for dynamic imports).
 * Call once when the budget format add/edit page (or list) mounts.
 */
let preloadStarted: Promise<void> | null = null

export function preloadUniverEditor(): void {
  if (preloadStarted) return
  preloadStarted = Promise.all([
    import('@univerjs/presets'),
    import('@univerjs/preset-sheets-core'),
    import('@univerjs/preset-sheets-core/locales/en-US').catch(() => ({ default: {} })),
    import('@univerjs/preset-sheets-core/lib/index.css'),
    import('@/components/budget/UniverSpreadsheetEmbed'),
  ]).then(() => {})
}
