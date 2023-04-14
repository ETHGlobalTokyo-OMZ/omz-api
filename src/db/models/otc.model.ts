import { Schema } from 'mongoose';

interface IOTC {
    seller: string;
    sellTokenName: string;
    sellTokenAddress: string;
    sellTokenAmount: number;
    price: number;
    collateralTokenAddress: number;
    collateralTokenAmount: number;
    listingTimestamp: number;
    status: number;
}

const OTCSchema = new Schema<IOTC>({
    seller: { type: String, required: true },
    sellTokenName: { type: String, required: true },
    sellTokenAddress: { type: String, required: true },
    sellTokenAmount: { type: Number, required: true },
    price: { type: Number, required: true },
    collateralTokenAddress: { type: Number, required: true },
    collateralTokenAmount: { type: Number, required: true },
    listingTimestamp: { type: Number, require: true },
    status: { type: Number, required: true },
})

export { IOTC, OTCSchema }
