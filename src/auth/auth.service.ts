import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/entities/user.entity";
import { Repository } from "typeorm";
import { SignInDto } from "./dtos/signin.dto";
import { SignInProvider } from "./providers/sign-in.provider";


@Injectable()
export class AuthService{
    private readonly logger = new Logger(AuthService.name);

    constructor(

        private readonly signInProvider: SignInProvider,
        // @InjectRepository(User)
        // private usersRepository:Repository<User>
    )
    {

    }

    //email: string, password: string, id: string
    public login = async(signInDto: SignInDto): Promise<any> =>
    {



        return await this.signInProvider.signIn(signInDto);

    }
}