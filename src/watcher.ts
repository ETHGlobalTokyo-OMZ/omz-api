import config, { IConfig } from 'config';
import mongoose from 'mongoose';
import cron from 'node-cron';
import {
    ChainIDEnums, ContractType, getContractByContractAddress,
    getContractByContractType, OrderEnums
} from 'omz-module';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import * as PushAPI from '@pushprotocol/restapi';
import { ENV } from '@pushprotocol/restapi/src/lib/constants';

import orderFactoryABI from './abis/order-factory.abi.json';
import sellerABI from './abis/seller.abi.json';
import { defineCollection } from './db';
import { IMongoCollection } from './db/collection';

const ethers = require('ethers');

export class Watcher {
    private explorerBase = "https://explorer.hyperlane.xyz/message/";

    private ListSellEventName = "ListSell";
    private EscrowCreateEventName = "Escrow_Create";
    private EscrowDepositEventName = "EscrowDeposit";
    private ResolveSellEventName = "ResolveSell";

    private db: {
        connection: mongoose.Connection
        collection: IMongoCollection,
    };
    private chainID: ChainIDEnums;
    private web3;
    private sellerContract;
    private orderFactoryContract;

    private pushOwner;

    constructor() { }

    public async init(chainID: ChainIDEnums): Promise<void> {

        const sellerVault = getContractByContractType(chainID, ContractType.SELLER_VAULT);
        if (!sellerVault) {
            console.log("sellerAddress is null");
            return;
        }

        const orderFactory = getContractByContractType(chainID, ContractType.ORDER_FACTORY);
        if (!orderFactory) {
            console.log("orderFactory is null");
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
        this.sellerContract = new this.web3.eth.Contract(sellerABI as AbiItem[], sellerVault.address);
        this.orderFactoryContract = new this.web3.eth.Contract(orderFactoryABI as AbiItem[], orderFactory.address);

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

            console.log(`ChainID: ${this.chainID}, Sync Block ${fromBlock} ~ ${toBlock}`);

            // event catch
            await this.getListSell(fromBlock, toBlock);
            await this.getEscrowCreateEvent(fromBlock, toBlock);
            await this.getEscrowDepositEvent(fromBlock, toBlock);
            await this.getResolveSell(fromBlock, toBlock);

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
                price: eventValue.order[1] / 10 ** 6,
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
                    URL: ${this.explorerBase + eventValue.mailID}
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
                    URL: ${this.explorerBase + eventValue.mailID}
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

    private async getEscrowCreateEvent(fromBlock, toBlock) {
        const pastEvents = await this.orderFactoryContract.getPastEvents(this.EscrowCreateEventName, {
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

            console.log(pastEvents);

            const newEscrow = new db.collection.escrow({
                tradeID: eventValue.tradeID,
                chainID: this.chainID,
                contractAddress: eventValue.escrow
            });

            await newEscrow.save();
        }
    }


    private async getEscrowDepositEvent(fromBlock, toBlock) {
        const pastEvents = await this.orderFactoryContract.getPastEvents(this.EscrowDepositEventName, {
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

            const escrow = await db.collection.escrow.findOne({
                chainID: this.chainID,
                contractAddress: eventValue.escrowAddr
            });

            if (!escrow) {
                continue;
            }

            const otc = await db.collection.otc.findOne(
                { tradeID: escrow.tradeID }
            );


            if (!otc) {
                continue;
            }

            await db.collection.otc.findOneAndUpdate(
                { tradeID: escrow.tradeID },
                {
                    buyer: eventValue.orderer,
                    buyChainID: this.chainID,
                    expiredTimestamp: Math.floor(Date.now() / 1000) + 86400,
                    status: OrderEnums.PROGRESS
                }
            );

            // push protocol to seller

            await PushAPI.payloads.sendNotification({
                senderType: 0,
                signer: this.pushOwner,
                type: 3, // target
                identityType: 0, // Minimal payload
                notification: {
                    title: `Your Asset is Solded!`,
                    body: `
                  URL: ${this.explorerBase + eventValue.mailID}
                  Chain: ${this.chainID}\n
                  Buyer: ${eventValue.orderer}\n
                  `
                },
                payload: {
                    title: `Your Asset is Solded!`,
                    body: `
                  URL: ${this.explorerBase + eventValue.mailID}
                  Chain: ${this.chainID}\n
                  Buyer: ${eventValue.orderer}\n
                  `,
                    cta: '',
                    img: ''
                },
                recipients: `eip155:5:${otc.seller}`, // recipient address
                channel: 'eip155:5:0x966c2443cebcC21A94047e2cF4Ff6DB1fCa897fE', // your channel address
                env: ENV.STAGING
            });
        }
    }


    private async getResolveSell(fromBlock, toBlock) {
        const pastEvents = await this.orderFactoryContract.getPastEvents(this.ResolveSellEventName, {
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

            const otc = await db.collection.otc.findOne({
                seller: eventValue.seller,
                sellerNonce: eventValue.nonce
            });


            if (!otc) {
                continue;
            }

            // push protocol to seller
            await PushAPI.payloads.sendNotification({
                senderType: 0,
                signer: this.pushOwner,
                type: 3, // target
                identityType: 0, // Minimal payload
                notification: {
                    title: `Seller Deposited!`,
                    body: `
                  URL: ${this.explorerBase + eventValue.mailID}
                  `
                },
                payload: {
                    title: `Seller Deposited!`,
                    body: `
                  URL: ${this.explorerBase + eventValue.mailID}
                  `,
                    cta: '',
                    img: ''
                },
                recipients: `eip155:5:${otc.buyer}`, // recipient address
                channel: 'eip155:5:0x966c2443cebcC21A94047e2cF4Ff6DB1fCa897fE', // your channel address
                env: ENV.STAGING
            });
        }
    }
}