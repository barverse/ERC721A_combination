// SPDX-License-Identifier: MIT
// EIP 1167

import "@openzeppelin/contracts/proxy/Clones.sol";

pragma solidity ^0.8.0;

contract ProxyFactory {
  address public master;

  constructor(address _master) {
    master = _master;
  }

  event ProxyGenerated(address indexed contractAddress);

  using Clones for address;

  //   function getPairAddress(bytes32 salt) external view returns (address) {
  //     require(master != address(0), "master must be set");
  //     return master.predictDeterministicAddress(salt);
  //   }

  //   function createPair(bytes32 salt) external payable {
  //     master.cloneDeterministic(salt);
  //   }

  function clone() external {
    address proxy = master.clone();
    emit ProxyGenerated(proxy);
  }
}
