'use strict';

var SlackBot = require('slackbots');
var request = require('request');


var bot = new SlackBot({
	token: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
	name: 'Koshekh'
});

console.log("Hello Console!");
console.log("my name is "+bot.name);
bot.postMessageToChannel('test-space','Hello World!', {as_user: true});