import { OracleContract as ContractInterface } from '../types/truffle/Oracle';
import Artifact from '../abi/Oracle.json';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Contract = require('@truffle/contract');
export default Contract(Artifact) as ContractInterface;
