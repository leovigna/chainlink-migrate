// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC677} from './ERC677.sol';

/**
 * @dev {ERC20} token, including:
 *
 *  - Preminted initial supply
 *  - No access control mechanism (for minting/pausing) and hence no governance
 *
 */
contract ERC677FixedSupply is ERC677 {
    /**
     * @dev Mints `initialSupply` amount of token and transfers them to `owner`.
     *
     * See {ERC20-constructor}.
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address owner
    ) ERC677(name, symbol) {
        _mint(owner, initialSupply);
    }
}
