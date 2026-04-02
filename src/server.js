'use strict';

require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n🚀  Zorvyn Finance API is running`);
  console.log(`   → http://localhost:${PORT}`);
  console.log(`   → Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
