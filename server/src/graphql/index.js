// server/src/graphql/index.js
const { ApolloServer } = require('apollo-server-express');
const { typeDefs, resolvers } = require('./schema');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

async function createApolloServer(app) {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    // context will receive { req, res } from express
    context: ({ req, res }) => {
      // Read token from cookie
      const token = req.cookies?.jwt;
      let user = null;
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          user = { userId: decoded.userId, username: decoded.username };
        } catch (e) {
          // token invalid -> user remains null
        }
      }
      return { req, res, user };
    },
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql', cors: false }); // cors handled in app.js
  return server;
}

module.exports = createApolloServer;
