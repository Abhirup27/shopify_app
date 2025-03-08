import { Injectable, Logger } from "@nestjs/common";
import { SignInDto } from "./dtos/signin.dto";
import { SignInProvider } from "./providers/sign-in.provider";
// import { JwtService } from "@nestjs/jwt";
// import jwtConfiguration from "./config/jwt.config";
// import { ConfigType } from "@nestjs/config";


@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(

        private readonly signInProvider: SignInProvider,
        // @InjectRepository(User)
        // private usersRepository:Repository<User>

    ) {

    }

    //email: string, password: string, id: string
    public login = async (signInDto: SignInDto): Promise<any> => {



        return await this.signInProvider.signIn(signInDto);

    }
}