import dotenv from 'dotenv';
import path from 'path';

//Pass custom env file arg
const args = process.argv;
const envfileName = args.length > 2 ? args[2] : '.env';
const envfile = path.resolve(process.cwd(), envfileName);

dotenv.config({ path: envfile });

export const CONTRACT_LINK = process.env.CONTRACT_LINK || process.env.LINK_CONTRACT_ADDRESS;
export const CONTRACT_ORACLE = process.env.CONTRACT_ORACLE || process.env.ORACLE_CONTRACT_ADDRESS;
export const CONTRACT_ORACLE_TEST_CONSUMER =
    process.env.CONTRACT_ORACLE_TEST_CONSUMER || process.env.ORACLE_TEST_CONSUMER_CONTRACT_ADDRESS;
export const NODE_ADDRESS = process.env.NODE_ADDRESS;
export const NODE_JOB_ID = process.env.NODE_JOB_ID;
export const RPC_URL = process.env.RPC_URL;
export const ACCOUNT_ADDRESS = process.env.ACCOUNT_ADDRESS;
export const HD_WALLET_MNEMONIC = process.env.HD_WALLET_MNEMONIC;
export const PRIVATE_KEYS = process.env.PRIVATE_KEYS;
