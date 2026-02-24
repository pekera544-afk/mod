require('dotenv').config();

/** @type {import('prisma/config').PrismaConfig} */
module.exports = {
  schema: 'prisma/schema.prisma',
  datasourceUrl: process.env.DATABASE_URL,
};
