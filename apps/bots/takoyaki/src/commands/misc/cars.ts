import { SlashCommandBuilder } from 'discord.js';

import { SlashCommand } from 'typings/command';

const DISCORD_MESSAGE_LIMIT = 2000;
const ELLIPSIS = '…';

const carsPasta = `I have two Ph.D's in Pixarmotive Autobiology and I am here to share facts and spread awareness about the TRUTH of Disney Pixar's Cars.

Imagine, for just a moment- You find yourself in the peaceful, quiet Radiator Springs. You're walking down the sidewalk, taking in the warm rays of the sun on a cloudless day. Suddenly, with the shrill scream of an engine, you turn to see a car barreling toward you at top speed, horrific mouth agape, teeth gnashing. Before you even have time to comprehend what is happening, the car scoops you up, and your body is instantly annihilated as it's torn to shreds.

Now stick with me here, because I'm about to blow this case wide open- but be warned, you won't see your beloved childhood sentient vehicles in the same way.

Consider first, the cars themselves and the world they live in. Now, we know for a fact the cars don't have hands and can't hold objects- We see this first hand in the diner, where the car waitress brings over a drink on an extendable tray attached to her. So the natural question is, who built the world they live in? And furthermore- who built the cars? They obviously can't reproduce, even through attempts to copulate via tailpipes. Obviously, humans had to have had a hand in the creation of said sentient automobiles and their environment. Perhaps they had created the cars to be our humble servants, to chauffeur us around while we relax and lounge comfortably, or pull things for us such as trailers or farming equipment, with no need for exertion on our part. Little did they know what evil AI they had created.

This brings me to my next point. What do you think Cars stands for? The name is not just a coincidence- it stands for Carnivorous Automobiles Ravenously Snacking. C.A.R.S. Snacking on what, though, you might ask?

Human bodies.

Now consider this- all the cars have eyes, tongues, and teeth. This implies they are not merely pure machine, but an unholy hybrid of organic life and robotics. Why would they need tongues and teeth, if they're purely mechanical, as we're lead to believe? Especially when we have never observed them eating- only drinking what appears to be gasoline, as a beverage, akin to a soda. However, we never observe the cars NEEDING this gas beverage as fuel, it seems it is purely a confectionery.

So what are they using for fuel? This brings me back to the question of where the inevitable human founders of Radiator Springs have disappeared to.

The cars have eaten all the humans, using them for fuel; they were likely farming them and keeping them as fodder. The tractors and various farm vehicles we see in film are likely the ones who ran said human farms. After all, what would they all be there for? The cars have no need to farm crops, themselves. But now with the extinction of the humans, they serve no purpose, and merely inhabit the now abandoned human farms. Now, they don't show this onscreen, this would be too traumatic for the intended younger audience, but the implication is there, written clear as day.

We also don't see the insides of the cars- the windows are blacked out, and covered by their soulless, organic-machine-hybrid eyes. This is because the insides of the cars contain their "digestive tracks," where the human is consumed and incinerated upon digestion, only to be expelled via fumes out the tailpipes. If the cars were truly mechanical, they would have headlights for eyes, and you would be able to see a regular vehicle interior inside.

But why would the humans have designed these monstrous, blood thirsty abominations? I cannot say for sure, but it could possibly have to do with desperation caused by scarcity in the run down town of Radiator Springs. Judging by the state of the town as the humans left it- barren, and devoid of crops or other life- they likely faced the same problem many countries in our world do today- over population and lack of resources. Using the excess human bodies to power these machines would not only supply the cars endless fuel that doesn't have to be fought over or conserved, but provide the humans with a means of population control, so that the remaining resources in the town could be distributed more evenly amongst the remaining populace. With the cars doing most of the work for them, there would no longer be much of a need for manpower, anyway; and thus, such a large population. It could also serve as a way to dispose of criminals or other "undesirables" who would end up a strain on the economy of the already struggling community. At first this might have seemed like a great deal, a wonderful invention, car and man living side by side, helping each other; the community of Radiator Springs looked as though it might flourish again, until, of course, the cars inevitably turned on their masters, and took human society for their own, enslaving the humans and farming them for fuel until their consumption became too much, and they were eradicated.

The Wall-E universe allows us a glimpse of what may have been, in another timeline, had the humans not toyed with fate, and instead created purely robotic AI, the way it was intended. Sure, in Wall-E, the world might have almost been destroyed, but who saved it in the end? It was Wall-E, an intelligent little machine who not only doesn't have a mouth, but has no horrific organic hybrid components.

In conclusion, with these facts and information presented, the Cars universe has a darker history than they're willing to let on; they can try to cover it up with cute cartoon faces and comedic relief, but these secrets can only stay buried for so long. I can't force anyone to believe or heed my warning, but I strongly advise caution, and at least a healthy skepticism regarding the dangers of Disney Pixar's Cars. Fear the day that these mouthed, hybrid horrors are introduced into our world.`;

const truncate = (text: string, limit: number) => {
  if (text.length <= limit) {
    return text;
  }

  const cut = text.slice(0, limit - ELLIPSIS.length);
  const lastSpace = cut.search(/\s\S*$/);
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd() + ELLIPSIS;
};

export const command = {
  command: new SlashCommandBuilder()
    .setName('cars')
    .setDescription('Learn the TRUTH about Disney Pixar\'s Cars'),
  execute: async (interaction) => {
    await interaction.reply({
      content: truncate(carsPasta, DISCORD_MESSAGE_LIMIT),
    });
  },
} satisfies SlashCommand;
