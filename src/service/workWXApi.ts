import RedisService, { CACHE_KEY } from "./redis"
import * as rp from "request-promise"
import config from "../config"

export default class WorkWXApi {
  public static async fetchToken() {
    console.log("fetch wx access token", new Date())
    const wx_token = await rp({
      uri: "https://qyapi.weixin.qq.com/cgi-bin/gettoken",
      qs: {
        corpid: config.work_wx.corpId,
        corpsecret: config.work_wx.agentSecret
      },
      json: true
    })
    wx_token.expires_time = Date.now() + wx_token.expires_in * 1e3
    RedisService.setCache(CACHE_KEY.WX_ACCESS_TOKEN, JSON.stringify(wx_token))
    return wx_token
  }
  public static async getToken() {
    const tokenCache = await RedisService.getCache(CACHE_KEY.WX_ACCESS_TOKEN)
    if (!tokenCache) {
      const token = await this.fetchToken()
      return token.access_token
    }
    const token = JSON.parse(tokenCache)
    if (token.expires_time - Date.now() < 60) {
      const token = await this.fetchToken()
      return token.access_token
    }
    return token.access_token
  }

  public static async getUserInfoByCode(code: string) {
    return this.fetchApi(
      "https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo",
      {
        code
      }
    )
  }
  /**
   * getUser
   */
  public static async getUser(userId: string) {
    return this.fetchApi("https://qyapi.weixin.qq.com/cgi-bin/user/get", {
      userid: userId
    })
  }
  public static async fetchApi(uri: string, data: any) {
    const accessToken = await this.getToken()
    const apiData = await rp({
      uri,
      qs: {
        ...data,
        access_token: accessToken
      },
      json: true
    })
    return apiData
  }
}
