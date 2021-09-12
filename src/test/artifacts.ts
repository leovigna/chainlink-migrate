export const contracts = {};
export type ContractName = keyof typeof contracts;

//patch mock artifacts object for backwards-compatibility
export const artifacts = {
    require(name: ContractName) {
        return contracts[name];
    },
};
