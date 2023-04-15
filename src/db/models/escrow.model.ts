import { Schema } from 'mongoose';

interface IEscrow {
    tradeID: string;
    chainID: number;
    contractAddress: string;
}

const EscrowSchema = new Schema<IEscrow>({
    tradeID: { type: String, unique: true, required: true },
    chainID: { type: Number, required: true },
    contractAddress: { type: String, required: true },
})

export { IEscrow, EscrowSchema }
