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

module.exports = async (client) => {
    try {
        const playersEndpointURL = `https://api.fcraft.pl/event/player/list?key0=${config.key}`;
        const players = JSON.parse(await httpAsPromised.get(playersEndpointURL, { resolve: 'body' }));
        const members = client.guilds.get(config.verification.guild).members.array();

        for(const member of members) {
            const playerByDiscordTag = players.find(player => player.discord === member.user.tag);

            if(playerByDiscordTag) {
                const user = await rethinkdb.table('users').get(member.id).run(database);

                if(!user) {
                    await rethinkdb.table('users').insert({
                        id: member.id,
                        uuid: playerByDiscordTag.uuid
                    }).run(database);
                }
            }

            const user = await rethinkdb.table('users').get(member.id).run(database);

            if(user) {
                const playerByUUID = players.find(player => player.uuid === user.uuid);
                const nickname = (await apiClient.resolverUuids([user.uuid]))[user.uuid];

                member.setNickname(nickname).catch(error => {});

                if(playerByUUID) {
                    member.addRole(config.verification.roles.player);

                    if(playerByUUID.death) {
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
};
