[... previous tests unchanged ...]

Clarinet.test({
  name: "Can track user assets correctly",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const assetId = 1;
    
    // Create asset
    let block = chain.mineBlock([
      Tx.contractCall('game-meta', 'create-asset', [
        types.uint(assetId),
        types.ascii("Test Asset"),
        types.ascii("Character"),
        types.utf8("{}"),
        types.bool(true)
      ], deployer.address)
    ]);
    
    // Check owner assets
    let ownerAssets = chain.mineBlock([
      Tx.contractCall('game-meta', 'get-user-assets', [
        types.principal(deployer.address)
      ], deployer.address)
    ]);
    
    ownerAssets.receipts[0].result.expectOk();
    // Add assertions for asset list
  }
});

Clarinet.test({
  name: "Can calculate and claim staking rewards",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const assetId = 1;
    
    // Create and stake asset
    chain.mineBlock([
      Tx.contractCall('game-meta', 'create-asset', [
        types.uint(assetId),
        types.ascii("Test Asset"),
        types.ascii("Character"),
        types.utf8("{}"),
        types.bool(true)
      ], deployer.address),
      Tx.contractCall('game-meta', 'stake-asset', [
        types.uint(assetId),
        types.uint(100)
      ], deployer.address)
    ]);
    
    // Advance chain
    chain.mineEmptyBlockUntil(110);
    
    // Calculate rewards
    let rewardsBlock = chain.mineBlock([
      Tx.contractCall('game-meta', 'calculate-rewards', [
        types.uint(assetId)
      ], deployer.address)
    ]);
    
    rewardsBlock.receipts[0].result.expectOk();
    // Add assertions for rewards calculation
  }
});
