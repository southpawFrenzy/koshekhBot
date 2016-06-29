'use strict';

/*
 * Command line script that generates a SQLite database file that contains 
 * quotes from Welcome to Night Vale using a JSON formatted text file
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

 //various npm packages required
var path = require('path');
var request = require('request');
var sqlite3 = require('sqlite3').verbose();

//you can specify a database file name, or it will default to "koshekhbot.db"
var outputFile = process.argv[2] || path.resolve(__dirname, 'koshekhbot.db');

//create a new instance of a sqlite3 database object
var db = new sqlite3.Database(outputFile);

// executes an API request to call the JSON formatted text file containing the quotes and a count
request('https://raw.githubusercontent.com/southpawFrenzy/koshekhBot/master/data/cecilspeaks.json', function (error, response, body) {
	//check to see if the file was able to be accessed, if so, proceed
    if (!error && response.statusCode === 200) {
		
		//creates a new array of JSON objects and parses the values of the file into the array
		var quotesArray = JSON.parse(body).value;
		//create a count of the quotes based on the length of the array
		var count = quotesArray.length;
		//create a variable to store the number of quotes stored in the database
        var savedQuotes = 0;
        var index = 0;

        // Prepares the database connection in serialized mode
        db.serialize();

        // Creates the database structure
        db.run('CREATE TABLE IF NOT EXISTS info (name TEXT PRIMARY KEY, val TEXT DEFAULT NULL)');
		//create the table of quotes to store the content of the JSON objects. They have a unique id and field for the number of times the quote has been used.
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
		//if all's well close the database and exit, or report any errors that occurred and exit
        return onComplete;
    }

    console.log('Error: unable to access page of quotes');
    process.exit(1);
});
