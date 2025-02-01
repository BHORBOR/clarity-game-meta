import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Can create new asset as contract owner",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const assetId = 1;
    
    let block = chain.mineBlock([
      Tx.contractCall('game-meta', 'create-asset', [
        types.uint(assetId),
        types.ascii("Test Asset"),
        types.ascii("Character"),
        types.utf8("{}"),
        types.bool(true)
      ], deployer.address)
    ]);
    
    block.receipts[0].result.expectOk();
    
    let assetBlock = chain.mineBlock([
      Tx.contractCall('game-meta', 'get-asset', [
        types.uint(assetId)
      ], deployer.address)
    ]);
    
    const asset = assetBlock.receipts[0].result.expectOk();
    assertEquals(asset.owner, deployer.address);
  }
});

Clarinet.test({
  name: "Can stake owned asset",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
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
    
    // Stake asset
    let stakeBlock = chain.mineBlock([
      Tx.contractCall('game-meta', 'stake-asset', [
        types.uint(assetId),
        types.uint(100)
      ], deployer.address)
    ]);
    
    stakeBlock.receipts[0].result.expectOk();
    
    // Verify staking
    let stakingBlock = chain.mineBlock([
      Tx.contractCall('game-meta', 'get-staking-info', [
        types.uint(assetId)
      ], deployer.address)
    ]);
    
    const stakeInfo = stakingBlock.receipts[0].result.expectOk();
    assertEquals(stakeInfo.staker, deployer.address);
  }
});

Clarinet.test({
  name: "Cannot transfer staked asset",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
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
    
    // Try to transfer
    let transferBlock = chain.mineBlock([
      Tx.contractCall('game-meta', 'transfer-asset', [
        types.uint(assetId),
        types.principal(wallet1.address)
      ], deployer.address)
    ]);
    
    transferBlock.receipts[0].result.expectErr(types.uint(104)); // err-already-staked
  }
});
