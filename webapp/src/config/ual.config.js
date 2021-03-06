import { TokenPocket } from 'ual-token-pocket'
import { Anchor } from 'ual-anchor'

export const endpoint = `${process.env.REACT_APP_UAL_API_PROTOCOL}://${
  process.env.REACT_APP_UAL_API_HOST
}${process.env.REACT_APP_UAL_API_PORT ? ':' : ''}${
  process.env.REACT_APP_UAL_API_PORT
}`
export const appName = process.env.REACT_APP_UAL_APP_NAME || 'app'
export const network = {
  chainId: process.env.REACT_APP_UAL_CHAIN_ID,
  rpcEndpoints: [
    {
      blockchain: 'eos',
      protocol: process.env.REACT_APP_UAL_API_PROTOCOL,
      host: process.env.REACT_APP_UAL_API_HOST,
      port: parseInt(process.env.REACT_APP_UAL_API_PORT)
    }
  ]
}
export const authenticators = [
  new TokenPocket([network]),
  new Anchor([network], { appName })
]
