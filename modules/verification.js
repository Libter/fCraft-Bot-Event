'use strict';

const fs = require('fs');
const path = require('path');

const apifcraftpl = require('api-fcraft.pl');
const httpAsPromised = require('http-as-promised');
const rethinkdb = require('rethinkdb');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json')));

const apiClient = new apifcraftpl(config.key);

let database;

rethinkdb.connect({
    host: config.database.host,
    port: config.database.port,
    db: config.database.database,
    user: config.database.user.name,
    password: config.database.user.password
}).then(connection => {
    database = connection;
});

async function verification(client) {
    try {
        const playersEndpointURL = `https://api.fcraft.pl/event/player/list?key0=${config.key}`;
        const players = Object.entries(JSON.parse(await httpAsPromised.get(playersEndpointURL, { resolve: 'body' })));
        const members = client.guilds.get(config.verification.guild).members.array();

        for(const member of members) {
            const playerByDiscordTag = players.find(player => player[1].discord === member.user.tag);

            if(playerByDiscordTag) {
                const user = await rethinkdb.table('users').get(member.id).run(database);

                if(!user) {
                    await rethinkdb.table('users').insert({
                        id: member.id,
                        uuid: playerByDiscordTag[0]
                    }).run(database);
                }
            }

            const user = await rethinkdb.table('users').get(member.id).run(database);

            if(user) {
                const playerByUUID = players.find(player => player[0] === user.uuid);
                const nickname = (await apiClient.resolverUuids([user.uuid]))[user.uuid];

                member.setNickname(nickname).catch(error => {});

                if(playerByUUID) {
                    member.addRole(config.verification.roles.player);

                    if(playerByUUID[1].death.time) {
                        member.addRole(config.verification.roles.dead);
                    } else {
                        member.removeRole(config.verification.roles.dead);
                    }
                } else {
                    member.removeRole(config.verification.roles.player);
                }
            }
        }
    } catch(error) {
        console.error(error);
    }
}

exports.noMessage = client => {
    verification(client);
};

exports.message = message => {
    verification(client).then(() => {
        message.reply('zweryfikowano!');
        message.channel.stopTyping();
    });
};
