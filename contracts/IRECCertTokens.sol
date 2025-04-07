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

    //total supply
    uint256 public iTotalSupply;

    //check if token minted
    mapping (uint256 => bool) public hasMinted;

    event TokenMintedFromNFT(uint256 indexed nftTokenId);

    constructor(
        uint256 _totalSupply,
        string memory _name,
        string memory _symbol,
        address _nftContractAddress
    ) ERC20(_name, _symbol) Ownable(msg.sender) ERC20Permit('I-REC Tokens') {
        //get NFT 
        nftContract = IERC721(_nftContractAddress);
        //initialize totalsupply
        iTotalSupply = _totalSupply;
    }
    
   /**
    * @dev Mints tokens from the NFT holder
    */
   function tranferNFTOwnership(uint _nftTokenId) public onlyOwner {
        require(iTotalSupply > 0, "Amount Must Be Greater Than 0!");
        require(!hasMinted[_nftTokenId], "NFT Token ID Already Minted!");

        //mint fractions from NFT using tokenId and amount to be minted
        nftContract.safeTransferFrom(msg.sender, address(this), _nftTokenId);
        
        //mint
        _mint(msg.sender, iTotalSupply);

        hasMinted[_nftTokenId] = true;
    }

}
