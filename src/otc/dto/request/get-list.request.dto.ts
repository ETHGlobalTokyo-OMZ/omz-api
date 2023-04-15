import { IsOptional, IsString } from 'class-validator';

class GetOTCListReqDTO {
    @IsOptional()
    @IsString()
    readonly tokenName: string = "";

    @IsOptional()
    @IsString()
    readonly seller: string = "";

    @IsOptional()
    @IsString()
    readonly buyer: string = "";
}

export { GetOTCListReqDTO };
