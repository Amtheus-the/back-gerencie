// Gerar hash bcrypt para senha 123456
const bcrypt = require('bcryptjs');

bcrypt.hash('123456', 10)
  .then(hash => {
    console.log('Hash da senha "123456":');
    console.log(hash);
  })
  .catch(err => console.error(err));
