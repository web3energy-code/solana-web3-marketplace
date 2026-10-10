import React from ‘react’
import { createRoot } from ‘react-dom/client’
import {
ConnectionProvider,
WalletProvider,
} from ‘@solana/wallet-adapter-react’
import { WalletModalProvider } from ‘@solana/wallet-adapter-react-ui’
import { clusterApiUrl } from ‘@solana/web3.js’
import ‘@solana/wallet-adapter-react-ui/styles.css’
import App from ‘./App’

const network = ‘devnet’
const endpoint = clusterApiUrl(network)

createRoot(document.getElementById(‘root’)!).render(
<React.StrictMode>
</React.StrictMode>,
)
