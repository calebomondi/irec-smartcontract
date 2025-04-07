// scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
  console.log("Starting deployment process...");
  
  // Get the signers
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);
  
  // Display account balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} ETH`);
    /*
  // 1. Deploy the NFT contract first
  console.log("\n1. Deploying IRECCertNFT contract...");
  const IRECCertNFT = await ethers.getContractFactory("IRECCertNFT");
  const nftContract = await IRECCertNFT.deploy(
    "IREC Certificate",                     //name
    "IREC",                                 //symbol       
    "https://www.jsonkeeper.com/b/YDXG/"    // base URI for metadata
  );
  await nftContract.deploymentTransaction()?.wait();
  
  const nftAddress = await nftContract.getAddress();
  console.log(`IRECCertNFT deployed to: ${nftAddress}`);
  
  // Get the token ID of the minted NFT (it is 0 for the first NFT)
  const tokenId = 0;
  
  // 2. Deploy the Token contract that links to the NFT
  console.log("\n2. Deploying IRECCertTokens contract...");
  const IRECCertTokens = await ethers.getContractFactory("IRECCertTokens");
  const totalSupply = ethers.parseEther("1000"); // 1000 tokens with 18 decimals
  
  const tokenContract = await IRECCertTokens.deploy(
    totalSupply,         // total supply
    "IREC Tokens",       // name
    "IRET",              // symbol
    "0x8539DA660BFEd7c0F49728CDA6726BeB1ecf2cBA",          // NFT contract address
    tokenId              // NFT token ID
  );
  await tokenContract.deploymentTransaction()?.wait();
  
  const tokenAddress = await tokenContract.getAddress();
  console.log(`IRECCertTokens deployed to: ${tokenAddress}`);
  */
  // 3. Deploy the Marketplace contract that uses the tokens
  console.log("\n3. Deploying IRECMarketplace contract...");
  const IRECMarketplace = await ethers.getContractFactory("IRECMarketplace");
  const marketplace = await IRECMarketplace.deploy("0x953894c851453758b3Ec420f75e96217241DC038");
  await marketplace.deploymentTransaction()?.wait();
  
  const marketplaceAddress = await marketplace.getAddress();
  console.log(`IRECMarketplace deployed to: ${marketplaceAddress}`);

  /*
  // Verify contracts on Etherscan
  const network = await ethers.provider.getNetwork();
  if (network.name !== "localhost" && network.name !== "hardhat") {
    console.log("\nVerifying contracts on Etherscan...");
    console.log("Waiting for block confirmations...");
    
    // Wait for block confirmation
    await new Promise(resolve => setTimeout(resolve, 30000));  // 30 seconds
    
    // Import hre for verification
    const hre = require("hardhat");
    
    // Verify NFT contract
    await hre.run("verify:verify", {
      address: "0x8539DA660BFEd7c0F49728CDA6726BeB1ecf2cBA",
      constructorArguments: [
        "IREC Certificate",
        "IREC",
        "https://www.jsonkeeper.com/b/YDXG/"
      ],
    });
    
    // Verify Token contract
    await hre.run("verify:verify", {
      address: tokenAddress,
      constructorArguments: [
        totalSupply,
        "IREC Tokens",
        "IRET",
        "0x8539DA660BFEd7c0F49728CDA6726BeB1ecf2cBA",
        tokenId
      ],
    });
    /*
    // Verify Marketplace contract
    await hre.run("verify:verify", {
      address: marketplaceAddress,
      constructorArguments: [tokenAddress],
    });
    */
    console.log("Contract verification complete!");
}

// Execute the deployment
main()
.then(() => process.exit(0))
.catch((error: any) => {
  console.error(error);
  process.exit(1);
});