import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const upstreamName = 'awesome-gpt-image-2'
const upstreamRepo = 'https://github.com/freestylefly/awesome-gpt-image-2'
const defaultRef = 'main'
const defaultRawBase = 'https://raw.githubusercontent.com/freestylefly/awesome-gpt-image-2'

const args = parseArgs(process.argv.slice(2))
const sourceDir = args['source-dir'] || ''
const ref = args.ref || defaultRef
const shouldDownloadAssets = Boolean(args['download-assets'] || args.assets)

const srcDataDir = join(root, 'src', 'data', 'prompt-library')
const snapshotDir = join(root, 'content', 'prompt-library', 'upstreams')
const publicAssetDir = join(root, 'public', 'prompt-assets', upstreamName, 'images')
const assetQueue = []
const caseChunkSize = 100

const syncedAt = new Date().toISOString()
const upstreamCommit = sourceDir ? getGitCommit(sourceDir) : ref
const rawBase = `${defaultRawBase}/${encodeURIComponent(ref)}`

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

async function main() {
  mkdirSync(srcDataDir, { recursive: true })
  mkdirSync(snapshotDir, { recursive: true })
  if (shouldDownloadAssets) mkdirSync(publicAssetDir, { recursive: true })

  const upstreamCases = await readJsonFromUpstream('data/cases.json')
  const styleLibrary = await readJsonFromUpstream('data/style-library.json')

  assertPayload(upstreamCases, styleLibrary)

  const cases = upstreamCases.cases.map((item) => normalizeCase(item, styleLibrary))
  const templates = styleLibrary.templates.map((item, index) => normalizeTemplate(item, index))
  const taxonomy = normalizeTaxonomy(styleLibrary)
  const manifest = buildManifest(upstreamCases, styleLibrary, cases, templates, taxonomy)

  if (shouldDownloadAssets) {
    await mirrorQueuedAssets()
  }

  const caseIndex = buildCaseIndex(cases)
  writeJson(join(snapshotDir, `${upstreamName}.snapshot.json`), {
    manifest,
    upstreamCases,
    styleLibrary,
  })
  manifest.caseChunks = writeCaseChunks(cases, manifest)
  writeJson(join(srcDataDir, 'cases-index.json'), {
    manifest: manifest.upstream,
    total: cases.length,
    cases: caseIndex,
  })
  writeJson(join(srcDataDir, 'templates.json'), {
    manifest: manifest.upstream,
    total: templates.length,
    templates,
  })
  writeJson(join(srcDataDir, 'taxonomy.json'), taxonomy)
  writeJson(join(srcDataDir, 'manifest.json'), manifest)

  console.log(`Synced ${cases.length} cases and ${templates.length} templates from ${upstreamName}`)
  console.log(`Prompt library data written to ${srcDataDir}`)
  if (!shouldDownloadAssets) {
    console.log('Image assets were not mirrored. Re-run with --download-assets to copy/download them locally.')
  }
}

function parseArgs(items) {
  return items.reduce((result, item) => {
    if (item === '--') return result
    if (!item.startsWith('--')) return result
    const [key, value] = item.slice(2).split('=')
    result[key] = value ?? true
    return result
  }, {})
}

async function readJsonFromUpstream(relativePath) {
  if (sourceDir) {
    return JSON.parse(readFileSync(join(sourceDir, relativePath), 'utf8'))
  }

  const response = await fetch(`${rawBase}/${relativePath}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${relativePath}: ${response.status}`)
  }
  return response.json()
}

function getGitCommit(dir) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return 'unknown'
  }
}

function assertPayload(casesPayload, styleLibrary) {
  if (!Array.isArray(casesPayload?.cases)) {
    throw new Error('Upstream cases payload is missing cases[]')
  }
  if (!Array.isArray(styleLibrary?.templates)) {
    throw new Error('Upstream style library payload is missing templates[]')
  }

  const ids = new Set()
  const duplicate = casesPayload.cases.find((item) => {
    if (ids.has(item.id)) return true
    ids.add(item.id)
    return false
  })
  if (duplicate) throw new Error(`Duplicate upstream case id: ${duplicate.id}`)

  const emptyPrompt = casesPayload.cases.find((item) => !String(item.prompt || '').trim())
  if (emptyPrompt) throw new Error(`Case ${emptyPrompt.id} has an empty prompt`)
}

