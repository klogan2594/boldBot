const Discord = require('discord.js');
const client = new Discord.Client();
const auth = require('./auth.json');
const config = require('./config.json');
const assert = require('assert');
var cache = new Map();


client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity("Bold Simulator 2020");
  getEventMsgIds()
});

//testing signed commit

//Need to run this chunk to listen for reactions on non-cached messages
client.on('raw', packet => {
  // We don't want this to run on unrelated packets
  if (!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) return;
  // Grab the channel to check the message from
  const channel = client.channels.get(packet.d.channel_id);
  // There's no need to emit if the message is cached, because the event will fire anyway for that
  if (channel.messages.has(packet.d.message_id)) return;
  // Since we have confirmed the message is not cached, let's fetch it
  channel.fetchMessage(packet.d.message_id).then(message => {
    // Emojis can have identifiers of name:id format, so we have to account for that case as well
    const emoji = packet.d.emoji.id ? `${packet.d.emoji.name}:${packet.d.emoji.id}` : packet.d.emoji.name;
    // This gives us the reaction we need to emit the event properly, in top of the message object
    const reaction = message.reactions.get(emoji);
    // Adds the currently reacting user to the reaction's users collection.
    if (reaction) reaction.users.set(packet.d.user_id, client.users.get(packet.d.user_id));
    // Check which type of event it is before emitting
    if (packet.t === 'MESSAGE_REACTION_ADD') {
      client.emit('messageReactionAdd', reaction, client.users.get(packet.d.user_id));
    }
    if (packet.t === 'MESSAGE_REACTION_REMOVE') {
      client.emit('messageReactionRemove', reaction, client.users.get(packet.d.user_id));
    }
  });
});


client.on('messageReactionAdd', (messageReaction, user) => {
  //console.dir(messageReaction);
  //console.dir(user);
  let msgId = messageReaction.message.id;
  let eventMsgIds = cache.get("eventMsgIds");
  let reactEmoji = messageReaction.emoji.name;
  console.log('added reaction');
  //console.log(messageReaction.message.id);
  //console.log(messageReaction.emoji.name);
  //console.log(user.id + ": " + user.username);
  //console.dir(cache);

  if (eventMsgIds.includes(msgId) && reactEmoji === '✅') {
    console.log("its working!")
    //Get the info we need to add the user to the event
    let msg = messageReaction.message;
    let msgText = msg.content;
    let reactingUserName = user.username;
    let reactingUserId = user.id;

    let newMsg = msgText += `, ${reactingUserName}`
    msg.edit(newMsg);

    //Update event doc in mongo
    const { MongoClient, url } = mongoInit();

    // Use connect method to connect to the Server
    MongoClient.connect(url, async function (err, db) {
      assert.equal(null, err);
      //console.log("Connected correctly to server");
      if (err) throw err;
      var dbo = db.db("boldBotDB");
      var query = { eventMsgId: msgId };
      var command = { $push: { "participants": reactingUserId } };

      dbo.collection("events").updateOne(query, command, function (err, res) {
        if (err) throw err;
        console.log("added participant to event");
        db.close();
      });

    });

  }
});

client.on('messageReactionRemove', (messageReaction, user) => {
  console.dir(messageReaction);
  //console.dir(user);
  let msgId = messageReaction.message.id;
  let eventMsgIds = cache.get("eventMsgIds");
  let reactEmoji = messageReaction.emoji.name;
  console.log('removed reaction');
  //console.log(messageReaction.message.id);
  //console.log(messageReaction.emoji.name);
  //console.log(user.id + ": " + user.username);
  //console.dir(cache);

  if (eventMsgIds.includes(msgId) && reactEmoji === '✅') {
    console.log("its working 2!")
    //Get the info we need to add the user to the event
    let msg = messageReaction.message;
    let msgText = msg.content;
    let reactingUserName = user.username;
    let reactingUserId = user.id;

    let newMsg = msgText.replace(`, ${reactingUserName}`, "");
    msg.edit(newMsg);

    //Update event doc in mongo
    const { MongoClient, url } = mongoInit();

    // Use connect method to connect to the Server
    MongoClient.connect(url, async function (err, db) {
      assert.equal(null, err);
      //console.log("Connected correctly to server");
      if (err) throw err;
      var dbo = db.db("boldBotDB");
      var query = { eventMsgId: msgId };
      var command = { $pull: { "participants": reactingUserId } };

      dbo.collection("events").updateOne(query, command, function (err, res) {
        if (err) throw err;
        console.log("removed participant from event");
        db.close();
      });

    });

  }
});


