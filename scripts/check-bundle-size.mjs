import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const assetsDir = join(process.cwd(), 'dist', 'assets')
const strict = process.env.BUNDLE_SIZE_STRICT === '1'

const monitors = [
  {
    label: 'app.css',
    pattern: /^app-.*\.css$/,
    maxRaw: 100 * 1024,
    maxGzip: 20 * 1024,
  },
  {
    label: 'GenerateView.js',
    pattern: /^GenerateView-.*\.js$/,
    maxRaw: 100 * 1024,
    maxGzip: 31 * 1024,
  },
  {
    label: 'GenerateView.css',
    pattern: /^GenerateView-.*\.css$/,
    maxRaw: 45 * 1024,
    maxGzip: 9 * 1024,
  },
  {
    label: 'ShowcaseView.js',
    pattern: /^ShowcaseView-.*\.js$/,
    maxRaw: 24 * 1024,
    maxGzip: 8 * 1024,
  },
  {
    label: 'ShowcaseView.css',
    pattern: /^ShowcaseView-.*\.css$/,
    maxRaw: 8 * 1024,
    maxGzip: 3 * 1024,
  },
  {
    label: 'vendor-icons.js',
    pattern: /^vendor-icons-.*\.js$/,
    maxRaw: 22 * 1024,
    maxGzip: 8 * 1024,
  },
  {
    label: 'cases-index.js',
    pattern: /^cases-index-.*\.js$/,
    maxRaw: 565 * 1024,
    maxGzip: 115 * 1024,
  },
  {
    label: 'cases-part-*.js',
    pattern: /^cases-part-\d+-.*\.js$/,
    maxRaw: 360 * 1024,
    maxGzip: 96 * 1024,
    multiple: true,
  },
]

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '-'
  return `${(bytes / 1024).toFixed(2)} KiB`
}

function measureAsset(fileName) {
  const bytes = readFileSync(join(assetsDir, fileName))
  return {
    fileName,
    raw: bytes.length,
    gzip: gzipSync(bytes).length,
  }
}

if (!existsSync(assetsDir)) {
  console.error('[bundle] dist/assets 不存在，请先运行 pnpm build')
  process.exit(1)
}

const assetFiles = readdirSync(assetsDir)
const warnings = []
const rows = []

for (const monitor of monitors) {
  const matches = assetFiles.filter((fileName) => monitor.pattern.test(fileName)).sort()

  if (!matches.length) {
    warnings.push(`${monitor.label} 未找到匹配构建产物`)
    rows.push({
      target: monitor.label,
      file: '未找到',
      raw: '-',
      gzip: '-',
      limit: `${formatBytes(monitor.maxRaw)} / ${formatBytes(monitor.maxGzip)}`,
      status: 'WARN',
    })
    continue
  }

  const selectedFiles = monitor.multiple ? matches : [matches[0]]
  for (const fileName of selectedFiles) {
    const size = measureAsset(fileName)
    const overRaw = size.raw > monitor.maxRaw
    const overGzip = size.gzip > monitor.maxGzip
    const status = overRaw || overGzip ? 'WARN' : 'OK'

    if (status === 'WARN') {
      warnings.push(
        `${fileName} 超过软阈值：raw ${formatBytes(size.raw)} / ${formatBytes(
          monitor.maxRaw,
        )}，gzip ${formatBytes(size.gzip)} / ${formatBytes(monitor.maxGzip)}`,
      )
    }

    rows.push({
      target: monitor.label,
      file: fileName,
      raw: formatBytes(size.raw),
      gzip: formatBytes(size.gzip),
      limit: `${formatBytes(monitor.maxRaw)} / ${formatBytes(monitor.maxGzip)}`,
      status,
    })
  }
}

console.table(rows)

if (!warnings.length) {
  console.log('[bundle] 关键构建产物均在软阈值内')
  process.exit(0)
}

warnings.forEach((warning) => console.warn(`[bundle] ${warning}`))

if (strict) {
  console.error('[bundle] BUNDLE_SIZE_STRICT=1，体积超阈值导致检查失败')
  process.exit(1)
}

console.warn('[bundle] 已发现体积警告；当前为软阈值模式，不阻断 CI')
