'use strict';

const fs = require('fs');
const path = require('path');

const Discord = require('discord.js');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));
const packageInfo = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json')));

const verification = require(path.join(__dirname, 'modules', 'verification.js'));
const playerCmd = require(path.join(__dirname, 'modules', 'player.js'));
const historyCmd = require(path.join(__dirname, 'modules', 'history.js'));

const client = new Discord.Client();

client.on('ready', () => {
    client.user.setActivity(`!zweryfikuj | v${packageInfo.version}`);
    console.log('Client is ready!');

    setInterval(() => {
        verification.noMessage(client);
    }, 60 * 60 * 1000);
});

client.on('guildMemberAdd', member => {
    verification.noMessage(client);
});

client.on('message', message => {
    if(!message.guild) return;

    const args = message.content.trim().split(/\s+/);

    switch(args[0].toLowerCase()) {
        case '!zweryfikuj':
            message.channel.startTyping();
            verification.message(message);
            break;
        case 'event!historia':
        case 'e!historia':
            message.channel.startTyping();
            historyCmd(message, args);
            message.channel.stopTyping();
            break;
        case 'event!gracz':
        case 'e!gracz':
            message.channel.startTyping();
            playerCmd(false, message, args);
            message.channel.stopTyping();
            break;
        case 'event!ranking':
        case 'e!ranking':
            message.channel.startTyping();
            playerCmd(true, message, args);
            message.channel.stopTyping();
            break;
    }
});

client.login(config.token);
