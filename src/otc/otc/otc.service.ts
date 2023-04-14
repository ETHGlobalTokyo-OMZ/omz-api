import { HttpStatus, Injectable } from '@nestjs/common';

import { defineCollection } from '../../db';
import { GetOTCListReqDTO } from '../dto/request/get-list.request.dto';
import { GetOTCListResDTO } from '../dto/response/get-list.response.dto';

@Injectable()
export class OtcService {
    public async getOTCList(reqDTO: GetOTCListReqDTO): Promise<GetOTCListResDTO> {
        const db = await defineCollection();
        const resDTO = new GetOTCListResDTO(HttpStatus.OK);

        let findObj = {}
        reqDTO.tokenName === null ? findObj : findObj = { tokenName: reqDTO.tokenName };

        const offset = reqDTO.index * reqDTO.limit;
        const otcList = await db.collection.otc.find(findObj).skip(offset).limit(reqDTO.limit);

        resDTO.lists = otcList;

        return resDTO;
    }
}
