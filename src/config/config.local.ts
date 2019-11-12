import { IConfigOptions } from "../types"

let config: IConfigOptions = {
  version: '2.7.2',
  serve: {
    port: 8080,
    path: '',
  },
  keys: ['some secret hurr'],
  session: {
    key: 'rap2:sess',
  },
  db: {
    dialect: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: '',
    database: 'RAP2_DELOS_APP_LOCAL',
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
    },
    logging: false
  },
  redis: {},
  mail: {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    auth: {
      user: '',
      pass: ''
    }
  },
  mailSender: '',
  work_wx: {
    corpId: 'wwded713f7f22ac9f7',
    agentId: '',
    agentSecret: 'O96D3UinLFeo3peIowkC-cXZtETPqXifLiTYFiyg654'
  },
}

export default config