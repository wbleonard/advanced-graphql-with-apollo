import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import { ApolloServer, gql } from "apollo-server";
import { buildSubgraphSchema } from "@apollo/subgraph";

import AccountsDataSource from "./graphql/dataSources/AccountsDataSource.js";
import auth0 from "./config/auth0.js";
import resolvers from "./graphql/resolvers.js";
import { authDirectives } from "../../shared/src/index.js";


const __dirname = dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT;

const { authDirectivesTypeDefs, authDirectivesTransformer } = authDirectives();
const subgraphTypeDefs = readFileSync(
  resolve(__dirname, "./graphql/schema.graphql"),
  "utf-8"
);
const typeDefs = gql(`${subgraphTypeDefs}\n${authDirectivesTypeDefs}`);
let subgraphSchema = buildSubgraphSchema({ typeDefs, resolvers });
subgraphSchema = authDirectivesTransformer(subgraphSchema);

const server = new ApolloServer({
  schema: subgraphSchema,
  context: ({ req }) => {
    const user = req.headers.user ? JSON.parse(req.headers.user) : null;
    return { user };
  },
  dataSources: () => {
    return {
      accountsAPI: new AccountsDataSource({ auth0 })
    };
  }
});

const { url } = await server.listen({ port });
console.log(`Accounts service ready at ${url}`);