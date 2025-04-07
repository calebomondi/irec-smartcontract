import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("IREC Ecosystem Tests", function () {
  // Variables 
  let nft: Contract;
  let token: Contract;
  let marketplace: Contract;
  let owner: Signer;
  let addr1: Signer;
  let addr2: Signer;
  let ownerAddress: string;
  let addr1Address: string;
  let addr2Address: string;
  
  const NFT_NAME = "IREC Certificate";
  const NFT_SYMBOL = "IREC";
  const BASE_URI = "https://example.com/metadata/";
  const TOKEN_NAME = "IREC Fraction Token";
  const TOKEN_SYMBOL = "IRECF";
  const TOTAL_SUPPLY = ethers.parseEther("1000");
  const PRICE_PER_TOKEN = ethers.parseEther("0.01");

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    addr1Address = await addr1.getAddress();
    addr2Address = await addr2.getAddress();

    // Deploy NFT contract
    const NFTFactory = await ethers.getContractFactory("IRECCertNFT");
    nft = await NFTFactory.deploy(NFT_NAME, NFT_SYMBOL, BASE_URI);
    
    // Deploy token contract
    const TokenFactory = await ethers.getContractFactory("IRECCertTokens");
    token = await TokenFactory.deploy(TOTAL_SUPPLY, TOKEN_NAME, TOKEN_SYMBOL, await nft.getAddress());
    
    // Deploy marketplace contract
    const MarketplaceFactory = await ethers.getContractFactory("IRECMarketplace");
    marketplace = await MarketplaceFactory.deploy(await token.getAddress());
  });

  describe("IRECCertNFT Contract", function () {
    it("Should deploy with correct name and symbol", async function () {
      expect(await nft.name()).to.equal(NFT_NAME);
      expect(await nft.symbol()).to.equal(NFT_SYMBOL);
    });

    it("Should mint an NFT and return the token ID", async function () {
      const tx = await nft.safeMint(ownerAddress);
      const receipt = await tx.wait();
      
      // Get events from transaction receipt
      const events = receipt.logs.map(log => nft.interface.parseLog(log));
      const transferEvent = events.find(event => event?.name === 'Transfer');
      
      expect(transferEvent).to.not.be.undefined;
      const tokenId = transferEvent?.args?.tokenId;
      
      expect(await nft.ownerOf(tokenId)).to.equal(ownerAddress);
      expect(await nft.tokenURI(tokenId)).to.equal(BASE_URI);
    });

    it("Should increment token ID counter correctly", async function () {
      expect(await nft.getTokenIdCount()).to.equal(0);
      
      await nft.safeMint(ownerAddress);
      expect(await nft.getTokenIdCount()).to.equal(1);
      
      await nft.safeMint(addr1Address);
      expect(await nft.getTokenIdCount()).to.equal(2);
    });

    it("Should prevent multiple minting from the same address", async function () {
      await nft.connect(addr1).safeMint(addr1Address);
      await expect(nft.connect(addr1).safeMint(addr1Address)).to.be.revertedWith("You Have Already minted!");
    });

    it("Should allow owner to set a new base URI", async function () {
      const NEW_BASE_URI = "https://irec.org/metadata/";
      await nft.setBaseURI(NEW_BASE_URI);
      
      const tokenId = await nft.safeMint(ownerAddress);
      expect(await nft.tokenURI(0)).to.equal(NEW_BASE_URI);
    });

    it("Should not allow non-owners to mint", async function () {
      await expect(nft.connect(addr1).safeMint(addr1Address)).to.be.revertedWithCustomError(
        nft,
        "OwnableUnauthorizedAccount"
      );
    });
  });

  describe("IRECCertTokens Contract", function () {
    let nftTokenId: number;
    
    beforeEach(async function () {
      // Mint an NFT to owner
      const tx = await nft.safeMint(ownerAddress);
      const receipt = await tx.wait();
      
      // Extract token ID from events
      const events = receipt.logs.map(log => nft.interface.parseLog(log));
      const transferEvent = events.find(event => event?.name === 'Transfer');
      nftTokenId = Number(transferEvent?.args?.tokenId);
      
      // Approve token contract to transfer NFT
      await nft.approve(await token.getAddress(), nftTokenId);
    });

    it("Should deploy with correct parameters", async function () {
      expect(await token.name()).to.equal(TOKEN_NAME);
      expect(await token.symbol()).to.equal(TOKEN_SYMBOL);
      expect(await token.nftContract()).to.equal(await nft.getAddress());
      expect(await token.iTotalSupply()).to.equal(TOTAL_SUPPLY);
    });

    it("Should mint tokens from NFT ownership transfer", async function () {
      await token.tranferNFTOwnership(nftTokenId);
      
      expect(await token.balanceOf(ownerAddress)).to.equal(TOTAL_SUPPLY);
      expect(await token.hasMinted(nftTokenId)).to.be.true;
    });

    it("Should prevent re-minting tokens from the same NFT", async function () {
      await token.tranferNFTOwnership(nftTokenId);
      await expect(token.tranferNFTOwnership(nftTokenId)).to.be.revertedWith("NFT Token ID Already Minted!");
    });

    it("Should transfer NFT to token contract during minting", async function () {
      await token.tranferNFTOwnership(nftTokenId);
      expect(await nft.ownerOf(nftTokenId)).to.equal(await token.getAddress());
    });

    it("Should not allow non-owners to mint tokens", async function () {
      await expect(token.connect(addr1).tranferNFTOwnership(nftTokenId)).to.be.revertedWithCustomError(
        token,
        "OwnableUnauthorizedAccount"
      );
    });
  });

  describe("IRECMarketplace Contract", function () {
    let nftTokenId: number;
    
    beforeEach(async function () {
      // Setup: Mint NFT and ERC20 tokens
      const tx = await nft.safeMint(ownerAddress);
      const receipt = await tx.wait();
      
      // Extract token ID
      const events = receipt.logs.map(log => nft.interface.parseLog(log));
      const transferEvent = events.find(event => event?.name === 'Transfer');
      nftTokenId = Number(transferEvent?.args?.tokenId);
      
      // Approve and mint tokens
      await nft.approve(await token.getAddress(), nftTokenId);
      await token.tranferNFTOwnership(nftTokenId);
      
      // Configure marketplace sale
      await marketplace.configureSale(PRICE_PER_TOKEN);
      
      // Approve tokens for marketplace
      await token.approve(await marketplace.getAddress(), TOTAL_SUPPLY);
    });

    it("Should deploy with correct token address", async function () {
      expect(await marketplace.fractionToken()).to.equal(await token.getAddress());
      expect(await marketplace.salePrice()).to.equal(PRICE_PER_TOKEN);
      expect(await marketplace.saleActive()).to.be.true;
    });

    it("Should allow owner to deposit reserve tokens", async function () {
      await marketplace.depositReserveTokens();
      expect(await token.balanceOf(await marketplace.getAddress())).to.equal(TOTAL_SUPPLY);
    });

    it("Should calculate ownership percentage correctly", async function () {
      // Owner has all tokens initially
      expect(await marketplace.getOwnershipPercentage(ownerAddress)).to.equal(10000); // 100.00%
      
      // Transfer half to addr1
      await token.transfer(addr1Address, TOTAL_SUPPLY / 2n);
      
      expect(await marketplace.getOwnershipPercentage(ownerAddress)).to.equal(5000); // 50.00%
      expect(await marketplace.getOwnershipPercentage(addr1Address)).to.equal(5000); // 50.00%
    });

    it("Should allow users to purchase tokens from reserve", async function () {
      // First deposit tokens to marketplace
      await marketplace.depositReserveTokens();
      
      const amount = 10;
      const cost = BigInt(amount) * PRICE_PER_TOKEN;
      
      // Purchase tokens
      await marketplace.connect(addr1).purchaseFromReserve(amount, { value: cost });
      
      expect(await token.balanceOf(addr1Address)).to.equal(BigInt(amount) * PRICE_PER_TOKEN / PRICE_PER_TOKEN);
      
      // Check ownership records
      const ownerships = await marketplace.getOwnershipTransfers();
      expect(ownerships.length).to.equal(1);
      expect(ownerships[0].from).to.equal(await marketplace.getAddress());
      expect(ownerships[0].to).to.equal(addr1Address);
      expect(ownerships[0].amount).to.equal(amount);
    });

    it("Should allow users to list tokens for sale", async function () {
      const listAmount = 100;
      const listPrice = ethers.parseEther("0.02");
      
      // Approve and list tokens
      await token.approve(await marketplace.getAddress(), listAmount);
      await marketplace.listToken(listAmount, listPrice);
      
      // Check listing
      expect(await marketplace.listingCount()).to.equal(1);
      
      const listing = await marketplace.getTokenListing(1);
      expect(listing.seller).to.equal(ownerAddress);
      expect(listing.amount).to.equal(listAmount);
      expect(listing.pricePerToken).to.equal(listPrice);
      expect(listing.active).to.be.true;
    });

    it("Should allow users to purchase from listings", async function () {
      const listAmount = 100;
      const listPrice = ethers.parseEther("0.02");
      
      // List tokens
      await token.approve(await marketplace.getAddress(), listAmount);
      await marketplace.listToken(listAmount, listPrice);
      
      // Purchase tokens
      const cost = BigInt(listAmount) * listPrice;
      await marketplace.connect(addr1).purchaseFromListing(1, { value: cost });
      
      // Verify token transfer
      expect(await token.balanceOf(addr1Address)).to.equal(listAmount);
      
      // Verify listing is no longer active
      const listing = await marketplace.getTokenListing(1);
      expect(listing.active).to.be.false;
      
      // Check ownership records
      const ownerships = await marketplace.getOwnershipTransfers();
      expect(ownerships.length).to.equal(1);
      expect(ownerships[0].from).to.equal(ownerAddress);
      expect(ownerships[0].to).to.equal(addr1Address);
      expect(ownerships[0].amount).to.equal(listAmount);
    });

    it("Should fail to purchase if not enough ETH is sent", async function () {
      const listAmount = 100;
      const listPrice = ethers.parseEther("0.02");
      
      // List tokens
      await token.approve(await marketplace.getAddress(), listAmount);
      await marketplace.listToken(listAmount, listPrice);
      
      // Try to purchase with insufficient funds
      const insufficientCost = BigInt(listAmount) * listPrice - 1n;
      await expect(
        marketplace.connect(addr1).purchaseFromListing(1, { value: insufficientCost })
      ).to.be.revertedWith("Insufficient ETH sent");
    });
    
    it("Should fail to list tokens if user doesn't have enough", async function () {
      // Transfer all tokens to addr1
      await token.transfer(addr1Address, TOTAL_SUPPLY);
      
      // Try to list tokens 
      await expect(
        marketplace.listToken(100, ethers.parseEther("0.02"))
      ).to.be.revertedWith("Insufficient Tokens To List!");
    });
  });
});