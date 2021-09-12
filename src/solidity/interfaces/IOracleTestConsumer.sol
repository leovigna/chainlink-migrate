//SPDX-License-Identifier: MIT
pragma solidity >=0.6.0;

interface IOracleTestConsumer {
    event RequestUInt256(
        bytes32 indexed requestId,
        address oracle,
        string jobId,
        uint256 payment,
        string url,
        string path,
        int256 times
    );
    event FullfillUInt256(bytes32 indexed requestId, uint256 price);

    function latestResponseUInt256() external view returns (uint256);

    function responseUInt256(bytes32 requestId) external view returns (uint256);

    function requestGetUInt256(
        address oracle,
        string calldata jobId,
        uint256 payment,
        string calldata url,
        string calldata path,
        int256 times
    ) external returns (bytes32 requestId);

    function fulfillUInt256(bytes32 requestId, uint256 response) external;

    function cancelRequest(
        bytes32 _requestId,
        uint256 _payment,
        bytes4 _callbackFunctionId,
        uint256 _expiration
    ) external;

    /***** Token Info *****/
    function getChainlinkToken() external view returns (address);

    function withdrawLink() external;
}
