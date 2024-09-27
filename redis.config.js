const { Redis } = require( "@telegraf/session/redis");

const store = Redis({
	url: "redis://127.0.0.1:6379",
});
module.exports = store