import { IOTC } from '../../../db';
import { ResponseDTOBase } from '../../../response.dto';

class GetOTCListResDTO extends ResponseDTOBase {
    lists: IOTC[] | null;
}

export { GetOTCListResDTO };
