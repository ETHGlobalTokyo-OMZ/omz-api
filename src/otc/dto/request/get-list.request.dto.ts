import { IsNumber, IsOptional, IsString } from 'class-validator';

class GetOTCListReqDTO {
    @IsOptional()
    @IsString()
    readonly tokenName: string = "";

    @IsOptional()
    @IsNumber()
    readonly index: number = 0;

    @IsOptional()
    @IsNumber()
    readonly limit: number = 20;
}

export { GetOTCListReqDTO };
