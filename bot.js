const Discord = require('discord.js');
const client = new Discord.Client();
const auth = require('./auth.json');
const config = require('./config.json');

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity("Doubling down on being bold.");
});



client.on('message', async msg => {

  if(msg.author.bot) return;

  if(msg.content.indexOf(config.prefix) !== 0) return;

  if (msg.content === 'ping') {
    msg.reply('pong');
  }


  if (msg.content === 'Is a hotdog a sandwich?') {
    msg.reply('Of course it is, you filthy casual.');
  }


  if (msg.content.includes('schedule')) {
    //example request -> !boldBot schedule destiny raid 10/25/19 7:00pm
    let parsedContent = msg.content.split(" ");
    console.log(parsedContent.toString());
    console.log(msg.author.id);

    if (parsedContent.length != 6) {
      //msg.author.send('u r dum');
      msg.channel.send("Invalid syntax, please use 'gameName gameMode date time'.");
      return;
    }

    var [prefix, action, game, gameMode, date, time] = parsedContent;
    var creatorId = msg.author.id;

    //generate JSON
    //TODO: store date and time as JS date object
    const eventBlob = {
      "game": game,
      "gameMode": gameMode,
      "date": date, 
      "time": time,
      "participants": [creatorId],
      "creator": creatorId
    };

    //console.log(eventBlob.toString());

    //store event to mongodb
    var MongoClient = require('mongodb').MongoClient,
      f = require('util').format,
      assert = require('assert');

    var user = encodeURIComponent(auth.mongoUser);
    var password = encodeURIComponent(auth.mongoPw);
    var authMechanism = 'DEFAULT';

    // Connection URL
    var url = f('mongodb://%s:%s@localhost:27017/boldBotDB?authMechanism=%s',
      user, password, authMechanism);

    // Use connect method to connect to the Server
    MongoClient.connect(url, function (err, db) {
      assert.equal(null, err);
      console.log("Connected correctly to server");

      if (err) throw err;
      var dbo = db.db("boldBotDB");
      dbo.collection("events").insertOne(eventBlob, function(err, res) {
        if (err) throw err;
        console.log("1 document inserted");
        db.close();
      });
    });

    msg.channel.send(`Got it. ${game} ${gameMode} scheduled for ${date} at ${time}.`);

  }




  

  //TODO: Don't grab events that have already happened.
  if (msg.content.includes('listEvents')) {
    var msgString = "**List of events incoming:** \n\n";
    var results;


    //Get stuff ready to query DB
    var MongoClient = require('mongodb').MongoClient,
      f = require('util').format,
      assert = require('assert');

    var user = encodeURIComponent(auth.mongoUser);
    var password = encodeURIComponent(auth.mongoPw);
    var authMechanism = 'DEFAULT';

    // Connection URL
    var url = f('mongodb://%s:%s@localhost:27017/boldBotDB?authMechanism=%s',
      user, password, authMechanism);

    // Use connect method to connect to the Server
     await MongoClient.connect(url, async function (err, db) {
      assert.equal(null, err);
      console.log("Connected correctly to server");

      if (err) throw err;
      var dbo = db.db("boldBotDB");
      
      dbo.collection("events").find({}).toArray(function(err, result) {
        if (err) throw err;
        console.log(result);
        result.forEach( event => msgString += `${event.game} ${event.gameMode} scheduled for ${event.date} at ${event.time}.\n`);
        db.close();
        msg.channel.send(msgString);
      });    
    });    
  }

});


client.login(auth.token);