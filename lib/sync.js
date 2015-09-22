var User = require('./user');
var mongoose = require('mongoose');
var config = require("../config.json");                                     
mongoose.connect('mongodb://' + config.db.ip + '/' + config.db.name);
User.syncUsers();

