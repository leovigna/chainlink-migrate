import Web3 from 'web3';
import { OracleTestConsumer as ContractInterface } from '../types/web3/OracleTestConsumer';
import { abi, bytecode } from '../abi/OracleTestConsumer.json';

const ContractFactory = (web3: Web3, address?: string) =>
    new web3.eth.Contract(abi as any, address ?? undefined, {
        data: bytecode,
        from: web3.eth.defaultAccount ?? undefined,
    }) as unknown as ContractInterface;
export default ContractFactory;
