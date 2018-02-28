'use strict';

const httpAsPromised = require('http-as-promised');
const fs = require('fs'); const path = require('path');
const moment = require('moment'); const discord = require('discord.js');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json')));
const apifcraftpl = require('api-fcraft.pl'); const apiClient = new apifcraftpl(config.key);

module.exports = async (message, args) => {
    let nick = args[1] ? args[1] : (message.guild ? message.member.displayName : message.author.username);

    const playersUrl = `https://api.fcraft.pl/event/player/list?key0=${config.key}`;
    const players = JSON.parse(await httpAsPromised.get(playersUrl, { resolve: 'body' }));
    const resolved = await apiClient.resolverUuids(Object.keys(players));

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
    const killings = []; const killingsCount = [];
    for (const everyUuid in players) {
        const everyPlayer = players[everyUuid];
        if (everyPlayer.death.reason != null) {
            const key = resolved[everyPlayer.death.reason].replace('_', '\\_');
            if (!(key in killingsCount)) {
                killingsCount[key] = 0;
            } killingsCount[key]++;

            if (everyPlayer.death.reason == uuid) {
                killings.push(resolved[everyUuid].replace('_', '\\_'));
            }
        }
    }

    for (const i in killings) {
        const victim = killings[i];
        if (victim in killingsCount) {
            killings[i] += ` (${killingsCount[victim]})`;
        }
    }

    const embed = new discord.RichEmbed();
    embed.setAuthor('Informacje o graczu eventu', 'https://cdn.fcraft.pl/logo/event/v2.2.png');
    embed.setColor('FF8600');
    embed.setThumbnail(`https://api.fcraft.pl/player/${nick}/head?size=16`);
    embed.addField('Nick', nick.replace('_', '\\_'), true);
    embed.addField('Discord', player.discord, true);
    embed.addField('Zapisanie się', player.applied == null ? '_brak_' :
        moment(player.applied * 1000).format('DD.MM.YYYY o HH:mm'), true);
    embed.addField('Dołączenie', player.joined == null ? '_brak_' :
        moment(player.joined * 1000).format('DD.MM.YYYY o HH:mm'), true);
    embed.addField('Zabici gracze', killings.length == 0 ? '_brak_' : killings.join(', '));
    embed.addField('Śmierć', player.death.time == null ? '_brak_' :
        moment(player.death.time * 1000).format('DD.MM.YYYY o HH:mm') + ' przez ' +
        (player.death.reason == null ? 'siły natury' : resolved[player.death.reason].replace('_', '\\_')), false);
    message.channel.send(embed);
};
