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
        const nick = resolved[uuid].replace('_', '\\_');
        history.push([player.applied, 'apply', nick]);
        if (player.joined != null) {
            history.push([player.joined, 'join', nick]);
        }
        if (player.death.time != null) {
            history.push([player.death.time, 'death', nick, player.death.reason == null ? null : resolved[player.death.reason].replace('_', '\\_')]);
        }
    }

    const filters = args.slice(2);
    history = history.filter(function(event) {
        for (const i in filters) {
            let filter = filters[i];
            switch (filter) {
                case 'zapisy':
                    if (event[1] != 'apply') { return false; }
                    break;
                case 'dołączenia':
                    if (event[1] != 'join') { return false; }
                    break;
                case 'śmierci':
                    if (event[1] != 'death') { return false; }
                    break;
                default:
                    filter = filter.replace('_', '\\_');
                    if (filter != event[2] && filter != event[3]) { return false; }
            }
        }
        return true;
    });

    history = history.sort(function(a, b) {
        return b[0] - a[0];
    });

    let page = args[1] ? parseInt(args[1]) : 1;
    const maxPage = Math.ceil(history.length / 10);
    if (page < 0 || isNaN(page)) { page = 1; }
    if (page > maxPage) { page = maxPage; }
    const embed = new discord.RichEmbed();
    embed.setAuthor(`Historia eventu`, 'https://cdn.fcraft.pl/logo/event/v2.2.png');
    embed.setColor('FF8600');
    let end = false;
    for (let i = (page - 1) * 10; i < page * 10; i++) {
        const event = history[i];
        if (event == undefined) { break; }
        const time = moment(event[0] * 1000).format('DD.MM.YYYY o HH:mm');
        const nick = event[2];
        switch (event[1]) {
            case 'apply':
                embed.addField(time, `Gracz ${nick} złożył podanie na serwer.`, false);
                break;
            case 'join':
                embed.addField(time, `Gracz ${nick} dołączył po raz pierwszy na serwer.`, false);
                break;
            case 'death':
                const reason = event[3] == null ? 'siły natury' : 'gracza ' + event[3];
                embed.addField(time, `Gracz ${nick} został zabity przez ${reason}.`, false);
                break;
        }
    }
    embed.setFooter(`Strona ${page}/${maxPage}` + (page == maxPage ? '' : `, następna: event!historia ${page + 1}`))
    message.channel.send(embed);
};
