const {ethers} = require("ethers");
const dingtalk = require("./dingTalk");
const {sprintf} = require("sprintf-js");


const WS_URL = ''
const wssProvider = new ethers.WebSocketProvider(WS_URL)

const abiERC20 = [
    'function name() view returns (string)',
    'function approve(address spender, uint256 tokens) returns (bool success)',
    'function totalSupply() view returns (uint256)',
    'function transferFrom(address from, address to, uint256 tokens) returns (bool success)',
    'function decimals() view returns (uint8)',
    'function balanceOf(address tokenOwner) view returns (uint256 balance)',
    'function symbol() view returns (string)',
    'function transfer(address to, uint256 tokens) returns (bool success)',
    'function allowance(address tokenOwner, address spender) view returns (uint256 remaining)',
    'event Transfer(address indexed from, address indexed to, uint256 tokens)',
    'event Approval(address indexed tokenOwner, address indexed spender, uint256 tokens)'
];

const abiERC721 = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function approve(address to, uint256 tokenId)',
    'function balanceOf(address owner) view returns (uint256 balance)',
    'function getApproved(uint256 tokenId) view returns (address operator)',
    'function isApprovedForAll(address owner, address operator) view returns (bool)',
    'function ownerOf(uint256 tokenId) view returns (address owner)',
    'function safeTransferFrom(address from, address to, uint256 tokenId)',
    'function safeTransferFrom(address from, address to, uint256 tokenId, bytes data)',
    'function setApprovalForAll(address operator, bool approved)',
    'function transferFrom(address from, address to, uint256 tokenId)',
    'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
    'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
    'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)'
]

async function isERC20Contract(address) {
    try {
        const contract = new ethers.Contract(address, abiERC20, wssProvider)
        const name = await contract.name();
        const symbol = await contract.symbol();
        const decimals = await contract.decimals();
        return name !== "" && symbol !== "" && decimals !== "";
    } catch (error) {
        return false;
    }
}

async function isERC721Contract(address) {
    try {
        const contract = new ethers.Contract(address, abiERC721, wssProvider);
        const name = await contract.name();
        const symbol = await contract.symbol();
        return name !== "" && symbol !== ""
    } catch (error) {
        return false
    }
}

async function dealTx(tx) {
    try {
        if (tx.to == null) {
            const receipt = await wssProvider.getTransactionReceipt(tx.hash);
            const logs = receipt.logs;
            for (let i = 0; i < logs.length; i++) {
                if (logs[i].address != null && logs[i].topics.length === 3) {
                    const address = logs[i].address;
                    if (await isERC20Contract(address) === true) {
                        const tokenInfo = new ethers.Contract(address, abiERC20, wssProvider);
                        const name = await tokenInfo.name();
                        const symbol = await tokenInfo.symbol();
                        const decimals = await tokenInfo.decimals();
                        const totalSupply = await tokenInfo.totalSupply();
                        const tokenAmount = ethers.formatUnits(totalSupply, decimals);
                        const msgString = sprintf("监控到新代币创建:%s(%s) 合约地址:%s, decimals:%d, totalSupply:%s\n",
                            name,
                            symbol,
                            address,
                            parseInt(decimals),
                            tokenAmount);
                        console.log(msgString);
                        dingtalk.dingTalk(msgString);
                        return;
                    } else if (await isERC721Contract(address) === true) {
                        const msgString = sprintf("监控到新NFT创建:%s(%s) 合约地址:%s\n",
                            name,
                            symbol,
                            address);
                        console.log(msgString);
                        dingtalk.dingTalk(msgString);
                    }
                }
            }
        }
    } catch (error) {
        console.log(error);
    }
}

async function dealBlock(blockNumber) {
    try {
        const block = await wssProvider.getBlock(blockNumber, true);
        const txArr = block.prefetchedTransactions;
        const promises = txArr.map((tx) => dealTx(tx));
        await Promise.all(promises);
    } catch (error) {
        console.log(error);
    }
}

const main = async () => {
    try {
        wssProvider.on("block", dealBlock);
    } catch (error) {
        console.log(error);
        dingtalk.dingTalk(error);
    }
}


process.on('uncaughtException', function (err) {
    //打印出错误
    console.log(err);
    //打印出错误的调用栈方便调试
    console.log(err.stack);
});

main();