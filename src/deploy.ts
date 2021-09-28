import Web3 from 'web3';
import HDWalletProvider from '@truffle/hdwallet-provider';
import { inquireAbiInputList, inquireAddress } from '@leovigna/web3-prompt';
import inquirer from 'inquirer';
import { ERC677FixedSupply, Oracle, OracleTestConsumer } from './truffle';
import { OracleTestConsumer as OracleTestConsumerWeb3 } from './web3';
import { ZERO_ADDRESS } from '@leovigna/web3-prompt/utils';
import {
    ACCOUNT_ADDRESS,
    CONTRACT_LINK,
    CONTRACT_ORACLE,
    CONTRACT_ORACLE_TEST_CONSUMER,
    HD_WALLET_MNEMONIC,
    NODE_ADDRESS,
    NODE_JOB_ID,
    PRIVATE_KEYS,
    RPC_URL,
} from './environment';

let provider: any;
if (HD_WALLET_MNEMONIC) {
    provider = new HDWalletProvider({
        mnemonic: HD_WALLET_MNEMONIC,
        providerOrUrl: RPC_URL,
        addressIndex: 0,
    });
} else if (PRIVATE_KEYS) {
    provider = new HDWalletProvider({
        privateKeys: PRIVATE_KEYS.split(','),
        providerOrUrl: RPC_URL,
    });
} else {
    provider = new Web3.providers.HttpProvider(RPC_URL);
}

//HDWalletProvider not support websocket
const web3WS = new Web3(RPC_URL);
const web3 = new Web3(provider);
web3.eth.defaultAccount = ACCOUNT_ADDRESS;

//Set Web3 provider
export const contracts = {
    ERC677FixedSupply,
    Oracle,
    OracleTestConsumer,
};

export function setProvider() {
    for (const k in contracts) {
        //@ts-ignore
        contracts[k].setProvider(provider);
        //@ts-ignore
        contracts[k].web3.eth.defaultAccount = ACCOUNT_ADDRESS;
    }
}

async function deployERC677() {
    //@ts-ignore
    const abi = ERC677FixedSupply._json.abi;
    const { inputs: contructorFn } = abi.find((x: any) => x.type === 'constructor');
    contructorFn[0].default = 'Chainlink Token';
    contructorFn[1].default = 'LINK';
    contructorFn[2].default = '1000000000000000000';
    contructorFn[3].default = ACCOUNT_ADDRESS;
    const { flatArgs } = await inquireAbiInputList(contructorFn);

    //@ts-ignore
    const token = await ERC677FixedSupply.new(...flatArgs);
    return token;
}

