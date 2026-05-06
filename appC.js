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
  EndBehaviorType,
  getVoiceConnection,
  joinVoiceChannel,
} from "@discordjs/voice";
import net from "net";

// TCP Socket to App B
let relaySocket = null;
let reconnectInterval = null;
const RECONNECT_DELAY = 5000;

function connectToAppB() {
  if (relaySocket) {
    relaySocket.destroy();
    relaySocket = null;
  }

  relaySocket = new net.Socket();

  relaySocket.connect(9001, "127.0.0.1", () => {
    console.log("Connected to App D relay server");

    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
  });

  relaySocket.on("error", (err) => {
    console.error("Relay socket error: ", err?.message);
    scheduleReconnect();
  });

  relaySocket.on("close", () => {
    console.warn("Relay socket closed");
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (!reconnectInterval) {
    console.log(
      `Will attempt to reconnect to App D in ${RECONNECT_DELAY / 1000} seconds...`,
    );

    reconnectInterval = setInterval(() => {
      console.log("Attempting to reconnect to App D...");
      connectToAppB();
    }, RECONNECT_DELAY);
  }
}

connectToAppB();

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

client.login(process.env.DISCORD_TOKEN_B);

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT_B || 3002;

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post(
  "/interactions",
  verifyKeyMiddleware(process.env.PUBLIC_KEY_B),
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

      if (name === "test3") {
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

      if (name === "projectvc2") {
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

          joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: true,
          });

          const connection = getVoiceConnection(channel.guild.id);
          const receiver = connection.receiver;

          const activeSubscriptions = new Map();

          receiver.speaking.on("start", (userId) => {
            if (
              userId === process.env.RECEIVER_APP_ID ||
              userId === process.env.RECEIVER_APP_ID_2
            )
              return;

            if (activeSubscriptions.has(userId)) return;

            const audioStream = receiver.subscribe(userId, {
              end: {
                behavior: EndBehaviorType.AfterSilence,
                duration: 500,
              },
            });

            activeSubscriptions.set(userId, audioStream);

            audioStream.on("data", (chunk) => {
              if (relaySocket.writable) {
                const header = Buffer.alloc(4);
                header.writeUInt32BE(chunk.length, 0);
                relaySocket.write(header);
                relaySocket.write(chunk);
              }
            });

            audioStream.on("end", () => {
              activeSubscriptions.delete(userId);
            });

            audioStream.on("error", (err) => {
              console.error(`Audio stream error for ${userId}: `, err?.message);
              activeSubscriptions.delete(userId);
            });
          });

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

      if (name === "projectorleave2") {
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
