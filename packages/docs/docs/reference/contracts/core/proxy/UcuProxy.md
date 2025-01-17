## UcuProxy

### _IMPLEMENTATION_SLOT

```solidity
bytes32 _IMPLEMENTATION_SLOT
```

_Storage slot with the address of the current implementation.
This is the keccak-256 hash of "eip1967.proxy.implementation" subtracted by 1_

### _ADMIN_SLOT

```solidity
bytes32 _ADMIN_SLOT
```

### _REPOSITORY_SLOT

```solidity
bytes32 _REPOSITORY_SLOT
```

### constructor

```solidity
constructor(contract ImplementationRepository _repository, address _owner) public
```

_reverts if either `_repository` or `_owner` is null_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _repository | contract ImplementationRepository | repository used for sourcing upgrades |
| _owner | address | owner of proxy |

### upgradeImplementation

```solidity
function upgradeImplementation() external
```

upgrade the proxy implementation

_reverts if the repository has not been initialized or if there is no following version_

### transferOwnership

```solidity
function transferOwnership(address newOwner) external
```

Set the address of the new owner of the contract

_Set _newOwner to address(0) to renounce any ownership._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newOwner | address |  |

### owner

```solidity
function owner() external view returns (address)
```

Get the address of the owner

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the owner. |

### getRepository

```solidity
function getRepository() external view returns (contract ImplementationRepository)
```

Returns the associated {Repo}
  contract used for fetching implementations to upgrade to

### _upgradeImplementation

```solidity
function _upgradeImplementation() internal
```

### _implementation

```solidity
function _implementation() internal view returns (address impl)
```

_Returns the current implementation address._

### _upgradeToAndCall

```solidity
function _upgradeToAndCall(address newImplementation, bytes data) internal virtual
```

Emits an {Upgraded} event.

### _setImplementationAndCall

```solidity
function _setImplementationAndCall(address newImplementation, bytes data) internal
```

_Stores a new address in the EIP1967 implementation slot._

### _setRepository

```solidity
function _setRepository(contract ImplementationRepository newRepository) internal
```

### _getRepository

```solidity
function _getRepository() internal view returns (contract ImplementationRepository repo)
```

### _getOwner

```solidity
function _getOwner() internal view returns (address adminAddress)
```

### _setOwner

```solidity
function _setOwner(address newOwner) internal
```

### onlyOwner

```solidity
modifier onlyOwner()
```

### Upgraded

```solidity
event Upgraded(address implementation)
```

_Emitted when the implementation is upgraded._

