import mongoose from 'mongoose';
import cron from 'node-cron';
import {
    ChainIDEnums, getContractByContractAddress, IContract
} from 'omz-module';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import sellerABI from './abis/seller.abi.json';
import { defineCollection } from './db';
import { IMongoCollection } from './db/collection';

export class EventWatcher {
    private ListSellEventName = "ListSell";

    private db: {
        connection: mongoose.Connection
        collection: IMongoCollection,
    };
    private chainID: ChainIDEnums;
    private web3;
    private sellerContract

    constructor() { }

    public async init(chainID: ChainIDEnums, sellerContract: IContract | null): Promise<void> {
        if (!sellerContract) {
            console.log("sellerAddress is null");
            return;
        }

        this.chainID = chainID;
        this.db = await defineCollection();

        const syncedBlock = await this.db.collection.blockSync.findOne({
            chainID: this.chainID
        });

        if (!syncedBlock) {
            return;
        }

        this.web3 = new Web3(syncedBlock.nodeURI);
        this.sellerContract = new this.web3.eth.Contract(sellerABI as AbiItem[], sellerContract.address);
    }

    public async run(): Promise<void> {
        const runTask = cron.schedule('*/3 * * * * *', async () => { // every 3 sec
            await this.getEvents();
        }, {
            scheduled: false,
            timezone: 'Asia/Tokyo',
        });
        runTask.start();
    }

    private async getEvents() {
        const latestBlockNumber = await this.web3.eth.getBlockNumber();

        const syncedBlock = await this.db.collection.blockSync.findOne({
            chainID: this.chainID
        });

        if (!syncedBlock) {
            console.log("synced block number error");
            return;
        }

        if (latestBlockNumber <= syncedBlock.lastBlockNumber) {
            // already full synced;
            return;
        }

        for (let fromBlock = syncedBlock.lastBlockNumber + 1; fromBlock <= latestBlockNumber; fromBlock += 451) {
            let toBlock = fromBlock + 450;
            if (toBlock >= latestBlockNumber) {
                toBlock = latestBlockNumber;
            }

            console.log(`Sync Block ${fromBlock} ~ ${toBlock}`);

            // event catch
            await this.getListSell(fromBlock, toBlock);

            await this.db.collection.blockSync.findOneAndUpdate(
                { chainID: this.chainID },
                { lastBlockNumber: toBlock }
            )
        }
    }

    private async getListSell(fromBlock, toBlock) {
        const pastEvents = await this.sellerContract.getPastEvents(this.ListSellEventName, {
            fromBlock: fromBlock,
            toBlock: toBlock
        });

        if (pastEvents.length === 0) {
            return;
        }

        const db = await defineCollection();

        for (const pastEvent of pastEvents) {
            const eventValue = pastEvent.returnValues;

            if (!eventValue) {
                continue;
            }

            // past Event insert in db
            const sellToken = getContractByContractAddress(this.chainID, eventValue.order[5]);
            if (!sellToken) {
                console.log('sell token is null');
                return;
            }

            const collateralToken = getContractByContractAddress(this.chainID, eventValue.order[6]);
            if (!collateralToken) {
                console.log('collateral token is null');
                return;
            }

            const newOTC = new db.collection.otc({
                seller: eventValue.order[0],
                sellTokenName: sellToken.tokenName,
                sellTokenAddress: "0x0000000000000000000000000000000000000000",
                sellTokenAmount: eventValue.order[2],
                price: eventValue.order[1],
                collateralTokenName: collateralToken.tokenName,
                collateralTokenAddress: "0x0000000000000000000000000000000000000000",
                collateralTokenAmount: eventValue.order[3],
                listingTimestamp: eventValue.order[4],
                status: 0
            });

            await newOTC.save();
        }

        // Result {
        //     seller: '0xF44A53ac17779f27ae9Fc4B352Db4157aDE7a35C',
        //     chainId: '0',
        //     nonce: '1',
        //     order: [
        //       '0xF44A53ac17779f27ae9Fc4B352Db4157aDE7a35C',
        //       '1000000000000000000',
        //       '1000000000000000000',
        //       '100000000',
        //       '1681474815',
        //       to: '0xF44A53ac17779f27ae9Fc4B352Db4157aDE7a35C',
        //       bob_amount: '1000000000000000000',
        //       native_amount: '1000000000000000000',
        //       collateral_amount: '100000000',
        //       time_lock_start: '1681474815'
        //     ],
        //     sig: [
        //       '27',
        //       '0xcf8e2fdfd44b98e3be93e195f8457de347eda293a9e9f2869225263172d5bc3d',
        //       '0x7654cc9759f17b2d0f38597e5dc2668e0cd912d53154d31a42c56cee82e3c0d9',
        //       v: '27',
        //       r: '0xcf8e2fdfd44b98e3be93e195f8457de347eda293a9e9f2869225263172d5bc3d',
        //       s: '0x7654cc9759f17b2d0f38597e5dc2668e0cd912d53154d31a42c56cee82e3c0d9'
        //     ]
        //   }
    }

}