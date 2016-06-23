'use strict';

/**
 * Command line script that generates a SQLite database file that contains 
 * quotes from Welcome to Night Vale using a local JSON formatted text file
 *
 * Many of the quotes pulled from episode transcripts
 * available at: http://cecilspeaks.tumblr.com/
 *
 * Usage:
 *
 *   node databaseGenerator.js [destFile]
 *
 *   destFile is optional and it will default to "koshekhbot.db"
 *
 * adapted for use from the NorrisBot databaseGenerator from Luciano Mammino <lucianomammino@gmail.com>
 * https://github.com/lmammino/norrisbot/blob/master/data/databaseGenerator.js
 */

var path = require('path');
var request = require('request');
var sqlite3 = require('sqlite3').verbose();

var outputFile = process.argv[2] || path.resolve(__dirname, 'koshekhbot.db');
var db = new sqlite3.Database(outputFile);

// executes an API request to count all the available quotes
request('https://raw.githubusercontent.com/southpawFrenzy/koshekhBot/master/cecilspeaks.json', function (error, response, body) {
	
    if (!error && response.statusCode === 200) {
		
		var quotesArray = JSON.parse(body).value;
		var count = quotesArray.length;
        var savedQuotes = 0;
        var index = 0;

        // Prepares the database connection in serialized mode
        db.serialize();

        // Creates the database structure
        db.run('CREATE TABLE IF NOT EXISTS info (name TEXT PRIMARY KEY, val TEXT DEFAULT NULL)');
		
        db.run('CREATE TABLE IF NOT EXISTS quotes (id INTEGER PRIMARY KEY, quote TEXT, used INTEGER DEFAULT 0)');
		
        db.run('CREATE INDEX IF NOT EXISTS quotes_used_idx ON quotes (used)');
		
		do{
		//iterate through the array of JSON objects to insert the quotes into the SQL table
		db.run('INSERT INTO quotes (quote) VALUES (?)', quotesArray[savedQuotes].quote, function (err) {
            if (err) {
                return err;
            }
		});
		//increment to the next quote
        savedQuotes++;         
		}while (savedQuotes < count);
        
        // On completion we just need to show errors in case we had any and close the database connection
        var onComplete = function (err) {
            db.close();
            if (err) {
                console.log('Error: ', err);
                process.exit(1);
            }
        };
		
        return onComplete;
    }

    console.log('Error: unable to count the total number of quotes');
    process.exit(1);
});
