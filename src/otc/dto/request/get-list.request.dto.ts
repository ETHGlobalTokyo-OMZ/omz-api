import { IsOptional, IsString } from 'class-validator';

class GetOTCListReqDTO {
    @IsOptional()
    @IsString()
    readonly tokenName: string = "";
}

export { GetOTCListReqDTO };
