import { Model } from 'mongoose';

import { IBlockSync } from './models/block-sync.model';
import { IEscrow } from './models/escrow.model';
import { IOTC } from './models/otc.model';

interface IMongoCollection {
  otc: Model<IOTC>;
  blockSync: Model<IBlockSync>;
  escrow: Model<IEscrow>;
}

export { IMongoCollection };
