;; GameMeta Contract
;; Define constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-already-exists (err u102))
(define-constant err-unauthorized (err u103))
(define-constant err-already-staked (err u104))
(define-constant err-not-staked (err u105))
(define-constant err-stake-period (err u106))

;; Define data variables
(define-map assets 
    {asset-id: uint}
    {
        owner: principal,
        name: (string-ascii 64),
        asset-type: (string-ascii 32),
        metadata: (string-utf8 256),
        transferable: bool
    }
)

(define-map asset-owners
    principal
    (list 100 uint)
)

(define-map staked-assets
    {asset-id: uint}
    {
        staker: principal,
        stake-height: uint,
        unlock-height: uint,
        rewards-rate: uint,
        claimed-rewards: uint
    }
)

;; NFT implementation
(define-non-fungible-token game-asset uint)

;; Private function to update asset owner list
(define-private (update-owner-assets (owner principal) (asset-id uint) (is-add bool))
    (let (
        (current-assets (default-to (list) (map-get? asset-owners owner)))
    )
        (if is-add
            (map-set asset-owners owner (append current-assets asset-id))
            (map-set asset-owners owner (filter not-eq? current-assets asset-id))
        )
    )
)

;; Create new asset
(define-public (create-asset (asset-id uint) 
                         (name (string-ascii 64))
                         (asset-type (string-ascii 32))
                         (metadata (string-utf8 256))
                         (transferable bool))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (asserts! (is-none (nft-get-owner? game-asset asset-id)) err-already-exists)
        
        (try! (nft-mint? game-asset asset-id tx-sender))
        (map-set assets
            {asset-id: asset-id}
            {
                owner: tx-sender,
                name: name,
                asset-type: asset-type, 
                metadata: metadata,
                transferable: transferable
            }
        )
        (update-owner-assets tx-sender asset-id true)
        (ok true)
    )
)

;; Calculate staking rewards
(define-read-only (calculate-rewards (asset-id uint))
    (let (
        (staked-asset (unwrap! (map-get? staked-assets {asset-id: asset-id}) err-not-staked))
        (current-height (get-block-height))
        (blocks-staked (- current-height (get stake-height staked-asset)))
        (unclaimed-blocks (- blocks-staked (get claimed-rewards staked-asset)))
    )
        (ok (* unclaimed-blocks (get rewards-rate staked-asset)))
    )
)

;; Claim staking rewards
(define-public (claim-rewards (asset-id uint))
    (let (
        (staked-asset (unwrap! (map-get? staked-assets {asset-id: asset-id}) err-not-staked))
        (current-height (get-block-height))
    )
        (asserts! (is-eq (get staker staked-asset) tx-sender) err-unauthorized)
        (map-set staked-assets
            {asset-id: asset-id}
            (merge staked-asset {claimed-rewards: (- current-height (get stake-height staked-asset))})
        )
        (ok (try! (calculate-rewards asset-id)))
    )
)

;; Transfer asset
(define-public (transfer-asset (asset-id uint) (recipient principal))
    (let (
        (asset (unwrap! (map-get? assets {asset-id: asset-id}) err-not-found))
    )
        (asserts! (is-eq (get owner asset) tx-sender) err-unauthorized)
        (asserts! (get transferable asset) err-unauthorized)
        (asserts! (is-none (map-get? staked-assets {asset-id: asset-id})) err-already-staked)
        
        (try! (nft-transfer? game-asset asset-id tx-sender recipient))
        (map-set assets
            {asset-id: asset-id}
            (merge asset {owner: recipient})
        )
        (update-owner-assets tx-sender asset-id false)
        (update-owner-assets recipient asset-id true)
        (ok true)
    )
)

[... remaining functions unchanged ...]
