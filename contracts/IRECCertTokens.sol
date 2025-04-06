// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

contract IRECCertTokens is ERC20, Ownable, ERC20Permit, ERC721Holder {
    // The NFT contract
    IERC721 public nftContract;
    
    // The specific NFT token ID that is fractionalized
    uint256 public nftTokenId;

    constructor(
        uint256 _totalSupply,
        string memory _name,
        string memory _symbol,
        address _nftContractAddress,
        uint256 _nftTokenId
    ) ERC20(_name, _symbol) Ownable(msg.sender) ERC20Permit(_name) {
        //get NFT 
        nftContract = IERC721(_nftContractAddress);
        nftTokenId = _nftTokenId;

        //mint
        _mint(msg.sender, _totalSupply);
    }
    
   /**
    * @dev Mints tokens from the NFT holder
    */
   function mintTokensFromNFT() public onlyOwner {
        require(totalSupply() > 0, "Amount Must Be Greater Than 0!");
        //mint fractions from NFT using tokenId and amount to be minted
        nftContract.safeTransferFrom(msg.sender, address(this), nftTokenId);
    }

}
