import "dotenv/config";
import { InstallGlobalCommands } from "./utils.js";

// Simple test command
const TEST_COMMAND = {
  name: "test4",
  description: "Basic command",
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Project VC command
const RECEIVE_VC_2 = {
  name: "receivevc2",
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

const RECEIVER_LEAVE_2 = {
  name: "receiverleave2",
  description: "Leave VC",
  type: 1,
  inregration_types: [0],
  contexts: [0],
};

const ALL_COMMANDS = [TEST_COMMAND, RECEIVE_VC_2, RECEIVER_LEAVE_2];

InstallGlobalCommands(
  process.env.RECEIVER_APP_ID_2,
  ALL_COMMANDS,
  process.env.RECEIVER_DISCORD_TOKEN_2,
);
