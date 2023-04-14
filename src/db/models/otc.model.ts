import { Schema } from 'mongoose';
import { ChainIDEnums, OrderEnums } from 'omz-module';

interface IOTC {
    id: string;
    chain: ChainIDEnums

    seller: string;
    sellTokenName: string;
    sellTokenAddress: string;
    sellTokenAmount: number;

    price: number; // stable

    collateralTokenName: string;
    collateralTokenAddress: number;
    collateralTokenAmount: number;

    listingTimestamp: number;
    status: OrderEnums;
}

const OTCSchema = new Schema<IOTC>({
    id: { type: String, required: true },
    chain: { type: Number, required: true },

    seller: { type: String, required: true },
    sellTokenName: { type: String, required: true },
    sellTokenAddress: { type: String, required: true },
    sellTokenAmount: { type: Number, required: true },
    price: { type: Number, required: true },
    collateralTokenName: { type: String, required: true },
    collateralTokenAddress: { type: Number, required: true },
    collateralTokenAmount: { type: Number, required: true },
    listingTimestamp: { type: Number, require: true },
    status: { type: Number, required: true },
})

export { IOTC, OTCSchema }