function normalizeCase(item, styleLibrary) {
  const upstreamId = Number(item.id)
  const asset = normalizeImageAsset(item.image, upstreamId)
  const styles = normalizeTags(item.styles)
  const scenes = normalizeTags(item.scenes)
  const category = item.category || inferCategory(item, styleLibrary)

  return {
    id: `${upstreamName}:${upstreamId}`,
    upstreamId,
    title: cleanText(item.title || `Case ${upstreamId}`),
    image: asset.image,
    imageRemote: asset.remote,
    imageLocal: asset.local,
    imageAlt: cleanText(item.imageAlt || item.title || `Case ${upstreamId}`),
    sourceLabel: cleanText(item.sourceLabel || 'Community'),
    sourceUrl: item.sourceUrl || '',
    prompt: cleanText(item.prompt),
    promptPreview: cleanText(item.promptPreview || item.prompt)
      .replace(/\s+/g, ' ')
      .slice(0, 260),
    category,
    styles,
    scenes,
    featured: Boolean(item.featured),
    githubUrl: item.githubUrl || `${upstreamRepo}/blob/main/docs/gallery.md#case-${upstreamId}`,
    upstream: upstreamName,
    upstreamCommit,
    syncedAt,
    licenseStatus: 'needs-review',
  }
}

function normalizeTemplate(item, index) {
  const asset = normalizeImageAsset(item.cover, item.id)

  return {
    id: `${upstreamName}:template:${item.id || index + 1}`,
    upstreamId: item.id || String(index + 1),
    anchor: item.anchor || '',
    title: normalizeLocalizedText(item.title),
    description: normalizeLocalizedText(item.description),
    useWhen: normalizeLocalizedText(item.useWhen),
    guidance: normalizeLocalizedList(item.guidance),
    pitfalls: normalizeLocalizedList(item.pitfalls),
    category: item.category || 'Other Use Cases',
    styles: normalizeTags(item.styles),
    scenes: normalizeTags(item.scenes),
    tags: normalizeTags(item.tags),
    exampleCases: Array.isArray(item.exampleCases) ? item.exampleCases : [],
    cover: asset.image,
    coverRemote: asset.remote,
    coverLocal: asset.local,
    githubUrl: `${upstreamRepo}/blob/main/data/style-library.json`,
    upstream: upstreamName,
    upstreamCommit,
    syncedAt,
    licenseStatus: 'needs-review',
  }
}

function normalizeTaxonomy(styleLibrary) {
  return {
    manifest: {
      upstream: upstreamName,
      upstreamRepo,
      upstreamCommit,
      syncedAt,
    },
    categories: normalizeTaxonomyGroup(styleLibrary.categories),
    styles: normalizeTaxonomyGroup(styleLibrary.styles),
    scenes: normalizeTaxonomyGroup(styleLibrary.scenes),
    tagLabels: styleLibrary.tagLabels || {},
  }
}

function normalizeTaxonomyGroup(items = []) {
  return items.map((item) => ({
    id: item.id || item.value,
    value: item.value,
    anchor: item.anchor || '',
    templateAnchor: item.templateAnchor || '',
    title: normalizeLocalizedText(item.title || item.value),
    description: normalizeLocalizedText(item.description || ''),
    keywords: Array.isArray(item.keywords) ? item.keywords : [],
    cover: normalizeImageAsset(item.cover, item.id || item.value).image,
  }))
}

function buildManifest(upstreamCases, styleLibrary, cases, templates, taxonomy) {
  const payloadHash = hashJson({ upstreamCases, styleLibrary })

  return {
    libraryVersion: syncedAt.slice(0, 10),
    generatedAt: syncedAt,
    upstream: {
      name: upstreamName,
      repo: upstreamRepo,
      ref,
      commit: upstreamCommit,
      payloadHash,
      source: sourceDir || `${rawBase}/data`,
    },
    counts: {
      cases: cases.length,
      templates: templates.length,
      categories: taxonomy.categories.length,
      styles: taxonomy.styles.length,
      scenes: taxonomy.scenes.length,
    },
    assets: {
      mirrored: shouldDownloadAssets,
      basePath: `/prompt-assets/${upstreamName}/images`,
    },
    licensing: {
      defaultStatus: 'needs-review',
      note: 'Imported community prompt examples require source review before commercial promotional use.',
    },
  }
}

