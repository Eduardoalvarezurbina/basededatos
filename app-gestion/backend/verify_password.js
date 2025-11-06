const bcrypt = require('bcrypt');

const password = 'adminpassword';
const hash = '$2b$10$r/bcdB.IUgCKd/ROkQsJw.WVyuPdZwHreGD5s/JNPx8jsfmIwsDXK';

bcrypt.compare(password, hash, function(err, result) {
  if (err) {
    console.error('Error comparing passwords:', err);
    return;
  }
  if (result) {
    console.log('Passwords match');
  } else {
    console.log('Passwords do not match');
  }
});
