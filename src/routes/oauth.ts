import router from "./router"
import { OAuth } from "../models/"
import TokenService from "../service/token"

router.get("/oauth/token", async ctx => {
  const { appid, secret } = ctx.query
  if (!appid || !secret) {
    ctx.body = {
      isOk: false,
      errMsg: "参数不完整"
    }
    return
  }
  const result = await OAuth.findOne({
    where: { appId: appid, secret }
  })
  if (!result) {
    ctx.body = {
      isOk: false,
      errMsg: "appId和secret不匹配"
    }
    return
  }
  const token = TokenService.generate(appid, secret)

  ctx.body = { token }
})
router.get("/oauth/verify", async ctx => {
  const { token } = ctx.query
  const isVerify = TokenService.verify(token)

  ctx.body = {
    isOk: isVerify,
    errMsg: isVerify ? "有效token" : "无效token"
  }
})
