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
        killings = killings.sort(function (a, b) {
            return a.length - b.length;
        });

        const embed = new discord.RichEmbed();
        embed.setAuthor('Ranking zabójstw', 'https://cdn.fcraft.pl/logo/event/v2.2.png');
        embed.setColor('FF8600');
        let i = 0;
        for (const nick in killings) {
            i++; if (i > 5) { break; }
            embed.addField(`Miejsce #${i}`, `${nick} (${killings[nick].length}): ${killings[nick].join(', ')}`, false);
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
    for (const i in killings[nick]) {
        const victim = killings[nick][i];
        if (victim in killings) {
            killings[nick][i] += ` (${killings[victim].length})`;
        }
    }

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
