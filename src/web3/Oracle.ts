import Web3 from 'web3';
import { Oracle as ContractInterface } from '../types/web3/Oracle';
import { abi, bytecode } from '../abi/Oracle.json';

const ContractFactory = (web3: Web3, address?: string) =>
    new web3.eth.Contract(abi as any, address ?? undefined, {
        data: bytecode,
        from: web3.eth.defaultAccount ?? undefined,
    }) as unknown as ContractInterface;
export default ContractFactory;
