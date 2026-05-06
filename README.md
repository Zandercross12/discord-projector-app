# Description

These discord bots were made with the intention of relaying audio between two vcs.

# Getting Started

To install, make sure you have node installed on your machine. Then install npm or pnpm.
After they are installed, make sure you run this command to install all the packages necessary for the project:

`npm install`
OR
`pnpm install`

The command will install all the packages needed.

Next, you will need to set up your environment variables. The necessary environment variables are in the `.env.sample` file, which you will need to copy to a new `.env` file. The environment variables are information for the discord bot, so you'll need to set up your own discord bots for these to hook up to.

Once you have that step figured out, you'll need to register their commands:

`npm run register`
OR
`pnpm run register`

This will set up their commands when they join your discord server. Once that is done, you can start the discord bots. However, you aren't out of the woods just yet!

You will still need to figure out how to connect to your bot, likely through some proxy. Then you can hook up the interactions to your bot in your bot settings:

- General Information > Interactions Endpoint URL

The URL should look something like this:

`<URL>/interactions`

It'll look like that for each bot.

### DEFAULT-PORTS (when ports aren't entered in environment variables):
- App A - 3000
- App B - 3001 && Audio Relay Socket - 9000
- App C - 3002
- App D - 3003 && Audio Relay Socket - 9001
