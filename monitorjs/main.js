const {ethers} = require("ethers");
const dingtalk = require("./dingTalk");
const {sprintf} = require("sprintf-js");


const WS_URL = ''
const wssProvider = new ethers.providers.WebSocketProvider(WS_URL)

const abiERC20 = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint)",
    "function decimals() view returns (uint8)",
];

async function isTokenContract(address) {
    try {
        const contract = new ethers.Contract(address, abiERC20, wssProvider);
        const name = await contract.name();
        const symbol = await contract.symbol();
        const decimals = await contract.decimals();
        return name !== "" && symbol !== "" && decimals !== "";
    } catch (error) {
        return false;
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
                    if (await isTokenContract(address) === true) {
                        const tokenInfo = new ethers.Contract(address, abiERC20, wssProvider);
                        const name = await tokenInfo.name();
                        const symbol = await tokenInfo.symbol();
                        const decimals = await tokenInfo.decimals();
                        const totalSupply = await tokenInfo.totalSupply();
                        const tokenAmount = ethers.utils.formatUnits(totalSupply, decimals);
                        const msgString = sprintf("【%s】监控到新代币创建:%s(%s) 合约地址:%s, decimals:%d, totalSupply:%s\n",
                            "Arbitrum",
                            name,
                            symbol,
                            address,
                            parseInt(decimals),
                            tokenAmount);
                        console.log(msgString);
                        dingtalk.dingTalk(msgString);
                        return;
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
        const block = await wssProvider.getBlockWithTransactions(blockNumber);
        const txArr = block.transactions;
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