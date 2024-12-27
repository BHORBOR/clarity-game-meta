;; GameMeta Contract
;; Define constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-already-exists (err u102))
(define-constant err-unauthorized (err u103))

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

;; NFT implementation
(define-non-fungible-token game-asset uint)

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
        (ok true)
    )
)

;; Transfer asset
(define-public (transfer-asset (asset-id uint) (recipient principal))
    (let (
        (asset (unwrap! (map-get? assets {asset-id: asset-id}) err-not-found))
    )
        (asserts! (is-eq (get owner asset) tx-sender) err-unauthorized)
        (asserts! (get transferable asset) err-unauthorized)
        
        (try! (nft-transfer? game-asset asset-id tx-sender recipient))
        (map-set assets
            {asset-id: asset-id}
            (merge asset {owner: recipient})
        )
        (ok true)
    )
)

;; Get asset details
(define-read-only (get-asset (asset-id uint))
    (ok (unwrap! (map-get? assets {asset-id: asset-id}) err-not-found))
)

;; Check if user owns asset
(define-read-only (owns-asset? (user principal) (asset-id uint))
    (is-eq user (unwrap! (nft-get-owner? game-asset asset-id) false))
)

;; Get all assets owned by user
(define-read-only (get-user-assets (user principal))
    (ok (default-to (list) (map-get? asset-owners user)))
)