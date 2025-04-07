// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract IRECCertNFT is ERC721, ERC721URIStorage, Ownable {
    //token IDs counter
    uint256 private _tokenIdCounter;

    //NFT URI
    string private _baseTokenURI;

    constructor(
        string memory name, 
        string memory symbol, 
        string memory baseTokenURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseTokenURI;
    }

    //Mint tokens
    function safeMint(address to) public onlyOwner returns (uint256) {
        uint256 tokenId = getTokenIdCount();
        increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _baseTokenURI);

        return tokenId;
    }

    //Icreament tokenId count
    function increment() internal {
        _tokenIdCounter += 1;
    }

    //Get tokenId count
    function getTokenIdCount() public view returns(uint256) {
        return _tokenIdCounter;
    }

    // Set base URI for all token metadata
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    // Override base URI function
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /*
    * @notice override the tokenURI and supportsInterface in the ERC721 and ERC721URIStorage
    */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
