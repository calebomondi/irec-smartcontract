# IREC Fractionalization Smart Contract Documentation

This repository contains a set of smart contracts that implement a marketplace for trading Renewable Energy Certificates (IRECs) as tokenized assets. The system uses NFTs to represent certificates and ERC20 tokens to represent fractional ownership.

## Contract Architecture

The system consists of three main contracts:

1. **IRECCertNFT**: An ERC721 contract that represents the renewable energy certificates as NFTs
2. **IRECCertTokens**: An ERC20 contract that tokenizes fractional ownership of the certificates
3. **IRECMarketplace**: A marketplace contract that facilitates trading of the fractional tokens

### Relationship Between Contracts

```
                         ┌───────────────────┐
                         │   IRECCertNFT     │
                         │  (ERC721 Tokens)  │
                         └─────────┬─────────┘
                                   │ NFT is fractionalized into
                                   ▼
┌───────────────────┐    ┌───────────────────┐
│                   │    │  IRECCertTokens   │
│  IRECMarketplace  │◄───┤   (ERC20 Tokens)  │
│                   │    │                   │
└───────────────────┘    └───────────────────┘
```

## Contract Details

### IRECCertNFT

An ERC721 contract that represents renewable energy certificates as non-fungible tokens.

#### Key Features

- **Standard Compliance**: Implements ERC721 and ERC721URIStorage for metadata support
- **Ownership Control**: Uses OpenZeppelin's Ownable pattern for restricted functions
- **Minting Capabilities**: Only the owner can mint new certificates
- **Metadata Management**: Supports setting and updating token URIs for metadata

#### Main Functions

| Function                      | Description                                          | Access |
|-------------------------------|------------------------------------------------------|--------|
| `safeMint(address to)`        | Mints a new certificate NFT to the specified address |  Owner |
| `setBaseURI(string baseURI)`  | Updates the base URI for all token metadata          |  Owner |
| `getTokenIdCount()`           | Returns the current token ID counter value           | Public |
| `tokenURI(uint256 tokenId)`   | Returns the metadata URI for a specific token        | Public |

### IRECCertTokens

An ERC20 contract that represents fractional ownership of renewable energy certificates.

#### Key Features

- **Standard Compliance**: Implements ERC20 and ERC20Permit for gasless approvals
- **NFT Linkage**: Each token contract is linked to a specific NFT in the IRECCertNFT contract
- **Ownership Control**: Uses OpenZeppelin's Ownable pattern for restricted functions
- **NFT Holder**: Implements ERC721Holder to safely receive NFTs

#### Main Functions

| Function              | Description                                                | Access |
|-----------------------|------------------------------------------------------------|--------|
| `constructor`         | Sets up the token with initial supply and links to the NFT |   -    |
| `mintTokensFromNFT()` | Transfers the NFT from the owner to the contract           | Owner  |

### IRECMarketplace

A marketplace contract that facilitates the buying and selling of fractional certificate tokens.

#### Key Features

- **Primary and Secondary Markets**: Supports both primary sales from reserve and secondary trading between users
- **Ownership Tracking**: Records all token transfers and ownership changes
- **Listing Management**: Allows users to create and fulfill token sale listings
- **Security**: Implements ReentrancyGuard to prevent reentrancy attacks

#### Main Functions

| Function                                  | Description                                        | Access |
|-------------------------------------------|----------------------------------------------------|--------|
| `configureSale(uint256 _pricePerToken)`   | Sets the price for tokens in the primary sale      |  Owner |
| `depositReserveTokens()`                  | Transfers tokens from owner to contract reserve    |  Owner |
| `purchaseFromReserve(uint16 _amount)`     | Allows users to buy tokens directly from reserve   |  Public|
| `listToken(uint256 _amount, uint _price)` | Creates a secondary market listing for tokens      |  Public|
| `purchaseFromListing(uint listingId)`     | Allows users to buy tokens from a specific listing | Public |
| `getOwnershipPercentage(address owner)`   | Calculates ownership percentage for an address     | Public |
| `getOwnershipTransfers()`                 | Returns all ownership transfer records             | Public |
| `getTokenListing(uint listingId)`         | Returns details of a specific token listing        | Public |

## Data Structures

### Ownership

Tracks the change of token ownership:

```solidity
struct Ownership {
    address from;      // Seller address
    address to;        // Buyer address
    uint256 amount;    // Number of tokens transferred
    uint32 timestampz; // When the transfer occurred
}
```

### Listing

Represents a token sale listing in the secondary market:

```solidity
struct Listing {
    address seller;        // Address of the seller
    uint256 amount;        // Number of tokens for sale
    uint256 pricePerToken; // Price per token in ETH
    bool active;           // Whether the listing is still active
}
```

