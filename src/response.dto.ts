import { HttpStatus } from '@nestjs/common';

export class ResponseDTOBase {
    private statusCode: HttpStatus;
    private message: string = '';

    constructor(status: HttpStatus) {
        this.statusCode = status;
    }

    public getStatus(): HttpStatus {
        return this.statusCode;
    }

    public setStatus(status: HttpStatus) {
        this.statusCode = status;
    }

    public getMsg() {
        return this.message;
    }

    public setMsg(msg: string) {
        this.message = msg;
    }
}
