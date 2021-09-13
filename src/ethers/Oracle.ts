import { ContractFactory } from 'ethers';
import { abi, bytecode } from '../abi/Oracle.json';

export default new ContractFactory(abi, bytecode);
