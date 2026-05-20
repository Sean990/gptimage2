#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { emitKeypressEvents } from 'node:readline'

const require = createRequire(import.meta.url)
const { Client } = require('ssh2')

const scriptDir = dirname(fileURLToPath(import.meta.url))
const frontendDir = resolve(scriptDir, '..')

const defaults = {
  host: '165.154.20.195',
  user: 'root',
  port: 22,
  remoteRoot: '/opt/imgsgen',
  webRoot: '/var/www/imgsgen',
  frontendDomain: 'ai.imgsgen.cn',
  adminDomain: 'admin.imgsgen.cn',
  apiDomain: 'api.imgsgen.cn',
}

const args = parseArgs(process.argv.slice(2))
const adminDir = resolve(args.adminDir || process.env.ADMIN_DIR || join(frontendDir, '..', 'gptimage2-admin'))
const apiDir = resolve(args.apiDir || process.env.API_DIR || join(frontendDir, '..', 'gptimage2-api'))
const host = args.host || process.env.SSH_HOST || process.env.DEPLOY_SSH_HOST || defaults.host
const user = args.user || process.env.SSH_USER || process.env.DEPLOY_SSH_USER || defaults.user
const port = Number(args.port || process.env.SSH_PORT || process.env.DEPLOY_SSH_PORT || defaults.port)
let password = process.env.SSH_PASSWORD || process.env.DEPLOY_SSH_PASSWORD
const remoteRoot = args.remoteRoot || process.env.REMOTE_ROOT || defaults.remoteRoot
const webRoot = args.webRoot || process.env.WEB_ROOT || defaults.webRoot
const frontendDomain = args.frontendDomain || process.env.FRONTEND_DOMAIN || defaults.frontendDomain
const adminDomain = args.adminDomain || process.env.ADMIN_DOMAIN || defaults.adminDomain
const apiDomain = args.apiDomain || process.env.API_DOMAIN || defaults.apiDomain
const skipBuild = Boolean(args.skipBuild)
const skipPublicCheck = Boolean(args.skipPublicCheck)

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(`部署失败：${error.message}`)
    process.exit(1)
  })

async function main() {
  if (args.help) {
    printHelp()
    return
  }

  assertFile(join(frontendDir, 'package.json'), '前台仓库')
  assertFile(join(adminDir, 'package.json'), '后台仓库')
  assertFile(join(apiDir, 'package.json'), 'API 仓库')
  if (!password && process.stdin.isTTY) {
    password = await readSecret('请输入 SSH 密码（不会回显）：')
  }
  if (!password) {
    throw new Error('缺少 SSH_PASSWORD 或 DEPLOY_SSH_PASSWORD 环境变量，也无法从当前终端读取密码')
  }

  const release = args.release || makeReleaseName()
  const packageDir = join(tmpdir(), `imgsgen-release-${release}`)
  rmSync(packageDir, { recursive: true, force: true })
  mkdirSync(packageDir, { recursive: true })

  log(`目标服务器：${user}@${host}:${port}`)
  log(`前台目录：${frontendDir}`)
  log(`后台目录：${adminDir}`)
  log(`API 目录：${apiDir}`)
  log(`release：${release}`)

  if (!skipBuild) {
    buildProjects()
  } else {
    log('已跳过本地构建，仅使用现有产物打包。')
  }

  const packages = createPackages(packageDir)
  const conn = await connectSsh({ host, user, port, password })
  try {
    const remotePackageDir = `/tmp/imgsgen-deploy/${release}`
    await runRemote(conn, `mkdir -p ${shellQuote(remotePackageDir)}`)
    await uploadPackages(conn, packages, remotePackageDir)
    await runRemote(
      conn,
      renderRemoteDeployScript({
        release,
        remotePackageDir,
        remoteRoot,
        webRoot,
        frontendDomain,
        adminDomain,
        apiDomain,
      }),
      { stream: true },
    )
  } finally {
    conn.end()
  }

  if (!skipPublicCheck) {
    await verifyPublicEndpoints({ frontendDomain, adminDomain, apiDomain })
  }

  log('部署完成。')
}

function buildProjects() {
  runLocal('corepack', ['pnpm@10.11.1', 'build'], frontendDir)
  runLocal('pnpm', ['build'], adminDir)
  runLocal('pnpm', ['lint'], apiDir)
}

