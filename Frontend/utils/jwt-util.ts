import * as https from 'https'
import jwt from 'jsonwebtoken'
// eslint-disable-next-line camelcase
import jwk_to_pem from 'jwk-to-pem'
import axios from 'axios'

export default class JwtUtil {
  /**
     * Verifies and decodes a JWT using a set of public keys.
     * If verification fails, returns null. Otherwise, return
     * the decoded JWT as an object.
     * @param jwtBase64 JWT signed by the owner of the public key set.
     * @param keysetUrl Path for JWK public key set provided by JWT signer.
     */
  public static async getAndVerifyWithKeyset (jwtBase64 : string, keysetUrl: string) {
    const kid = JwtUtil.getMessageKid(jwtBase64)

    if (kid === null) {
      throw new Error(`Getting launch message failed. Reason: kid is null`)
    }

    const pem : string = await JwtUtil.getPublicPemFromJwkKeyset(kid as string, keysetUrl)
    if (pem === null) {
      throw new Error('Getting public key pem failed')
    }

    return JwtUtil.verifyAndDecode(jwtBase64, pem)
  }

  public static async getPublicPemFromJwkKeyset (kid : string, keysetPath: string) : Promise<string> {
    const resp = await axios.get('keySetPath', {
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    })

    return new Promise<string>((resolve, reject) => {
      if (!resp.data) {
        console.warn(`Failed to get public key set from ${keysetPath}`)
        reject(new Error(`Failed to get public key set from ${keysetPath}`))
      }
      else {
        const keySet = resp.data.keys // Array of JWKs

        for (const curJWK of keySet) {
          if (curJWK.kid === kid) {
            // eslint-disable-next-line camelcase
            const jwk: jwk_to_pem.JWK = {
              kty: curJWK.kty,
              e: curJWK.e,
              n: curJWK.n
            }
            const pem = jwk_to_pem(jwk)
            resolve(pem)
          }
        }
        console.warn(`Failed to get public key set from ${keysetPath} ' because no matching kid for ${kid}`)
        reject(new Error(`Failed to get public key set from ${keysetPath} ' because no matching kid for ${kid}`))
      }
    })
  }

  public static getMessageKid (jwtBase64 : string) : string | null {
    const msg = jwt.decode(jwtBase64, { complete: true })   // 'complete' option to include JWT header.
    console.log('kid is ' + (msg as any).kid)
    if (!msg || !(msg as {[key: string]: any}).kid) {
      console.warn('Could not get message kid from message jwt. jwt: ' + jwtBase64)
      return null
    }
    return (msg as {[key: string]: any}).kid
  }

  public static verifyAndDecode (jwtBase64 : string, pemKey : string) : Object | null {
    try {
      return jwt.verify(jwtBase64, pemKey) as object
    }
    catch (ex) {
      console.warn('JWT verification failed. Reason: ' + ex)
      return null
    }
  }

  public static async encodeJWT (jwtData : Object, nonce: string) {
    const jwtResponse = await axios.post(
         `https://${process.env.backend}:3000/api/jwt/lti_jwt/${nonce}`,
         jwtData, {
           httpsAgent: new https.Agent({
             rejectUnauthorized: false
           })
         })

    if (!jwtResponse.data) {
      return null
    }

    return jwtResponse.data.jwt
  }

  public static createJwtFormUrlEncoded (jwtDataBase64 : string) : string {
    return `JWT=${encodeURIComponent(jwtDataBase64)}`
  }
}
