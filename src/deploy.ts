import Web3 from 'web3';
import path from 'path';
import dotenv from 'dotenv';
import HDWalletProvider from '@truffle/hdwallet-provider';
import { inquireAbiInputList, inquireAddress } from '@leovigna/web3-prompt';
import inquirer from 'inquirer';
import { ERC677FixedSupply, Oracle, OracleTestConsumer } from './truffle';

//Pass custom env file arg
const args = process.argv;
const envfileName = args.length > 2 ? args[2] : '.env.local';
const envfile = path.resolve(process.cwd(), envfileName);

dotenv.config({ path: envfile });

const rpc = process.env.RPC_URL as string;
const account = process.env.ACCOUNT_ADDRESS as string;
const mnemonic = process.env.HD_WALLET_MNEMONIC;
let provider: any;
if (mnemonic) {
    provider = new HDWalletProvider({
        mnemonic,
        providerOrUrl: rpc,
        addressIndex: 0,
    });
} else {
    provider = new Web3.providers.HttpProvider(rpc);
}

const web3 = new Web3(provider);
web3.eth.defaultAccount = account;

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
        contracts[k].web3.eth.defaultAccount = account;
    }
}

async function deployERC677() {
    //@ts-ignore
    const abi = ERC677FixedSupply._json.abi;
    const { inputs: contructorFn } = abi.find((x: any) => x.type === 'constructor');
    contructorFn[0].default = 'Chainlink Token';
    contructorFn[1].default = 'LINK';
    contructorFn[2].default = '1000000000000000000';
    contructorFn[3].default = account;
    const { flatArgs } = await inquireAbiInputList(contructorFn);

    //@ts-ignore
    const token = await ERC677FixedSupply.new(...flatArgs);
    return token;
}

async function main() {
    setProvider();

    let token;
    let oracle;
    let oracleTestConsumer;

    const { deployToken } = await inquirer.prompt({
        name: 'deployToken',
        message: 'Deploy Chainlink token?',
        type: 'confirm',
        default: false,
    })

    let tokenAddress;
    if (deployToken) {
        //Deploy contracts
        token = await deployERC677();
        tokenAddress = token.address
    } else {
        const answers = await inquireAddress({ name: 'tokenAddress' });
        tokenAddress = answers.tokenAddress;
    }

    const { deployOracle } = await inquirer.prompt({
        name: 'deployOracle',
        message: 'Deploy Oracle contract?',
        type: 'confirm',
        default: false,
    })
    if (deployOracle) {
        oracle = await Oracle.new(tokenAddress);
    }

    const { deployOracleTestConsumer } = await inquirer.prompt({
        name: 'deployOracleTestConsumer',
        message: 'Deploy Oracle Test Consumer contract?',
        type: 'confirm',
        default: false,
    });
    if (deployOracleTestConsumer) {
        oracleTestConsumer = await OracleTestConsumer.new(tokenAddress);
    }

    console.debug({
        token: tokenAddress,
        oracle: oracle?.address,
        oracleTestConsumer: oracleTestConsumer?.address,
    });

    /*
    //TODO
    //Set fulfillment permissions oracle
    //@ts-ignore
    const { inputs: setFulfillmentPermisionsFn } = Oracle._json.abi.find(
        (x: any) => x.name === 'setFulfillmentPermission',
    );

    const { flatArgs } = await inquireAbiInputList(setFulfillmentPermisionsFn);
    console.debug(flatArgs)
    //Fund Test Consumer
    */
}

if (typeof require !== 'undefined' && require.main === module) {
    main();
}
