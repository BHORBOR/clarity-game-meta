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
    
    // Verify asset exists
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
  name: "Can transfer owned asset",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const assetId = 1;
    
    // First create asset
    let block = chain.mineBlock([
      Tx.contractCall('game-meta', 'create-asset', [
        types.uint(assetId),
        types.ascii("Test Asset"),
        types.ascii("Character"),
        types.utf8("{}"),
        types.bool(true)
      ], deployer.address)
    ]);
    
    // Then transfer it
    let transferBlock = chain.mineBlock([
      Tx.contractCall('game-meta', 'transfer-asset', [
        types.uint(assetId),
        types.principal(wallet1.address)
      ], deployer.address)
    ]);
    
    transferBlock.receipts[0].result.expectOk();
    
    // Verify new owner
    let ownerBlock = chain.mineBlock([
      Tx.contractCall('game-meta', 'owns-asset?', [
        types.principal(wallet1.address),
        types.uint(assetId)
      ], deployer.address)
    ]);
    
    assertEquals(ownerBlock.receipts[0].result, types.bool(true));
  }
});

Clarinet.test({
  name: "Non-owner cannot create assets",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('game-meta', 'create-asset', [
        types.uint(1),
        types.ascii("Test Asset"),
        types.ascii("Character"),
        types.utf8("{}"),
        types.bool(true)
      ], wallet1.address)
    ]);
    
    block.receipts[0].result.expectErr(types.uint(100)); // err-owner-only
  }
});