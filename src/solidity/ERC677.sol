// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import {Address} from '@openzeppelin/contracts/utils/Address.sol';
import {IERC677Receiver} from './interfaces/IERC677Receiver.sol';

contract ERC677 is ERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value, bytes data);

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    /**
     * @dev transfer token to a contract address with additional data if the recipient is a contact.
     * @param to The address to transfer to.
     * @param value The amount to be transferred.
     * @param data The extra data to be passed to the receiving contract.
     */
    function transferAndCall(
        address to,
        uint256 value,
        bytes memory data
    ) public virtual returns (bool success) {
        super.transfer(to, value);
        emit Transfer(msg.sender, to, value, data);

        if (Address.isContract(to)) {
            IERC677Receiver receiver = IERC677Receiver(to);
            receiver.onTokenTransfer(msg.sender, value, data);
        }

        return true;
    }
}
