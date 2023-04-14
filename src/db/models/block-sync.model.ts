import { Schema } from 'mongoose';

interface IBlockSync {
  chainID: number;
  nodeURI: string;
  lastBlockNumber: number;
}

const BlockSyncSchema = new Schema<IBlockSync>({
  chainID: { type: Number, required: true },
  nodeURI: { type: String, required: true }, // need archive Node
  lastBlockNumber: { type: Number, default: 0 },
})

export { IBlockSync, BlockSyncSchema }
