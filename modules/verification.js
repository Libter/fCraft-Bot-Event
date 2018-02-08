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
    const playersEndpointURL = `https://api.fcraft.pl/event/player/list?key0=${config.key}`;
    const playersRequest = JSON.parse(await httpAsPromised.get(playersEndpointURL, { resolve: 'body' }));
    const nicknames = await apiClient.resolverUuids(Object.keys(playersRequest));
    const players = Object.entries(playersRequest);
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
            const nickname = nicknames[user.uuid];

            if(member.displayName !== nickname) {
                member.setNickname(nickname).catch(error => {});
            }

            if(playerByUUID) {
                if(!member.roles.get(config.verification.roles.player)) {
                    member.addRole(config.verification.roles.player);
                }

                if(playerByUUID[1].death.time) {
                    if(!member.roles.get(config.verification.roles.dead)) {
                        member.addRole(config.verification.roles.dead);
                    }
                } else {
                    if(member.roles.get(config.verification.roles.dead)) {
                        member.removeRole(config.verification.roles.dead);
                    }
                }
            } else {
                if(member.roles.get(config.verification.roles.player)) {
                    member.removeRole(config.verification.roles.player);
                }
            }
        }
    }
}

exports.noMessage = client => {
    verification(client).catch(error => {
        console.error(error);
    });
};

exports.message = message => {
    verification(message.client).then(() => {
        if(!message.member.roles.get(config.verification.roles.player)) {
            message.reply('nie można było zweryfikować! Upewnij się, czy jesteś zapisany.')
        }

        message.channel.stopTyping();
    }).catch(error => {
        message.reply('wystąpił błąd!');
        message.channel.stopTyping();
        console.error(error);
    });
};
