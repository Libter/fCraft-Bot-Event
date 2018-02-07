'use strict';

const fs = require('fs');
const path = require('path');

const Discord = require('discord.js');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));
const packageInfo = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json')));

const verification = require(path.join(__dirname, 'modules', 'verification.js'));

const client = new Discord.Client();

client.on('ready', () => {
    client.user.setActivity(`@weryfikacja | v${packageInfo.version}`);
    console.log('Client is ready!');

    setInterval(() => {
        verification(client);
    }, 60 * 60 * 1000);
});

client.on('guildMemberAdd', member => {
    verification(client);
});

client.on('message', message => {
    const args = message.content.trim().split(/\s+/);

    switch(args[0]) {
        case '@weryfikacja':
            verification(client);
            break;
    }
});

client.login(config.token);
