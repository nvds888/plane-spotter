"use client"

import { WalletProvider, WalletManager, WalletId, NetworkId } from '@txnlab/use-wallet-react'
import { ReactNode } from 'react'

const walletManager = new WalletManager({
  wallets: [
    WalletId.PERA
  ],
  defaultNetwork: NetworkId.TESTNET
})

export function WalletProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <WalletProvider manager={walletManager}>
      {children}
    </WalletProvider>
  )
}