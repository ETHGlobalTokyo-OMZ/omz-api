import { HttpStatus, Injectable } from '@nestjs/common';

import { defineCollection } from '../../db';
import { GetOTCListReqDTO } from '../dto/request/get-list.request.dto';
import { GetOTCListResDTO } from '../dto/response/get-list.response.dto';

@Injectable()
export class OtcService {
    public async getOTCList(reqDTO: GetOTCListReqDTO): Promise<GetOTCListResDTO> {
        const db = await defineCollection();
        const resDTO = new GetOTCListResDTO(HttpStatus.OK);


        let otcList;
        reqDTO.tokenName === ''
            ? otcList = await db.collection.otc.aggregate([
                {
                    $lookup: {
                        from: 'Escrow',
                        localField: 'tradeID',
                        foreignField: 'tradeID',
                        as: 'escrow'
                    },
                },
                { $unwind: '$escrow' }
            ])
            : otcList = await db.collection.otc.aggregate([
                {
                    $match: { sellTokenName: reqDTO.tokenName }
                },
                {
                    $lookup: {
                        from: 'Escrow',
                        localField: 'tradeID',
                        foreignField: 'tradeID',
                        as: 'escrow'
                    },
                },
            ]);


        resDTO.lists = otcList;

        return resDTO;
    }
}