function createPackages(packageDir) {
  const frontendDist = join(frontendDir, 'dist')
  const adminDist = join(adminDir, 'apps', 'core', 'dist')
  assertDir(frontendDist, '前台 dist')
  assertDir(adminDist, '后台 dist')

  const packages = [
    { name: 'frontend-dist.tar', path: join(packageDir, 'frontend-dist.tar') },
    { name: 'admin-dist.tar', path: join(packageDir, 'admin-dist.tar') },
    { name: 'api.tar', path: join(packageDir, 'api.tar') },
    { name: 'frontend-source.tar', path: join(packageDir, 'frontend-source.tar') },
  ]

  runLocal('tar', ['-cf', packages[0].path, '-C', frontendDist, '.'], frontendDir)
  runLocal('tar', ['-cf', packages[1].path, '-C', adminDist, '.'], adminDir)
  runLocal(
    'tar',
    [
      '--exclude=.git',
      '--exclude=node_modules',
      '--exclude=.env',
      '--exclude=uploads',
      '--exclude=*.log',
      '-cf',
      packages[2].path,
      '-C',
      apiDir,
      '.',
    ],
    apiDir,
  )

  const frontendSourceEntries = existingEntries(frontendDir, [
    'src',
    'content',
    'public',
    'scripts',
    'index.html',
    'package.json',
    'pnpm-lock.yaml',
    'vite.config.js',
  ])
  runLocal(
    'tar',
    [
      '--exclude=.git',
      '--exclude=node_modules',
      '--exclude=dist',
      '--exclude=.vite-ssg-temp',
      '-cf',
      packages[3].path,
      '-C',
      frontendDir,
      ...frontendSourceEntries,
    ],
    frontendDir,
  )

  for (const item of packages) {
    const size = statSync(item.path).size
    if (size <= 0) throw new Error(`部署包为空：${item.path}`)
    log(`已生成 ${item.name} (${formatBytes(size)})`)
  }

  return packages
}

async function uploadPackages(conn, packages, remotePackageDir) {
  const sftp = await new Promise((resolveSftp, rejectSftp) => {
    conn.sftp((error, sftpClient) => {
      if (error) rejectSftp(error)
      else resolveSftp(sftpClient)
    })
  })

  try {
    for (const item of packages) {
      const remotePath = `${remotePackageDir}/${item.name}`
      log(`上传 ${item.name}`)
      await uploadFile(sftp, item.path, remotePath)
      const localSha = sha256File(item.path)
      const remoteSha = (await runRemote(conn, `sha256sum ${shellQuote(remotePath)} | awk '{print $1}'`)).trim()
      if (remoteSha !== localSha) {
        throw new Error(`${item.name} 校验失败，本地 ${localSha}，远端 ${remoteSha}`)
      }
      log(`${item.name} 上传并校验完成`)
    }
  } finally {
    sftp.end()
  }
}

function uploadFile(sftp, localPath, remotePath) {
  return new Promise((resolveUpload, rejectUpload) => {
    const readStream = createReadStream(localPath)
    const writeStream = sftp.createWriteStream(remotePath, { mode: 0o600 })
    readStream.on('error', rejectUpload)
    writeStream.on('error', rejectUpload)
    writeStream.on('close', resolveUpload)
    readStream.pipe(writeStream)
  })
}

