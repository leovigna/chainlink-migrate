// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IWithdrawal {
    /**
     * @notice transfer token held by the contract belonging to msg.sender to
     * another address
     * @param recipient is the address to send the token to
     * @param amount is the amount of token to send
     */
    function withdraw(address recipient, uint256 amount) external;

    /**
     * @notice query the available amount of token to withdraw by msg.sender
     */
    function withdrawable() external view returns (uint256);
}
