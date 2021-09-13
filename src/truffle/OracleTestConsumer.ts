import { OracleTestConsumerContract as ContractInterface } from '../types/truffle/OracleTestConsumer';
import Artifact from '../abi/OracleTestConsumer.json';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Contract = require('@truffle/contract');
export default Contract(Artifact) as ContractInterface;
