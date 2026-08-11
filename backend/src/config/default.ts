import dotenv from 'dotenv';

dotenv.config({ path: `${__dirname}/.env` });

export default {
  mongoURI: process.env.DB_STRING || 'mongodb://localhost:27017/nee3',
  port: process.env.PORT || 3000,
};
