import { Response } from 'express';

import { Controller, Get, Query, Res } from '@nestjs/common';

import { GetOTCListReqDTO } from './dto/request/get-list.request.dto';
import { OtcService } from './otc/otc.service';

@Controller('otc')
export class OtcController {
    constructor(private readonly otcService: OtcService) { }

    @Get('/list')
    public async recaptcha(
        @Query() reqDTO: GetOTCListReqDTO,
        @Res() res: Response
    ): Promise<void> {
        const responseDTO = await this.otcService.getOTCList(reqDTO);
        res.status(responseDTO.getStatus()).json(responseDTO);
    }
}
