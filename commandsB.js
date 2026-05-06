import "dotenv/config";
import { InstallGlobalCommands } from "./utils.js";

// Simple test command
const TEST_COMMAND = {
  name: "test2",
  description: "Basic command",
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Project VC command
const RECEIVE_VC = {
  name: "receivevc",
  description: "A receiver bot will join the specified vc.",
  type: 1,
  integration_types: [0],
  contexts: [0],
  options: [
    {
      name: "channel_name",
      type: 7,
      description: "Channel name",
      required: true,
      channel_types: [2, 13],
    },
  ],
};

const RECEIVER_LEAVE = {
  name: "receiverleave",
  description: "Leave VC",
  type: 1,
  inregration_types: [0],
  contexts: [0],
};

const ALL_COMMANDS = [TEST_COMMAND, RECEIVE_VC, RECEIVER_LEAVE];

InstallGlobalCommands(
  process.env.RECEIVER_APP_ID,
  ALL_COMMANDS,
  process.env.RECEIVER_DISCORD_TOKEN,
);
