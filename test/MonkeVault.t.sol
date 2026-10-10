// SPDX-License-Identifier: ISC
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MonkeVault, MonkeVaultFactory, IUSDC3009} from "../contracts/MonkeVault.sol";

/// @dev Minimal FiatToken-v2-style mock: 6 decimals, EIP-712 domain ("USDC","2"), EIP-3009 both overloads.
contract MockUSDC {
    string public constant name = "USDC";
    string public constant version = "2";
    uint8 public constant decimals = 6;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(bytes32 => bool)) public authorizationState;
    bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH = keccak256(
        "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );
    bytes32 public immutable DOMAIN_SEPARATOR;

    constructor() {
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes(name)), keccak256(bytes(version)), block.chainid, address(this)
        ));
    }

    function mint(address to, uint256 v) external { balanceOf[to] += v; }

    function transfer(address to, uint256 v) external returns (bool) {
        balanceOf[msg.sender] -= v; balanceOf[to] += v; return true;
    }

    function digest(address from, address to, uint256 value, uint256 va, uint256 vb, bytes32 nonce) public view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR,
            keccak256(abi.encode(TRANSFER_WITH_AUTHORIZATION_TYPEHASH, from, to, value, va, vb, nonce))));
    }

    function transferWithAuthorization(address from, address to, uint256 value, uint256 va, uint256 vb, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) public {
        require(block.timestamp > va && block.timestamp < vb, "time");
        require(!authorizationState[from][nonce], "used");
        require(ecrecover(digest(from, to, value, va, vb, nonce), v, r, s) == from, "sig");
        authorizationState[from][nonce] = true;
        balanceOf[from] -= value; balanceOf[to] += value;
    }

    function transferWithAuthorization(address from, address to, uint256 value, uint256 va, uint256 vb, bytes32 nonce, bytes calldata sig) external {
        require(sig.length == 65, "len");
        transferWithAuthorization(from, to, value, va, vb, nonce, uint8(sig[64]), bytes32(sig[0:32]), bytes32(sig[32:64]));
    }
}

contract MonkeVaultTest is Test {
    MockUSDC usdc;
    MonkeVaultFactory factory;
    address seller = address(0x5E11E7);
    address platform = address(0x91A7);
    uint256 payerKey = 0xA11CE;
    address payer;

    function setUp() public {
        vm.warp(1_000);
        usdc = new MockUSDC();
        factory = new MonkeVaultFactory(IUSDC3009(address(usdc)), platform, 100); // 1%
        payer = vm.addr(payerKey);
        usdc.mint(payer, 100e6);
    }

    function _sign(address to, uint256 value, bytes32 nonce) internal view returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(payerKey, usdc.digest(payer, to, value, 0, 2_000, nonce));
        return abi.encodePacked(r, s, v);
    }

    function test_predictMatchesCreate() public {
        address predicted = factory.predictVault(seller);
        address vault = factory.createVault(seller);
        assertEq(vault, predicted);
        assertTrue(factory.isVault(vault));
        assertEq(factory.createVault(seller), vault, "idempotent");
    }

    function test_settleSplitsAtomically() public {
        MonkeVault vault = MonkeVault(factory.createVault(seller));
        bytes memory sig = _sign(address(vault), 10_000, bytes32("n1")); // $0.01
        vm.prank(address(0xBEEF)); // any relayer
        vault.settle(payer, 10_000, 0, 2_000, bytes32("n1"), sig);
        assertEq(usdc.balanceOf(seller), 9_900);
        assertEq(usdc.balanceOf(platform), 100);
        assertEq(usdc.balanceOf(address(vault)), 0);
        assertEq(usdc.balanceOf(payer), 100e6 - 10_000);
    }

    function test_replayReverts() public {
        MonkeVault vault = MonkeVault(factory.createVault(seller));
        bytes memory sig = _sign(address(vault), 10_000, bytes32("n1"));
        vault.settle(payer, 10_000, 0, 2_000, bytes32("n1"), sig);
        vm.expectRevert(bytes("used"));
        vault.settle(payer, 10_000, 0, 2_000, bytes32("n1"), sig);
    }

    function test_cannotRedirectToAnotherVault() public {
        MonkeVault vault = MonkeVault(factory.createVault(seller));
        MonkeVault attacker = MonkeVault(factory.createVault(address(0xBAD)));
        bytes memory sig = _sign(address(vault), 10_000, bytes32("n1"));
        vm.expectRevert(bytes("sig"));
        attacker.settle(payer, 10_000, 0, 2_000, bytes32("n1"), sig);
    }

    function test_cannotInflateValue() public {
        MonkeVault vault = MonkeVault(factory.createVault(seller));
        bytes memory sig = _sign(address(vault), 10_000, bytes32("n1"));
        vm.expectRevert(bytes("sig"));
        vault.settle(payer, 1_000_000, 0, 2_000, bytes32("n1"), sig);
    }

    function test_sweepSplitsDirectDeposits() public {
        MonkeVault vault = MonkeVault(factory.createVault(seller));
        usdc.mint(address(vault), 1_000_000);
        vault.sweep();
        assertEq(usdc.balanceOf(seller), 990_000);
        assertEq(usdc.balanceOf(platform), 10_000);
    }

    function testFuzz_splitConserves(uint96 amount) public {
        MonkeVault vault = MonkeVault(factory.createVault(seller));
        usdc.mint(address(vault), amount);
        vault.sweep();
        assertEq(usdc.balanceOf(seller) + usdc.balanceOf(platform), amount);
        assertLe(usdc.balanceOf(platform), uint256(amount) / 100);
    }

    function test_feeCap() public {
        vm.expectRevert(MonkeVault.FeeTooHigh.selector);
        new MonkeVault(IUSDC3009(address(usdc)), seller, platform, 1_001);
    }
}
