import React from 'react'
import { Button } from 'react-bootstrap';
import BscDapp from '@obsidians/bsc-dapp'
import '../App.css'
import abi from './coin.json'

const message = 'Sign'



export default function DApp() {
    const dapp = React.useMemo(() => new BscDapp(), [])
    // const dapp = React.useMemo(() => new BscDapp({ extension: 'MetaMask' }), [])
    // const dapp = React.useMemo(() => new BscDapp({ extension: 'BinanceChainWallet' }), [])
    window.dapp = dapp

    const [enabled, setEnabled] = React.useState(dapp.isBrowserExtensionEnabled)
    const [account, setAccount] = React.useState(dapp.currentAddress)
    const [network, setNetwork] = React.useState()
    const [transferInfo, setTransferInfo] = React.useState({
        to: '',
        amount: '0.01',
        txHash: ''
    })
    const [contractInfo, setContractInfo] = React.useState({
        address: '',
        receiver: '',
        amount: '1000',
        txHash: ''
    })
    const [sig, setSig] = React.useState('')

    React.useEffect(() => dapp.onEnabled(account => {
        setEnabled(true)
        setAccount(account)
        updateNetwork(dapp.network)
    }), [])

    React.useEffect(() => dapp.onNetworkChanged(result => {
        updateNetwork(result)
    }), [])


    React.useEffect(() => dapp.onAccountChanged(account => {
        setAccount(account)
    }), [])

    const updateNetwork = (network = {}) => {
        if (network.isBscMainnet) {
            setNetwork('Mainnet')
        } else if (network.isBscTestnet) {
            setNetwork('Testnet')
        } else {
            setNetwork()
        }
    }

    const signMessage = async () => {
        let sig
        if (dapp.browserExtension.name === 'MetaMask') {
            // Ref EIP-712, sign data that has a structure
            sig = await dapp.signTypedData([{ type: 'string', name: 'Message', value: message }])
        } else {
            // Binance Chain Wallet doesn't support signTypedData yet
            sig = await dapp.signMessage(message)
        }
        setSig(sig)
    }

    const transfer = async (to, amount) => {
        const tx = {
            from: account.address,
            to,
            value: dapp.parseEther(amount),
        };
        const txHash = await dapp.sendTransaction(tx)
        setTransferInfo({ ...transferInfo, txHash })
    }

    const execute = async () => {
        const { address, receiver, amount } = contractInfo
        const txParams = await dapp.executeContract({ address, abi }, 'mint', [receiver, amount])
        const txHash = await dapp.sendTransaction({
            from: account.address,
            value: dapp.parseEther('0'),
            ...txParams,
        })
        setContractInfo({ ...contractInfo, txHash })
    }

    let browserExtensionStatus
    let enableButton = null
    if (dapp.isBrowserExtensionInstalled) {
        browserExtensionStatus = `${dapp.browserExtension.name} Detected. ${enabled ? 'Enabled.' : 'Not enabled'}`
        if (!enabled) {
            enableButton = (
                <Button variant="primary" onClick={() => dapp.enableBrowserExtension()}>
                    Enable {dapp.browserExtension.name}
                </Button>
            )
        }
    } else {
        browserExtensionStatus = 'No Browser Extension detected'
    }

    let accountInfo = null
    if (enabled && account) {
        accountInfo = (
            <div>
                Current account: <small><code>{account.address}</code></small>
                <Button variant="primary" onClick={() => getBalanceAndHistory()}>Get Balance and History</Button>
            </div>
        )
    }

    const getBalanceAndHistory = async () => {
        const balance = await dapp.rpc.getBalance(account.address)
        console.log('Balance:', balance.toString())

        const txs = await dapp.explorer.getHistory(account.address)
        console.log('TX History:', txs)
    }

    let networkInfo = null
    if (enabled) {
        if (network) {
            networkInfo = <p>Network: BSC {network}</p>
        } else {
            networkInfo = <p>Not connected to BSC Mainnet (<a target='_black' href='https://docs.binance.org/smart-chain/wallet/metamask.html'>Use BSC with Metamask</a>)</p>
        }
    }

    let signMessageButton = null
    if (enabled && network) {
        signMessageButton = <div style={{ margin: '20px 0' }}>
            <div>message: <small><code>{message}</code></small></div>
            <div>signature: <small><code>{sig}</code></small></div>
            {!sig && <Button variant="primary" type="Button" class="btn btn-primary" onClick={() => signMessage()}>Sign Message</Button>}
        </div>
    }

    let transferForm = null
    if (enabled && network) {
        transferForm = <div style={{ margin: '20px 0' }}>
            <div>
                Transfer
            </div>
            to:
            <input
                value={transferInfo.to}
                onChange={(e) => setTransferInfo({ ...transferInfo, to: e.target.value })}
                placeholder="Transfer to"
            />
            <br />
            amount:
            <input
                value={transferInfo.amount}
                onChange={(e) => setTransferInfo({ ...transferInfo, amount: e.target.value })}
                placeholder="Transfer amount"
            />
            <br />
            <Button variant="primary" onClick={() => transfer(transferInfo.to, transferInfo.amount)}>Transfer</Button>
            {
                !!transferInfo.txHash &&
                <div>{transferInfo.txHash}</div>
            }
        </div>
    }

    let contractForm = null
    if (enabled && network) {
        contractForm = <div style={{ margin: '20px 0' }}>
            <div>
                Contract
            </div>
            contract:
            <input
                value={contractInfo.address}
                onChange={(e) => setContractInfo({ ...contractInfo, address: e.target.value })}
                placeholder="Contract Address"
            />
            <br />
            method: mint
            <br />
            param1 (receiver):
            <input
                value={contractInfo.receiver}
                onChange={(e) => setContractInfo({ ...contractInfo, receiver: e.target.value })}
                placeholder="Receiver"
            />
            <br />
            param2 (amount):
            <input
                value={contractInfo.amount}
                onChange={(e) => setContractInfo({ ...contractInfo, amount: e.target.value })}
                placeholder="Amount"
            />
            <br />
            <Button variant="primary" onClick={() => execute()}>Execute</Button>
            {
                !!contractInfo.txHash &&
                <div>{contractInfo.txHash}</div>
            }
        </div>
    }

    return (
        <div className="App">
            <p>{browserExtensionStatus}</p>
            {enableButton}
            {accountInfo}
            {networkInfo}
            {signMessageButton}
            {transferForm}
            {contractForm}
        </div>
    );
}