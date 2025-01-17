import { Entity, PrimaryColumn } from "typeorm";


@Entity()
export class UserStore{

    @PrimaryColumn({
         type: 'bigint'
    })
    user_id: number;
    store_id: number;
}