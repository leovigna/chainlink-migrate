import { ContractFactory } from 'ethers';
import { abi, bytecode } from '../abi/OracleTestConsumer.json';

export default new ContractFactory(abi, bytecode);
