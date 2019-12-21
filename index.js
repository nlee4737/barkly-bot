const Discord = require('discord.js');
const {
    prefix,
    token
} = require('./config.json');

const ytdl = require('ytdl-core');
const client = new Discord.Client();
const queue = new Map();

client.once('ready', () =>{
    console.log('Ready!');
});
client.once('reconnecting', () => {
    console.log('Reconnecting!');
});
client.once('disconnect', () =>{
    console.log('Disconnect!');
});

client.on('message', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);
try {
    if(message.content.startsWith(`${prefix}play http`)) {
        execute(message,serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}skip`)) {
        skip(message,serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}stop`)) {
        stop(message,serverQueue);
        return;
    } else {
        message.channel.send('Not a valid command.')
    } 
} catch (error) {
    console.log(JSON.stringify(error, null, 2));
    message.channel.send(error.message)
}
});

async function execute(message, serverQueue) {
    try {
    const args = message.content.split(' ');
    
        const voiceChannel = message.member.voiceChannel;
        if(!voiceChannel) return message.channel.send('You need to be a in a voice channel to play music.');
            const permissions = voiceChannel.permissionsFor(message.client.user);
        if(!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
            return message.channel.send('I need the permissions to join and speak in your voice channel.');
        }
        const songInfo = await ytdl.getInfo(args[1]);

        const song = {
            title: songInfo.title,
            url: songInfo.video_url,
        };

        if (!serverQueue) {
            const queueConstruct = {
			    textChannel: message.channel,
			    voiceChannel: voiceChannel,
			    connection: null,
			    songs: [],
			    volume: 5,
			    playing: true,
            };
            queue.set(message.guild.id, queueConstruct);
            queueConstruct.songs.push(song);

            try {
                var connection = await voiceChannel.join();
                queueConstruct.connection = connection;
                play(message.guild, queueConstruct.songs[0]);
            } catch (err) {
                console.log(err);
                queue.delete(message.guild.id);
                return message.channel.send(err);
            }
    } else {
        serverQueue.songs.push(song);
        console.log(serverQueue.songs);
        return message.channel.send(`${song.title} has been added to the queue.`);
    }
    } catch (error) {
        console.log(JSON.stringify(error, null, 2));
        message.channel.send(error.message)
    }
}

function skip(message, serverQueue) {
    if (!message.member.voiceChannel) return message.channel.send('You have to be in a voice channel to stop the music!');
    if (!serverQueue) return message.channel.send('There is no song that I could skip!');
    serverQueue.connection.dispatcher.end();
}
function stop(message, serverQueue) {
    if (!message.member.voiceChannel) return message.channel.send('You have to be in a voice channel to stop the music!');
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if(!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }
    const dispatcher = serverQueue.connection.playStream(ytdl(song.url,{
		filter: "audioonly",
		highWaterMark: 1<<25
	}))
        .on('end', () => {
            console.log('All songs are over.');
            serverQueue.songs.shift();
            play(guild,serverQueue.songs[0]);    
        })
        .on('error', error => {
            console.error(error);
        });
    dispatcher.setVolumeLogarithmic(serverQueue.volume/5);
}

client.login(token);