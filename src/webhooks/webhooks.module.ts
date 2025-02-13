import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { WebhooksController } from './webhooks.controller';

@Module({

    imports: [
        // GraphQLModule.forRoot<ApolloDriverConfig>({
        //     driver: ApolloDriver,
        //     playground: true,
        //     autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        // })
    ],

    controllers: [WebhooksController]
})
export class WebhooksModule {}
