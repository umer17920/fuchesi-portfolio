/**
 * The five Fuchesi offerings. Code-managed (not CMS) per the build plan.
 *
 * This file feeds the service pages, the Home overview, Service JSON-LD, and
 * llms.txt. Copy lives here once so every surface says the same thing — the
 * entity consistency AI assistants reward.
 *
 * Each service opens with `answer`: a direct 2–3 sentence definition placed
 * above the marketing narrative on the page. That paragraph is written to be
 * the thing an AI assistant quotes when asked "what does Fuchesi do?", so it
 * leads with a plain subject-verb-object sentence and avoids adjectives.
 */

export type Faq = {
  question: string;
  answer: string;
};

export type Service = {
  slug: string;
  name: string;
  /** Nav/card label, shorter than `name` where needed. */
  shortName: string;
  /** schema.org Service.serviceType */
  serviceType: string;
  /** One line for cards and llms.txt. */
  summary: string;
  /** The direct answer block. 2–3 sentences, no marketing voice. */
  answer: string;
  /** Body sections. Headings are phrased as questions people actually ask. */
  sections: { heading: string; body: string }[];
  faqs: Faq[];
};

export const services: Service[] = [
  {
    slug: 'software-development',
    name: 'Software Development',
    shortName: 'Software Development',
    serviceType: 'Custom Software Development',
    summary:
      'Web applications, mobile apps, and internal systems built for businesses that have outgrown off-the-shelf tools.',
    answer:
      'Fuchesi builds custom software for companies whose needs have outgrown off-the-shelf tools: web applications, mobile apps, and internal business systems. We work end to end, from shaping what should be built through design, engineering, and support after launch. You own the code and the infrastructure it runs on.',
    sections: [
      {
        heading: 'What kind of software does Fuchesi build?',
        body: 'Web applications, native and cross-platform mobile apps, customer portals, booking and ordering systems, marketplaces, and internal tools that only your team will ever see. We have shipped across commerce, healthcare, property, finance, recruitment, education, and legal services. The common thread is that the software has a job to do and someone depends on it working.',
      },
      {
        heading: 'When is custom software the right call?',
        body: 'When an off-the-shelf product forces your team to work around it. When you are paying per seat for software you use a tenth of. When the process that makes your business distinctive is the one your tools handle worst. If a configurable product covers you, we will say so, and that is a cheaper answer than we are.',
      },
      {
        heading: 'How do projects run?',
        body: 'Discovery first, so we agree on what matters before anything gets built. Then design and engineering in short cycles you can see and steer. You get working software early and often rather than a reveal at the end, and support continues after launch.',
      },
    ],
    faqs: [
      {
        question: 'How much does custom software cost?',
        answer:
          'Custom software with Fuchesi starts at $12,000, and most first releases land between $18,000 and $45,000. A focused internal tool sits at the lower end; a full customer-facing platform with several user types sits above it. The main driver is how much of your process is genuinely unique to you. Discovery is free and produces a written scope and a fixed range before you commit to anything.',
      },
      {
        question: 'How long does it take to build custom software?',
        answer:
          'Six to ten weeks to a working first release for most projects, then it grows from there. You see something you can click at the end of every cycle rather than waiting for a reveal, so the first usable version arrives well before the last feature does.',
      },
      {
        question: 'Do we own the code Fuchesi writes?',
        answer:
          'Yes. You own the source code and it runs on infrastructure in your name. There is no licence to keep paying and no lock-in that makes leaving expensive.',
      },
      {
        question: 'Can Fuchesi work on an existing codebase?',
        answer:
          'Yes. We take over, extend, and repair existing systems as well as building new ones. We start by reading what is there and telling you honestly whether it is worth keeping.',
      },
    ],
  },

  {
    slug: 'erp-systems',
    name: 'Custom ERP Systems',
    shortName: 'ERP Systems',
    serviceType: 'Custom ERP Development',
    summary:
      'One system that models how your business really runs, instead of forcing it into someone else’s template.',
    answer:
      'Fuchesi builds custom ERP systems that replace spreadsheets and disconnected tools with a single system a team will actually use. We model your real operations, whether that is inventory, orders, finance, HR, or all of them, rather than bending the business to fit a product’s assumptions. Systems are built module by module, so the first one is in use while the next is being built.',
    sections: [
      {
        heading: 'What is a custom ERP system?',
        body: 'An ERP, short for enterprise resource planning, is the single place a business tracks the things it runs on: stock, orders, customers, suppliers, invoices, staff. A custom ERP is one built around how your business already works, rather than a product you configure and compromise against.',
      },
      {
        heading: 'Why not use an off-the-shelf ERP?',
        body: 'Sometimes you should, and we will tell you when. Off-the-shelf makes sense while your operations look like everyone else’s. It stops making sense once the thing that makes you competitive is the thing the product handles worst, or once you notice your team running the real process in a spreadsheet beside the ERP you already pay for.',
      },
      {
        heading: 'How does a custom ERP get built without stopping the business?',
        body: 'Module by module. We start with the part causing the most pain, put it into real use, and build outward from there. Your team is never asked to switch everything on a single day, and each module earns its place before the next one starts.',
      },
    ],
    faqs: [
      {
        question: 'How much does a custom ERP cost?',
        answer:
          'A custom ERP is priced by module rather than as one number. The first module starts at $15,000, and three modules covering something like stock, orders, and invoicing typically land between $45,000 and $90,000. Later modules are quoted as you decide to build them, so you are never writing one large cheque against a system you have not seen.',
      },
      {
        question: 'How long does it take to implement a custom ERP?',
        answer:
          'Eight to twelve weeks to the first module in real use. That module is live and earning its place while the next one is being built, which is the point of working this way. Full rollout depends on how many areas of the business are in scope.',
      },
      {
        question: 'Can a custom ERP integrate with our existing tools?',
        answer:
          'Yes. Accounting, e-commerce, payment providers, shipping, CRM, and warehouse systems all connect through their APIs. Integration is usually cheaper than replacement, so we integrate what works and replace only what does not.',
      },
      {
        question: 'What happens to our existing data?',
        answer:
          'It gets migrated. Data in spreadsheets, an old ERP, or an accounting package is mapped, cleaned, and moved as part of the build. Data migration is planned in discovery, not left as an afterthought.',
      },
    ],
  },

  {
    slug: 'ai-calling-agents',
    name: 'AI Calling Agents',
    shortName: 'AI Calling Agents',
    serviceType: 'AI Voice Agent Development',
    summary:
      'Voice agents that hold real phone conversations in your customer’s language, around the clock.',
    answer:
      'Fuchesi builds AI calling agents that hold real phone conversations in your customer’s language. They answer inbound calls, qualify leads, book appointments, and follow up at any hour, with no queue and no hold music. Agents speak the language the caller speaks, including English, Arabic, Urdu, and Hindi.',
    sections: [
      {
        heading: 'What is an AI calling agent?',
        body: 'A voice agent answers or places phone calls and holds a real conversation, listening, understanding, responding, and acting on what it hears. It is not a phone menu and not a recording. It books the appointment, answers the question, or passes the call to a person when a person is needed.',
      },
      {
        heading: 'What languages can AI calling agents speak?',
        body: 'Agents are built to speak whatever language your customers call in, including English, Arabic, Urdu, Hindi, Spanish, French, and German. An agent can also switch languages mid-call when the caller does, which matters in markets where a single call moves between two languages naturally.',
      },
      {
        heading: 'What do businesses use them for?',
        body: 'Answering every inbound call at peak instead of losing the overflow. Qualifying leads the moment they arrive rather than the next morning. Booking and confirming appointments. Following up on quotes. Chasing the calls a busy team never gets back to.',
      },
    ],
    faqs: [
      {
        question: 'Can AI calling agents speak Urdu?',
        answer:
          'Yes. Fuchesi builds calling agents that speak Urdu, and they can switch between Urdu and English within a single call when the caller does. The same applies to Arabic, Hindi, and other languages your customers use.',
      },
      {
        question: 'Do callers know they are talking to an AI?',
        answer:
          'We build agents that say so when asked, and we recommend disclosing it up front. It is the honest choice and in a growing number of places it is the legal one.',
      },
      {
        question: 'Can an AI calling agent transfer to a human?',
        answer:
          'Yes, and knowing when to is most of the design work. Agents hand off on request, on frustration, and on anything outside what they should be deciding. The context goes with the call, so the customer never starts over.',
      },
      {
        question: 'What does an AI calling agent integrate with?',
        answer:
          'Your calendar, CRM, and phone system. An agent that books an appointment writes it to the same calendar your team uses, and a qualified lead lands in your CRM with the call recording and transcript attached.',
      },
      {
        question: 'How much does an AI calling agent cost?',
        answer:
          'A single-workflow agent starts at $8,000 to build. Agents handling several workflows with CRM and calendar integration typically land between $15,000 and $30,000. Running cost is $0.18 to $0.30 per connected minute with telephony included, so a business taking 500 calls a month averaging four minutes would spend roughly $360 to $600 a month on call time. A live agent takes three to five weeks.',
      },
    ],
  },

  {
    slug: 'lead-generation',
    name: 'Custom Lead Generation Pipelines',
    shortName: 'Lead Generation',
    serviceType: 'Lead Generation Automation',
    summary:
      'Pipelines that find, qualify, and route prospects into your CRM without anyone copying rows between tabs.',
    answer:
      'Fuchesi builds custom lead generation pipelines that find, qualify, and route prospects automatically. We connect the sources your market actually lives in, score what comes back against your real criteria, and deliver qualified leads into your CRM with the context your team needs to act. The work your salespeople do by hand at 8am is the work we automate.',
    sections: [
      {
        heading: 'What is a lead generation pipeline?',
        body: 'A system that runs the whole path from "we do not know this company exists" to "a salesperson is talking to the right person there". It sources, enriches, qualifies, and routes. Built once, it runs every day without anyone opening a spreadsheet.',
      },
      {
        heading: 'How is this different from buying a lead list?',
        body: 'A list is a snapshot that starts decaying the moment you buy it, and everyone else can buy the same one. A pipeline is yours: it works from criteria that reflect how your business actually wins, it refreshes continuously, and it gets sharper as your team marks what closed.',
      },
      {
        heading: 'What does a qualified lead look like when it arrives?',
        body: 'In your CRM, scored, with the reasoning attached and the next action clear. A name and an email address is not a lead. What arrives is the context a salesperson needs to make the first conversation a good one.',
      },
    ],
    faqs: [
      {
        question: 'What sources can a lead generation pipeline use?',
        answer:
          'Public company data, professional networks, job listings, review platforms, industry directories, and your own site traffic and form fills. The right mix depends on where your market is visible, which we work out before building anything.',
      },
      {
        question: 'Does this comply with GDPR and data protection rules?',
        answer:
          'Pipelines are built to work within the rules of the markets you sell into, covering lawful basis, opt-outs, and data retention. For US outbound that means CAN-SPAM and state privacy law; for UK and EU prospects it means GDPR and PECR. <!-- TODO: confirm: if you hold any specific certification or a documented DPA, say so here. Buyers ask this early. -->',
      },
      {
        question: 'Will leads land in our existing CRM?',
        answer:
          'Yes. Leads are delivered into the CRM your team already uses, not a separate dashboard nobody opens. If your CRM has an API, we write to it.',
      },
      {
        question: 'How is lead quality kept high over time?',
        answer:
          'By closing the loop. When your team marks a lead as won or junk, that feedback tunes the scoring, so the pipeline gets more accurate the longer it runs.',
      },
    ],
  },

  {
    slug: 'ai-workflow-automation',
    name: 'Custom AI Workflow Automations',
    shortName: 'AI Automation',
    serviceType: 'AI Workflow Automation',
    summary:
      'Repetitive work taken off your team, automated where judgment isn’t needed and handed over cleanly where it is.',
    answer:
      'Fuchesi builds AI workflow automations that take repetitive work off your team. We map the process as it really runs, automate the parts that do not need human judgment, and design a clean handoff to a person for the parts that do. The goal is to stop spending people on work a system should be doing, not to remove them from the process.',
    sections: [
      {
        heading: 'What can actually be automated?',
        body: 'Reading documents and pulling out what matters. Routing requests to the right person. Drafting replies for a human to approve. Reconciling records between two systems that were never designed to talk. Summarising long threads into a decision. Anything with a clear input, a clear output, and a rule you could explain to a new hire.',
      },
      {
        heading: 'What should not be automated?',
        body: 'Decisions with real consequences and no clear rule. Anything a customer would be upset to learn a machine decided. We draw that line during discovery and design the handoff deliberately, because an automation that quietly makes bad calls is worse than the manual process it replaced.',
      },
      {
        heading: 'How do you know it is working?',
        body: 'We measure the thing you care about, whether that is hours returned, turnaround time, or error rate, both before and after. If an automation is not moving that number, it gets fixed or removed.',
      },
    ],
    faqs: [
      {
        question: 'What is AI workflow automation?',
        answer:
          'Using AI to handle the repetitive steps in a business process, such as reading, sorting, drafting, routing, and reconciling, while leaving decisions that need judgment to a person. It differs from traditional automation in that it copes with messy, unstructured input like emails, documents, and free text.',
      },
      {
        question: 'Will AI automation replace our staff?',
        answer:
          'That is not what we build for. The work we automate is the work people do not want: retyping, chasing, reconciling. The point is to give a team its hours back, not to shrink it.',
      },
      {
        question: 'What if the AI gets something wrong?',
        answer:
          'It will, sometimes, so systems are designed around that rather than pretending otherwise. Steps that carry real consequences get human approval before they act, and everything is logged so a wrong call can be found and corrected.',
      },
      {
        question: 'Which tools do these automations connect to?',
        answer:
          'The ones you already use: email, CRM, accounting, storage, messaging, and internal systems with an API. We automate around your stack rather than asking you to move to ours.',
      },
    ],
  },
];

export const getService = (slug: string) => services.find((s) => s.slug === slug);
