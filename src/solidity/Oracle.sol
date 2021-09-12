// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';

import {IOracleRequest} from './interfaces/IOracleRequest.sol';
import {IOracle} from './interfaces/IOracle.sol';
import {IWithdrawal} from './interfaces/IWithdrawal.sol';
import {IERC677} from './interfaces/IERC677.sol';

import {ERC677OracleReceiver} from './ERC677OracleReceiver.sol';

/**
 * @title The Chainlink Oracle contract
 * @notice Node operators can deploy this contract to fulfill requests sent to them
 */
contract Oracle is IOracle, IOracleRequest, IWithdrawal, Ownable, ERC677OracleReceiver {
    uint256 public constant EXPIRY_TIME = 5 minutes;
    uint256 private constant MINIMUM_CONSUMER_GAS_LIMIT = 400000;

    IERC677 internal token;
    mapping(bytes32 => bytes32) private commitments;
    mapping(address => bool) private authorizedNodes;
    uint256 private withdrawableTokens;

    event OracleRequest(
        bytes32 indexed specId,
        address requester,
        bytes32 requestId,
        uint256 payment,
        address callbackAddr,
        bytes4 callbackFunctionId,
        uint256 cancelExpiration,
        uint256 dataVersion,
        bytes data
    );

    event CancelOracleRequest(bytes32 indexed requestId);

    /**
     * @notice Deploy with the address of the ERC677 token
     * @dev Sets the token address for the imported ERC677
     * @param _link The address of the ERC677 token
     */
    constructor(address _link) Ownable() {
        token = IERC677(_link); // external but already deployed and unalterable
    }

    /**
     * @notice Creates the Chainlink request
     * @dev Stores the hash of the params as the on-chain commitment for the request.
     * Emits OracleRequest event for the Chainlink node to detect.
     * @param _sender The sender of the request
     * @param _payment The amount of payment given (specified in wei)
     * @param _specId The Job Specification ID
     * @param _callbackAddress The callback address for the response
     * @param _callbackFunctionId The callback function ID for the response
     * @param _nonce The nonce sent by the requester
     * @param _dataVersion The specified data version
     * @param _data The CBOR payload of the request
     */
    function oracleRequest(
        address _sender,
        uint256 _payment,
        bytes32 _specId,
        address _callbackAddress,
        bytes4 _callbackFunctionId,
        uint256 _nonce,
        uint256 _dataVersion,
        bytes calldata _data
    ) external override onlyERC677 checkCallbackAddress(_callbackAddress) {
        bytes32 requestId = keccak256(abi.encodePacked(_sender, _nonce));
        require(commitments[requestId] == 0, 'Must use a unique ID');
        // solhint-disable-next-line not-rely-on-time
        uint256 expiration = block.timestamp + EXPIRY_TIME;

        commitments[requestId] = keccak256(
            abi.encodePacked(_payment, _callbackAddress, _callbackFunctionId, expiration)
        );

        emit OracleRequest(
            _specId,
            _sender,
            requestId,
            _payment,
            _callbackAddress,
            _callbackFunctionId,
            expiration,
            _dataVersion,
            _data
        );
    }

    /**
     * @notice Called by the Chainlink node to fulfill requests
     * @dev Given params must hash back to the commitment stored from `oracleRequest`.
     * Will call the callback address' callback function without bubbling up error
     * checking in a `require` so that the node can get paid.
     * @param _requestId The fulfillment request ID that must match the requester's
     * @param _payment The payment amount that will be released for the oracle (specified in wei)
     * @param _callbackAddress The callback address to call for fulfillment
     * @param _callbackFunctionId The callback function ID to use for fulfillment
     * @param _expiration The expiration that the node should respond by before the requester can cancel
     * @param _data The data to return to the consuming contract
     * @return Status if the external call was successful
     */
    function fulfillOracleRequest(
        bytes32 _requestId,
        uint256 _payment,
        address _callbackAddress,
        bytes4 _callbackFunctionId,
        uint256 _expiration,
        bytes32 _data
    ) external override onlyAuthorizedNode isValidRequest(_requestId) returns (bool) {
        bytes32 paramsHash = keccak256(abi.encodePacked(_payment, _callbackAddress, _callbackFunctionId, _expiration));
        require(commitments[_requestId] == paramsHash, 'Params do not match request ID');
        withdrawableTokens = withdrawableTokens + _payment;
        delete commitments[_requestId];
        require(gasleft() >= MINIMUM_CONSUMER_GAS_LIMIT, 'Must provide consumer enough gas');
        // All updates to the oracle's fulfillment should come before calling the
        // callback(addr+functionId) as it is untrusted.
        // See: https://solidity.readthedocs.io/en/develop/security-considerations.html#use-the-checks-effects-interactions-pattern
        (bool success, ) = _callbackAddress.call(abi.encodeWithSelector(_callbackFunctionId, _requestId, _data)); // solhint-disable-line avoid-low-level-calls
        return success;
    }

    /**
     * @notice Use this to check if a node is authorized for fulfilling requests
     * @param _node The address of the Chainlink node
     * @return The authorization status of the node
     */
    function getAuthorizationStatus(address _node) external view override returns (bool) {
        return authorizedNodes[_node];
    }

    /**
     * @notice Sets the fulfillment permission for a given node. Use `true` to allow, `false` to disallow.
     * @param _node The address of the Chainlink node
     * @param _allowed Bool value to determine if the node can fulfill requests
     */
    function setFulfillmentPermission(address _node, bool _allowed) external override onlyOwner {
        authorizedNodes[_node] = _allowed;
    }

    /**
     * @notice Allows the node operator to withdraw earned ERC677 to a given address
     * @dev The owner of the contract can be another wallet and does not have to be a Chainlink node
     * @param _recipient The address to send the ERC677 token to
     * @param _amount The amount to send (specified in wei)
     */
    function withdraw(address _recipient, uint256 _amount)
        external
        override(IOracle, IWithdrawal)
        onlyOwner
        hasAvailableFunds(_amount)
    {
        withdrawableTokens = withdrawableTokens - _amount;
        assert(token.transfer(_recipient, _amount));
    }

    /**
     * @notice Displays the amount of ERC677 that is available for the node operator to withdraw
     * @return The amount of withdrawable ERC677 on the contract
     */
    function withdrawable() external view override(IOracle, IWithdrawal) onlyOwner returns (uint256) {
        return withdrawableTokens;
    }

    /**
     * @notice Allows requesters to cancel requests sent to this oracle contract. Will transfer the ERC677
     * sent for the request back to the requester's address.
     * @dev Given params must hash to a commitment stored on the contract in order for the request to be valid
     * Emits CancelOracleRequest event.
     * @param _requestId The request ID
     * @param _payment The amount of payment given (specified in wei)
     * @param _callbackFunc The requester's specified callback address
     * @param _expiration The time of the expiration for the request
     */
    function cancelOracleRequest(
        bytes32 _requestId,
        uint256 _payment,
        bytes4 _callbackFunc,
        uint256 _expiration
    ) external override {
        bytes32 paramsHash = keccak256(abi.encodePacked(_payment, msg.sender, _callbackFunc, _expiration));
        require(paramsHash == commitments[_requestId], 'Params do not match request ID');
        // solhint-disable-next-line not-rely-on-time
        require(_expiration <= block.timestamp, 'Request is not expired');

        delete commitments[_requestId];
        emit CancelOracleRequest(_requestId);

        assert(token.transfer(msg.sender, _payment));
    }

    /**
     * @notice Returns the address of the ERC677 token
     * @dev This is the public implementation for chainlinkTokenAddress, which is
     * an internal method of the ChainlinkClient contract
     */
    function getChainlinkToken() public view override returns (address) {
        return address(token);
    }

    // MODIFIERS

    /**
     * @dev Reverts if amount requested is greater than withdrawable balance
     * @param _amount The given amount to compare to `withdrawableTokens`
     */
    modifier hasAvailableFunds(uint256 _amount) {
        require(withdrawableTokens >= _amount, 'Amount requested is greater than withdrawable balance');
        _;
    }

    /**
     * @dev Reverts if request ID does not exist
     * @param _requestId The given request ID to check in stored `commitments`
     */
    modifier isValidRequest(bytes32 _requestId) {
        require(commitments[_requestId] != 0, 'Must have a valid requestId');
        _;
    }

    /**
     * @dev Reverts if `msg.sender` is not authorized to fulfill requests
     */
    modifier onlyAuthorizedNode() {
        require(authorizedNodes[msg.sender] || msg.sender == owner(), 'Not an authorized node to fulfill requests');
        _;
    }

    /**
     * @dev Reverts if the callback address is the ERC677 token
     * @param _to The callback address
     */
    modifier checkCallbackAddress(address _to) {
        require(_to != address(token), 'Cannot callback to ERC677');
        _;
    }
}