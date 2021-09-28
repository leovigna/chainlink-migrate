declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'production';
            CONTRACT_LINK: string;
            CONTRACT_ORACLE: string;
            CONTRACT_ORACLE_TEST_CONSUMER: string;
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
