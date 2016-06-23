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
var Async = require('async');
var ProgressBar = require('progress');
var sqlite3 = require('sqlite3').verbose();

var outputFile = process.argv[2] || path.resolve(__dirname, 'koshekhbot.db');
var db = new sqlite3.Database(outputFile);

// executes an API request to count all the available quotes
request('https://raw.githubusercontent.com/southpawFrenzy/koshekhBot/master/cecilspeaks.json', function (error, response, body) {
	console.log(error);
	console.log(response.statusCode);
    if (!error && response.statusCode === 200) {
        var count = JSON.parse(body).count;
		var quotesArray = JSON.parse(body).value;
        var savedQuotes = 0;
        var index = 0;

        // Prepares the database connection in serialized mode
        db.serialize();

        // Creates the database structure
        db.run('CREATE TABLE IF NOT EXISTS info (name TEXT PRIMARY KEY, val TEXT DEFAULT NULL)');
		console.log("info table created");
        db.run('CREATE TABLE IF NOT EXISTS quotes (id INTEGER PRIMARY KEY, quote TEXT, used INTEGER DEFAULT 0)');
		console.log("quotes table created");
        db.run('CREATE INDEX IF NOT EXISTS quotes_used_idx ON quotes (used)');
		console.log("index created");
		console.log("count:"+count);
		console.log("savedQuotes:"+savedQuotes);
		do{
			console.log("inside the do-while");
			console.log("count:"+count);
			console.log("savedQuotes:"+savedQuotes);
		db.run('INSERT INTO quotes (quote) VALUES (?)', quotesArray[savedQuotes].quote, function (err) {
            if (err) {
                return err;
            }
				console.log(quotesArray[savedQuotes].quote);
                ++savedQuotes;
            });
		}while (savedQuotes < count);
        // The idea from now on is to iterate through all the possible quotes starting from the index 1 until we can
        // find all the available ones. There might be holes in the sequence, so we might want to issue all the requests
        // sequentially and count the successful requests until we get the total amount of quotes.
        // We are going to use the function Async.whilst so we need to define 3 functions: test, task and onComplete

        // Tests whether to stop fetching quotes. It gets called before starting a new iteration
        //var test = function () {
        //    return savedQuotes < count;
        //};

/**        // The task executed at every iteration. Basically fetches a new quote and creates a new record in the database.
        var task = function (cb) {
            request('\cecilspeaks.json' + (++index) + '?escape=javascript', function (err, response, body) {
                // handle possible request errors by stopping the whole process
                if (err || response.statusCode !== 200) {
                    console.log(index, error, response.statusCode);
                    return cb(error || response.statusCode);
                }

                // invalid ids generates an invalid JSON response (basically an HTML output), so we can
                // check for it by detecting JSON parse errors and skip the id by calling the callback completion
                // function for the current iteration
                var result = null;
                try {
                    result = JSON.parse(body).value;
                } catch (ex) {
                    return cb(null);
                }

                db.run('INSERT INTO quotes (quote) VALUES (?)', quotesArray[savedQuotes].quote, function (err) {
                    if (err) {
                        return cb(err);
                    }
					console.log(quotesArray[savedQuotes].quote);
                    ++savedQuotes;
                    //bar.tick();
                    return cb(null);
                });
        };
**/
        // On completion we just need to show errors in case we had any and close the database connection
        var onComplete = function (err) {
            db.close();
            if (err) {
                console.log('Error: ', err);
                process.exit(1);
            }
        };

        // triggers the asynchronous iteration using the previously defined test, task and onComplete functions
        return Async.whilst( onComplete);
    }

    console.log('Error: unable to count the total number of quotes');
    process.exit(1);
});
