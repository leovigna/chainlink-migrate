// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {ChainlinkClient} from '@chainlink/contracts/src/v0.8/ChainlinkClient.sol';
import {Chainlink} from '@chainlink/contracts/src/v0.8/Chainlink.sol';

import {IERC677} from './interfaces/IERC677.sol';
import {IOracleTestConsumer} from './interfaces/IOracleTestConsumer.sol';

contract OracleTestConsumer is IOracleTestConsumer, ChainlinkClient, Ownable {
    using Chainlink for Chainlink.Request;

    constructor(address link) Ownable() {
        setChainlinkToken(link);
    }

    uint256 public override latestResponseUInt256;
    mapping(bytes32 => uint256) public override responseUInt256;

    /***** Runlog request *****/
    function requestGetUInt256(
        address oracle,
        string memory jobId,
        uint256 payment,
        string memory url,
        string memory path,
        int256 times
    ) public override onlyOwner returns (bytes32 requestId) {
        Chainlink.Request memory req = buildChainlinkRequest(
            stringToBytes32(jobId),
            address(this),
            this.fulfillUInt256.selector
        );
        req.add('url', url);
        req.add('path', path);
        req.addInt('times', times);
        requestId = sendChainlinkRequestTo(oracle, req, payment);

        emit RequestUInt256(requestId, oracle, jobId, payment, url, path, times);
    }

    function fulfillUInt256(bytes32 requestId, uint256 response) public override recordChainlinkFulfillment(requestId) {
        responseUInt256[requestId] = response;
        latestResponseUInt256 = response;

        emit FullfillUInt256(requestId, response);
    }

    function cancelRequest(
        bytes32 _requestId,
        uint256 _payment,
        bytes4 _callbackFunctionId,
        uint256 _expiration
    ) public override onlyOwner {
        cancelChainlinkRequest(_requestId, _payment, _callbackFunctionId, _expiration);
    }

    /***** Token Info *****/
    function getChainlinkToken() public view override returns (address) {
        return chainlinkTokenAddress();
    }

    function withdrawLink() public override onlyOwner {
        IERC677 link = IERC677(chainlinkTokenAddress());
        require(link.transfer(msg.sender, link.balanceOf(address(this))), 'Unable to transfer');
    }

    /*****  Utils *****/
    function stringToBytes32(string memory source) private pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            // solhint-disable-line no-inline-assembly
            result := mload(add(source, 32))
        }
    }
}
