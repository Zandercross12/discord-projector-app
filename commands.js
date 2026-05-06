import "dotenv/config";
import { InstallGlobalCommands } from "./utils.js";

// Simple test command
const TEST_COMMAND = {
  name: "test",
  description: "Basic command",
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Project VC command
const PROJECT_VC = {
  name: "projectvc",
  description: "A projector bot will join the specified vc.",
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

const PROJECTOR_LEAVE = {
  name: "projectorleave",
  description: "Leave VC",
  type: 1,
  inregration_types: [0],
  contexts: [0],
};

const ALL_COMMANDS = [TEST_COMMAND, PROJECT_VC, PROJECTOR_LEAVE];

InstallGlobalCommands(
  process.env.APP_ID,
  ALL_COMMANDS,
  process.env.DISCORD_TOKEN,
);
