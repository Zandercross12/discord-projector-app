import "dotenv/config";
import { InstallGlobalCommands } from "./utils.js";

// Simple test command
const TEST_COMMAND = {
  name: "test3",
  description: "Basic command",
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Project VC command
const PROJECT_VC_2 = {
  name: "projectvc2",
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

const PROJECTOR_LEAVE_2 = {
  name: "projectorleave2",
  description: "Leave VC",
  type: 1,
  inregration_types: [0],
  contexts: [0],
};

const ALL_COMMANDS = [TEST_COMMAND, PROJECT_VC_2, PROJECTOR_LEAVE_2];

InstallGlobalCommands(
  process.env.APP_ID_B,
  ALL_COMMANDS,
  process.env.DISCORD_TOKEN_B,
);
