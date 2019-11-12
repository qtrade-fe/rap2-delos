import { IConfigOptions } from "../types"

// 先从环境变量取配置
let config: IConfigOptions = {
  version: "2.7.2",
  serve: {
    port:
      (process.env.EXPOSE_PORT && parseInt(process.env.EXPOSE_PORT)) || 2280,
    path: ""
  },
  keys: ["some secret hurr"],
  session: {
    key: "rap2:sess"
  },
  db: {
    dialect: "mysql",
    host: process.env.MYSQL_URL || "localhost",
    port: (process.env.MYSQL_PORT && parseInt(process.env.MYSQL_PORT)) || 3306,
    username: process.env.MYSQL_USERNAME || "RAP2_DELOS_APP",
    password: process.env.MYSQL_PASSWD || "YqyZyx0501",
    database: process.env.MYSQL_SCHEMA || "RAP2_DELOS_APP",
    pool: {
      max: 80,
      min: 0,
      idle: 20000,
      acquire: 20000
    },
    logging: false
  },
  redis: {
    db: (process.env.REDIS_DB && parseInt(process.env.REDIS_DB)) || 1,
    password: process.env.MYSQL_PASSWD || undefined,
    host: process.env.REDIS_URL || "localhost",
    port: (process.env.REDIS_PORT && parseInt(process.env.REDIS_PORT)) || 6379
  },
  mail: {
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false,
    auth: {
      user: "rap2_notify@outlook.com",
      pass: ""
    }
  },
  mailSender: "rap2_notify@outlook.com",
  work_wx: {
    corpId: process.env.WORK_WEIXIN_CORPID || '',
    agentId: process.env.WORK_WEIXIN_AGENTID || '',
    agentSecret:  process.env.WORK_WEIXIN_AGENT_SECRET || ''
  }
}

export default config
