// SPDX-License-Identifier: ISC
pragma solidity ^0.8.24;

/// @dev Minimal EIP-3009 + ERC-20 surface of Arc's USDC (0x3600…0000, 6 decimals).
interface IUSDC3009 {
    function transferWithAuthorization(
        address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce,
        uint8 v, bytes32 r, bytes32 s
    ) external;
    function transferWithAuthorization(
        address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce,
        bytes calldata signature
    ) external;
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title MonkeVault
/// @notice Per-seller x402 pay-to address. Buyers sign a standard EIP-3009 authorization with
///         `to = vault`; anyone may submit it, and the vault splits the payment between the seller
///         and the MonkePay platform in the same transaction. Seller, platform and fee are fixed at
///         creation, so no relayer or server can redirect funds.
contract MonkeVault {
    IUSDC3009 public immutable usdc;
    address public immutable seller;
    address public immutable platform;
    uint16 public immutable feeBps;

    event Settled(address indexed payer, bytes32 indexed nonce, uint256 amount, uint256 sellerAmount, uint256 fee);
    event Swept(uint256 amount, uint256 sellerAmount, uint256 fee);

    error FeeTooHigh();
    error ZeroAddress();

    constructor(IUSDC3009 usdc_, address seller_, address platform_, uint16 feeBps_) {
        if (feeBps_ > 1_000) revert FeeTooHigh(); // hard cap: 10%
        if (seller_ == address(0) || platform_ == address(0)) revert ZeroAddress();
        usdc = usdc_;
        seller = seller_;
        platform = platform_;
        feeBps = feeBps_;
    }

    /// @notice Pull a signed x402 payment into the vault and split it atomically.
    function settle(
        address from, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes calldata signature
    ) external {
        if (signature.length == 65) {
            bytes32 r = bytes32(signature[0:32]);
            bytes32 s = bytes32(signature[32:64]);
            uint8 v = uint8(signature[64]);
            if (v < 27) v += 27;
            usdc.transferWithAuthorization(from, address(this), value, validAfter, validBefore, nonce, v, r, s);
        } else {
            usdc.transferWithAuthorization(from, address(this), value, validAfter, validBefore, nonce, signature);
        }
        (uint256 toSeller, uint256 fee) = _split(value);
        emit Settled(from, nonce, value, toSeller, fee);
    }

    /// @notice Split anything sent to the vault directly (e.g. settled by a plain x402 facilitator).
    function sweep() external {
        uint256 bal = usdc.balanceOf(address(this));
        if (bal == 0) return;
        (uint256 toSeller, uint256 fee) = _split(bal);
        emit Swept(bal, toSeller, fee);
    }

    function _split(uint256 amount) private returns (uint256 toSeller, uint256 fee) {
        fee = (amount * feeBps) / 10_000;
        toSeller = amount - fee;
        if (fee > 0) require(usdc.transfer(platform, fee), "fee transfer");
        require(usdc.transfer(seller, toSeller), "seller transfer");
    }
}

/// @title MonkeVaultFactory
/// @notice Deterministic (CREATE2) vault per seller, so a seller's pay-to address is known before deployment.
contract MonkeVaultFactory {
    IUSDC3009 public immutable usdc;
    address public immutable platform;
    uint16 public immutable feeBps;

    mapping(address => address) public vaultOf;
    mapping(address => bool) public isVault;

    event VaultCreated(address indexed seller, address vault);

    constructor(IUSDC3009 usdc_, address platform_, uint16 feeBps_) {
        usdc = usdc_;
        platform = platform_;
        feeBps = feeBps_;
    }

    function createVault(address seller) external returns (address vault) {
        vault = vaultOf[seller];
        if (vault != address(0)) return vault;
        vault = address(new MonkeVault{salt: bytes32(uint256(uint160(seller)))}(usdc, seller, platform, feeBps));
        vaultOf[seller] = vault;
        isVault[vault] = true;
        emit VaultCreated(seller, vault);
    }

    function predictVault(address seller) external view returns (address) {
        bytes memory init = abi.encodePacked(type(MonkeVault).creationCode, abi.encode(usdc, seller, platform, feeBps));
        bytes32 h = keccak256(abi.encodePacked(bytes1(0xff), address(this), bytes32(uint256(uint160(seller))), keccak256(init)));
        return address(uint160(uint256(h)));
    }
}
