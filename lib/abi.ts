export const ATTESTATION_VERIFIER = {
  address: "0x913f3f178038e99938a38718014f1e0b41197a2b" as const,
  abi: [
    {"inputs":[{"internalType":"address","name":"_owner","type":"address"},{"internalType":"address","name":"_signer","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
    {"inputs":[],"name":"ECDSAInvalidSignature","type":"error"},
    {"inputs":[{"internalType":"uint256","name":"length","type":"uint256"}],"name":"ECDSAInvalidSignatureLength","type":"error"},
    {"inputs":[{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"ECDSAInvalidSignatureS","type":"error"},
    {"inputs":[],"name":"InvalidShortString","type":"error"},
    {"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},
    {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},
    {"inputs":[{"internalType":"string","name":"str","type":"string"}],"name":"StringTooLong","type":"error"},
    {"anonymous":false,"inputs":[],"name":"EIP712DomainChanged","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"signer","type":"address"}],"name":"SignerUpdated","type":"event"},
    {"inputs":[],"name":"SCORE_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"eip712Domain","outputs":[{"internalType":"bytes1","name":"fields","type":"bytes1"},{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"version","type":"string"},{"internalType":"uint256","name":"chainId","type":"uint256"},{"internalType":"address","name":"verifyingContract","type":"address"},{"internalType":"bytes32","name":"salt","type":"bytes32"},{"internalType":"uint256[]","name":"extensions","type":"uint256[]"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"_signer","type":"address"}],"name":"setSigner","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"signer","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"bytes","name":"payload","type":"bytes"},{"internalType":"bytes","name":"sig","type":"bytes"}],"name":"verifyAndScore","outputs":[{"internalType":"uint256","name":"fid","type":"uint256"},{"internalType":"uint256","name":"day","type":"uint256"},{"internalType":"uint64","name":"dss","type":"uint64"},{"internalType":"bool","name":"valid","type":"bool"}],"stateMutability":"view","type":"function"}
  ] as const
};

export const TAMABOT_CORE = {
  address: "0x25f68f020e0c8db4b1b7e2d89477c324944a7d51" as const,
  abi: [
    {"inputs":[{"internalType":"address","name":"_royaltyReceiver","type":"address"},{"internalType":"uint96","name":"_royaltyBps","type":"uint96"},{"internalType":"string","name":"_baseRenderer","type":"string"}],"stateMutability":"nonpayable","type":"constructor"},
    {"inputs":[],"name":"MAX_SUPPLY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint64","name":"fid","type":"uint64"}],"name":"mint","outputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"stateMutability":"payable","type":"function"},
    {"inputs":[],"name":"mintFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"fid","type":"uint256"}],"name":"tokenIdByFID","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"feed","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"play","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"clean","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"rest","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getState","outputs":[{"components":[{"internalType":"uint64","name":"level","type":"uint64"},{"internalType":"uint64","name":"xp","type":"uint64"},{"internalType":"int32","name":"mood","type":"int32"},{"internalType":"uint64","name":"hunger","type":"uint64"},{"internalType":"uint64","name":"energy","type":"uint64"},{"internalType":"uint64","name":"cleanliness","type":"uint64"},{"internalType":"uint64","name":"lastTick","type":"uint64"},{"internalType":"uint64","name":"fid","type":"uint64"}],"internalType":"struct PetState","name":"","type":"tuple"}],"stateMutability":"view","type":"function"}
  ] as const
};
