declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'production';
            LINK_CONTRACT_ADDRESS: string;
            ORACLE_CONTRACT_ADDRESS: string;
            ORACLE_TEST_CONSUMER_CONTRACT_ADDRESS: string;
            NODE_ADDRESS: string;
            NODE_JOB_ID: string;
            RPC_URL: string;
            ACCOUNT_ADDRESS: string;
            HD_WALLET_MNEMONIC: string;
            PRIVATE_KEYS: string;
        }
    }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export { };
