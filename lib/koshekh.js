'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');

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
	//sets name from the environment variables or defaults to "wtnv"
	this.settings.name = this.settings.name || 'koshekhbot';
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
	console.log("starting onStart\n");
	//connect to the Slack server and perform startup functions
	this.on('start', this._onStart);
	console.log("onStart completed, starting onMessage\n");
	//listen for messages and respond accordingly
	this.on('message', this._onMessage);
	
};

//called when the bot connects to the server
KoshekhBot.prototype._onStart = function() {
	
	console.log("starting loadBotUser\n");
	this._loadBotUser();
	console.log("loadBotUser completed, starting connectDb\n");
	this._connectDb();
	console.log("connectDb completed, starting firstRunCheck\n");
	this._firstRunCheck();
	
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
	console.log("self.name:",self.name,"\n");
};

/*
 *Simple function to test if the database file is readable
 *and create a new SQLite database instance
 */
KoshekhBot.prototype._connectDb = function () {
	if(!fs.existsSync(this.dbPath)) {
		console.log('Database path '+'"'+this.dbPath+'" does not exist or is not readable');
		console.error('Database path '+'"'+this.dbPath+'" does not exist or is not readable');
		process.exit(1);
	}
	this.db = new SQLite.Database(this.dbPath);
	console.log("database created, path set to:",this.dbPath,"\n");
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
			console.log("Database error:",err);
			return console.error('DATABASE ERROR: ',err);
		}
		console.log("record:",record);
		var currentTime = (new Date()).toJSON();
		//first time run
		if (!record) {
			console.log("starting welcomeMessage\n");
			self._welcomeMessage();
			return self.db.run('INSERT INTO info(name,val) VALUES("lastrun",?)', currentTime);
		}
		
		//update the database with a new last run time
		self.db.run('UPDATE info SET val = ? WHERE name = "lastrun"',currentTime);
		console.log("lastrun value updated to:",currentTime,"\n");
	});
};

//A simple welcome message to be posted to the "random" channel upon first run
KoshekhBot.prototype._welcomeMessage = function() {
	console.log("posting welcomeMessage\n");
	this.postMessageToChannel('test-space','Words of wisdom from a friendly desert community where the sun is hot, the moon is beautiful, and mysterious lights pass overhead while we all pretend to sleep.\n \n Welcome to Night Vale.',{as_user:true});
};

/*
 *Util function that receives a message object as a parameter and checks if it meets
 *certain criteria before posting a random reply.
 */
KoshekhBot.prototype._onMessage = function(message) {
	console.log("checking message status\n");
	if(this._isChatMessage(message) &&
		this._isChannelConversation(message) &&
		!(this._isFromKoshekhBot(message)) &&
		//we will be changing this later to suit our needs
		this._isMentioningNightVale(message)) 
		{
			console.log("criteria passed, replying\n");
			//this will also be changed.
			this._replyWithRandomJoke(message);
		}
	
};

//Helper function to check if the object is a chat message and if it contains text
KoshekhBot.prototype._isChatMessage = function(message) {
	console.log("is it a text-based message check\n");
	return message.type === 'message' && Boolean(message.text);
};

/*
 *Helper function to check if the object is directed to a channel.
 *Every communication channel is identified by an alphanumeric ID,
 *and to distinguish between them we can have a look at the first character of the ID, 
 *when it starts with a “C” it represents a chat channel.
 */
KoshekhBot.prototype._isChannelConversation = function(message) {
	console.log("is it a channel convo check\n");
	return typeof message.channel === 'string' && message.channel[0] === 'C';
};

//Helper function to see if the user posting the message is the bot to prevent a loop
KoshekhBot.prototype._isFromKoshekhBot = function(message) {
	console.log("is the user koshekhbot check\n");
	return message.user === this.user;
};

//Helper function to see if the message contains the phrase 'Night Vale' or mentions this bot
//may be changed later
KoshekhBot.prototype._isMentioningNightVale = function(message) {
	console.log("does it mention koshekhbot or night vale check\n");
	return message.text.toLowerCase().indexOf('night vale') > -1 || 
		message.text.toLowerCase().indexOf(this.name) > -1;
};

//bot retrieves a random quote from the table and replys in the channel that mentioned night vale
//WILL NEED TO BE CHANGED LATER
KoshekhBot.prototype._replyWithRandomJoke = function(originalMessage) {
	console.log("setting self = this\n");
	var self = this;
	console.log("getting quote from table\n");
	self.db.get('SELECT id, quote FROM quotes ORDER BY used ASC, RANDOM() LIMIT 1', function (err, record) {
		if(err) {
			console.log('DATABASE ERROR:',err,"\n");
			return console.error('DATABASE ERROR:',err);
		}
		console.log("record:",record);
		console.log("setting channel\n");
		var channel = self._getChannelById(originalMessage.channel);
		console.log("posting message to channel\n");
		self.postMessageToChannel(channel.name, record.quote, {as_user:true});
		console.log("updating quote used value\n");
		self.db.run('UPDATE quotes SET used = used + 1 WHERE id = ?',record.id);
	});
};

//Helper function to determine the channel name where the mention occurred.
KoshekhBot.prototype._getChannelById = function(channelId) {
	console.log("getting channel ID\n")
	return this.channels.filter(function (item) {
		console.log("channel id:",item.id,"\n");
		return item.id === channelId;
	})[0];
};

module.exports = KoshekhBot;