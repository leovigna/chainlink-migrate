import { ERC677FixedSupplyContract as ContractInterface } from '../types/truffle/ERC677FixedSupply';
import Artifact from '../abi/ERC677FixedSupply.json';

const Contract = require('@truffle/contract');
export default Contract(Artifact) as ContractInterface;
