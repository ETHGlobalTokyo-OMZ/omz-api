import config, { IConfig } from 'config';
import mongoose from 'mongoose';
import cron from 'node-cron';
import {
    ChainIDEnums, getContractByContractAddress, IContract
} from 'omz-module';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import * as PushAPI from '@pushprotocol/restapi';
import { ENV } from '@pushprotocol/restapi/src/lib/constants';

import sellerABI from './abis/seller.abi.json';
import { defineCollection } from './db';
import { IMongoCollection } from './db/collection';

const ethers = require('ethers');

export class SellerWatcher {
    private ListSellEventName = "ListSell";

    private db: {
        connection: mongoose.Connection
        collection: IMongoCollection,
    };
    private chainID: ChainIDEnums;
    private web3;
    private sellerContract

    private pushOwner;

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

        const pushConfig = config.get<IConfig>('Push');
        this.pushOwner = new ethers.Wallet(pushConfig.get('pk'));
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

            console.log(`Seller Sync Block ${fromBlock} ~ ${toBlock}`);

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
            console.log(eventValue);

            // past Event insert in db
            const sellToken = getContractByContractAddress(this.chainID, eventValue.order[2]);
            if (!sellToken) {
                console.log('sell token is null');
                return;
            } else if (!sellToken.decimal) {
                console.log('sell token decimal null');
                return;
            }

            const collateralToken = getContractByContractAddress(this.chainID, eventValue.order[4]);
            if (!collateralToken) {
                console.log('collateral token is null');
                return;
            } else if (!collateralToken.decimal) {
                console.log('collateral token decimal null');
                return;
            }

            const newOTC = new db.collection.otc({
                tradeID: eventValue.tradeID,
                chainID: this.chainID,
                seller: eventValue.order[0],
                sellerNonce: eventValue.nonce,
                sellTokenName: sellToken.tokenName,
                sellTokenAddress: sellToken.address,
                sellTokenAmount: eventValue.order[3] / 10 ** sellToken.decimal,
                price: eventValue.order[1] / 10 ** 18,
                collateralTokenName: collateralToken.tokenName,
                collateralTokenAddress: collateralToken.address,
                collateralTokenAmount: eventValue.order[5] / 10 ** collateralToken.decimal,
                listingTimestamp: eventValue.order[6],
                status: 0
            });

            await PushAPI.payloads.sendNotification({
                senderType: 0,
                signer: this.pushOwner,
                type: 1, // broadcast
                identityType: 2, // direct payload
                notification: {
                    title: `New Listing ${newOTC.sellTokenName}`,
                    body:
                        `
                    Token: ${newOTC.sellTokenName}\n
                    Token Amount: ${newOTC.sellTokenAmount}\n
                    Price: ${newOTC.price}\n\n
                    Collateral Token: ${newOTC.collateralTokenName}\n
                    Collateral Amount: ${newOTC.collateralTokenAmount}
                    `
                },
                payload: {
                    title: `New Listing ${newOTC.sellTokenName}`,
                    body:
                        `
                    Token: ${newOTC.sellTokenName}\n
                    Token Amount: ${newOTC.sellTokenAmount}\n
                    Price: ${newOTC.price}\n\n
                    Collateral Token: ${newOTC.collateralTokenName}\n
                    Collateral Amount: ${newOTC.collateralTokenAmount}
                    `,
                    cta: '',
                    img: ''
                },
                channel: 'eip155:5:0x966c2443cebcC21A94047e2cF4Ff6DB1fCa897fE', // your channel address
                env: ENV.STAGING
            });

            await newOTC.save();
        }
    }

}