function renderRemoteDeployScript(config) {
  const { release, remotePackageDir, remoteRoot, webRoot, frontendDomain, adminDomain, apiDomain } = config

  return `set -euo pipefail
release=${shellQuote(release)}
package_dir=${shellQuote(remotePackageDir)}
remote_root=${shellQuote(remoteRoot)}
web_root=${shellQuote(webRoot)}
frontend_domain=${shellQuote(frontendDomain)}
admin_domain=${shellQuote(adminDomain)}
api_domain=${shellQuote(apiDomain)}
release_root="$remote_root/releases/$release"
previous_api="$(readlink -f "$remote_root/api" 2>/dev/null || true)"
previous_frontend="$(readlink -f "$web_root/frontend" 2>/dev/null || true)"
previous_admin="$(readlink -f "$web_root/admin" 2>/dev/null || true)"

rollback() {
  code=$?
  trap - ERR
  echo "deploy_failed_status=$code"
  if [ -n "$previous_api" ] && [ -d "$previous_api" ]; then ln -sfn "$previous_api" "$remote_root/api"; fi
  if [ -n "$previous_frontend" ] && [ -d "$previous_frontend" ]; then ln -sfn "$previous_frontend" "$web_root/frontend"; fi
  if [ -n "$previous_admin" ] && [ -d "$previous_admin" ]; then ln -sfn "$previous_admin" "$web_root/admin"; fi
  systemctl start imgsgen-api >/dev/null 2>&1 || true
  nginx -t >/dev/null 2>&1 && systemctl reload nginx >/dev/null 2>&1 || true
  exit "$code"
}
trap rollback ERR

echo "release=$release"
mkdir -p "$release_root/api" "$release_root/frontend" "$release_root/admin" "$release_root/frontend-source" "$remote_root/backups" "$web_root"
test -f "$remote_root/api/.env"
for file in api.tar frontend-dist.tar admin-dist.tar frontend-source.tar; do
  test -s "$package_dir/$file"
done

tar -xf "$package_dir/api.tar" -C "$release_root/api"
tar -xf "$package_dir/frontend-dist.tar" -C "$release_root/frontend"
tar -xf "$package_dir/admin-dist.tar" -C "$release_root/admin"
tar -xf "$package_dir/frontend-source.tar" -C "$release_root/frontend-source"
cp -p "$remote_root/api/.env" "$release_root/api/.env"
find "$release_root" -type d -exec chmod 755 {} +
find "$release_root" -type f -exec chmod 644 {} +
chmod 600 "$release_root/api/.env"

cd "$release_root/api"
pnpm install --prod --frozen-lockfile
pnpm readiness
pnpm db:check

backup="$remote_root/backups/gptimage2-before-$release.sql"
if command -v mysqldump >/dev/null 2>&1; then
  mysqldump --single-transaction --routines --triggers gptimage2 > "$backup"
else
  mariadb-dump --single-transaction --routines --triggers gptimage2 > "$backup"
fi
chmod 600 "$backup"
echo "db_backup=$backup"

systemctl stop imgsgen-api || true
pnpm db:migrate
ln -sfn "$release_root/api" "$remote_root/api"
ln -sfn "$release_root/frontend-source" "$remote_root/frontend-source"
ln -sfn "$release_root/frontend" "$web_root/frontend"
ln -sfn "$release_root/admin" "$web_root/admin"
systemctl start imgsgen-api
sleep 3
systemctl is-active imgsgen-api
curl -fsS "http://127.0.0.1:3001/api/health?deep=1"
nginx -t
systemctl reload nginx
curl -k -fsSI --resolve "$frontend_domain:443:127.0.0.1" "https://$frontend_domain/" | sed -n '1,8p'
curl -k -fsSI --resolve "$admin_domain:443:127.0.0.1" "https://$admin_domain/" | sed -n '1,8p'
curl -k -fsS --resolve "$api_domain:443:127.0.0.1" "https://$api_domain/api/health"

trap - ERR
echo "active_api=$(readlink -f "$remote_root/api")"
echo "active_frontend=$(readlink -f "$web_root/frontend")"
echo "active_admin=$(readlink -f "$web_root/admin")"
`
}

async function verifyPublicEndpoints({ frontendDomain, adminDomain, apiDomain }) {
  const checks = [
    { url: `https://${frontendDomain}/`, method: 'HEAD', expected: 200 },
    { url: `https://${frontendDomain}/generate`, method: 'HEAD', expected: 200 },
    { url: `https://${adminDomain}/`, method: 'HEAD', expected: 200 },
    { url: `http://${frontendDomain}/`, method: 'HEAD', expected: 301 },
    { url: `http://${adminDomain}/`, method: 'HEAD', expected: 301 },
    { url: `http://${apiDomain}/api/health`, method: 'HEAD', expected: 301 },
  ]

  for (const check of checks) {
    const response = await fetch(check.url, { method: check.method, redirect: 'manual' })
    if (response.status !== check.expected) {
      throw new Error(`${check.url} 期望 ${check.expected}，实际 ${response.status}`)
    }
    log(`公网验证 ${check.url} -> ${response.status}`)
  }

  const health = await fetch(`https://${apiDomain}/api/health?deep=1`, { redirect: 'manual' })
  const payload = await health.json()
  if (health.status !== 200 || payload?.data?.status !== 'up') {
    throw new Error(`API 深度健康检查失败：HTTP ${health.status}`)
  }
  log(`公网验证 https://${apiDomain}/api/health?deep=1 -> up`)
}

function connectSsh({ host, user, port, password }) {
  return new Promise((resolveConn, rejectConn) => {
    const conn = new Client()
    conn
      .on('ready', () => resolveConn(conn))
      .on('error', rejectConn)
      .connect({
        host,
        port,
        username: user,
        password,
        readyTimeout: 20000,
      })
  })
}

