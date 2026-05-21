/**
 * 统一的日志系统
 * 在生产环境可以轻松切换到远程日志服务
 */

const isDevelopment = import.meta.env.DEV

class Logger {
  constructor() {
    this.enabled = isDevelopment
  }

  log(message, ...args) {
    if (this.enabled) {
      console.log(`[ImgsGen]`, message, ...args)
    }
  }

  warn(message, ...args) {
    if (this.enabled) {
      console.warn(`[ImgsGen]`, message, ...args)
    }
    // 生产环境可以发送到远程日志服务
    // this.sendToRemote('warn', message, args)
  }

  error(message, ...args) {
    if (this.enabled) {
      console.error(`[ImgsGen]`, message, ...args)
    }
    // 生产环境可以发送到远程日志服务
    // this.sendToRemote('error', message, args)
  }

  // 预留：发送到远程日志服务
  // sendToRemote(level, message, args) {
  //   if (import.meta.env.PROD) {
  //     // 发送到 Sentry、LogRocket 等服务
  //   }
  // }
}

export const logger = new Logger()