async function main() {
    setProvider();

    const { action } = await inquirer.prompt({
        name: 'action',
        message: 'What would you like to do?',
        type: 'list',
        choices: [
            { name: 'Deploy LINK token', value: 'deployLINK' },
            { name: 'Deploy Oracle contract (directrequest)', value: 'deployOracle' },
            { name: 'Deploy Oracle Test Consumer contract (directrequest)', value: 'deployOracleTestConsumer' },
            { name: 'Fund ETH Chainlink node', value: 'fundNode' },
            { name: 'Oracle.setFulfillmentPermission (directrequest)', value: 'setFulfillmentPermission' },
            { name: 'Fund LINK Oracle Test Consumer contract (directrequest)', value: 'fundOracleTestConsumer' },
            { name: 'OracleTestconsumer.requestGetUInt256() (directrequest)', value: 'requestGetUInt256' },
        ],
    });

    if (action === 'deployLINK') {
        const token = await deployERC677();
        console.log();
        console.log('LINK ERC677.sol deployed at');
        console.log(token.address);
    } else if (action === 'deployOracle') {
        const { tokenAddress } = await inquireAddress({
            name: 'tokenAddress',
            message: 'LINK token address:',
            default: CONTRACT_LINK ?? ZERO_ADDRESS,
        });
        const oracle = await Oracle.new(tokenAddress);
        console.log();
        console.log('Oracle.sol deployed at');
        console.log(oracle.address);
    } else if (action === 'deployOracleTestConsumer') {
        const { tokenAddress } = await inquireAddress({
            name: 'tokenAddress',
            message: 'LINK token address:',
            default: CONTRACT_LINK ?? ZERO_ADDRESS,
        });
        const oracleTestConsumer = await OracleTestConsumer.new(tokenAddress);
        console.log();
        console.log('OracleTestConsumer.sol deployed at');
        console.log(oracleTestConsumer.address);
    } else if (action === 'setFulfillmentPermission') {
        const { oracleAddress } = await inquireAddress({
            name: 'oracleAddress',
            message: 'Oracle contract address:',
            default: CONTRACT_ORACLE ?? ZERO_ADDRESS,
        });

        //Set fulfillment permissions oracle
        //@ts-ignore
        const { inputs: setFulfillmentPermisionsFn } = Oracle._json.abi.find(
            (x: any) => x.name === 'setFulfillmentPermission',
        );
        setFulfillmentPermisionsFn[0].default = NODE_ADDRESS ?? ZERO_ADDRESS;

        const { flatArgs } = await inquireAbiInputList(setFulfillmentPermisionsFn);
        const oracle = await Oracle.at(oracleAddress);

        //@ts-ignore
        const tx = await oracle.setFulfillmentPermission(...flatArgs);

        console.log();
        console.log(`Fulfillment permission set. ${tx.tx}`);
        //Fund Test Consumer
    } else if (action === 'requestGetUInt256') {
        const { oracleTestConsumerAddress } = await inquireAddress({
            name: 'oracleTestConsumerAddress',
            message: 'OracleTestConsumer contract address:',
            default: CONTRACT_ORACLE_TEST_CONSUMER ?? ZERO_ADDRESS,
        });

        //Set fulfillment permissions oracle
        //@ts-ignore
        const { inputs: requestGetUInt256Fn } = OracleTestConsumer._json.abi.find(
            (x: any) => x.name === 'requestGetUInt256',
        );
        requestGetUInt256Fn[0].default = CONTRACT_ORACLE ?? ZERO_ADDRESS;
        requestGetUInt256Fn[1].default = NODE_JOB_ID ?? '00000000-0000-0000-0000-000000000000';
        requestGetUInt256Fn[3].default = 'https://www.bitstamp.net/api/ticker/';
        requestGetUInt256Fn[4].default = 'last';
        requestGetUInt256Fn[5].default = '100';

        const { flatArgs } = await inquireAbiInputList(requestGetUInt256Fn);
        flatArgs[1] = flatArgs[1].replace(/-/g, '');
        console.debug(flatArgs[1]);
        const oracleTestConsumer = await OracleTestConsumer.at(oracleTestConsumerAddress);

        //Event listener
        const oracleTestConsumerWeb3 = OracleTestConsumerWeb3(web3WS, oracleTestConsumerAddress);
        const waitRequest = new Promise((resolve) => {
            oracleTestConsumerWeb3.events.RequestUInt256((error, event) => {
                resolve({ event: event.event, blockNumber: event.blockNumber, returnValues: event.returnValues });
            });
        });
        const waitFullfill = new Promise((resolve) => {
            oracleTestConsumerWeb3.events.FullfillUInt256((error, event) => {
                resolve({ event: event.event, blockNumber: event.blockNumber, returnValues: event.returnValues });
            });
        });

        //@ts-ignore
        const tx = await oracleTestConsumer.requestGetUInt256(...flatArgs);
        console.log();
        console.log(`Request sent. ${tx.tx}`);
        console.log('Awaiting events...\n');

        console.log(await waitRequest);
        console.log(await waitFullfill);
    } else if (action === 'fundNode') {
        const { nodeAddress } = await inquireAddress({
            name: 'nodeAddress',
            message: 'Node token address (http://localhost:6688/keys):',
            default: NODE_ADDRESS ?? ZERO_ADDRESS,
        });
        const accounts = await web3.eth.getAccounts();
        const tx = await web3.eth.sendTransaction({
            from: accounts[0],
            to: nodeAddress,
            value: Web3.utils.toWei(Web3.utils.toBN(1), 'ether'),
        });

        console.log();
        console.log(`Sent 1 ETH to ${nodeAddress}. ${tx.transactionHash}`);
    } else if (action === 'fundOracleTestConsumer') {
        const { tokenAddress } = await inquireAddress({
            name: 'tokenAddress',
            message: 'LINK token address:',
            default: CONTRACT_LINK ?? ZERO_ADDRESS,
        });
        const { oracleTestConsumerAddress } = await inquireAddress({
            name: 'oracleTestConsumerAddress',
            message: 'OracleTestConsumer contract address:',
            default: CONTRACT_ORACLE_TEST_CONSUMER ?? ZERO_ADDRESS,
        });

        const token = await ERC677FixedSupply.at(tokenAddress);

        const tx = await token.transfer(oracleTestConsumerAddress, Web3.utils.toBN(1));

        console.log();
        console.log(`Sent 1 LINK to ${oracleTestConsumerAddress}. ${tx.tx}`);
    }
}

if (typeof require !== 'undefined' && require.main === module) {
    main().then(() => process.exit());
}
