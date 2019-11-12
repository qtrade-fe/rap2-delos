import * as _ from "lodash"
import { ParameterizedContext } from "koa"
import TokenService from "../service/token"
const inTestMode = process.env.TEST_MODE === "true"

export async function isLoggedIn(
  ctx: ParameterizedContext<any, any>,
  next: () => Promise<any>
) {
  const { tokenAccess } = ctx.state
  if (!inTestMode && (!ctx.session || !ctx.session.id) && !tokenAccess) {
    ctx.body = {
      isOk: false,
      errMsg: "need login"
    }
  } else {
    await next()
  }
}
export async function isTokenAccess(
  ctx: ParameterizedContext<any, any>,
  next: () => Promise<any>
) {
  const { authorization } = ctx.header

  if (authorization) {
    const token = authorization.replace("Bearer ", '')
    if (!await TokenService.verify(token)) {
      ctx.body = {
        isOk: false,
        errMsg: "access_token 非法"
      }
    } else {
      ctx.state.tokenAccess = true
      await next()
    }
  } else {
    await next()
  }
}
