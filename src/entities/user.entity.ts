import { Entity, PrimaryColumn } from "typeorm";


@Entity()
export class User{

    @PrimaryColumn({
        type: 'bigint'
    })
    user_id: number;
}