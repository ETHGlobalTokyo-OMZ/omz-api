import { Schema } from 'mongoose';

interface IEscrow {
    tradeID: string;
    contractAddress: string;
}

const EscrowSchema = new Schema<IEscrow>({
    tradeID: { type: String, required: true },
    contractAddress: { type: String, required: true },
})

export { IEscrow, EscrowSchema }
