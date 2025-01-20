import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/entities/user.entity";
import { Repository } from "typeorm";
import { SignInDto } from "../dtos/signin.dto";


@Injectable()
export class AuthService{
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @InjectRepository(User)
        private usersRepository:Repository<User>
    )
    {

    }

    //email: string, password: string, id: string
    public login = async(signInDto: SignInDto): Promise<string> =>
    {


        return 'SAMPLE_TOKEN'

    }
}