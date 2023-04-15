import config, { IConfig } from 'config';
import mongoose, { model } from 'mongoose';

import { IMongoCollection } from './collection';
import { BlockSyncSchema, IBlockSync } from './models/block-sync.model';
import { EscrowSchema, IEscrow } from './models/escrow.model';
import { IOTC, OTCSchema } from './models/otc.model';

async function createConnection(): Promise<mongoose.Connection> {
  const mConfig = config.get<IConfig>('Mongo');
  const username = mConfig.get('username');
  const password = encodeURIComponent(mConfig.get('password'));
  const host = mConfig.get('host');
  const port = mConfig.get('port');
  const db = mConfig.get('db');

  let uri = '';
  if (username && password) {
    uri = `mongodb://${username}:${password}@${host}:${port}/${db}?authSource=admin`;
  } else {
    uri = `mongodb://${host}:${port}/${db}`;
  }

  try {
    const connection = await mongoose.connect(uri)
    return connection.connection;
  } catch (err) {
    throw new Error(`MongoDB connection error: ${err}`);
  }
}

async function defineCollection(): Promise<{
  connection: mongoose.Connection
  collection: IMongoCollection,
}> {
  const connection = await createConnection();

  const OTCModel = model<IOTC>('OTC', OTCSchema, 'OTC', { connection });
  const BlockSyncModel = model<IBlockSync>('BlockSync', BlockSyncSchema, 'BlockSync', { connection });
  const EscrowModel = model<IEscrow>('Escrow', EscrowSchema, 'Escrow', { connection });

  const collection: IMongoCollection = {
    otc: OTCModel,
    blockSync: BlockSyncModel,
    escrow: EscrowModel
  }

  return { connection, collection };
}


export {
  defineCollection,
  IOTC,
  IBlockSync,
}
