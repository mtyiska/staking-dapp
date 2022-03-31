pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

import 'hardhat/console.sol';
import './ExampleExternalContract.sol';

contract Staker {
  ExampleExternalContract public exampleExternalContract;
  mapping(address => uint256) public balances;
  uint256 public constant threshold = 1 ether;
  uint256 public deadLine = block.timestamp + 120 hours;

  constructor(address exampleExternalContractAddress) {
    exampleExternalContract = ExampleExternalContract(exampleExternalContractAddress);
  }

  // Collect funds in a payable `stake()` function and track individual `balances` with a mapping:
  //  ( make sure to add a `Stake(address,uint256)` event and emit it for the frontend <List/> display )

  event Stake(address adr, uint256 balance);

  function timeLeft() public view returns (uint256 timeremaining) {
    if (block.timestamp >= deadLine) return 0;
    return deadLine - block.timestamp;
  }

  modifier onlyAfter(bool timePassed) {
    console.log('mytime left', timeLeft());
    if (timePassed) {
      require(timeLeft() == 0, 'Deadline has not passed');
    } else {
      require(timeLeft() > 0, 'Deadline is reached');
    }
    _;
  }

  modifier notCompleted() {
    bool completed = exampleExternalContract.completed();
    require(!completed, 'staking process already completed');
    _;
  }

  receive() external payable {}

  function transferEther() public payable notCompleted {
    (bool sent, ) = address(this).call{value: msg.value}('');
    require(sent, 'Failed to send Ether');
  }

  function stake() public payable onlyAfter(false) notCompleted {
    require(msg.value >= 0, 'Cannot stake nothing');
    balances[msg.sender] += msg.value;
    emit Stake(msg.sender, msg.value);
  }

  function withdraw(address adr) public onlyAfter(true) notCompleted {
    uint256 contractBalance = address(this).balance;
    require(contractBalance < threshold, 'Threshold not reached');
    uint256 amount = balances[adr];
    require(amount >= 0, "You don't have balance to widthraw");
    balances[adr] = 0;
    (bool sent, ) = msg.sender.call{value: amount}('');
    require(sent, 'Failed to send user balance back to user');
  }

  function execute() public onlyAfter(true) notCompleted {
    uint256 contractBalance = address(this).balance;
    if (contractBalance >= threshold) {
      (bool sent, ) = address(exampleExternalContract).call{value: contractBalance}(abi.encodeWithSignature('complete()'));
      require(sent, 'exampleExternalContract.complete failed');
    }
  }

  // After some `deadline` allow anyone to call an `execute()` function
  //  It should either call `exampleExternalContract.complete{value: address(this).balance}()` to send all the value

  // if the `threshold` was not met, allow everyone to call a `withdraw()` function

  // Add a `timeLeft()` view function that returns the time left before the deadline for the frontend

  // Add the `receive()` special function that receives eth and calls stake()
}
