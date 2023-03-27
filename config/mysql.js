const mysql = require("mysql");

var connection = mysql.createPool({
	host		: "localhost",
	user		: "root",
	password	: "",
	database	: "db_wa"
  });

module.exports = connection;