// read environment variables from .env file
require('dotenv').config({ path: './.env' })
const mongodbUser = process.env.MONGODB_USER;
const mongodbPassword = process.env.MONGODB_USER_PASSWORD;

module.exports = {
    urlAcronyms: `mongodb://${mongodbUser}:${mongodbPassword}@localhost:27017/acronyms`
  };