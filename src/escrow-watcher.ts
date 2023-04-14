import mongoose from 'mongoose';
import cron from 'node-cron';
import {
    ChainIDEnums, ContractType, getContractByContractType
} from 'omz-module';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import orderFactoryABI from './abis/order-factory.abi.json';
import { defineCollection } from './db';
import { IMongoCollection } from './db/collection';

export class EscrowWatcher {
    private EscrowCreateEventName = "Escrow_Create";

    private db: {
        connection: mongoose.Connection
        collection: IMongoCollection,
    };
    private chainID: ChainIDEnums = ChainIDEnums.ORDER_FACTORY; // Polygon
    private web3;
    private orderFactoryContract;

    constructor() { }

    public async init(): Promise<void> {
        const orderFactory = getContractByContractType(0, ContractType.ORDER_FACTORY);

        if (!orderFactory) {
            console.log("orderFactory is null");
            return;
        }

        this.db = await defineCollection();

        const syncedBlock = await this.db.collection.blockSync.findOne({
            chainID: this.chainID
        });

        if (!syncedBlock) {
            return;
        }

        this.web3 = new Web3(syncedBlock.nodeURI);
        this.orderFactoryContract = new this.web3.eth.Contract(orderFactoryABI as AbiItem[], orderFactory.address);
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

        console.log(latestBlockNumber);
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

            console.log(`Escrow Sync Block ${fromBlock} ~ ${toBlock}`);

            // event catch
            await this.getEscrowCreateEvent(fromBlock, toBlock);

            await this.db.collection.blockSync.findOneAndUpdate(
                { chainID: this.chainID },
                { lastBlockNumber: toBlock }
            )
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

            // merge exist otc
            await db.collection.otc.findOneAndUpdate(
                { id: eventValue.tradeID },
                { escrowContractAddress: eventValue.escrow }
            );
        }
    }

}