## Events

The contracts emit the following events:

### IRECMarketplace Events

- **TokenPurchased**: Triggered when tokens are purchased (from reserve or listing)
- **TokenListed**: Triggered when tokens are listed for sale

## Security Considerations

1. **Reentrancy Protection**: The marketplace uses OpenZeppelin's ReentrancyGuard to prevent reentrancy attacks
2. **Access Control**: Critical functions are protected with Ownable modifier
3. **Input Validation**: Functions validate input parameters before execution
4. **Token Transfers**: The contract uses the secure transfer patterns from OpenZeppelin

## Usage Flow

1. Deploy the IRECCertNFT contract
2. Mint an NFT representing a Renewable Energy Certificate
3. Deploy the IRECCertTokens contract, linking it to the specific NFT
4. Transfer the NFT to the token contract via mintTokensFromNFT()
5. Deploy the IRECMarketplace contract, linking it to the token contract
6. Configure the sale price in the marketplace
7. Deposit tokens to the marketplace for primary sales
8. Users can now:
   - Purchase tokens from the primary reserve
   - List tokens for sale on the secondary market
   - Purchase tokens from other users' listings

## Integration Guide

To integrate with these contracts:

1. **For primary market purchases**:
   - Call `purchaseFromReserve(amount)` with the appropriate ETH value

2. **For listing tokens**:
   - Approve the marketplace to transfer your tokens
   - Call `listToken(amount, price)`

3. **For purchasing from listings**:
   - Find the listing ID of interest
   - Call `purchaseFromListing(listingId)` with the appropriate ETH value

4. **For tracking ownership**:
   - Call `getOwnershipPercentage(address)` to view percentage ownership
   - Call `getOwnershipTransfers()` to view the complete transfer history

## Setup & Development Instructions

Follow these steps to clone, compile, test, and potentially fork this project:

### Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v16.x or later recommended)
- [npm](https://www.npmjs.com/) (v8.x or later)
- [Git](https://git-scm.com/)

### Cloning the Repository

1. Open your terminal or command prompt
2. Clone the repository using Git:

```bash
git clone https://github.com/calebomondi/irec-smartcontract
cd irec-smartcontract
```

### Installing Dependencies

1. Install all required packages:

```bash
npm install
```

2. Specifically ensure OpenZeppelin contracts are installed correctly:

```bash
npm install @openzeppelin/contracts@latest
```

### Compiling the Contracts

1. Compile the smart contracts using Hardhat:

```bash
npx hardhat compile
```

If you encounter compilation errors related to OpenZeppelin imports, try clearing the cache:

```bash
npx hardhat clean
npx hardhat compile
```

### Running Tests

1. Execute the test suite to verify all contracts are working correctly:

```bash
npx hardhat test
```

For more verbose output during testing:

```bash
npx hardhat test --verbose
```

### Deploying to Local Network

1. Start a local Hardhat network node:

```bash
npx hardhat node
```

2. In a separate terminal, deploy your contracts to the local network:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

### Forking the Project

If you want to create your own version of this project:

1. Go to the GitHub repository page
2. Click the "Fork" button in the top-right corner
3. Clone your forked repository:

```bash
git clone https://github.com/calebomondi/irec-smartcontract
cd irec-smartcontract
```

4. Create a new branch for your changes:

```bash
git checkout -b feature/your-new-feature
```

5. Make your changes to the contracts or tests
6. Commit and push your changes:

```bash
git add .
git commit -m "Add your detailed commit message here"
git push origin feature/your-new-feature
```

7. Create a Pull Request on GitHub if you'd like to contribute back to the original project

### Troubleshooting Common Issues

#### Import Errors

If you encounter "Source not found" errors:
```bash
npm uninstall @openzeppelin/contracts
npm install @openzeppelin/contracts@4.9.3
npx hardhat clean
npx hardhat compile
```

#### Solidity Version Mismatch

If you have compiler version issues, check that your hardhat.config.js matches your pragma statement:

```javascript
module.exports = {
  solidity: "0.8.19",  // Should match the ^0.8.0 in the contracts
  // Other settings...
};
```

#### Gas Estimation Errors

If transactions fail due to gas estimation during testing, try increasing the gas in your Hardhat configuration:

```javascript
networks: {
  hardhat: {
    gas: 12000000,
    blockGasLimit: 12000000,
  }
}
```

### Contributing Back

If you've made improvements you'd like to share:

1. Ensure your code passes all tests
2. Update documentation to reflect your changes
3. Submit a Pull Request with a clear description of the changes and why they're valuable
4. Wait for the code review and address any feedback