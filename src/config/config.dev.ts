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
    host: '192.168.0.11',
    port: 3306,
    username: 'rap2_admin',
    password: '666666',
    database: 'db_rap2_delos_app',
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
    },
    logging: true,
  },
  redis: {
    host: '192.168.0.11',
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
    corpId: 'wwfe99d324096b2f7e',
    agentId: '1000002',
    agentSecret: 'JDCIdSequQT-5ZAHN9obGuyzYY-wO7BpMQPuDYKVN_U',
  },
}

export default config
