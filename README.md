# Chainlink Migrate
This project is meant to help you quickly deploy Chainlink blockchain smart contracts and test a local deployment setup.

## Configuration
### Dependencies
We use [pnpm](https://pnpm.io/) as a symlynk based drop-in replacement package manager for NPM. PNPM will help you save significant storage space by avoiding instaling duplicate copies of your dependencies.
Install pnpm
```
npm i -g pnpm
```
Install dependencies
```
pnpm i
```
### Local Blockchain (optional)
If using a local test ganache blockchain. The script stores data under `data/ganache` so you can pickup where you left off. Start ganache-cli.
```
npm run ganache
```
### Local Blockchain Explorer (optional)
Run a simple lightweight opensource transaction explorer by Aleth.io.
```
npm run docker:explorer
```

### Configure env file
This project uses 2 configuration files:
* [`.env`](./.env) for the general typescript CLI
* [`data/chainlink/.env`](./data/chainlink/.env) for the Chainlink node configuration passed to Docker


<b>.env</b>
The [`.env`](./.env) file has the following variables.
```.env
RPC_URL=ws://localhost:8545 #required, websocket rpc connection
PRIVATE_KEYS=PRIVATE_KEY_1,PRIVATE_KEY_2 #required, comma separated private keys
ACCOUNT_ADDRESS= #required, eth address of account to use (only 1 address)
LINK_CONTRACT_ADDRESS= #optional, default address for link token
ORACLE_CONTRACT_ADDRESS= #optional, default address for oracle contract
ORACLE_TEST_CONSUMER_CONTRACT_ADDRESS= #optional, default address for test consumer contract
NODE_ADDRESS= #optional, default chainlink node account address
NODE_JOB_ID= #optional, default test job id
```

Some are required (eth connection related) while others are optional though we recommend you add them as you deploy your contracts as this can make keeping track of the different contract addresses simpler. For a local setup, only configure the required variables and then progressively deploy the contracts by following this guide.

<b>data/chainlink/.env</b>
The [`data/chainlink/.env`](data/chainlink/.env) file has the following **required** variables.
```
ETH_URL=ws://localhost:8545 #websocket rpc connection
ETH_CHAIN_ID=1 # chain id
LINK_CONTRACT_ADDRESS= #LINK token address
ORACLE_CONTRACT_ADDRESS= #Oracle.sol contract address (for directrequest oracles)
DATABASE_URL= #postgres database connection
```

For now, configure all files with your Eth connection info and addditional contract addresses if you're working with already deployed contracts.

### Chainlink Smart Contracts Compile
Compile from Solidity source. Generates typescript types and also compiles deploy script.
```
npm run compile
```

## Chainlink Node
One you've done completed the configuration, our next step is to deploy an idle Chainlink node with no oracle jobs.

### LINK Token Deploy (optional)
If using a local test blockchain or just looking to test out a deployment, you can deploy your own LINK token to test out the Chainlink node.

Run the deploy script CLI. Feel free to pass a custom .env file to configure the deployment script.
```
npm run deploy
* Deploy LINK token
```
This should log the deployed address. You can then update:
* `LINK_CONTRACT_ADDRESS` in [`.env`](./.env) and [`data/chainlink/.env`](data/chainlink/.env)

### Docker Postgres
If using a local test postgresql database. The script stores data under `data/postgres` so you can pickup where you left off. Start postgresql docker instance
```
npm run docker:postgres
```

### Docker Chainlink
For this step you must have the [`data/chainlink/.env`](data/chainlink/.env) properly configured.

Start chainlink docker instance
```
npm run docker:chainlink
```

<b>Funding Chainlink Node</b>
Your node should now be initializing the postgres database and then be idle as you have not created any oracle jobs yet. We will now fund your node with some Ether so that it can make transactions when responding to oracle requests.
* Go to https://localhost:6688 and login with your email/password from [`data/chainlink/.api`](./data/chainlink/.api)
* Under the `ACCOUNTS` tab, copy your account address
* Update your [`.env`](./.env) file with  `NODE_ADDRESS`, your Chainlink node's address.

Fund your node using either a wallet or run this helper command that funds 1 ETH.
```
npm run deploy
* Fund ETH Chainlink node
```

Now that your Chainlink node is setup and idle, we will look into deploying various types of oracle jobs.

## Direct Request Jobs
The simplest and most flexible form of oracle requests.
* User makes an on-chain request using a contract inheriting the `ChainlinkClient.sol` contract. In our demo we deploy a flexible `TestOracleConsumer.sol` contract.
* This transaction sends some LINK to the `Oracle.sol` contract and emits an event log. Usually, an `Oracle.sol` contract has permissions set to only allow 1 authorized chainlink node to respond to requests.
* The Chainlink node detects the requests and responds accordingly, thus being able to claim the payment.
* Further customized aggregation can be implemented either off-chain by customizing the job, or on-chain by implemeting the logic at the consumer level (eg. edit `TestOracleConsumer.sol` to send multiple requests).

See more at https://docs.chain.link/docs/jobs/types/direct-request/

### Deploy Direct Request Contracts
Deploy `Oracle.sol`:
```
npm run deploy
* Deploy Oracle contract (directrequest)
```
This should log the deployed address. You can then update:
* `ORACLE_CONTRACT_ADDRESS` in [`.env`](./.env) and [`data/chainlink/.env`](data/chainlink/.env)


Deploy `OracleTestConsumer.sol`:
```
npm run deploy
* Deploy Oracle Test Consumer contract (directrequest)
```
This should log the deployed address. You can then update:
* `ORACLE_TEST_CONSUMER_CONTRACT_ADDRESS` in [`.env`](./.env)

Restart your Chainlink node to apply your changes.

### Configure Direct Request Contracts
Configure the `Oracle.sol` contract to accept responses from your node and fund the `OracleTestConsumer.sol` contract.
Set this to your Chainlink node's address.
```
npm run deploy
* Oracle.setFulfillmentPermission (directrequest)
```
This sends 1 LINK to `OracleTestConsumer.sol`.
```
npm run deploy
* Fund LINK Oracle Test Consumer contract (directrequest)
```

### Create Chainlink Job
We will now create a direct requests job that makes an HTTP requests, parses out the json and converts the result to a uint256.
* Login to your Chainlink node
* Click "New Job"
* Copy [`httpget.toml`](./src/jobs/httpget.toml) and replace `ORACLE_CONTRACT_ADDRESS` with the deployed `Oracle.sol` address
* Create the job

You can then update:
* `NODE_JOB_ID` in [`.env`](./.env)

### Trigger Direct Request
```
npm run deploy
* OracleTestconsumer.requestGetUInt256() (directrequest)
```

This should trigger an oracle request and then wait for the response from the Chainlink node.

## Fluxmonitor Jobs
Specialized oracle for price feeds. Chainlink node monitors the price and updates on-chain value based on a sensitivity parameter (eg. 1% movement). Unlike the "Direct Request" no on-chain trigger is required, saving gas costs and simplifying the architecture. Multiple Chainlink nodes can be aggregated using the `FluxAggregator.sol` contract.

See more at https://docs.chain.link/docs/jobs/types/flux-monitor/

TBD: Demo steps.

## Off-chain Reporting Jobs (OCR)
Off-chain aggregation where multiple Chainlink nodes sign a payload that is then verified on-chain through a single transaction. Significantly saves gas costs by requiring only 1 transaction to validate data from N Chainlink nodes. Requires P2P configuration of Chainlink nodes and at least 1 bootstrap Chainlink node serving to seed the P2P network peers.

See more at https://docs.chain.link/docs/jobs/types/offchain-reporting/

TBD: Demo steps.
