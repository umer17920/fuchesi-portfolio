/**
 * How Fuchesi works. Code-managed; feeds /process, the Home teaser, and llms.txt.
 *
 * Written as concrete stages with a stated output, because "typical project
 * stages" is exactly the kind of specific, quotable fact an AI assistant will
 * cite when asked how a company runs its projects.
 */

export type Stage = {
  number: string;
  name: string;
  summary: string;
  body: string;
  /** The tangible thing you get at the end of this stage. */
  output: string;
};

export const process: Stage[] = [
  {
    number: '01',
    name: 'Discovery',
    summary: 'We work out what is actually worth building.',
    body: 'We start with your process, not our proposal — what the business does, where it breaks, and what it costs you when it does. This is also where we tell you if you do not need us. A cheaper answer that works is a better answer, and saying so early is the point of discovery.',
    output: 'A written scope, a fixed price range, and a clear recommendation.',
  },
  {
    number: '02',
    name: 'Shape',
    summary: 'We design it before we build it.',
    body: 'Screens, flows, and data model — enough to make the thing real and disagreeable before anyone writes production code. Changing your mind here costs a conversation. Changing it in month three costs money.',
    output: 'Designs and a technical plan you have signed off.',
  },
  {
    number: '03',
    name: 'Build',
    summary: 'You see working software early, and often.',
    body: 'We build in short cycles, and you get something you can click at the end of each one. No reveal at the end, no quarter of silence. If it is going the wrong way, you find out in week two rather than week twelve.',
    output: 'Working software you can use, updated continuously.',
  },
  {
    number: '04',
    name: 'Launch',
    summary: 'We put it live carefully, and move your data with it.',
    body: 'Migration, testing, and rollout — planned as part of the work rather than bolted on at the end. Where it makes sense we go live in stages, so the business is never betting everything on a single day.',
    output: 'The system in production, with your real data in it.',
  },
  {
    number: '05',
    name: 'Support',
    summary: 'We stay responsible for it after it ships.',
    body: 'Software that is used gets changed. We fix what breaks, extend what works, and stay reachable — you are not handed a repository and wished luck. You own the code and infrastructure throughout, so staying with us is a choice rather than a trap.',
    output: 'An agreed support arrangement, and someone who knows the system.',
  },
];
