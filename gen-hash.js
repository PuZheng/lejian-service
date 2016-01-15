var cofy = require('cofy');
var bcrypt = require('bcrypt');

module.exports = function *(password) {
	var salt = yield cofy.fn(bcrypt.genSalt)(10);
	return (yield cofy.fn(bcrypt.hash)(password, salt));
};
