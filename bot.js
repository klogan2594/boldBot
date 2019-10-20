const Discord = require('discord.js');
const client = new Discord.Client();
const auth = require('./auth.json');

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  parseReply(msg);
});


function parseReply(msg) {
  if (msg.content === 'ping') {
    msg.reply('pong');
  } else if (msg.content === 'Is a hotdog a sandwich?') {
    msg.reply('Of course it is, you filthy casual.');
  } else if (msg.content.includes('!schedule')) {
    scheduleEvent(msg);
  }
}


function scheduleEvent(msg) {
  //msg.reply("http://gph.is/1BIJbcc");
  msg.channel.send('its working!')

  const parsedContent = msg.content.split(" ")
  console.log(parsedContent.toString());

  

}


client.login(auth.token);