client.on('message', async msg => {

  if (msg.author.bot) return;

  if (msg.content.indexOf(config.prefix) !== 0) return;

  if (msg.content === 'ping') {
    msg.reply('pong');
  }

  if (msg.content === 'Is a hotdog a sandwich?') {
    msg.reply('Of course it is, you filthy casual.');
  }

  if (msg.content.includes('schedule')) {
    //example request -> !boldBot schedule destiny raid 10/25/19 7:00pm
    let parsedContent = msg.content.split(" ");
    //console.log(parsedContent.toString());
    //console.log(msg.author.id);

    if (parsedContent.length != 6) {
      //msg.author.send('u r dum');
      msg.channel.send("Invalid syntax, please use 'gameName gameMode date time'.");
      return;
    }

    var [prefix, action, game, gameMode, date, time] = parsedContent;
    var creatorId = msg.author.id;
    var creatorUsername = msg.author.username;
    var eventMsgId;

    //store event to mongodb
    const { MongoClient, url } = mongoInit();

    // Use connect method to connect to the Server
    MongoClient.connect(url, async function (err, db) {
      assert.equal(null, err);
      //console.log("Connected correctly to server");
      if (err) throw err;

      //send response and get response message id
      let eventMsg = await msg.channel.send(`Got it. ${game} ${gameMode} scheduled for ${date} at ${time}. \nWanna join? React with a ✅ \nOrganizer: ${creatorUsername} \nParticpants: `)
      eventMsgId = eventMsg.id;
      console.log("eventMsgId: " + eventMsgId);

      //store new msgId to cache
      let curCache = cache.get("eventMsgIds") || [];
      curCache.push(eventMsgId);
      cache.set('eventMsgIds', curCache);

      //generate JSON
      //TODO: store date and time as JS date object
      const eventBlob = {
        "game": game,
        "gameMode": gameMode,
        "date": date,
        "time": time,
        "participants": [creatorId],
        "creator": creatorId,
        "eventMsgId": eventMsgId
      };

      console.dir(eventBlob);

      var dbo = db.db("boldBotDB");
      dbo.collection("events").insertOne(eventBlob, function (err, res) {
        if (err) throw err;
        console.log("1 document inserted");
        db.close();
      });
    });
  }

  //TODO: Don't grab events that have already happened.
  if (msg.content.includes('listEvents')) {
    var msgString = "**List of events incoming:** \n\n";
    var results;

    //Get stuff ready to query DB
    const { MongoClient, url } = mongoInit();

    // Use connect method to connect to the Server
    await MongoClient.connect(url, async function (err, db) {
      assert.equal(null, err);
      //console.log("Connected correctly to server");

      if (err) throw err;
      var dbo = db.db("boldBotDB");

      dbo.collection("events").find({}).toArray(function (err, result) {
        if (err) throw err;
        console.log(result);
        result.forEach(event => msgString += `${event.game} ${event.gameMode} scheduled for ${event.date} at ${event.time}.\n`);
        db.close();
        msg.channel.send(msgString);
      });
    });
  }

});


client.login(auth.token);


async function getEventMsgIds() {
  //Get stuff ready to query DB
  const { MongoClient, url } = mongoInit();

  // Use connect method to connect to the Server
  MongoClient.connect(url, function (err, db) {
    assert.equal(null, err);
    //console.log("Connected correctly to server");

    if (err) throw err;
    var dbo = db.db("boldBotDB");

    dbo.collection("events").find({}).project({ eventMsgId: 1, _id: 0 }).toArray(function (err, result) {
      if (err) throw err;
      //console.log(result.eventMsgId);
      var parsedResults = result.map(event => event.eventMsgId);
      //console.log(parsedResults);
      db.close();
      cache.set('eventMsgIds', parsedResults);
      console.log("Event Message Ids cached.");
    });
  });
}


function mongoInit() {
  var MongoClient = require('mongodb').MongoClient;
  var f = require('util').format;
  var user = encodeURIComponent(auth.mongoUser);
  var password = encodeURIComponent(auth.mongoPw);
  var authMechanism = 'DEFAULT';
  // Connection URL
  var url = f('mongodb://%s:%s@localhost:27017/boldBotDB?authMechanism=%s',
    user, password, authMechanism);
  return { MongoClient: MongoClient, url: url };
}
