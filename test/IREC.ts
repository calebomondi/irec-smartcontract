import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("IREC Contract Tests", function () {
  // Test fixture to deploy contracts once and reuse for multiple tests
  async function deployContractsFixture() {
    const [owner, buyer1, buyer2, seller1] = await ethers.getSigners();
    
    // Deploy NFT contract first
    const IRECCertNFT = await ethers.getContractFactory("IRECCertNFT");
    const baseTokenURI = "ipfs://QmXyz..."; // Replace with actual IPFS URI
    const nftContract = await IRECCertNFT.deploy("IREC Certificate", "IREC", baseTokenURI);
    await nftContract.waitForDeployment();
    
    // Mint an NFT to the owner
    const mintTx = await nftContract.safeMint(owner.address);
    await mintTx.wait();
    const tokenId = 0; // First token ID should be 0
    
    // Deploy Token contract
    const IRECCertTokens = await ethers.getContractFactory("IRECCertTokens");
    const totalSupply = ethers.parseEther("1000"); // 1000 tokens
    const tokenContract = await IRECCertTokens.deploy(
      totalSupply,
      "IREC Tokens",
      "IRET",
      await nftContract.getAddress(),
      tokenId
    );
    await tokenContract.waitForDeployment();
    
    // Deploy Marketplace contract
    const IRECMarketplace = await ethers.getContractFactory("IRECMarketplace");
    const marketplace = await IRECMarketplace.deploy(await tokenContract.getAddress());
    await marketplace.waitForDeployment();
    
    // Set sale price in marketplace
    const pricePerToken = ethers.parseEther("0.01"); // 0.01 ETH per token
    await marketplace.configureSale(pricePerToken);
    
    return { 
      nftContract, 
      tokenContract, 
      marketplace, 
      owner, 
      buyer1, 
      buyer2, 
      seller1, 
      tokenId,
      pricePerToken,
      totalSupply
    };
  }

  /*
   * IRECCertNFT Contract Tests
   */
  describe("IRECCertNFT", function () {
    it("Should deploy and mint NFT correctly", async function () {
      const { nftContract, owner, tokenId } = await loadFixture(deployContractsFixture);
      
      // Check NFT ownership
      expect(await nftContract.ownerOf(tokenId)).to.equal(owner.address);
      
      // Check token count
      expect(await nftContract.getTokenIdCount()).to.equal(1);
    });
    
    it("Should set token URI correctly", async function () {
      const { nftContract, tokenId } = await loadFixture(deployContractsFixture);
      
      const tokenURI = await nftContract.tokenURI(tokenId);
      expect(tokenURI).to.not.be.empty;
    });
    
    it("Should allow owner to set new base URI", async function () {
      const { nftContract, owner } = await loadFixture(deployContractsFixture);
      
      const newBaseURI = "ipfs://QmNew...";
      await nftContract.connect(owner).setBaseURI(newBaseURI);
      
      // We can't directly check the private _baseTokenURI, but we can mint a new token
      // and check its URI which should use the new base URI
      await nftContract.connect(owner).safeMint(owner.address);
      const newTokenId = 1;
      const tokenURI = await nftContract.tokenURI(newTokenId);
      expect(tokenURI).to.include(newBaseURI);
    });
    
    it("Should not allow non-owner to mint", async function () {
      const { nftContract, buyer1 } = await loadFixture(deployContractsFixture);
      
      await expect(
        nftContract.connect(buyer1).safeMint(buyer1.address)
      ).to.be.revertedWithCustomError(nftContract, "OwnableUnauthorizedAccount");
    });
  });

  /*
   * IRECCertTokens Contract Tests
   */
  describe("IRECCertTokens", function () {
    it("Should deploy with correct initial supply", async function () {
      const { tokenContract, owner, totalSupply } = await loadFixture(deployContractsFixture);
      
      const balance = await tokenContract.balanceOf(owner.address);
      expect(balance).to.equal(totalSupply);
    });
    
    it("Should correctly set NFT contract address and token ID", async function () {
      const { tokenContract, nftContract, tokenId } = await loadFixture(deployContractsFixture);
      
      expect(await tokenContract.nftContract()).to.equal(await nftContract.getAddress());
      expect(await tokenContract.nftTokenId()).to.equal(tokenId);
    });
    
    it("Should allow owner to call mintTokensFromNFT", async function () {
      const { tokenContract, nftContract, owner, tokenId } = await loadFixture(deployContractsFixture);
      
      // First, we need to approve the token contract to transfer the NFT
      await nftContract.connect(owner).approve(await tokenContract.getAddress(), tokenId);
      
      // Now call mintTokensFromNFT
      await tokenContract.connect(owner).mintTokensFromNFT();
      
      // Check NFT ownership has been transferred to the token contract
      expect(await nftContract.ownerOf(tokenId)).to.equal(await tokenContract.getAddress());
    });
    
    it("Should not allow non-owner to call mintTokensFromNFT", async function () {
      const { tokenContract, buyer1 } = await loadFixture(deployContractsFixture);
      
      await expect(
        tokenContract.connect(buyer1).mintTokensFromNFT()
      ).to.be.revertedWithCustomError(tokenContract, "OwnableUnauthorizedAccount");
    });
  });

  /*
   * IRECMarketplace Contract Tests
   */
  describe("IRECMarketplace", function () {
    // Helper function to setup tokens for marketplace testing
    async function setupMarketplaceTokens() {
      const fixture = await loadFixture(deployContractsFixture);
      const { tokenContract, marketplace, owner } = fixture;
      
      // Approve marketplace to spend tokens
      await tokenContract.connect(owner).approve(
        await marketplace.getAddress(),
        ethers.parseEther("1000")
      );
      
      // Deposit reserve tokens to marketplace
      await marketplace.connect(owner).depositReserveTokens();
      
      return fixture;
    }
    
    it("Should deploy with correct token contract", async function () {
      const { marketplace, tokenContract } = await loadFixture(deployContractsFixture);
      
      expect(await marketplace.fractionToken()).to.equal(await tokenContract.getAddress());
    });
    
    it("Should configure sale price correctly", async function () {
      const { marketplace, pricePerToken } = await loadFixture(deployContractsFixture);
      
      expect(await marketplace.salePrice()).to.equal(pricePerToken);
    });
    
    it("Should deposit reserve tokens correctly", async function () {
      const { marketplace, tokenContract, totalSupply } = await setupMarketplaceTokens();
      
      // Check if tokens were transferred to marketplace
      const marketplaceBalance = await tokenContract.balanceOf(await marketplace.getAddress());
      expect(marketplaceBalance).to.equal(totalSupply);
    });
    
    it("Should allow users to purchase tokens from reserve", async function () {
      const { marketplace, tokenContract, buyer1, pricePerToken } = await setupMarketplaceTokens();
      
      const tokenAmount = 5;
      const ethToSend = pricePerToken * BigInt(tokenAmount);
      
      // Initial balance
      const initialBalance = await tokenContract.balanceOf(buyer1.address);
      
      // Purchase tokens
      await marketplace.connect(buyer1).purchaseFromReserve(tokenAmount, { value: ethToSend });
      
      // Check if tokens were transferred
      const finalBalance = await tokenContract.balanceOf(buyer1.address);
      expect(finalBalance - initialBalance).to.equal(ethToSend / pricePerToken);
      
      // Check ownership tracking
      const transfers = await marketplace.getOwnershipTransfers();
      expect(transfers.length).to.be.at.least(1);
      
      const lastTransfer = transfers[transfers.length - 1];
      expect(lastTransfer.from).to.equal(await marketplace.getAddress());
      expect(lastTransfer.to).to.equal(buyer1.address);
      expect(lastTransfer.amount).to.equal(tokenAmount);
    });
    
    it("Should fail purchase if not enough ETH sent", async function () {
      const { marketplace, buyer1, pricePerToken } = await setupMarketplaceTokens();
      
      const tokenAmount = 5;
      const insufficientEth = pricePerToken * BigInt(tokenAmount) - BigInt(1);
      
      await expect(
        marketplace.connect(buyer1).purchaseFromReserve(tokenAmount, { value: insufficientEth })
      ).to.be.revertedWith("Must send ETH");
    });
    
    it("Should allow users to list tokens for sale", async function () {
      const { marketplace, tokenContract, owner, buyer1, pricePerToken } = await setupMarketplaceTokens();
      
      // First, transfer some tokens to buyer1 so they can list them
      const tokenAmount = 10;
      const ethToSend = pricePerToken * BigInt(tokenAmount);
      await marketplace.connect(buyer1).purchaseFromReserve(tokenAmount, { value: ethToSend });
      
      // Now buyer1 lists tokens for sale
      const listPrice = ethers.parseEther("0.015"); // Higher than original price
      await tokenContract.connect(buyer1).approve(await marketplace.getAddress(), tokenAmount);
      await marketplace.connect(buyer1).listToken(tokenAmount, listPrice);
      
      // Check listing was created
      const listingCount = await marketplace.listingCount();
      expect(listingCount).to.equal(1);
      
      const listing = await marketplace.getTokenListing(listingCount);
      expect(listing.seller).to.equal(buyer1.address);
      expect(listing.amount).to.equal(tokenAmount);
      expect(listing.pricePerToken).to.equal(listPrice);
      expect(listing.active).to.be.true;
    });
    
    it("Should allow users to purchase from listings", async function () {
      const { marketplace, tokenContract, owner, buyer1, buyer2 } = await setupMarketplaceTokens();
      
      // First, transfer some tokens to buyer1 so they can list them
      const tokenAmount = 10;
      const purchasePrice = ethers.parseEther("0.01") * BigInt(tokenAmount);
      await marketplace.connect(buyer1).purchaseFromReserve(tokenAmount, { value: purchasePrice });
      
      // Now buyer1 lists tokens for sale
      const listPrice = ethers.parseEther("0.015"); // Higher than original price
      const totalListingPrice = listPrice * BigInt(tokenAmount);
      await tokenContract.connect(buyer1).approve(await marketplace.getAddress(), tokenAmount);
      await marketplace.connect(buyer1).listToken(tokenAmount, listPrice);
      
      const listingId = await marketplace.listingCount();
      
      // Initial balances
      const initialSellerBalance = await ethers.provider.getBalance(buyer1.address);
      const initialBuyerTokenBalance = await tokenContract.balanceOf(buyer2.address);
      
      // Buyer2 purchases from the listing
      await marketplace.connect(buyer2).purchaseFromListing(listingId, { value: totalListingPrice });
      
      // Check tokens were transferred to buyer2
      const finalBuyerTokenBalance = await tokenContract.balanceOf(buyer2.address);
      expect(finalBuyerTokenBalance - initialBuyerTokenBalance).to.equal(tokenAmount);
      
      // Check ETH was transferred to seller
      const finalSellerBalance = await ethers.provider.getBalance(buyer1.address);
      expect(finalSellerBalance > initialSellerBalance).to.be.true;
      
      // Check listing is no longer active
      const listing = await marketplace.getTokenListing(listingId);
      expect(listing.active).to.be.false;
      
      // Check ownership tracking
      const transfers = await marketplace.getOwnershipTransfers();
      const lastTransfer = transfers[transfers.length - 1];
      expect(lastTransfer.from).to.equal(buyer1.address);
      expect(lastTransfer.to).to.equal(buyer2.address);
    });
    
    it("Should calculate ownership percentage correctly", async function () {
      const { marketplace, tokenContract, buyer1, owner, totalSupply } = await setupMarketplaceTokens();
      
      // Purchase 10% of tokens
      const tokenAmount = Number(totalSupply) / 10;
      const ethToSend = ethers.parseEther("0.01") * BigInt(tokenAmount);
      
      await marketplace.connect(buyer1).purchaseFromReserve(tokenAmount, { value: ethToSend });
      
      // Check ownership percentage (multiplied by 10000 in the contract)
      const percentage = await marketplace.getOwnershipPercentage(buyer1.address);
      expect(percentage).to.be.closeTo(1000n, 5n); // Should be around 10% (1000 basis points) with small rounding tolerance
    });
  });
});