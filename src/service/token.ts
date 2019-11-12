import { OAuth } from "../models/"
import * as jwt from "jsonwebtoken"

export interface JWTData {
  appId: string
  iat: number
  exp: number
}
export const TOKEN_PREFIX = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."

export default class TokenService {
  public static async verify(token: string) {
    const fullToken = TOKEN_PREFIX + token
    const decoded = jwt.decode(fullToken) as JWTData
    const { appId } = decoded

    try {
      const result = await OAuth.findOne({
        where: { appId }
      })
      if (result) {
        jwt.verify(fullToken, result.secret)
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }

  public static generate(appId: string, secret: string) {
    const token = jwt.sign({ appId }, secret, { expiresIn: "10m" })
    return token.replace(TOKEN_PREFIX, "")
  }
}
