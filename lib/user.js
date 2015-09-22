var mongoose = require("mongoose");
var config = require("../config.json");
var corp = require('../config.json').corp;
var _API = require('x-wechat-enterprise-api');
var API = new _API(corp.corpid, corp.secret, corp.appid);
var fs = require('fs');

var Schema = mongoose.Schema;
var userSchema = new Schema({
	"userid": String,
	"name": String,
	"department": [],
	"position": String,
	"mobile": String,
	"gender": Number,
	"email": String,
	"weixinid": String,
	"avatar": String,
	"status": Number,
	"master": String,
	"nickname": String,
	"auth":String
});

userSchema.set('toJSON', {
	getters: true,
	virtuals: true,
	transform: function(doc, ret, options) {
		ret.uid = ret._id;
		delete ret.id;
		delete ret._id;
	}
});


var User = mongoose.model('User', userSchema);

exports.User = User;

var keys = {
	'昵称': 'nickname',
        '权限':'auth'
};

var convertExt = function(user, data) {
	if (user.extattr && user.extattr.attrs) {
		var exts = user.extattr.attrs;
		// exts.forEach(function(one) {
		// 	data[keys[one.name]] = one.value;
		// });
		for( var i in keys ){
			for( var j=0; j<exts.length; j++ ){
				if( exts[j].name == i ){
					data[keys[i]] = exts[j].value || "";
					break;
				} else if( j == exts.length-1 ){
					data[keys[i]] = ""
				}
			}
		}
	}
	return data;
};

exports.syncUsers = function() {
	API.getLatestToken(function(err, token) {
		if (err) {
			return 'token获取失败';
		} else {
			var restler = require('restler');
			restler.get('https://qyapi.weixin.qq.com/cgi-bin/user/list?access_token=' + token.accessToken + '&department_id=1&fetch_child=1&status=0')
				.on('complete', function(data) {
					data.userlist.forEach(function(one) {
						var _data = one;
						
						_data = convertExt(one, _data);
						// upsert data
						
						User.update({
							userid: _data.userid
						}, _data, {
							upsert: true
						}, function(err) {
							if (err) {
								console.log('upsert:', _data.name, ' fail')
							} else {
								console.log('upsert:', _data.name, ' successfully')
							}
						});
					});
				});
		}
	});
}

exports.syncDepartments = function() {
	API.getDepartments(function(err, datas) {
		fs.writeFileSync('departments.json', JSON.stringify(datas.department, null, 4));
	});
};

