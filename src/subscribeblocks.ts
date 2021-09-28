import Web3 from 'web3';
import Oracle from './web3/Oracle';
import { CONTRACT_ORACLE, RPC_URL } from './environment';

const web3 = new Web3(RPC_URL);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function subscribeBlocks() {
    web3.eth.subscribe('newBlockHeaders', (error, block) => {
        console.log(block);
    });
}

async function subscribeOracleRequest() {
    const oracle = Oracle(web3, CONTRACT_ORACLE);
    const waitRequest = new Promise((resolve) => {
        oracle.events.OracleRequest((error, event) => {
            resolve({ event: event.event, blockNumber: event.blockNumber, returnValues: event.returnValues });
        });
    });

    return waitRequest;
}
async function main() {
    console.debug(await subscribeOracleRequest());
}

if (typeof require !== 'undefined' && require.main === module) {
    main().then(() => process.exit());
}
