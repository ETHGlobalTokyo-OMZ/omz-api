import { Schema } from 'mongoose';
import { ChainIDEnums, OrderEnums } from 'omz-module';

interface IOTC {
    tradeID: string;
    chainID: ChainIDEnums

    seller: string;
    sellerNonce: number;
    sellTokenName: string;
    sellTokenAddress: string;
    sellTokenAmount: number;

    price: number; // stable

    collateralTokenName: string;
    collateralTokenAddress: string;
    collateralTokenAmount: number;

    listingTimestamp: number;

    status: OrderEnums;
}

const OTCSchema = new Schema<IOTC>({
    tradeID: { type: String, required: true },
    chainID: { type: Number, required: true },

    seller: { type: String, required: true },
    sellerNonce: { type: Number, required: true },
    sellTokenName: { type: String, required: true },
    sellTokenAddress: { type: String, required: true },
    sellTokenAmount: { type: Number, required: true },

    price: { type: Number, required: true },

    collateralTokenName: { type: String, required: true },
    collateralTokenAddress: { type: String, required: true },
    collateralTokenAmount: { type: Number, required: true },

    listingTimestamp: { type: Number, require: true },

    status: { type: Number, required: true },
})

export { IOTC, OTCSchema }
