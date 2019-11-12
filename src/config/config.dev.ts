import { IConfigOptions } from "../types"

let config: IConfigOptions = {
  version: 'v2.7.2',
  serve: {
    port: 8081,
    path: '',
  },
  keys: ['some secret hurr'],
  session: {
    key: 'rap2:sess',
  },
  db: {
    dialect: 'mysql',
    host: 'dev.qtrade.com.cn',
    port: 3306,
    username: 'rap2_admin',
    password: 'Fu9ZmU6x#2KB',
    database: 'db_rap2_delos_app',
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
    },
    logging: true,
  },
  redis: {
    host: '192.168.1.11',
    db: 10,
    password: undefined
  },
  mail: {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    auth: {
      user: 'rap2_notify@outlook.com',
      pass: ''
    }
  },
  mailSender: 'rap2_notify@outlook.com',
  work_wx: {
    corpId: 'wwded713f7f22ac9f7',
    agentId: '',
    agentSecret: 'O96D3UinLFeo3peIowkC-cXZtETPqXifLiTYFiyg654'
  },

}

export default config
