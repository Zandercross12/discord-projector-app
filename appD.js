import "dotenv/config";
import express from "express";
import {
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from "discord-interactions";
import { getRandomEmoji } from "./utils.js";
import { Client, GatewayIntentBits, InteractionResponse } from "discord.js";
import {
  getVoiceConnection,
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  StreamType,
  AudioPlayerStatus,
} from "@discordjs/voice";
import net from "net";
import { PassThrough } from "stream";
import OpusScript from "opusscript";

// Discord Gateway Client (needed for voice)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

client.once("clientReady", () => {
  console.log(`Gateway connected as ${client.user.tag}`);
});

client.login(process.env.RECEIVER_DISCORD_TOKEN_2);

// Create an express app
const app = express();
// Get port, or default to 3003
const PORT = process.env.RECEIVER_PORT_2 || 3003;
const AUDIO_RELAY_PORT = process.env.AUDIO_RELAY_PORT_D || 9001;

const SAMPLE_RATE = 48000;
const CHANNELS = 2;

let currentRelay = null;
const activeSources = new Map();

const player = createAudioPlayer();

function startPlayback(connection) {
  player._connection = connection;
  console.log("startPlayback");
  getOrCreateRelay();
}

function getOrCreateRelay() {
  if (!currentRelay || currentRelay.destroyed) {
    currentRelay = new PassThrough();

    const resource = createAudioResource(currentRelay, {
      inputType: StreamType.Raw,
    });

    player.play(resource);
    if (player._connection) {
      player._connection.subscribe(player);
    }
  }
  return currentRelay;
}

player.on(AudioPlayerStatus.Idle, () => {});

player.on("error", (err) => {
  console.error("Audio player error: ", err?.message);
  if (currentRelay && !currentRelay.destroyed) {
    currentRelay.destroy();
  }
});

function mixAndWrite() {
  const relay = getOrCreateRelay();
  if (!relay || relay.destroyed) return;

  const sources = Array.from(activeSources.values());
  if (sources.length === 0) return;

  // Collect frames from sources that have data
  const availableFrames = [];

  for (const source of sources) {
    if (source.frameQueue.length > 0) {
      availableFrames.push({
        source,
        frame: source.frameQueue.shift(),
      });
    }
  }

  if (availableFrames.length === 0) return;

  if (availableFrames.length === 1) {
    // Single source - write directly (no mixing needed)
    relay.write(availableFrames[0].frame);
    return;
  }

  // Multiple sources - mix them
  const frames = availableFrames.map((f) => f.frame);
  const maxLength = Math.max(...frames.map((f) => f.length));
  const mixed = Buffer.alloc(maxLength);

  for (let i = 0; i < maxLength; i += 2) {
    let sum = 0;

    for (const frame of frames) {
      if (i + 1 < frame.length) {
        sum += frame.readInt16LE(i);
      }
    }

    // Clamp to prevent clipping
    const clamped = Math.max(-32768, Math.min(32767, sum));
    mixed.writeInt16LE(clamped, i);
  }

  relay.write(mixed);
}

const server = net.createServer((socket) => {
  const sourceId = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`Source ${sourceId} connected via TCP`);

  const decoder = new OpusScript(
    SAMPLE_RATE,
    CHANNELS,
    OpusScript.Application.AUDIO,
  );

  const sourceData = {
    decoder,
    frameQueue: [],
  };

  activeSources.set(sourceId, sourceData);

  let buffer = Buffer.alloc(0);

  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 4) {
      const frameSize = buffer.readUInt32BE(0);
      if (buffer.length < 4 + frameSize) break;

      const frame = buffer.slice(4, 4 + frameSize);
      buffer = buffer.slice(4 + frameSize);

      try {
        const pcm = decoder.decode(frame);

        // Add to this source's queue
        sourceData.frameQueue.push(pcm);

        // Limit queue to prevent memory issues
        if (sourceData.frameQueue.length > 100) {
          sourceData.frameQueue.shift();
        }

        // Try to output mixed audio
        mixAndWrite();
      } catch (err) {
        console.error(`Opus decode error (${sourceId}): `, err?.message);
      }
    }
  });

  socket.on("end", () => {
    console.log(`Source ${sourceId} disconnected`);
    activeSources.delete(sourceId);
  });

  socket.on("error", (err) => {
    if (err.code !== "ECONNRESET") {
      console.error(`TCP socket error (${sourceId}): `, err?.message);
    }
    activeSources.delete(sourceId);
  });
});

server.listen(AUDIO_RELAY_PORT, "127.0.0.1", () => {
  console.log(`Audio relay TCP server listening on port ${AUDIO_RELAY_PORT}`);
});

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post(
  "/interactions",
  verifyKeyMiddleware(process.env.RECEIVER_PUBLIC_KEY_2),
  async function (req, res) {
    // Interaction id, type and data
    const { id, type, data, member, guild_id } = req.body;

    /**
     * Handle verification requests
     */
    if (type === InteractionType.PING) {
      return res.send({ type: InteractionResponseType.PONG });
    }

    /**
     * Handle slash command requests
     * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
     */
    if (type === InteractionType.APPLICATION_COMMAND) {
      const { name } = data;

      if (name === "test4") {
        // Send a message into the channel where command was triggered from
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2,
            components: [
              {
                type: MessageComponentTypes.TEXT_DISPLAY,
                // Fetches a random emoji to send from a helper function
                content: `hello world ${getRandomEmoji()}`,
              },
            ],
          },
        });
      }

      if (name === "receivevc2") {
        const channelId = data.options?.find(
          (o) => o.name === "channel_name",
        )?.value;

        if (!channelId) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: "Please provide a voice channel ID." },
          });
        }

        try {
          const channel = await client.channels.fetch(channelId);

          if (!channel || channel.type !== 2) {
            return res.send({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: "Selected channel is not a valid voice channel.",
              },
            });
          }

          const voiceConnection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false,
          });

          startPlayback(voiceConnection);

          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Joined <#${channelId}>!`,
            },
          });
        } catch (err) {
          console.error("Failed to join voice channel: ", err);
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "Failed to join the voice channel.",
            },
          });
        }
      }

      if (name === "receiverleave2") {
        const connection = getVoiceConnection(guild_id);

        if (!connection) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "Projector App is not in a voice channel.",
            },
          });
        }

        connection.destroy();

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "Left the voice channel.",
          },
        });
      }

      console.error(`unknown command: ${name}`);
      return res.status(400).json({ error: "unknown command" });
    }

    console.error("unknown interaction type", type);
    return res.status(400).json({ error: "unknown interaction type" });
  },
);

app.listen(PORT, () => {
  console.log("Listening on port", PORT);
});