function normalizeImageAsset(imagePath, id) {
  const path = String(imagePath || '').trim()
  const filename = path.split('/').filter(Boolean).pop() || `case-${id}.jpg`
  const local = `/prompt-assets/${upstreamName}/images/${filename}`
  const remote = path.startsWith('http') ? path : `${rawBase}/data/${path.replace(/^\//, '')}`

  if (shouldDownloadAssets) assetQueue.push({ path, filename, remote })

  return {
    image: shouldDownloadAssets ? local : remote,
    local,
    remote,
  }
}

async function mirrorQueuedAssets() {
  const seen = new Set()
  let copied = 0
  let skipped = 0

  for (const asset of assetQueue) {
    const target = join(publicAssetDir, asset.filename)
    if (seen.has(target) || existsSync(target)) {
      skipped += 1
      continue
    }
    seen.add(target)

    if (sourceDir && asset.path) {
      const localSource = join(sourceDir, 'data', asset.path.replace(/^\//, ''))
      if (existsSync(localSource)) {
        copyFileSync(localSource, target)
        copied += 1
        continue
      }
    }

    try {
      const response = await fetch(asset.remote)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const buffer = Buffer.from(await response.arrayBuffer())
      writeFileSync(target, buffer)
      copied += 1
    } catch (error) {
      skipped += 1
      console.warn(`Skipping asset ${asset.filename}: ${error.message}`)
    }
  }

  console.log(`Mirrored ${copied} assets to ${publicAssetDir}; skipped ${skipped}.`)
}

function inferCategory(item, styleLibrary) {
  const firstCategory = styleLibrary.categories?.[0]?.value
  return firstCategory || item.category || 'Other Use Cases'
}

function normalizeTags(items) {
  return Array.isArray(items) ? [...new Set(items.filter(Boolean).map(cleanText))] : []
}

function normalizeLocalizedText(value) {
  if (typeof value === 'string') return { zh: value, en: value }
  return {
    zh: cleanText(value?.zh || value?.en || ''),
    en: cleanText(value?.en || value?.zh || ''),
  }
}

function normalizeLocalizedList(value) {
  return {
    zh: Array.isArray(value?.zh) ? value.zh.map(cleanText) : [],
    en: Array.isArray(value?.en) ? value.en.map(cleanText) : [],
  }
}

function cleanText(value = '') {
  return String(value)
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

function hashJson(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function writeCaseChunks(cases, manifest) {
  for (const filename of readdirSync(srcDataDir)) {
    if (/^cases(?:-index|-part-\d+)?\.json$/.test(filename)) {
      unlinkSync(join(srcDataDir, filename))
    }
  }

  const chunks = []
  for (let index = 0; index < cases.length; index += caseChunkSize) {
    const chunkIndex = chunks.length + 1
    const filename = `cases-part-${String(chunkIndex).padStart(2, '0')}.json`
    const chunkCases = cases.slice(index, index + caseChunkSize)
    writeJson(join(srcDataDir, filename), {
      manifest: manifest.upstream,
      total: cases.length,
      chunk: chunkIndex,
      chunkSize: caseChunkSize,
      cases: chunkCases,
    })
    chunks.push({
      file: filename,
      count: chunkCases.length,
    })
  }
  return chunks
}

function buildCaseIndex(cases) {
  return cases.map((item, index) => {
    const chunk = Math.floor(index / caseChunkSize) + 1
    const tags = [...new Set([...(item.styles || []), ...(item.scenes || [])])]
    const searchText = [
      item.upstreamId,
      item.title,
      item.promptPreview,
      item.category,
      ...(item.styles || []),
      ...(item.scenes || []),
      item.sourceLabel,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return {
      id: item.id,
      upstreamId: item.upstreamId,
      chunk,
      title: item.title,
      image: item.image,
      imageAlt: item.imageAlt,
      category: item.category,
      styles: item.styles,
      scenes: item.scenes,
      tags,
      featured: item.featured,
      promptPreview: item.promptPreview,
      searchText,
    }
  })
}

function writeJson(file, value) {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}
