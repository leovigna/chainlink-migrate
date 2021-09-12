import { ContractFactory } from 'ethers';
import { abi, bytecode } from '../abi/ERC677FixedSupply.json';

export default new ContractFactory(abi, bytecode);
