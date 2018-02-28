'use strict';

const httpAsPromised = require('http-as-promised');
const fs = require('fs'); const path = require('path');
const moment = require('moment'); const discord = require('discord.js');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json')));
const apifcraftpl = require('api-fcraft.pl'); const apiClient = new apifcraftpl(config.key);

module.exports = async (message, args) => {
    let history = [];

    const playersUrl = `https://api.fcraft.pl/event/player/list?key0=${config.key}`;
    const players = JSON.parse(await httpAsPromised.get(playersUrl, { resolve: 'body' }));
    const resolved = await apiClient.resolverUuids(Object.keys(players));

    for (const uuid in players) {
        const player = players[uuid];
        history.push([player.applied, 'apply', uuid]);
        if (player.joined != null) {
            history.push([player.joined, 'join', uuid]);
        }
        if (player.death.time != null) {
            history.push([player.death.time, 'death', uuid, player.death.reason]);
        }
    }

    history.sort(function(a, b) {
        return b[0] - a[0];
    });

    const page = args[1] ? parseInt(args[1]) : 1;
    if (page < 0) { page = 1; }
    const embed = new discord.RichEmbed();
    embed.setAuthor(`Historia eventu`, 'https://cdn.fcraft.pl/logo/event/v2.2.png');
    embed.setColor('FF8600');
    for (let i = (page - 1) * 10; i < page * 10; i++) {
        const event = history[i];
        if (event == undefined) { break; }
        const time = moment(event[0] * 1000).format('DD.MM.YYYY o HH:mm');
        const nick = resolved[event[2]];
        switch (event[1]) {
            case 'apply':
                embed.addField(time, `Gracz ${nick} złożył podanie na serwer.`, false);
                break;
            case 'join':
                embed.addField(time, `Gracz ${nick} dołączył po raz pierwszy na serwer.`, false);
                break;
            case 'death':
                const reason = event[3] == null ? 'siły natury' : 'gracza ' + resolved[event[3]];
                embed.addField(time, `Gracz ${nick} został zabity przez ${reason}.`, false);
                break;
        }
    }
    embed.setFooter(`Strona ${page}, następna: event!historia ${page + 1}`)
    message.channel.send(embed);
};
