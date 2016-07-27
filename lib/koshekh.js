'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');

//variable to store the quote of the day
var QOTD = "null";

/*
 *Constructor function. It accepts a settings object which should contain the following keys:
 *a name, an API token to connect to Slack servers, and a file path for the quote database
 *
 *Author: Jason (SouthpawFrenzy) Hall
 *
 *Adapted for use from the NorrisBot project by Luciano Mammino <lucianomammino@gmail.com>
 *available at: https://github.com/lmammino/norrisbot/blob/master/lib/norrisbot.js
 *
 *Instructions for constructing a similar bot found at:
 * https://scotch.io/tutorials/building-a-slack-bot-with-node-js-and-chuck-norris-super-powers
 */
var KoshekhBot = function Constructor(settings) {
	
	this.settings = settings;
	
	//sets name from the environment variables or defaults to "koshekh"
	this.settings.name = this.settings.name || 'koshekh';
	
	//sets the path for the database file or defaults to "<current working directory>/data/koshekhbot.db"
	this.dbPath = settings.dbPath || path.resolve(process.cwd(),'data', 'koshekhbot.db');
	
	//used to store the current user
	this.user = null;
	
	//used to store the connection instance to the database
	this.db = null;
};

//inheret methods from the Bot class
util.inherits(KoshekhBot, Bot);

KoshekhBot.prototype.run = function () {
	
	//instantiate the bot
	KoshekhBot.super_.call(this, this.settings);
	
	//connect to the Slack server and perform startup functions
	this.on('start', this._onStart);
	
	//listen for messages and respond accordingly
	this.on('message', this._onMessage);
};

//called when the bot connects to the server
KoshekhBot.prototype._onStart = function() {
	
	this._loadBotUser();
	
	this._connectDb();
	
	this._firstRunCheck();
	
	this._updateQuote();
	
};

/*
 *When Bot.js connects to the Slack server is downloads a list of the users on the team
 *and stores it as an array of objects in 'users'.
 *This finds the user with the same name as the one set for this bot
 */
KoshekhBot.prototype._loadBotUser = function() {
	
	var self = this;
	
	this.user = this.users.filter(function (user) {
		
		return user.name === self.name;
		
	})[0];
};

/*
 *Simple function to test if the database file is readable
 *and create a new SQLite database instance
 */
KoshekhBot.prototype._connectDb = function () {
	
	if(!fs.existsSync(this.dbPath)) {
		
		console.error('Database path '+'"'+this.dbPath+'" does not exist or is not readable');
		
		process.exit(1);
		
	}
	
	this.db = new SQLite.Database(this.dbPath);
};

/*
 *We are using the info table (defined as a key-value table) to see if the bot has been previously run.
 *In fact we check if the record with name lastrun already exists in the table, 
 *if it exists we just update the timestamp to the current one, 
 *otherwise we call the function _welcomeMessage and create a new lastrun record.
 */
KoshekhBot.prototype._firstRunCheck = function () {
	
	var self = this;
	
	self.db.get('SELECT val FROM info WHERE name = "lastrun" LIMIT 1', function(err, record) {
		
		if (err) {
			
			return console.error('DATABASE ERROR: ',err);
			
		}
		
		var currentTime = (new Date()).toJSON();
		
		//first time run
		if (!record) {
			
			self._welcomeMessage();
			
			return self.db.run('INSERT INTO info(name,val) VALUES("lastrun",?)', currentTime);
			
		}
		
		//update the database with a new last run time
		self.db.run('UPDATE info SET val = ? WHERE name = "lastrun"',currentTime);
		
	});
};

//A simple welcome message to be posted to the "random" channel upon first run
KoshekhBot.prototype._welcomeMessage = function() {
	
	this.postMessageToChannel('random','Hello all! Here are some words of wisdom from a friendly desert community where the sun is hot, the moon is beautiful, and mysterious lights pass overhead while we all pretend to sleep.\n \n Welcome... to Night Vale.', {as_user: true});
	
};

/*
 *Pulls a random quote from the table ordered by the number of times they've been used,
 *then posts that quote to the "Random" channel and increments the number of times it's been used.
 */
KoshekhBot.prototype._updateQuote = function() {
	
	var self = this;
	
	var now = new Date();
	
	var nineOhClock = new Date(now.getFullYear(),now.getMonth(),now.getDate(),9,0,0,0) - now;
	
	if (nineOhClock < 0) {
		
		nineOhClock += 86400000;
		
	}
	setTimeout(function(){
		setInterval(function(){
	
			self.db.get('SELECT id, quote FROM quotes ORDER BY used ASC, RANDOM() LIMIT 1', function (err, record) {
		
				if(err) {
			
					return console.error('DATABASE ERROR:',err);
			
				}
	
			QOTD = record.quote;
	
			self.postMessageToChannel('random', QOTD, {as_user:true});
	
			self.db.run('UPDATE quotes SET used = used + 1 WHERE id = ?',record.id);
	
			});
		},30000)}, 30000);

};


/*
 *Util function that receives a message object as a parameter and checks if it meets
 *certain criteria before posting a random reply.
 */
KoshekhBot.prototype._onMessage = function(message) {
	
	if(this._isChatMessage(message) &&

		this._isChannelConversation(message) &&
		
		!(this._isFromKoshekhBot(message))) {
			
			this._searchForKeywords(message);
		}				
};

//Helper function to check if the object is a chat message and if it contains text
KoshekhBot.prototype._isChatMessage = function(message) {

	return message.type === 'message' && Boolean(message.text);
};

/*
 *Helper function to check if the object is directed to a channel.
 *Every communication channel is identified by an alphanumeric ID,
 *and to distinguish between them we can have a look at the first character of the ID, 
 *when it starts with a “C” it represents a chat channel.
 */
KoshekhBot.prototype._isChannelConversation = function(message) {
	
	return typeof message.channel === 'string' && message.channel[0] === 'C';
};

//Helper function to see if the user posting the message is the bot to prevent a loop
KoshekhBot.prototype._isFromKoshekhBot = function(message) {
	
	return message.user === this.user.id;
};

//Helper function to see if the message contains various phrases that trigger responses
KoshekhBot.prototype._searchForKeywords = function(message) {
	
	var self = this;
	
	var channel = self._getChannelById(message.channel);
	
	if (message.text.toLowerCase().indexOf('!whoareyou') > -1) {
		
		self.postMessageToChannel(channel.name,'I am everyone and no one. Everywhere. Nowhere. Call me... Koshekh!', {as_user:true});
		
	}
	
	if (message.text.toLowerCase().indexOf(this.name) > -1) {
		
		self.postMessageToChannel(channel.name,'MEOW', {as_user:true});
	}
	
	if (message.text.toLowerCase().indexOf('!repeat') > -1) {
		
		self.postMessageToChannel(channel.name, QOTD, {as_user:true});
	}
	/*
	if (message.text.toLowerCase().indexOf('!help') > -1) {
		
		self.postMessageToChannel(channel.name)
	}*/
};

//Helper function to determine the channel name where the mention occurred.
KoshekhBot.prototype._getChannelById = function(channelId) {
	
	return this.channels.filter(function (item) {
	
		return item.id === channelId;
	})[0];
};

module.exports = KoshekhBot;
