import { Model } from 'mongoose';

import { IBlockSync } from './models/block-sync.model';
import { IOTC } from './models/otc.model';

interface IMongoCollection {
  otc: Model<IOTC>;
  blockSync: Model<IBlockSync>;
}

export { IMongoCollection };
