var express = require("express.oi");
var app = express();
var fs = require('fs');
var config = require('./config.json');
var corp = config.corp;

var serveStatic = require('serve-static');
app.use(serveStatic('static'));

app.http().io();
app.io.set('transports', ['websocket']);

var _API = require('wechat-enterprise-api');
var API = new _API(corp.corpid, corp.secret, '0');

API.getAccessToken(function(err, token) {
	console.log(err, token);
});

var wx = app.io.of('wx');

var redirect_uri = 'http://common.bozhong.com/cms/content.html?type=page&id=54f50c09a3c3b1c21d8b456e';

wx.on('connection', function(socket) {
	socket.on('wx:qrcode:give_me_code', function() {
		var uuid = require('node-uuid').v4();
		socket.join('wx:' + uuid);
		var codeUrl = 'http://' + config.site.domain + '/oauth/wechat/checkcode?uuid=' + uuid;
		var url = 'https://open.weixin.qq.com/connect/oauth2/authorize?appid=' + corp.corpid + '&redirect_uri=' + encodeURIComponent('http://common.bozhong.com/cms/content.html?type=page&id=54f50c09a3c3b1c21d8b456e&redirect_uri=' + encodeURIComponent(codeUrl)) + '&response_type=' + 'code' + '&scope=' + 'snsapi_base' + '&state=' + 'hello' + '#wechat_redirect';
		socket.emit('wx:qrcode:got', 'http://' + config.site.domain + '/oauth/wechat/redirect?uuid=' + uuid + '&url=' + encodeURIComponent(url));
	});
});

app.get('/oauth/wechat/redirect', function(req, res, next) {
	var uuid = req.query.uuid;
	wx.to('wx:' + uuid).emit('wx:scan:success', req.user);
	res.redirect(req.query.url);
});

app.get('/oauth/wechat/checkcode', function(req, res, next) {
	var uuid = req.query.uuid;
	var code = req.query.code;

	wx.to('wx:' + uuid).emit('wx:auth:code', code);

	API.getUserIdByCode(code, function(err, user) {
		console.log('get user by code', code, err, user);
		if (user.UserId) {
			res.send('登录成功啦');
			wx.to('wx:' + uuid).emit('wx:auth:identify', user);
			wx.to('wx:' + uuid).emit('wx:auth:success', user);
			API.send({
				touser: user.UserId
			}, {
				"msgtype": "text",
				"text": {
					"content": "登录提醒：您刚刚通过微信登录了妈蜜采集系统"
				},
				"safe": "0"
			}, function(err, a) {
				console.log(err, a);
			});
		} else {
			// 没有UserId,只有OpenId
			wx.to('wx:' + uuid).emit('wx:auth:error', {
				message: '请先关注妈蜜企业号'
			});
			res.redirect('/follow');
		}
	});
});

app.get('/follow', function(req, res, next) {
	res.send(fs.readFileSync('./follow.html').toString());
});

app.get('/connect', function(req, res, next) {
	res.send(fs.readFileSync('./connect.html').toString());
});

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: false
}));

module.exports = function(option) {
	app.listen(option.port);
};