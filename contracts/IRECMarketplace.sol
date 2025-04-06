// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract IRECMarketplace is Ownable, ReentrancyGuard {
    //initialize NFT and Token
    IERC20 public fractionToken;

    // Price per token in ETH
    uint256 public salePrice; 
    
    // Determine if tokens are up for sale
    bool public saleActive = true;

    //Track ownership of tokens
    struct Ownership {
        address from;
        address to;
        uint256 amount;
        uint32 timestampz;
    }
    mapping (string => Ownership[]) public ownerships;

    //Active Token Listings
    struct Listing {
        address seller;
        uint256 amount;
        uint256 pricePerToken;
        bool active;
    }
    
    mapping(string => mapping(uint => Listing)) public listings;


    //track number of listings
    uint public listingCount;
    
    event TokenPurchased(address indexed from, address indexed to,  uint256 amount, uint256 price);
    event TokenListed(address indexed sellerAddress, uint256 amount, uint256 pricePerToken);

    constructor(
        IERC20 _fractionToken
    ) Ownable(msg.sender) {
        fractionToken = _fractionToken;
    }
    
    //get ownership percentage by amount of tokens
    function getOwnershipPercentage(address owner) public view returns (uint256) {
        return (fractionToken.balanceOf(owner) * 10000) / fractionToken.totalSupply(); //Multiplies % by 100
    }

    // Set up the initial sale
    function configureSale(uint256 _pricePerToken) external onlyOwner {
        salePrice = _pricePerToken;
    }

    //deposit tokens into contract address from the deployment address
    function depositReserveTokens() external nonReentrant onlyOwner {
        fractionToken.transferFrom(msg.sender, address(this), fractionToken.totalSupply());
    }

    // Allow anyone to buy tokens directly
    function purchaseFromReserve(uint16 _amount) external payable nonReentrant {
        require(saleActive, "Sale not active");
        require(msg.value > 0 && msg.value == salePrice * _amount, "Must send ETH");
        
        uint256 tokenAmount = msg.value / salePrice;
        require(tokenAmount > 0, "Not enough ETH sent");

        ownerships['IREC'].push(Ownership({
            from: address(this), 
            to: msg.sender,  
            amount: _amount,
            timestampz: uint32(block.timestamp)
        }));
        
        // Transfer tokens from contract's reserve to buyer
        fractionToken.transfer(msg.sender, tokenAmount);

        emit TokenPurchased(address(this), msg.sender, _amount, salePrice);
    }

    //token listing fro sale
    function listToken(uint256 _amount, uint _price) external nonReentrant {
        require(fractionToken.balanceOf(msg.sender) >= _amount, 'Insufficient Tokens To List!');

        listingCount++;

        //add listing
        listings['IREC'][listingCount] = Listing({
            seller: msg.sender, 
            amount: _amount,
            pricePerToken: _price, 
            active: true
        });

        //tranfer tokens to contract
        fractionToken.transferFrom(msg.sender, address(this), _amount);

        emit TokenListed(msg.sender, _amount, _price);
    }

    //purchase tokens from listing
    function purchaseFromListing(uint listingId) external payable nonReentrant {
        Listing memory listing = listings['IREC'][listingId];

        require(listing.active, "Token not active");
        require(msg.value >= listing.amount * listing.pricePerToken, "Insufficient ETH sent");

        ownerships['IREC'].push(Ownership({
            from: listing.seller, 
            to: msg.sender, 
            amount: listing.amount,
            timestampz: uint32(block.timestamp)
        }));

        //transfer tokens from contract to buyer
        fractionToken.transfer(msg.sender, listing.amount);

        //pay seller
        payable(listing.seller).transfer(msg.value);

        listings['IREC'][listingId].active = false;

        emit TokenPurchased(listing.seller, msg.sender, listing.amount, listing.pricePerToken);
    }

    //track ownerships
    function getOwnershipTransfers() public view returns (Ownership[] memory) {
        return  ownerships['IREC'];
    }

    //get current listing
    function getTokenListing(uint listingId) public view returns(Listing memory) {
        return listings['IREC'][listingId];
    }
}