'use strict';

const httpAsPromised = require('http-as-promised');
const fs = require('fs'); const path = require('path');
const moment = require('moment'); const discord = require('discord.js');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json')));
const apifcraftpl = require('api-fcraft.pl'); const apiClient = new apifcraftpl(config.key);

module.exports = async (ranking, message, args) => {
    const playersUrl = `https://api.fcraft.pl/event/player/list?key0=${config.key}`;
    const players = JSON.parse(await httpAsPromised.get(playersUrl, { resolve: 'body' }));
    const resolved = await apiClient.resolverUuids(Object.keys(players));

    let killings = [];
    for (const everyUuid in players) {
        const everyPlayer = players[everyUuid];
        if (everyPlayer.death.reason != null) {
            const key = resolved[everyPlayer.death.reason].replace('_', '\\_');
            if (!(key in killings)) {
                killings[key] = [];
            } killings[key].push(resolved[everyUuid].replace('_', '\\_'));
        }
    }

    if (ranking) {
        let limit = args[1] ? parseInt(args[1]) : 5;
        if (limit == 0) { limit = Number.MAX_VALUE; }
        if (limit < 0) { limit = 5; } if (limit > 25) { limit = 25; }

        const sortedKillings = [];
        for (const nick in killings) {
            sortedKillings.push([nick, killings[nick]]);
        }
        sortedKillings.sort((a, b) => b[1].length - a[1].length);

        const embed = new discord.RichEmbed();
        embed.setAuthor('Ranking zabójstw', 'https://cdn.fcraft.pl/logo/event/v2.2.png');
        embed.setColor('FF8600');
        for (const i in sortedKillings) {
            const place = parseInt(i) + 1;
            if (place > limit) { break; }
            const killing = sortedKillings[i];
            embed.addField(`Miejsce #${place}`, `${killing[0]} (${killing[1].length}): ${killing[1].join(', ')}`, false);
        }
        message.channel.send(embed);
        return;
    }

    let nick = args[1] ? args[1] : (message.guild ? message.member.displayName : message.author.username);

    let uuid = null;
    for (const everyUuid in resolved) {
        if (resolved[everyUuid].toLowerCase() == nick.toLowerCase()) {
            nick = resolved[everyUuid];
            uuid = everyUuid;
            break;
        }
    }

    if (uuid == null) {
        message.reply('nie można było uzyskać informacji nt. podanego gracza!');
        return;
    }

    const player = players[uuid];

    nick = nick.replace('_', '\\_');
    killings[nick] = killings[nick].map((victim) => {
        if (victim in killings) {
            victim += ` (${killings[victim].length})`;
        }
        return victim
    });

    const embed = new discord.RichEmbed();
    embed.setAuthor('Informacje o graczu eventu', 'https://cdn.fcraft.pl/logo/event/v2.2.png');
    embed.setColor('FF8600');
    embed.setThumbnail(`https://api.fcraft.pl/player/${nick}/head?size=16`);
    embed.addField('Nick', nick, true);
    embed.addField('Discord', player.discord, true);
    embed.addField('Zapisanie się', player.applied == null ? '_brak_' :
        moment(player.applied * 1000).format('DD.MM.YYYY o HH:mm'), true);
    embed.addField('Dołączenie', player.joined == null ? '_brak_' :
        moment(player.joined * 1000).format('DD.MM.YYYY o HH:mm'), true);
    embed.addField('Zabici gracze', (nick in killings) ? killings[nick].join(', ') : '_brak_');
    embed.addField('Śmierć', player.death.time == null ? '_brak_' :
        moment(player.death.time * 1000).format('DD.MM.YYYY o HH:mm') + ' przez ' +
        (player.death.reason == null ? 'siły natury' : resolved[player.death.reason].replace('_', '\\_')), false);
    message.channel.send(embed);
};