function runRemote(conn, command, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    conn.exec(command, (error, stream) => {
      if (error) {
        rejectRun(error)
        return
      }
      let stdout = ''
      let stderr = ''
      stream.on('data', (data) => {
        const text = data.toString()
        stdout += text
        if (options.stream) process.stdout.write(text)
      })
      stream.stderr.on('data', (data) => {
        const text = data.toString()
        stderr += text
        if (options.stream) process.stderr.write(text)
      })
      stream.on('close', (code) => {
        if (code) {
          rejectRun(new Error(stderr || stdout || `远程命令失败，退出码 ${code}`))
        } else {
          resolveRun(stdout.trim())
        }
      })
    })
  })
}

function runLocal(command, args, cwd) {
  log(`运行：${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    throw new Error(`本地命令失败：${command} ${args.join(' ')}`)
  }
}

function makeReleaseName() {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
  const frontendHash = gitShortHash(frontendDir)
  const adminHash = gitShortHash(adminDir)
  const apiHash = gitShortHash(apiDir)
  const dirty = [frontendDir, adminDir, apiDir].some((dir) => gitStatus(dir))
  return `${timestamp}-${frontendHash}-${adminHash}-${apiHash}${dirty ? '-dirty' : ''}`
}

function gitShortHash(cwd) {
  const result = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) return 'nogit'
  return result.stdout.trim()
}

function gitStatus(cwd) {
  const result = spawnSync('git', ['status', '--short'], {
    cwd,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
  return result.status === 0 ? result.stdout.trim() : ''
}

function parseArgs(argv) {
  const parsed = {}
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') parsed.help = true
    else if (arg === '--skip-build') parsed.skipBuild = true
    else if (arg === '--skip-public-check') parsed.skipPublicCheck = true
    else if (arg.startsWith('--')) {
      const [key, ...rest] = arg.slice(2).split('=')
      parsed[toCamelCase(key)] = rest.length ? rest.join('=') : true
    }
  }
  return parsed
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase())
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`
}

function sha256File(file) {
  if (!statSync(file).isFile()) throw new Error(`不是文件：${file}`)
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function existingEntries(root, entries) {
  return entries.filter((entry) => existsSync(join(root, entry)))
}

function assertFile(path, label) {
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`${label}不存在：${path}`)
  }
}

function assertDir(path, label) {
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    throw new Error(`${label}不存在：${path}`)
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function log(message) {
  console.log(`[deploy] ${message}`)
}

function readSecret(prompt) {
  return new Promise((resolveSecret) => {
    const stdin = process.stdin
    const stdout = process.stdout
    let value = ''
    let done = false

    emitKeypressEvents(stdin)
    const wasRaw = stdin.isRaw
    if (stdin.setRawMode) stdin.setRawMode(true)
    stdin.resume()
    stdout.write(prompt)

    function finish() {
      if (done) return
      done = true
      stdout.write('\n')
      stdin.off('keypress', onKeypress)
      if (stdin.setRawMode) stdin.setRawMode(Boolean(wasRaw))
      stdin.pause()
      resolveSecret(value)
    }

    function onKeypress(str, key = {}) {
      if (key.ctrl && key.name === 'c') {
        stdout.write('\n')
        process.exit(130)
      }
      if (key.name === 'return' || key.name === 'enter') {
        finish()
        return
      }
      if (key.name === 'backspace') {
        value = value.slice(0, -1)
        return
      }
      if (str && !key.ctrl && !key.meta) {
        value += str
      }
    }

    stdin.on('keypress', onKeypress)
  })
}

function printHelp() {
  console.log(`ImgsGen 生产部署脚本

用法：
  SSH_PASSWORD=*** pnpm deploy:production
  pnpm deploy:production  # 未设置环境变量时会提示输入密码

常用环境变量：
  SSH_HOST              默认 ${defaults.host}
  SSH_USER              默认 ${defaults.user}
  SSH_PASSWORD          可选；未设置时会交互输入，不要写进仓库
  ADMIN_DIR             默认 ../gptimage2-admin
  API_DIR               默认 ../gptimage2-api
  FRONTEND_DOMAIN       默认 ${defaults.frontendDomain}
  ADMIN_DOMAIN          默认 ${defaults.adminDomain}
  API_DOMAIN            默认 ${defaults.apiDomain}

常用参数：
  --skip-build          跳过本地构建，使用已有 dist
  --skip-public-check   跳过公网域名验收
  --release=NAME        指定 release 名称
  --host=IP             覆盖 SSH_HOST
  --user=USER           覆盖 SSH_USER
`)
}
