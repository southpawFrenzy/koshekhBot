'use strict';

var path = require('path');
var request = require('request');
var sqlite3 = require('sqlite3').verbose();

var outputFile = process.argv[2] || path.resolve(__dirname, 'koshekhbot.db');
var db = new sqlite3.Database(outputFile);

var quotesArray = null;

// executes an API request to count all the available quotes
request('https://raw.githubusercontent.com/southpawFrenzy/koshekhBot/master/cecilspeaks.json', function (error, response, body) {
    if (!error && response.statusCode === 200) {
        quotesArray = JSON.parse(body).value;
		console.log(quotesArray != null);
		var count = quotesArray.length;
        var savedQuotes = 0;
        
		// Prepares the database connection in serialized mode
        db.serialize();

        // Creates the database structure
        db.run('CREATE TABLE IF NOT EXISTS info (name TEXT PRIMARY KEY, val TEXT DEFAULT NULL)');
		console.log("info table created");
        db.run('CREATE TABLE IF NOT EXISTS quotes (id INTEGER PRIMARY KEY, quote TEXT, used INTEGER DEFAULT 0)');
		console.log("quotes table created");
        db.run('CREATE INDEX quotes_used_idx ON quotes (used)');
		console.log("index created");
		console.log("count:"+count);
		console.log("savedQuotes:"+savedQuotes);
		do{
			//console.log("inside the do-while");
			db.run('INSERT INTO quotes (quote) VALUES (?)', quotesArray[savedQuotes].quote, function (err) {
				if (err) {
					console.log("error: "+err)
					return err;
				}
				console.log(quotesArray[savedQuotes].quote);
				++savedQuotes;
				return 0;
            });
		}while (savedQuotes < count);
		db.close();
	}
});